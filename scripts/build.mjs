// Production build of the web app. esbuild is the only dependency.
//
//   node scripts/build.mjs [--out DIR]
//
// Writes the site to dist/web (or DIR), replacing what is there:
//   - js/main.<hash>.js and js/workers/data.worker.<hash>.js: the modules,
//     bundled and minified; the worker reference inside main is rewritten to
//     the hashed name.
//   - js/theme.<hash>.js and css/app.<hash>.css: minified.
//   - index.html pointing at the hashed files and carrying the version from
//     package.json in its application-name meta.
//   - sw.js with this build's cache name and file list.
//   - _headers: long-lived caching for the hashed files (read by Cloudflare
//     and Netlify; an ordinary file elsewhere).
//   - assets/, content/, fonts/, data/ and manifest.webmanifest as they are.
//
// Every rewrite must match exactly once; anything else stops the build with
// the reason, so a change in the source cannot produce a site that half works.

import { build, transform } from 'esbuild';
import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import appVersionModule from '../desktop/app-version.js';

const { appVersion, stampHtml } = appVersionModule;

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const APP = join(ROOT, 'app');
const TARGET = 'es2022';
const COPY = ['assets', 'content', 'fonts', 'data', 'manifest.webmanifest'];

/** Replaces the single occurrence of `find`; fails when there is not exactly one. */
export function replaceOnce(text, find, replacement, where) {
  const parts = text.split(find);
  if (parts.length !== 2) throw new Error(`${where}: expected "${find}" once, found it ${parts.length - 1} times.`);
  return parts.join(replacement);
}

const digest = (text) => createHash('sha256').update(text).digest('hex').slice(0, 10);

/** /js/main.js + content → /js/main.<hash>.js */
export function hashedPath(path, text) {
  return path.replace(/\.(\w+)$/, `.${digest(text)}.$1`);
}

async function bundle(entry) {
  const result = await build({
    entryPoints: [join(APP, entry)],
    bundle: true,
    format: 'esm',
    minify: true,
    target: TARGET,
    legalComments: 'none',
    write: false,
    logLevel: 'silent'
  });
  return result.outputFiles[0].text;
}

async function minify(file, loader) {
  const source = await readFile(join(APP, file), 'utf8');
  return (await transform(source, { loader, minify: true, target: loader === 'js' ? TARGET : undefined, legalComments: 'none' })).code;
}

async function filesIn(dir, test) {
  const names = await readdir(join(APP, dir));
  return names.filter(test).sort().map((n) => `/${dir}/${n}`);
}

function outputDir(args) {
  const i = args.indexOf('--out');
  if (i >= 0 && !args[i + 1]) throw new Error('--out needs a directory.');
  const out = resolve(i >= 0 ? args[i + 1] : join(ROOT, 'dist', 'web'));
  // The output is deleted before each build: refuse anything that holds source.
  for (const kept of [ROOT, APP, join(ROOT, 'scripts'), join(ROOT, 'tests'), join(ROOT, 'desktop')]) {
    if (out === kept || kept.startsWith(out + sep) || out.startsWith(APP + sep)) {
      throw new Error(`Refusing to build into ${out}: it would delete source files.`);
    }
  }
  return out;
}

/** Builds the site into `out` and returns what was written. */
export async function buildSite(out) {
  const files = new Map();

  const worker = await bundle('js/workers/data.worker.js');
  const workerPath = hashedPath('/js/workers/data.worker.js', worker);
  files.set(workerPath, worker);

  const main = replaceOnce(
    await bundle('js/main.js'),
    'workers/data.worker.js',
    `workers/${basename(workerPath)}`,
    'js/main.js bundle (the data worker reference)'
  );
  const mainPath = hashedPath('/js/main.js', main);
  files.set(mainPath, main);

  const theme = await minify('js/theme.js', 'js');
  const themePath = hashedPath('/js/theme.js', theme);
  files.set(themePath, theme);

  const css = await minify('css/app.css', 'css');
  const cssPath = hashedPath('/css/app.css', css);
  files.set(cssPath, css);

  const version = appVersion(ROOT);
  let html = stampHtml(await readFile(join(APP, 'index.html'), 'utf8'), version);
  html = replaceOnce(html, 'src="/js/theme.js"', `src="${themePath}"`, 'app/index.html');
  html = replaceOnce(html, 'href="/css/app.css"', `href="${cssPath}"`, 'app/index.html');
  html = replaceOnce(html, 'src="/js/main.js"', `src="${mainPath}"`, 'app/index.html');
  files.set('/index.html', html);

  const shell = [
    '/',
    '/index.html',
    '/manifest.webmanifest',
    cssPath,
    themePath,
    mainPath,
    workerPath,
    ...(await filesIn('fonts', (n) => n.endsWith('.woff2'))),
    ...(await filesIn('assets', (n) => n.endsWith('.svg'))),
    ...(await filesIn('data', (n) => n.endsWith('.json'))),
    ...(await filesIn('content', (n) => n.endsWith('.md')))
  ];
  const fingerprint = digest([html, main, worker, theme, css].join('\0'));
  let sw = await readFile(join(APP, 'sw.js'), 'utf8');
  sw = replaceOnce(sw, "const CACHE = 'zotune-unbuilt';", `const CACHE = 'zotune-${fingerprint}';`, 'app/sw.js');
  sw = replaceOnce(sw, "const SHELL = ['/', '/index.html'];", `const SHELL = ${JSON.stringify(shell)};`, 'app/sw.js');
  files.set('/sw.js', (await transform(sw, { loader: 'js', minify: true, target: TARGET })).code);

  files.set(
    '/_headers',
    ['/js/*', '/css/*'].map((p) => `${p}\n  Cache-Control: public, max-age=31536000, immutable\n`).join('')
  );

  await rm(out, { recursive: true, force: true });
  for (const name of COPY) await cp(join(APP, name), join(out, name), { recursive: true });
  for (const [path, text] of files) {
    const target = join(out, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, text);
  }
  return { out, files: [...files.keys()], shell, version };
}

async function main() {
  const out = outputDir(process.argv.slice(2));
  const { files } = await buildSite(out);
  const where = relative(process.cwd(), out) || '.';
  for (const f of files) {
    const size = Buffer.byteLength(await readFile(join(out, f)));
    console.log(`${(size / 1024).toFixed(1).padStart(7)} KB  ${f}`);
  }
  console.log(`Built into ${where}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((err) => {
    console.error(`build: ${err.message}`);
    process.exit(1);
  });
}
