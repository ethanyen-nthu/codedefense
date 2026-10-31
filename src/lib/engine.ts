import { QUESTION_BANK, type Template } from './question-bank';
import { levelOf } from './difficulty';
import { difficulties, type Difficulty } from './schemas';
import {
  configSchema,
  type Analysis,
  type AssignmentContext,
  type InterviewConfig,
  type PracticeSession,
  type Question,
  type Assessment,
} from './schemas';
export function random(seed: string) {
  let n = 2166136261;
  for (const c of seed) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
  return () => {
    n += 0x6d2b79f5;
    let t = n;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function shuffle<T>(list: T[], rng: () => number) {
  const result = [...list];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function generateQuestions(
  analysis: Analysis,
  config: InterviewConfig,
  exclude: string[] = [],
  limit: number = config.count,
  priorities: string[] = [],
): Question[] {
  if (analysis.diagnostics.length)
    throw new Error('Repair the reported syntax errors before starting an interview.');
  const rng = random(config.seed),
    maxLevel = levelOf(config.difficulty);
  const supports = (t: Template, c: Analysis['constructs'][number]) =>
    c.kind === t.kind &&
    (t.requires || []).every((tag) => c.features?.tags.includes(tag)) &&
    !(c.kind === 'for' && c.features?.tags.includes('range-for'));
  const wanted =
    config.mode === 'Code Tracing'
      ? 'Code Tracing'
      : config.mode === 'What Happens If?'
        ? 'What Happens If?'
        : config.mode === 'Debugging Challenge'
          ? 'Find the Problem'
          : config.mode === 'Explain My Code'
            ? 'Explain the Code'
            : null;
  const candidates = QUESTION_BANK.filter(
    (t) =>
      t.level <= maxLevel &&
      !exclude.includes(t.id) &&
      !(
        t.family && QUESTION_BANK.some((old) => exclude.includes(old.id) && old.family === t.family)
      ) &&
      !config.excluded.includes(t.kind) &&
      (!wanted ||
        (t.format || (t.style === 'debug' ? 'Find the Problem' : 'Explain the Code')) === wanted) &&
      analysis.constructs.some((c) => supports(t, c)),
  );
  const ordered = shuffle(candidates, rng).sort(
    (a, b) =>
      Number(priorities.includes(b.kind)) - Number(priorities.includes(a.kind)) ||
      (config.preset
        ? Number(
            [
              'cin',
              'cout',
              'if',
              'switch',
              'for',
              'while',
              'do-while',
              'array',
              'function',
              'recursion',
              'modulo',
              'integer-division',
            ].includes(b.kind),
          ) -
          Number(
            [
              'cin',
              'cout',
              'if',
              'switch',
              'for',
              'while',
              'do-while',
              'array',
              'function',
              'recursion',
              'modulo',
              'integer-division',
            ].includes(a.kind),
          )
        : 0) ||
      Math.abs(maxLevel - a.level) - Math.abs(maxLevel - b.level) ||
      Number(b.grounding === 'Your source') - Number(a.grounding === 'Your source'),
  );
  // A round of distinct concepts before revisiting one, and no repeated template.
  const groups = new Map<string, Template[]>();
  for (const t of ordered) groups.set(t.kind, [...(groups.get(t.kind) || []), t]);
  const chosen: Template[] = [];
  while (chosen.length < limit && [...groups.values()].some((g) => g.length)) {
    for (const group of groups.values()) {
      if (chosen.length >= limit) break;
      while (group[0]?.family && chosen.some((t) => t.family === group[0].family)) group.shift();
      const t = group.shift();
      if (t) chosen.push(t);
    }
  }
  return chosen.map((t) => {
    const supported = analysis.constructs.filter((c) => supports(t, c));
    const c = supported[Math.floor(rng() * supported.length)];
    const fill = (text: string) =>
      text
        .replaceAll('{name}', c.name)
        .replaceAll('{line}', String(c.evidence.start))
        .replaceAll('{expression}', c.features?.expression || c.evidence.snippet.trim())
        .replaceAll('{condition}', c.features?.condition || 'the cited condition')
        .replaceAll('{left}', c.features?.left || 'the left operand');
    const reference = fill(t.reference);
    const options = shuffle(
      [
        { text: reference, correct: true, why: reference },
        ...t.wrong.map((text, i) => ({
          text: fill(text),
          correct: false,
          why: fill(t.wrongReasons?.[i] || `This option is incorrect: ${t.reference}`),
        })),
      ],
      rng,
    );
    return {
      id: `${t.id}:${c.evidence.start}`,
      templateId: t.id,
      text: fill(t.prompt),
      concept: t.kind,
      evidence: c.evidence,
      level: t.level,
      format:
        config.mode === 'Quick Multiple Choice'
          ? 'Multiple Choice'
          : t.format || (t.style === 'debug' ? 'Find the Problem' : 'Explain the Code'),
      grounding: t.grounding || 'Language rule',
      simple: fill(t.simple || simpleRule(c.kind)),
      hint: `Start with ${c.kind} at line ${c.evidence.start}. ${simpleRule(c.kind)} State what the source supports and which inputs or types you assume.`,
      expected: (t.points || [simpleRule(c.kind), applicationCheck(c.kind)]).map(fill),
      explanation: reference,
      choices: options.map((o) => o.text),
      choiceExplanations: options.map((o) => o.why),
      correctIndex: options.findIndex((o) => o.correct),
      followUp: t.follow
        ? {
            text: fill(t.follow[0]),
            explanation: fill(t.follow[1]),
            expected: [fill(t.follow[1]), 'Justify the assumptions against the actual source.'],
          }
        : null,
    };
  });
}
const simpleRules: Partial<Record<Analysis['constructs'][number]['kind'], string>> = {
  variable: 'Separate the object’s name, type, and current value.',
  initialization: 'The initial value is supplied when an object is created.',
  int: 'An int stores whole numbers within a finite range.',
  double: 'Floating-point values have limited precision.',
  char: 'A char is one small integer code unit, not a whole text string.',
  bool: 'A bool is true or false.',
  string: 'A string is a sequence of characters.',
  cin: 'Reading can fail. Check the stream before relying on input.',
  cout: 'Output displays values; it does not verify them.',
  if: 'The condition chooses whether the body runs.',
  else: 'This path runs when its associated if is false.',
  'else-if': 'Check alternatives in order and stop at the first true condition.',
  switch: 'Find the matching entry label, then follow statements and exits.',
  case: 'A case is an entry label, not an automatic exit.',
  for: 'Separate setup, condition, body, and update.',
  while: 'Test the condition before each pass. Identify what changes it.',
  'do-while': 'The body precedes the first condition test.',
  'nested-loop': 'Count the inner passes for each outer pass separately.',
  array: 'Element positions run from zero through the element count minus one.',
  function: 'Describe inputs, work, and result from the actual body.',
  parameter: 'Inspect whether this parameter is a copy or a reference.',
  return: 'Return ends this function invocation and may supply its result.',
  recursion: 'Find a stopping path and show progress toward it.',
  arithmetic: 'Track operand types and each intermediate calculation.',
  comparison: 'Read the relation as a yes/no test and inspect its boundary.',
  modulo: 'Remainder is what remains after valid integer division.',
  'integer-division': 'Valid integral division discards the fractional part toward zero.',
  division: 'Check operand types and whether the divisor is valid.',
  and: 'Built-in AND needs both conditions; a false left operand skips the right.',
  or: 'Built-in OR needs at least one condition; a true left operand skips the right.',
  break: 'Find the nearest enclosing loop or switch that this exits.',
  continue: 'Find the nearest loop and the next test or update.',
  scope: 'Find where each name is declared and where its object’s lifetime ends.',
};
function simpleRule(kind: Analysis['constructs'][number]['kind']) {
  return simpleRules[kind] || 'Identify the statement and explain its rule in your own words.';
}
function applicationCheck(kind: Analysis['constructs'][number]['kind']) {
  const checks: Partial<Record<Analysis['constructs'][number]['kind'], string>> = {
    variable:
      'Locate the actual declaration and distinguish an independent object from a reference or pointer.',
    initialization:
      'Identify the initializer and when it runs; distinguish initialization from later assignment.',
    cin: 'Explain success, failure and input-domain checks using the actual extraction and surrounding paths.',
    cout: 'Identify what values or text are inserted and which separators the source explicitly supplies.',
    while:
      'Identify the exact condition and updates; consider entry at the boundary and every continuing path.',
    for: 'Relate initialization, condition, body and update to the actual bounds and any indexed elements.',
    'do-while': 'Explain the first body execution separately from subsequent condition tests.',
    'nested-loop': 'Separate the two bounds and state any independence or fixed-count assumption.',
    array: 'Identify the actual element count and justify every proposed element index.',
    recursion:
      'Locate a stopping path and argue progress for stated inputs; do not assume either is proved by parsing.',
    modulo:
      'Check built-in integral operand assumptions, a nonzero divisor, and any sign or digit interpretation.',
    'integer-division':
      'State the integral operand evidence and check valid division before applying truncation toward zero.',
    break: 'Identify the actual nearest loop or switch and where control continues afterward.',
    continue: 'Identify the actual loop and whether a body update can be bypassed.',
    parameter:
      'Use the actual declarator to distinguish a value copy from a reference; check constness where relevant.',
    comparison:
      'Name both operands and the relation, then justify an equality or boundary example.',
    and: 'State the built-in assumption and identify when the right operand is skipped.',
    or: 'State the built-in assumption and identify when the right operand is skipped.',
    scope: 'Tie visibility and lifetime to actual declarations, blocks and declaration order.',
  };
  return (
    checks[kind] ||
    'Apply the stated rule to the cited source and explicitly name any input, type, or reachability assumptions.'
  );
}
export function createSession(
  code: string,
  analysis: Analysis,
  context: AssignmentContext,
  input: InterviewConfig,
  history: PracticeSession[] = [],
): PracticeSession {
  const config = configSchema.parse({ ...input, seed: input.seed || crypto.randomUUID() }),
    questions = generateQuestions(
      analysis,
      config,
      [],
      config.count,
      config.adaptive ? weakTopics(history).map((t) => t.concept) : [],
    );
  if (!questions.length)
    throw new Error(
      'No reviewed questions fit the detected constructs and difficulty. Try Normal TA or add more source code.',
    );
  return {
    version: 2,
    id: crypto.randomUUID(),
    code,
    context,
    analysis,
    config,
    questions,
    createdAt: new Date().toISOString(),
    index: 0,
    stage: 'question',
    records: [],
    draft: '',
    draftChoice: null,
    hint: false,
    difficultyChanges: [],
  };
}
export function submit(session: PracticeSession, skip = false): PracticeSession {
  const s = structuredClone(session),
    q = s.questions[s.index];
  if (s.stage === 'followup') {
    if (!skip && !s.draft.trim()) throw new Error('Write your follow-up explanation first.');
    s.records.at(-1)!.followUp = {
      answer: skip ? '' : s.draft,
      assessment: null,
      skipped: skip,
      hintsUsed: s.hint,
    };
    s.stage = 'followup-feedback';
  } else if (s.stage === 'question') {
    const mc = s.config.mode === 'Quick Multiple Choice';
    if (!skip && (mc ? s.draftChoice === null : !s.draft.trim()))
      throw new Error(mc ? 'Choose an answer first.' : 'Write an answer first.');
    s.records.push({
      question: q,
      answer: skip ? '' : s.draft,
      choice: skip ? null : s.draftChoice,
      correct: mc ? !skip && s.draftChoice === q.correctIndex : null,
      assessment: null,
      skipped: skip,
      hintsUsed: s.hint,
      difficulty: s.config.difficulty,
      followUp: null,
    });
    s.stage = 'feedback';
  } else throw new Error('This response is already recorded.');
  s.draft = '';
  s.draftChoice = null;
  s.hint = false;
  return s;
}
export function assess(session: PracticeSession, value: Assessment): PracticeSession {
  const s = structuredClone(session),
    r = s.records.at(-1);
  if (!r) throw new Error('Submit an answer first.');
  if (s.stage === 'followup-feedback' && r.followUp && !r.followUp.skipped)
    r.followUp.assessment = value;
  else if (s.stage === 'feedback' && !r.skipped && s.config.mode !== 'Quick Multiple Choice')
    r.assessment = value;
  else throw new Error('No written response is awaiting self-assessment.');
  return s;
}
export function canAdvance(s: PracticeSession) {
  const r = s.records.at(-1);
  return Boolean(
    r &&
    (s.stage === 'feedback'
      ? r.skipped || s.config.mode === 'Quick Multiple Choice' || r.assessment
      : s.stage === 'followup-feedback'
        ? r.followUp?.skipped || r.followUp?.assessment
        : false),
  );
}
export function advance(session: PracticeSession): PracticeSession {
  if (!canAdvance(session))
    throw new Error('Compare your answer and record your self-assessment first.');
  let s = structuredClone(session);
  if (s.config.adaptive && s.index + 1 < s.questions.length) {
    const latest = s.records.at(-1)!;
    const strong = s.records.slice(-3).length === 3 && s.records.slice(-3).every((r) => !isWeak(r));
    const delta = isWeak(latest) ? -1 : strong ? 1 : 0;
    const target = difficulties[Math.max(0, Math.min(4, levelOf(s.config.difficulty) - 1 + delta))];
    if (target !== s.config.difficulty) {
      try {
        s = changeDifficulty(s, target, 'adaptive');
      } catch {
        /* Keep the supported pool when no replacement fits. */
      }
    }
  }
  s.index++;
  s.stage = s.index >= s.questions.length ? 'complete' : 'question';
  s.hint = false;
  return s;
}
export function followUp(session: PracticeSession): PracticeSession {
  const r = session.records.at(-1);
  if (session.stage !== 'feedback' || !canAdvance(session) || !r?.question.followUp || r.followUp)
    throw new Error('Only one supported follow-up is available after this answer.');
  return { ...session, stage: 'followup', draft: '', draftChoice: null, hint: false };
}
export function isWeak(r: PracticeSession['records'][number]) {
  return (
    r.hintsUsed ||
    r.skipped ||
    r.correct === false ||
    (r.correct === null && r.assessment !== 'complete') ||
    Boolean(
      r.followUp &&
      (r.followUp.hintsUsed || r.followUp.skipped || r.followUp.assessment !== 'complete'),
    )
  );
}
export function retryWeak(s: PracticeSession): PracticeSession {
  const questions = s.records.filter(isWeak).map((r) => r.question);
  if (!questions.length) throw new Error('No weak questions were recorded.');
  return {
    ...s,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    difficultyChanges: [],
    questions,
    index: 0,
    stage: 'question',
    records: [],
    draft: '',
    draftChoice: null,
    hint: false,
  };
}
export function summarize(s: PracticeSession) {
  const auto = s.records.filter((r) => r.correct !== null),
    written = s.records.filter((r) => r.correct === null && !r.skipped);
  const correct = auto.filter((r) => !r.skipped && r.choice === r.question.correctIndex).length;
  return {
    hints:
      s.records.filter((r) => r.hintsUsed).length +
      s.records.filter((r) => r.followUp?.hintsUsed).length,
    practiced: [...new Set(s.records.map((r) => r.question.concept))]
      .map((concept) => ({
        concept,
        count: s.records.filter((r) => r.question.concept === concept).length,
      }))
      .sort((a, b) => b.count - a.count),
    suggestedDifficulty:
      !s.config.adaptive && s.records.length >= 3 && s.records.slice(-3).every((r) => !isWeak(r))
        ? difficulties[Math.min(4, levelOf(s.config.difficulty))]
        : null,
    completed: s.records.filter((r) => !r.skipped).length,
    skipped: s.records.filter((r) => r.skipped).length,
    autoTotal: auto.length,
    autoCorrect: correct,
    autoScore: auto.length ? Math.round((correct / auto.length) * 100) : null,
    complete: written.filter((r) => r.assessment === 'complete').length,
    partial: written.filter((r) => r.assessment === 'partial').length,
    notYet: written.filter((r) => r.assessment === 'not-yet').length,
    unassessed: written.filter((r) => r.assessment === null).length,
    concepts: [...new Set(s.records.map((r) => r.question.concept))],
    weak: [...new Set(s.records.filter(isWeak).map((r) => r.question.concept))],
  };
}

export function changeDifficulty(
  session: PracticeSession,
  to: Difficulty,
  reason: 'chosen' | 'adaptive' = 'chosen',
): PracticeSession {
  if (reason === 'adaptive' && !session.config.adaptive)
    throw new Error('Enable Adaptive Practice before automatic changes.');
  if (
    session.stage === 'complete' ||
    session.stage === 'followup' ||
    session.stage === 'followup-feedback'
  )
    throw new Error('Change difficulty between main questions.');
  if (to === session.config.difficulty) return session;
  const s = structuredClone(session),
    locked = s.records.length;
  const config = { ...s.config, difficulty: to, seed: `${s.config.seed}:change:${locked}:${to}` };
  const needed = s.questions.length - locked;
  if (!needed)
    throw new Error(
      'No unanswered questions remain. Start another interview to change difficulty.',
    );
  const remaining = generateQuestions(
    s.analysis,
    config,
    s.questions.slice(0, locked).map((q) => q.templateId),
    needed,
    s.config.adaptive ? s.records.filter(isWeak).map((r) => r.question.concept) : [],
  );
  if (!remaining.length)
    throw new Error(
      'No unseen reviewed questions fit that level and your topic filters. Your current interview is preserved.',
    );
  s.questions = [...s.questions.slice(0, locked), ...remaining];
  s.difficultyChanges.push({ after: locked, from: s.config.difficulty, to, reason });
  s.config = { ...s.config, difficulty: to };
  if (s.stage === 'question') {
    s.draft = '';
    s.draftChoice = null;
    s.hint = false;
  }
  return s;
}
export function weakTopics(sessions: PracticeSession[]) {
  const result = new Map<
    string,
    {
      concept: Question['concept'];
      attempts: number;
      weak: number;
      hints: number;
      session: PracticeSession;
    }
  >();
  for (const session of sessions)
    for (const record of session.records) {
      const concept = record.question.concept,
        row = result.get(concept) || { concept, attempts: 0, weak: 0, hints: 0, session };
      row.attempts++;
      row.weak += Number(isWeak(record));
      row.hints += Number(record.hintsUsed);
      result.set(concept, row);
    }
  return [...result.values()].sort((a, b) => b.weak - a.weak || b.hints - a.hints);
}
