// Release version (Node standard library only).
//
//   node scripts/version.mjs                      show the next version
//   node scripts/version.mjs --note "…" [--note "…"] --apply
//
// Versions are vYY.MM.DD.N: the release date and N, the number of the release
// on that day. package.json is the only place the version is written, as
// YY.MMDD.N (valid semver that orders correctly); package-lock.json follows it
// and CHANGELOG.md gets a section with the notes given. The page receives the
// version when it is served or built (desktop/app-version.js). Without
// --apply nothing is written.

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import appVersionModule from '../desktop/app-version.js';

export const { toSemver, fromSemver, releaseDate } = appVersionModule;

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const FILES = {
  pkg: join(ROOT, 'package.json'),
  lock: join(ROOT, 'package-lock.json'),
  changelog: join(ROOT, 'CHANGELOG.md')
};
const VERSIONS_HEADING = '## Versions';

function fail(message) {
  console.error(`version: ${message}`);
  process.exit(1);
}

/** The version after `current` on `date` (a Date, local time). */
export function nextVersion(current, date) {
  const p = (n) => String(n).padStart(2, '0');
  const today = `${p(date.getFullYear() % 100)}.${p(date.getMonth() + 1)}.${p(date.getDate())}`;
  const m = /^(\d{2}\.\d{2}\.\d{2})\.(\d+)$/.exec(current);
  if (!m) throw new Error(`Invalid current version: ${current}`);
  if (m[1] > today) throw new Error(`The current version ${current} is later than today (${today}).`);
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

  const pkg = JSON.parse(await readFile(FILES.pkg, 'utf8'));
  const current = { version: fromSemver(pkg.version) };
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

  pkg.version = semver;
  const lock = JSON.parse(await readFile(FILES.lock, 'utf8'));
  lock.version = semver;
  if (lock.packages?.['']) lock.packages[''].version = semver;

  await writeFile(FILES.pkg, `${JSON.stringify(pkg, null, 2)}\n`);
  await writeFile(FILES.lock, `${JSON.stringify(lock, null, 2)}\n`);
  await writeFile(FILES.changelog, changelog.slice(0, insertAt) + section + changelog.slice(insertAt));
  console.log(`Wrote v${version} to package.json, package-lock.json and CHANGELOG.md.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => fail(err.message));
}
