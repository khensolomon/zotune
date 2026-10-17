import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { toSemver, nextVersion, stampHtml } from '../scripts/version.mjs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('the version is the same in every place it is written', () => {
  const { version, date } = JSON.parse(read('app/version.json'));
  assert.match(version, /^\d{2}\.\d{2}\.\d{2}\.\d+$/);
  assert.match(date, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(version.slice(0, 8), date.slice(2).replaceAll('-', '.'), 'the version starts with its date');
  assert.equal(JSON.parse(read('package.json')).version, toSemver(version));
  const lock = JSON.parse(read('package-lock.json'));
  assert.equal(lock.version, toSemver(version));
  const metas = [...read('app/index.html').matchAll(/<meta name="application-name" content="zotune\.com" data-version="([^"]*)">/g)];
  assert.equal(metas.length, 1, 'index.html has one application-name meta');
  assert.equal(metas[0][1], version, 'index.html carries the version');
  assert.match(read('CHANGELOG.md'), new RegExp(`^### v${version.replaceAll('.', '\\.')} — ${date}$`, 'm'));
});

test('versions are numbered per day and order correctly as semver', () => {
  assert.equal(toSemver('26.10.16.1'), '26.1016.1');
  assert.equal(toSemver('26.01.05.12'), '26.105.12');
  assert.equal(nextVersion('26.10.16.1', new Date(2026, 9, 16)), '26.10.16.2');
  assert.equal(nextVersion('26.10.16.4', new Date(2026, 9, 17)), '26.10.17.1');
  assert.throws(() => nextVersion('26.10.18.1', new Date(2026, 9, 17)), /later than today/);
  assert.throws(() => toSemver('v1.2'), /YY\.MM\.DD\.N/);
});

test('the version meta in index.html is replaced, and a missing or doubled one fails', () => {
  const meta = (v) => `<meta name="application-name" content="zotune.com" data-version="${v}">`;
  assert.equal(stampHtml(`<head>${meta('26.10.16.2')}</head>`, '26.10.17.1'), `<head>${meta('26.10.17.1')}</head>`);
  assert.throws(() => stampHtml('<head></head>', '26.10.17.1'), /found 0/);
  assert.throws(() => stampHtml(meta('a') + meta('b'), '26.10.17.1'), /found 2/);
});
