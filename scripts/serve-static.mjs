// Development/test preview only. Production serves out/ directly on Cloudflare Pages.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve('out'),
  port = Number(process.env.PORT || 3000);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.wasm': 'application/wasm',
  '.json': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
};
const rules = await readFile(path.join(root, '_headers'), 'utf8');
const globalHeaders = Object.fromEntries(
  rules
    .split('\n\n')[0]
    .split('\n')
    .slice(1)
    .filter((line) => line.startsWith('  '))
    .map((line) => {
      const i = line.indexOf(':');
      return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
    }),
);
http
  .createServer(async (req, res) => {
    try {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405);
        res.end();
        return;
      }
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname),
        target = path.resolve(root, '.' + pathname);
      if (target !== root && !target.startsWith(root + path.sep)) {
        res.writeHead(403);
        res.end();
        return;
      }
      let file = target;
      let status = 200;
      try {
        const info = await stat(file);
        if (info.isDirectory()) {
          try {
            await stat(path.join(file, 'index.html'));
            file = path.join(file, 'index.html');
          } catch {
            await stat(file + '.html');
            file += '.html';
          }
        }
      } catch {
        try {
          await stat(file + '.html');
          file += '.html';
        } catch {
          file = path.join(root, '404.html');
          status = 404;
        }
      }
      const data = await readFile(file);
      res.writeHead(status, {
        'Content-Type': types[path.extname(file)] || 'application/octet-stream',
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff',
        ...globalHeaders,
      });
      res.end(req.method === 'HEAD' ? undefined : data);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  })
  .listen(port, '127.0.0.1', () => console.log(`Static out/ preview: http://127.0.0.1:${port}`));
