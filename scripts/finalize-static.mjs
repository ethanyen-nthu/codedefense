import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((e) => (e.isDirectory() ? files(path.join(dir, e.name)) : path.join(dir, e.name))),
  );
  return nested.flat();
}
const all = await files('out');
if (all.some((f) => /[/\\](api|functions)[/\\]|_worker\.js$/.test(f)))
  throw new Error('A server artifact was found in the static export.');
for (const required of [
  'out/index.html',
  'out/404.html',
  'out/privacy.html',
  'out/parser/tree-sitter.wasm',
  'out/parser/tree-sitter-cpp.wasm',
])
  await stat(required);
const assets = all
  .filter((f) => /\.(html|js|css|wasm|ico|png|svg)$/.test(f) && !f.endsWith('sw.js'))
  .map((f) => '/' + path.relative('out', f).split(path.sep).join('/'));
assets.push('/', '/privacy');
const digest = createHash('sha256');
for (const f of all.sort()) digest.update(await readFile(f));
const version = 'codedefense-free-' + digest.digest('hex').slice(0, 16);
await writeFile(
  'out/sw.js',
  `const CACHE=${JSON.stringify(version)};const ASSETS=${JSON.stringify(assets)};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('codedefense-free-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;event.respondWith(fetch(event.request).catch(()=>caches.match(event.request).then(cached=>cached||new Response('Offline: this asset was not cached. Reconnect once to refresh the application.',{status:503}))));});
`,
);
console.log(
  `Static export verified: ${assets.length} self-hosted offline assets, no Functions or API routes.`,
);
