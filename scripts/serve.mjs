// Development server for app/ (Node standard library only).
// Serves existing files; any other path gets index.html so deep links work.
//
//   node scripts/serve.mjs [--port 5173] [--host 127.0.0.1] [--cite DIR] [--dist]
//
// --dist serves the production build in dist/web (made by npm run build)
// instead of the source in app/.
//
// --cite DIR serves a local checkout of the dictionary tables (the cite folder
// of laisiangtho/bible) at /cite/ and answers /data/source.json with a version
// that changes whenever a table file changes, so local edits show up on reload.

import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { readFile, stat, readdir } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import appVersionModule from '../desktop/app-version.js';

const { appVersion, stampHtml } = appVersionModule;

const DIST = process.argv.includes('--dist');
const ROOT = resolve(fileURLToPath(new URL(DIST ? '../dist/web' : '../app', import.meta.url)));
if (DIST && !existsSync(join(ROOT, 'index.html'))) {
  console.error(`No build in ${ROOT}. Run npm run build first.`);
  process.exit(2);
}
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

const citeArg = option('cite', null);
const CITE = citeArg ? resolve(citeArg) : null;

const port = Number(option('port', process.env.PORT ?? 5173));
const host = option('host', '127.0.0.1');
if (!Number.isInteger(port) || port <= 0 || port > 65535) {
  console.error(`Invalid port: ${option('port', '')}`);
  process.exit(2);
}

async function localSource() {
  const config = JSON.parse(await readFile(join(CITE, 'configuration.json'), 'utf8'));
  let latest = 0;
  const walk = async (dir) => {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) await walk(p);
      else if (e.name.endsWith('.tsv') || e.name === 'configuration.json') latest = Math.max(latest, (await stat(p)).mtimeMs);
    }
  };
  await walk(CITE);
  return { format: config.version, ref: `local-${Math.floor(latest)}`, base: '/cite/' };
}

async function fileFor(pathname, root = ROOT) {
  let rel;
  try {
    rel = normalize(decodeURIComponent(pathname)).replace(/^([/\\])+/, '');
  } catch {
    return null;
  }
  const full = join(root, rel);
  if (full !== root && !full.startsWith(root + sep)) return null;
  try {
    const s = await stat(full);
    return s.isFile() ? full : null;
  } catch {
    return null;
  }
}

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (CITE && url.pathname === '/data/source.json') {
    try {
      const body = JSON.stringify(await localSource());
      res.writeHead(200, { 'Content-Type': TYPES['.json'], 'Cache-Control': 'no-cache' });
      res.end(body);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`Could not read the tables in ${CITE}: ${err.message}`);
    }
    return;
  }
  if (CITE && url.pathname === '/cite/') {
    // Not a page: the app fetches table files from here. A plain list helps
    // checking that the folder is the right one.
    const names = [];
    const walk = async (dir, prefix) => {
      for (const e of await readdir(dir, { withFileTypes: true })) {
        if (e.isDirectory()) await walk(join(dir, e.name), `${prefix}${e.name}/`);
        else if (e.name.endsWith('.tsv') || e.name === 'configuration.json') names.push(prefix + e.name);
      }
    };
    await walk(CITE, '');
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.end(`Dictionary tables served from ${CITE}\n\n${names.sort().map((n) => `/cite/${n}`).join('\n')}\n`);
    return;
  }
  if (CITE && url.pathname.startsWith('/cite/')) {
    const f = await fileFor(url.pathname.slice('/cite'.length), CITE);
    if (!f) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`Not found: ${url.pathname}`);
      return;
    }
    res.writeHead(200, { 'Content-Type': f.endsWith('.json') ? TYPES['.json'] : 'text/tab-separated-values; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.end(await readFile(f));
    return;
  }
  const found = await fileFor(url.pathname);
  if (!found && /^\/(assets|css|data|fonts|js)\//.test(url.pathname)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`Not found: ${url.pathname}`);
    return;
  }
  const file = found ?? join(ROOT, 'index.html');
  try {
    let body = await readFile(file);
    // The source page leaves its version empty; it is filled in from
    // package.json on every request, so a version bump shows on reload.
    if (!DIST && file === join(ROOT, 'index.html')) body = stampHtml(body.toString('utf8'), appVersion(join(ROOT, '..')));
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(body);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`Could not read ${file}: ${err.message}`);
  }
}).listen(port, host, () => {
  console.log(`zotune: http://${host}:${port}/${DIST ? '  (build in dist/web)' : ''}${CITE ? `  (tables from ${CITE})` : ''}`);
});
