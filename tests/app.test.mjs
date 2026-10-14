import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { matchKey, markedParts } from '../app/js/text.js';
import { buildIndex, search, resolve, neighbours } from '../app/js/search-index.js';
import { route, match } from '../app/js/router.js';

const require = createRequire(import.meta.url);
const { deepLinkPath } = require('../desktop/links.js');
const pack = JSON.parse(readFileSync(new URL('../app/data/sample.json', import.meta.url), 'utf8'));

test('matchKey joins split and hyphenated spellings', () => {
  assert.equal(matchKey('amaute'), 'amaute');
  assert.equal(matchKey('amau te'), 'amaute');
  assert.equal(matchKey(' Amau-te '), 'amaute');
  assert.equal(matchKey('it·na'), 'itna');
  assert.equal(matchKey('café'), 'cafe');
  assert.equal(matchKey(''), '');
});

test('markedParts separates Zolai marks and links', () => {
  assert.deepEqual(markedParts('from <it>, and {na} here'), [
    { kind: 'text', text: 'from ' },
    { kind: 'link', text: 'it' },
    { kind: 'text', text: ', and ' },
    { kind: 'zo', text: 'na' },
    { kind: 'text', text: ' here' }
  ]);
  assert.deepEqual(
    markedParts('<a/b>').map((p) => p.text),
    ['a', '/', 'b']
  );
});

test('sample pack is well formed with unique ids', () => {
  const ids = new Set();
  for (const e of pack.entries) {
    assert.ok(e.id && e.word && Array.isArray(e.senses), `entry ${e.id}`);
    assert.ok(!ids.has(e.id), `duplicate entry id ${e.id}`);
    ids.add(e.id);
    for (const s of e.senses) {
      assert.ok(!ids.has(s.id), `duplicate sense id ${s.id}`);
      ids.add(s.id);
    }
  }
});

test('search finds Zolai, spellings and English from one input', () => {
  const index = buildIndex(pack.entries);
  assert.equal(search(index, 'itna')[0].word, 'itna');
  assert.equal(search(index, 'it na')[0].word, 'itna');
  assert.equal(search(index, 'IT-NA')[0].word, 'itna');
  const english = search(index, 'affection');
  assert.equal(english[0].word, 'itna');
  assert.equal(english[0].side, 'english');
  assert.deepEqual(search(index, '   '), []);
  assert.deepEqual(search(index, 'zzzz'), []);
});

test('exact headword outranks a longer prefix match', () => {
  const index = buildIndex(pack.entries);
  const hits = search(index, 'it');
  assert.equal(hits[0].word, 'it');
  assert.ok(hits.some((h) => h.word === 'itna'));
});

test('resolve and neighbours', () => {
  const index = buildIndex(pack.entries);
  assert.equal(resolve(index, 'hatred').word, 'huatna');
  assert.equal(resolve(index, 'nothing like this'), null);
  const n = neighbours(index, 'w1');
  assert.equal(n.prev, 'it');
  assert.equal(n.next, 'lungdamna');
});

test('router matches deep links', () => {
  route('/definition', 'empty');
  route('/definition/:word', 'word');
  assert.deepEqual(match('/definition/it%20na'), { view: 'word', params: { word: 'it na' } });
  assert.deepEqual(match('/definition/'), { view: 'empty', params: {} });
  assert.equal(match('/nowhere'), null);
});

test('desktop deep links map to app paths', () => {
  assert.equal(deepLinkPath('zotune://definition/itna'), '/definition/itna');
  assert.equal(deepLinkPath('zotune://definition/it%20na'), '/definition/it%20na');
  assert.equal(deepLinkPath('zotune://about/'), '/about');
  assert.equal(deepLinkPath('https://example.com/'), null);
  assert.equal(deepLinkPath('not a url'), null);
});
