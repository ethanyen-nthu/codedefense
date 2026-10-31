import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
await mkdir('public/parser', { recursive: true });
await copyFile(
  require.resolve('web-tree-sitter/tree-sitter.wasm'),
  'public/parser/tree-sitter.wasm',
);
const grammarRoot = path.dirname(require.resolve('@vscode/tree-sitter-wasm/package.json'));
await copyFile(
  path.join(grammarRoot, 'wasm/tree-sitter-cpp.wasm'),
  'public/parser/tree-sitter-cpp.wasm',
);
await copyFile(path.join(grammarRoot, 'LICENSE'), 'public/parser/VSCODE-LICENSE.txt');
await writeFile(
  'public/parser/grammar-provenance.json',
  JSON.stringify(
    JSON.parse(await readFile(path.join(grammarRoot, 'cgmanifest.json'), 'utf8')),
    null,
    2,
  ) + '\n',
);
const coreRoot = path.dirname(require.resolve('web-tree-sitter'));
await copyFile(path.join(coreRoot, 'LICENSE'), 'public/parser/TREE-SITTER-LICENSE.txt');
console.log('Bundled compatible Tree-sitter runtime, C++ grammar, and license notices.');
