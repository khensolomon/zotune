import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { toSemver, fromSemver, releaseDate, nextVersion } from '../scripts/version.mjs';
import appVersionModule from '../desktop/app-version.js';

const { stampHtml, appVersion } = appVersionModule;
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('package.json holds the version; the lock file and the changelog follow it', () => {
  const semver = JSON.parse(read('package.json')).version;
  const version = fromSemver(semver);
  assert.equal(appVersion(new URL('..', import.meta.url).pathname), version);
  const lock = JSON.parse(read('package-lock.json'));
  assert.equal(lock.version, semver);
  assert.equal(lock.packages[''].version, semver);
  assert.match(read('CHANGELOG.md'), new RegExp(`^### v${version.replaceAll('.', '\\.')} — ${releaseDate(version)}$`, 'm'));
  assert.equal(existsSync(new URL('../app/version.json', import.meta.url)), false, 'no second copy of the version');
});

test('the source page leaves its version empty for whoever serves it', () => {
  const html = read('app/index.html');
  assert.equal(html.split('<meta name="application-name" content="zotune.com" data-version="">').length - 1, 1);
  assert.match(stampHtml(html, '26.10.17.5'), /data-version="26\.10\.17\.5"/);
  assert.throws(() => stampHtml('<head></head>', '26.10.17.5'), /found 0/);
  assert.throws(() => stampHtml(stampHtml(html, '26.10.17.5'), '26.10.17.6'), /found 0/, 'a page that already carries a version is not stamped twice');
});

test('versions convert both ways, are numbered per day and order correctly as semver', () => {
  assert.equal(toSemver('26.10.16.1'), '26.1016.1');
  assert.equal(toSemver('26.01.05.12'), '26.105.12');
  assert.equal(fromSemver('26.1016.1'), '26.10.16.1');
  assert.equal(fromSemver('26.105.12'), '26.01.05.12');
  for (const v of ['26.01.01.1', '26.10.17.4', '27.12.31.9']) assert.equal(fromSemver(toSemver(v)), v);
  assert.throws(() => fromSemver('26.1340.1'), /does not encode a date/);
  assert.throws(() => fromSemver('1.2'), /YY\.MMDD\.N/);
  assert.equal(releaseDate('26.10.17.4'), '2026-10-17');
  assert.equal(nextVersion('26.10.16.1', new Date(2026, 9, 16)), '26.10.16.2');
  assert.equal(nextVersion('26.10.16.4', new Date(2026, 9, 17)), '26.10.17.1');
  assert.throws(() => nextVersion('26.10.18.1', new Date(2026, 9, 17)), /later than today/);
  assert.throws(() => toSemver('v1.2'), /YY\.MM\.DD\.N/);
});
