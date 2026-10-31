import { Parser, Language, type Node as SyntaxNode } from 'web-tree-sitter';
import { validateSource, sourceSlice } from './source';
import type { Analysis, Construct, Kind } from './schemas';
let initialization: Promise<Language> | undefined;
export function initializeParser(
  paths = { coreWasm: '/parser/tree-sitter.wasm', cppWasm: '/parser/tree-sitter-cpp.wasm' },
) {
  return (initialization ??= Parser.init({ locateFile: () => paths.coreWasm })
    .then(() => Language.load(paths.cppWasm))
    .catch((e) => {
      initialization = undefined;
      throw e;
    }));
}
const loops = new Set(['for_statement', 'for_range_loop', 'while_statement', 'do_statement']);
function nameOf(n: SyntaxNode | null): string {
  if (!n) return '';
  if (n.type === 'identifier' || n.type === 'field_identifier') return n.text;
  return nameOf(n.childForFieldName('declarator'));
}
function descendants(n: SyntaxNode, predicate: (node: SyntaxNode) => boolean): SyntaxNode[] {
  const found: SyntaxNode[] = [];
  const stack = [n];
  while (stack.length) {
    const next = stack.pop()!;
    if (['comment', 'string_literal', 'char_literal', 'raw_string_literal'].includes(next.type))
      continue;
    if (predicate(next)) found.push(next);
    stack.push(...next.namedChildren.filter((child): child is SyntaxNode => child !== null));
  }
  return found;
}
function containing(n: SyntaxNode, type: string) {
  let p = n.parent;
  while (p && p.type !== type) p = p.parent;
  return p;
}
function builtinType(n: SyntaxNode | null): string | null {
  if (!n) return null;
  const text = n.text;
  return [
    'int',
    'double',
    'float',
    'char',
    'bool',
    'long',
    'short',
    'unsigned',
    'signed',
    'long long',
  ].includes(text)
    ? text
    : null;
}
function integralType(type: string | null) {
  return Boolean(
    type &&
    ['int', 'char', 'bool', 'long', 'short', 'unsigned', 'signed', 'long long'].includes(type),
  );
}
// Deliberately narrow resolution: direct local primitive declarations/parameters only.
// Ambiguous/shadowed, aliased, overloaded and cross-scope expressions are not called integer division.
type Symbols = Map<number, Map<string, SyntaxNode[]>>;
function inferPrimitive(n: SyntaxNode | null, at: SyntaxNode, symbols: Symbols): string | null {
  if (!n) return null;
  if (n.type === 'number_literal')
    return /[.eEpPfF]/.test(n.text) ? 'double' : /^[0-9]+(?:[uUlL]*)$/.test(n.text) ? 'int' : null;
  if (n.type === 'char_literal') return 'char';
  if (n.type === 'parenthesized_expression') return inferPrimitive(n.namedChild(0), at, symbols);
  if (n.type !== 'identifier') return null;
  const fn = containing(at, 'function_definition');
  if (!fn) return null;
  const candidates = (symbols.get(fn.id)?.get(n.text) || []).filter(
    (node) => node.startIndex < at.startIndex,
  );
  if (candidates.length !== 1) return null;
  const declaration = candidates[0];
  if (
    ['init_declarator', 'parameter_declaration'].includes(declaration.type) &&
    declaration.childForFieldName('declarator')?.type !== 'identifier'
  )
    return null;
  const scope =
    declaration.type === 'parameter_declaration'
      ? fn
      : containing(declaration, 'compound_statement');
  if (!scope || at.startIndex < scope.startIndex || at.endIndex > scope.endIndex) return null;
  return builtinType(
    declaration.childForFieldName('type') || declaration.parent?.childForFieldName('type') || null,
  );
}
export async function analyzeCpp(
  input: string,
  paths?: { coreWasm: string; cppWasm: string },
): Promise<Analysis> {
  const code = validateSource(input),
    language = await initializeParser(paths),
    parser = new Parser();
  parser.setLanguage(language);
  const tree = parser.parse(code);
  if (!tree) {
    parser.delete();
    throw new Error('The parser could not read this source. Try a smaller program.');
  }
  try {
    const constructs: Construct[] = [],
      diagnostics: Analysis['diagnostics'] = [];
    const seen = new Set<string>(),
      quotes = new Map<string, string>();
    let evidenceChars = 0,
      evidenceLimited = false;
    function add(kind: Kind, n: SyntaxNode, name = n.text, detail = '') {
      if (constructs.length >= 1000) return;
      const key = `${kind}:${n.startIndex}:${n.endIndex}`;
      if (seen.has(key)) return;
      seen.add(key);
      const start = n.startPosition.row + 1,
        end = n.endPosition.row + (n.endPosition.column === 0 ? 0 : 1);
      const quoteKey = `${start}:${Math.max(start, end)}`;
      const snippet = quotes.get(quoteKey) || sourceSlice(code, start, Math.max(start, end));
      quotes.set(quoteKey, snippet);
      if (evidenceChars + snippet.length > 400000) {
        evidenceLimited = true;
        return;
      }
      evidenceChars += snippet.length;
      constructs.push({
        kind,
        name: name.slice(0, 120),
        detail,
        evidence: {
          start,
          end: Math.max(start, end),
          snippet,
        },
      });
    }
    const root = tree.rootNode;
    const all = descendants(root, () => true);
    const functions = all.filter((n) => n.type === 'function_definition');
    const symbols: Symbols = new Map();
    // Index declarations once, rather than scanning an entire function for each division.
    for (const node of all) {
      const fn = containing(node, 'function_definition');
      if (!fn) continue;
      const names =
        node.type === 'declaration'
          ? node
              .childrenForFieldName('declarator')
              .filter((d) => d?.type === 'identifier')
              .map(nameOf)
          : ['init_declarator', 'parameter_declaration'].includes(node.type)
            ? [nameOf(node.childForFieldName('declarator'))]
            : [];
      for (const name of names) {
        const table = symbols.get(fn.id) || new Map<string, SyntaxNode[]>();
        table.set(name, [...(table.get(name) || []), node]);
        symbols.set(fn.id, table);
      }
    }
    const streamBindings = all.filter((n) => n.type === 'using_declaration').map((n) => n.text);
    const stdNamespace = all.some(
      (n) =>
        ['using_directive', 'using_declaration'].includes(n.type) &&
        n.text.replace(/\s/g, '') === 'usingnamespacestd;',
    );
    const namesDeclared = new Set(
      all.flatMap((n) =>
        n.type === 'declaration'
          ? n.childrenForFieldName('declarator').map(nameOf)
          : ['init_declarator', 'parameter_declaration'].includes(n.type)
            ? [nameOf(n.childForFieldName('declarator'))]
            : [],
      ),
    );
    for (const n of all) {
      if ((n.type === 'ERROR' || n.isMissing) && diagnostics.length < 8)
        diagnostics.push({
          line: n.startPosition.row + 1,
          column: n.startPosition.column + 1,
          message: n.isMissing
            ? `Missing ${n.type}; check the preceding statement, delimiters, or semicolon.`
            : 'Incomplete or unrecognized C++ syntax here. Check parentheses, braces, semicolons, and surrounding lines.',
        });
      if (n.type === 'declaration') {
        const type = n.childForFieldName('type');
        for (const d of n
          .childrenForFieldName('declarator')
          .filter((child): child is SyntaxNode => child !== null)) {
          if (d.type === 'function_declarator') continue;
          const name = nameOf(d);
          if (name)
            add(
              'variable',
              d,
              name,
              (d.type === 'identifier' ||
              (d.type === 'init_declarator' &&
                d.childForFieldName('declarator')?.type === 'identifier')
                ? ''
                : 'indirect: ') + (type?.text || 'type not resolved'),
            );
          if (d.type === 'init_declarator')
            add('initialization', d, name, 'Initialization at declaration');
        }
      }
      if (n.type === 'primitive_type' && ['int', 'double', 'char', 'bool'].includes(n.text))
        add(n.text as Kind, n, n.text);
      if (n.type === 'qualified_identifier' && n.text === 'std::string')
        add('string', n, 'std::string');
      if (
        n.type === 'type_identifier' &&
        n.text === 'string' &&
        (stdNamespace || streamBindings.some((s) => s.includes('std::string')))
      )
        add('string', n, 'string');
      if (
        n.type === 'binary_expression' &&
        ['<<', '>>'].includes(n.childForFieldName('operator')?.text || '')
      ) {
        const ids = descendants(
          n.childForFieldName('left') || n,
          (c) => c.type === 'identifier' || c.type === 'qualified_identifier',
        );
        for (const kind of ['cin', 'cout'] as const)
          if (
            ids.some(
              (id) =>
                id.text === `std::${kind}` ||
                (id.text === kind &&
                  (stdNamespace || streamBindings.some((s) => s === `using std::${kind};`)) &&
                  !namesDeclared.has(kind)),
            )
          )
            add(
              kind,
              n,
              kind,
              'Stream-shaped expression; overload/semantic validity is not checked.',
            );
      }
      if (n.type === 'if_statement') {
        add('if', n, 'if');
        const alt = n.childForFieldName('alternative');
        if (alt) {
          add('else', alt, 'else');
          if (alt.namedChildren.some((c) => c?.type === 'if_statement'))
            add('else-if', alt, 'else if');
        }
      }
      if (n.type === 'switch_statement') add('switch', n, 'switch');
      if (n.type === 'case_statement')
        add('case', n, n.childForFieldName('value')?.text || 'default');
      if (loops.has(n.type)) {
        const kind =
          n.type === 'while_statement' ? 'while' : n.type === 'do_statement' ? 'do-while' : 'for';
        add(
          kind,
          n,
          kind,
          n.type === 'for_range_loop'
            ? 'Range-based for; conventional-for templates are excluded.'
            : '',
        );
        let p = n.parent;
        while (p) {
          if (loops.has(p.type)) {
            add('nested-loop', n, kind, 'Loop nested inside another loop');
            break;
          }
          if (p.type === 'function_definition' || p.type === 'lambda_expression') break;
          p = p.parent;
        }
      }
      if (n.type === 'array_declarator') add('array', n, nameOf(n), 'Built-in array declarator');
      if (n.type === 'function_definition')
        add('function', n, nameOf(n.childForFieldName('declarator')), 'Function definition');
      if (n.type === 'parameter_declaration')
        add(
          'parameter',
          n,
          nameOf(n.childForFieldName('declarator')) || n.text,
          n.childForFieldName('type')?.text || '',
        );
      if (n.type === 'return_statement') add('return', n, 'return');
      if (n.type === 'call_expression') {
        const fn = containing(n, 'function_definition'),
          callee = n.childForFieldName('function');
        const fnName = fn ? nameOf(fn.childForFieldName('declarator')) : '';
        if (
          fn &&
          callee?.type === 'identifier' &&
          callee.text === fnName &&
          functions.filter((f) => nameOf(f.childForFieldName('declarator')) === fnName).length ===
            1 &&
          !descendants(
            fn,
            (c) =>
              c.type === 'parameter_declaration' &&
              nameOf(c.childForFieldName('declarator')) === fnName,
          ).length &&
          !descendants(
            fn,
            (c) =>
              c.type === 'declaration' &&
              c
                .childrenForFieldName('declarator')
                .filter((child): child is SyntaxNode => child !== null)
                .some((d) => nameOf(d) === fnName),
          ).length
        )
          add(
            'recursion',
            n,
            fnName,
            'Unqualified direct self-call candidate; overload resolution and indirect recursion are not analyzed.',
          );
      }
      if (n.type === 'binary_expression' || n.type === 'assignment_expression') {
        const op = n.childForFieldName('operator')?.text;
        if (op && ['+', '-', '*', '/', '%', '+=', '-=', '*=', '/=', '%='].includes(op))
          add('arithmetic', n, op);
        if (op && ['==', '!=', '<', '>', '<=', '>='].includes(op)) add('comparison', n, op);
        if (op === '%' || op === '%=')
          add('modulo', n, op, `divisor:${n.childForFieldName('right')?.text || 'unknown'}`);
        if (op === '/' || op === '/=') {
          add('division', n, op);
          const a = inferPrimitive(n.childForFieldName('left'), n, symbols),
            b = inferPrimitive(n.childForFieldName('right'), n, symbols);
          if (integralType(a) && integralType(b))
            add(
              'integer-division',
              n,
              op,
              `${a} / ${b} from direct primitive declarations/literals`,
            );
        }
        if (op === '&&' || op === 'and') add('and', n, op);
        if (op === '||' || op === 'or') add('or', n, op);
      }
      if (n.type === 'break_statement') {
        let target = n.parent;
        while (
          target &&
          !loops.has(target.type) &&
          target.type !== 'switch_statement' &&
          target.type !== 'function_definition'
        )
          target = target.parent;
        add(
          'break',
          n,
          'break',
          target?.type === 'switch_statement' ? 'target:switch' : 'target:loop',
        );
      }
      if (n.type === 'continue_statement') {
        let p = n.parent,
          insideSwitch = false;
        while (p && !loops.has(p.type) && p.type !== 'function_definition') {
          if (p.type === 'switch_statement') insideSwitch = true;
          p = p.parent;
        }
        add('continue', n, 'continue', insideSwitch ? 'switch-loop' : 'loop');
      }
      if (n.type === 'compound_statement') add('scope', n, 'block', 'Brace-delimited block scope');
    }
    constructs.sort((a, b) => a.evidence.start - b.evidence.start || a.kind.localeCompare(b.kind));
    return {
      constructs,
      diagnostics,
      summary: `Parsed ${code.split('\n').length} source lines, ${functions.length} function definition(s), and ${new Set(constructs.map((c) => c.kind)).size} supported construct categories locally. Program purpose and runtime correctness are not inferred.`,
      parser: 'Tree-sitter C++',
      limitations: [
        ...(evidenceLimited
          ? [
              'Stored source evidence was limited to 400,000 characters to keep large/minified programs responsive. Reduce or format the source for broader occurrence coverage.',
            ]
          : []),
        ...(constructs.length >= 1000
          ? [
              'Occurrence display/selection is limited to the first 1,000 detected constructs. Reduce the source for full occurrence coverage.',
            ]
          : []),
        'Syntax parsing is not compilation, type checking, or execution. Headers, macros, overloads, aliases, and complete C++11 conformance are not resolved.',
        'Integer-division detection is intentionally conservative. Direct recursion is a syntactic self-call candidate; base cases and termination must be reviewed.',
        'Questions explain source syntax and stated rules, not invented program outputs.',
      ],
    };
  } finally {
    tree.delete();
    parser.delete();
  }
}
