// Release version (Node standard library only).
//
//   node scripts/version.mjs                      show the next version
//   node scripts/version.mjs --note "…" [--note "…"] --apply
//
// Versions are vYY.MM.DD.N: the release date and N, the number of the release
// on that day. app/version.json holds the version; package.json holds the same
// version as YY.MMDD.N, valid semver that orders correctly; CHANGELOG.md gets a
// section for it with the notes given; app/index.html carries it in
// <meta name="application-name" data-version="…">, so the page source shows
// which version a server delivered. Without --apply nothing is written.

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const FILES = {
  version: join(ROOT, 'app/version.json'),
  pkg: join(ROOT, 'package.json'),
  lock: join(ROOT, 'package-lock.json'),
  changelog: join(ROOT, 'CHANGELOG.md'),
  html: join(ROOT, 'app/index.html')
};
const VERSIONS_HEADING = '## Versions';
export const VERSION_META = /<meta name="application-name" content="zotune\.com" data-version="([^"]*)">/g;

/** index.html with the version in its application-name meta; fails unless there is exactly one. */
export function stampHtml(html, version) {
  const found = html.match(VERSION_META) ?? [];
  if (found.length !== 1) {
    throw new Error(`app/index.html must hold exactly one <meta name="application-name" content="zotune.com" data-version="…">; found ${found.length}.`);
  }
  return html.replace(VERSION_META, `<meta name="application-name" content="zotune.com" data-version="${version}">`);
}

function fail(message) {
  console.error(`version: ${message}`);
  process.exit(1);
}

/** 26.10.16.1 → 26.1016.1 */
export function toSemver(version) {
  const m = /^(\d{2})\.(\d{2})\.(\d{2})\.(\d+)$/.exec(version);
  if (!m) throw new Error(`Not a version of the form YY.MM.DD.N: ${version}`);
  return `${Number(m[1])}.${Number(m[2] + m[3])}.${Number(m[4])}`;
}

/** The version after `current` on `date` (a Date, local time). */
export function nextVersion(current, date) {
  const p = (n) => String(n).padStart(2, '0');
  const today = `${p(date.getFullYear() % 100)}.${p(date.getMonth() + 1)}.${p(date.getDate())}`;
  const m = /^(\d{2}\.\d{2}\.\d{2})\.(\d+)$/.exec(current);
  if (!m) throw new Error(`app/version.json holds an invalid version: ${current}`);
  if (m[1] > today) throw new Error(`app/version.json (${current}) is later than today (${today}).`);
  return m[1] === today ? `${today}.${Number(m[2]) + 1}` : `${today}.1`;
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const notes = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--note') {
      const text = args[i + 1];
      if (!text || text.startsWith('--')) fail('--note needs a text.');
      notes.push(text.trim());
      i++;
    } else if (args[i] !== '--apply') fail(`Unknown argument: ${args[i]}`);
  }

  const current = JSON.parse(await readFile(FILES.version, 'utf8'));
  const now = new Date();
  const version = nextVersion(current.version, now);
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const semver = toSemver(version);

  console.log(`current  v${current.version}`);
  console.log(`next     v${version}  (package.json ${semver}, ${date})`);
  if (!apply) {
    console.log('Dry run. Add --note "…" for each change and --apply to write.');
    return;
  }
  if (!notes.length) fail('Give at least one --note describing the release.');

  const changelog = await readFile(FILES.changelog, 'utf8');
  const at = changelog.indexOf(`${VERSIONS_HEADING}\n`);
  if (at < 0) fail(`CHANGELOG.md has no "${VERSIONS_HEADING}" heading.`);
  const insertAt = at + VERSIONS_HEADING.length + 1;
  const section = `\n### v${version} — ${date}\n\n${notes.map((n) => `- ${n}`).join('\n')}\n`;

  const pkg = JSON.parse(await readFile(FILES.pkg, 'utf8'));
  pkg.version = semver;
  const lock = JSON.parse(await readFile(FILES.lock, 'utf8'));
  lock.version = semver;
  if (lock.packages?.['']) lock.packages[''].version = semver;
  const html = stampHtml(await readFile(FILES.html, 'utf8'), version);

  await writeFile(FILES.version, `${JSON.stringify({ version, date }, null, 2)}\n`);
  await writeFile(FILES.pkg, `${JSON.stringify(pkg, null, 2)}\n`);
  await writeFile(FILES.lock, `${JSON.stringify(lock, null, 2)}\n`);
  await writeFile(FILES.changelog, changelog.slice(0, insertAt) + section + changelog.slice(insertAt));
  await writeFile(FILES.html, html);
  console.log(`Wrote v${version} to app/version.json, app/index.html, package.json, package-lock.json and CHANGELOG.md.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => fail(err.message));
}
