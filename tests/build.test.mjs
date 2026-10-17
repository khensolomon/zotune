import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, copyFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { buildSite, replaceOnce, hashedPath } from '../scripts/build.mjs';
import { readMessage, plan, stampedVersion } from '../scripts/release-plan.mjs';
import { fromSemver } from '../scripts/version.mjs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('the build is complete: every file the page and the service worker name exists and parses', async () => {
  const out = await mkdtemp(join(tmpdir(), 'zotune-build-'));
  try {
    const { files, shell, version } = await buildSite(out);
    const html = await readFile(join(out, 'index.html'), 'utf8');
    assert.match(html, new RegExp(`data-version="${version.replaceAll('.', '\\.')}"`), 'the built page carries the version');
    assert.equal(version, fromSemver(JSON.parse(read('package.json')).version));
    // Files the page loads (script and link tags); <a> links are routes, not files.
    const refs = [...html.matchAll(/<(?:script|link)\b[^>]*?\b(?:src|href)="(\/[^"]+)"/g)].map((m) => m[1]);
    for (const ref of refs) assert.ok(existsSync(join(out, ref)), `index.html names ${ref}, which the build lacks`);
    for (const path of ['/js/main.', '/js/theme.', '/css/app.']) assert.ok(refs.some((r) => r.startsWith(path)), `index.html loads the built ${path}*`);
    assert.doesNotMatch(html, /"\/(js\/main|js\/theme|css\/app)\.(js|css)"/, 'no unbuilt file is loaded');

    for (const entry of shell.filter((p) => p !== '/')) assert.ok(existsSync(join(out, entry)), `sw.js caches ${entry}, which the build lacks`);
    const sw = await readFile(join(out, 'sw.js'), 'utf8');
    assert.doesNotMatch(sw, /zotune-unbuilt/);

    const main = files.find((f) => f.startsWith('/js/main.'));
    const worker = files.find((f) => f.startsWith('/js/workers/data.worker.'));
    const mainText = await readFile(join(out, main), 'utf8');
    assert.ok(mainText.includes(`workers/${worker.split('/').pop()}`), 'main loads the hashed worker');

    for (const f of files.filter((f) => f.endsWith('.js'))) {
      const copy = join(out, `check-${f.split('/').pop()}.mjs`);
      await copyFile(join(out, f), copy);
      const r = spawnSync(process.execPath, ['--check', copy], { encoding: 'utf8' });
      assert.equal(r.status, 0, `${f} does not parse: ${r.stderr}`);
    }
  } finally {
    await rm(out, { recursive: true, force: true });
  }
});

test('build rewrites fail unless they match exactly once', () => {
  assert.equal(replaceOnce('a "/js/main.js" b', '/js/main.js', '/js/main.1.js', 'x'), 'a "/js/main.1.js" b');
  assert.throws(() => replaceOnce('nothing', '/js/main.js', 'y', 'index.html'), /index\.html: expected "\/js\/main\.js" once, found it 0 times/);
  assert.throws(() => replaceOnce('a a', 'a', 'b', 'x'), /found it 2 times/);
  assert.match(hashedPath('/js/main.js', 'text'), /^\/js\/main\.[0-9a-f]{10}\.js$/);
  assert.notEqual(hashedPath('/js/main.js', 'one'), hashedPath('/js/main.js', 'two'));
});

test('release messages name a target, and only what is set up is released', () => {
  assert.deepEqual(readMessage('release: web'), { target: 'web', written: null });
  assert.deepEqual(readMessage('release:web 26.10.17.3\n\nmore'), { target: 'web', written: '26.10.17.3' });
  assert.deepEqual(readMessage('release: all v26.10.17.3'), { target: 'all', written: '26.10.17.3' });
  assert.throws(() => readMessage('Merge pull request #5'), /Not a release/);
  assert.throws(() => readMessage('release: phone'), /Unknown release target "phone"/);
  assert.deepEqual(plan('web', '26.10.17.3'), { web: true, desktop: false, version: '26.10.17.3', tag: 'v26.10.17.3' });
  assert.throws(() => plan('web', '26.10.17.3', '26.10.17.2'), /names 26\.10\.17\.2, but the stamped version is 26\.10\.17\.3/);
  assert.throws(() => plan('desktop', '26.10.17.3'), /desktop is not set up/);
  assert.throws(() => plan('all', '26.10.17.3'), /desktop is not set up/);
});

test('the release plan reads the version from package.json and refuses a half-stamped one', () => {
  const version = fromSemver(JSON.parse(read('package.json')).version);
  assert.equal(stampedVersion(read), version);
  const stale = (p) => (p === 'package-lock.json' ? read(p).replace(/"version": "[^"]*"/, '"version": "26.101.1"') : read(p));
  assert.throws(() => stampedVersion(stale), /package-lock\.json is not/);
});
