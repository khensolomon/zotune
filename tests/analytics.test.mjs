import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { modeFor, choiceFrom, reportableTerm, placeholderPath, MEASUREMENT_ID } from '../app/js/analytics.js';
import { classify } from '../app/js/query.js';

test('statistics are sent on the web over https, printed locally, and off in the desktop app', () => {
  assert.equal(modeFor({ protocol: 'https:', hostname: 'zotune.com', desktop: false }), 'live');
  assert.equal(modeFor({ protocol: 'https:', hostname: 'zotune.com', desktop: true }), 'off');
  assert.equal(modeFor({ protocol: 'app:', hostname: 'zotune', desktop: true }), 'off');
  assert.equal(modeFor({ protocol: 'http:', hostname: '127.0.0.1', desktop: false }), 'preview');
  assert.equal(modeFor({ protocol: 'http:', hostname: 'localhost', desktop: false, search: '?analytics=send' }), 'debug');
  assert.equal(modeFor({ protocol: 'http:', hostname: 'example.com', desktop: false }), 'off');
});

test('nothing is assumed: no choice means ask, and Global Privacy Control means off', () => {
  assert.equal(choiceFrom(null, false), null);
  assert.equal(choiceFrom('granted', false), 'granted');
  assert.equal(choiceFrom('denied', false), 'denied');
  assert.equal(choiceFrom('yes', false), null);
  assert.equal(choiceFrom('granted', true), 'denied');
});

test('only a single short word is reported as a search term', () => {
  assert.equal(reportableTerm(classify('itna')), 'itna');
  assert.equal(reportableTerm(classify('Pasian')), 'Pasian');
  assert.equal(reportableTerm(classify('itna lungdamna')), null);
  assert.equal(reportableTerm(classify('Call me at home tonight.')), null);
  assert.equal(reportableTerm(classify('a'.repeat(33))), null);
  assert.equal(reportableTerm(classify('someone@example.com')), null);
  assert.equal(reportableTerm(classify('12')), null);
});

test('results that are not headwords are reported under a placeholder path', () => {
  assert.equal(placeholderPath(classify('xyzzy')), '/definition/(not found)');
  assert.equal(placeholderPath(classify('itna lungdamna')), '/definition/(phrase)');
  assert.equal(placeholderPath(classify('Call me at home tonight please.')), '/definition/(sentence)');
  assert.equal(placeholderPath(classify('12')), '/definition/(number)');
  assert.equal(placeholderPath(classify('https://example.com')), '/definition/(other)');
});

test('the security policy allows Google Analytics and still no inline script', () => {
  const html = readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
  const csp = /http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(html)[1];
  const directive = (name) => csp.split(';').map((d) => d.trim()).find((d) => d.startsWith(`${name} `)) ?? '';
  assert.match(directive('script-src'), /https:\/\/www\.googletagmanager\.com/);
  assert.doesNotMatch(directive('script-src'), /unsafe-inline/);
  assert.match(directive('connect-src'), /https:\/\/\*\.google-analytics\.com/);
  assert.match(directive('connect-src'), /https:\/\/raw\.githubusercontent\.com/);
  assert.doesNotMatch(html, /<script>(?!<\/script>)/, 'no inline script blocks');
  assert.match(MEASUREMENT_ID, /^G-[A-Z0-9]+$/);
});
