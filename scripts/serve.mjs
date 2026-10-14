// Development server for app/ (Node standard library only).
// Serves existing files; any other path gets index.html so deep links work.
//
//   node scripts/serve.mjs [--port 5173] [--host 127.0.0.1]

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('../app', import.meta.url)));
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8'
};

function option(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const port = Number(option('port', process.env.PORT ?? 5173));
const host = option('host', '127.0.0.1');
if (!Number.isInteger(port) || port <= 0 || port > 65535) {
  console.error(`Invalid port: ${option('port', '')}`);
  process.exit(2);
}

async function fileFor(pathname) {
  let rel;
  try {
    rel = normalize(decodeURIComponent(pathname)).replace(/^([/\\])+/, '');
  } catch {
    return null;
  }
  const full = join(ROOT, rel);
  if (full !== ROOT && !full.startsWith(ROOT + sep)) return null;
  try {
    const s = await stat(full);
    return s.isFile() ? full : null;
  } catch {
    return null;
  }
}

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const found = await fileFor(url.pathname);
  if (!found && /^\/(assets|css|data|fonts|js)\//.test(url.pathname)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`Not found: ${url.pathname}`);
    return;
  }
  const file = found ?? join(ROOT, 'index.html');
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(body);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`Could not read ${file}: ${err.message}`);
  }
}).listen(port, host, () => {
  console.log(`zotune: http://${host}:${port}/`);
});
