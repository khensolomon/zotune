// Reads what a push to master asks to release (Node standard library only).
//
//   node scripts/release-plan.mjs                     the last commit's message
//   node scripts/release-plan.mjs --message "release: web"
//   node scripts/release-plan.mjs --target web        as the Actions button does
//
// The first line of the message must start with "release:" followed by web,
// desktop or all ("release:web" and "release: web" both count). A version
// written after the target (release: web 26.10.17.3) must be the stamped one.
// The version must be the same in app/version.json, package.json,
// package-lock.json, app/index.html and CHANGELOG.md.
//
// Prints the plan; inside GitHub Actions it is also written to $GITHUB_OUTPUT
// as web, desktop, version and tag. Anything wrong stops with the reason.

import { readFileSync, appendFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { toSemver, VERSION_META } from './version.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const TARGETS = ['web', 'desktop', 'all'];
// Targets this repository can build. Desktop packaging is not set up yet.
const AVAILABLE = ['web'];

/** The target named by a commit message, and the version written after it, if any. */
export function readMessage(message) {
  const line = String(message ?? '').split('\n')[0].trim();
  const m = /^release:\s*([a-z]+)(.*)$/.exec(line);
  if (!m) throw new Error(`Not a release: the first line must start with "release: web", "release: desktop" or "release: all"; it is "${line}".`);
  const [, target, rest] = m;
  if (!TARGETS.includes(target)) throw new Error(`Unknown release target "${target}"; use web, desktop or all.`);
  const written = /\bv?(\d{2}\.\d{2}\.\d{2}\.\d+)\b/.exec(rest);
  return { target, written: written ? written[1] : null };
}

/** The stamped version, after checking that every file agrees. */
export function stampedVersion(read) {
  const { version } = JSON.parse(read('app/version.json'));
  const problems = [];
  const semver = toSemver(version);
  if (JSON.parse(read('package.json')).version !== semver) problems.push(`package.json is not ${semver}`);
  const lock = JSON.parse(read('package-lock.json'));
  if (lock.version !== semver || (lock.packages?.[''] && lock.packages[''].version !== semver)) problems.push(`package-lock.json is not ${semver}`);
  const metas = [...read('app/index.html').matchAll(VERSION_META)];
  if (metas.length !== 1 || metas[0][1] !== version) problems.push('app/index.html does not carry it in its application-name meta');
  if (!read('CHANGELOG.md').includes(`\n### v${version} — `)) problems.push('CHANGELOG.md has no section for it');
  if (problems.length) throw new Error(`app/version.json says ${version}, but ${problems.join('; ')}. Stamp with: node scripts/version.mjs --note "…" --apply`);
  return version;
}

/** What to release for a target and the stamped version. */
export function plan(target, version, written = null) {
  if (written && written !== version) throw new Error(`The message names ${written}, but the stamped version is ${version}.`);
  const wanted = target === 'all' ? ['web', 'desktop'] : [target];
  const missing = wanted.filter((t) => !AVAILABLE.includes(t));
  if (missing.length) throw new Error(`Releasing ${missing.join(' and ')} is not set up in this repository yet; available: ${AVAILABLE.map((t) => `release: ${t}`).join(', ')}.`);
  return { web: wanted.includes('web'), desktop: wanted.includes('desktop'), version, tag: `v${version}` };
}

function main() {
  const args = process.argv.slice(2);
  const value = (name) => {
    const i = args.indexOf(`--${name}`);
    if (i < 0) return undefined;
    if (!args[i + 1]) throw new Error(`--${name} needs a value.`);
    return args[i + 1];
  };
  const read = (p) => readFileSync(join(ROOT, p), 'utf8');

  let target;
  let written = null;
  const forced = value('target');
  if (forced !== undefined) {
    if (!TARGETS.includes(forced)) throw new Error(`Unknown release target "${forced}"; use web, desktop or all.`);
    target = forced;
  } else {
    const message = value('message') ?? process.env.RELEASE_MESSAGE ?? execFileSync('git', ['log', '-1', '--format=%B'], { cwd: ROOT, encoding: 'utf8' });
    ({ target, written } = readMessage(message));
  }
  const result = plan(target, stampedVersion(read), written);

  console.log(`release ${target}: web=${result.web} desktop=${result.desktop} version=${result.version} tag=${result.tag}`);
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(result).map(([k, v]) => `${k}=${v}\n`).join(''));
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    main();
  } catch (err) {
    console.error(`release-plan: ${err.message}`);
    process.exit(1);
  }
}
