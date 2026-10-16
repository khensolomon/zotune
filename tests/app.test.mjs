import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { matchKey, markedParts } from '../app/js/text.js';
import { buildIndex, search, resolve, neighbours } from '../app/js/search-index.js';
import { route, match } from '../app/js/router.js';

const require = createRequire(import.meta.url);
const { deepLinkPath } = require('../desktop/links.js');

const docs = [
  { id: 'w1', word: 'it', gloss: 'love', keys: [['it', 'word', 0], ['love', 'english', 0]] },
  { id: 'w2', word: 'itna', gloss: 'love, affection', keys: [['itna', 'word', 0], ['it na', 'spelling', 0], ['love', 'english', 0.1], ['affection', 'english', 0.2]] },
  { id: 'w5', word: 'Pasian', gloss: 'God', keys: [['Pasian', 'word', 0], ['God', 'english', 0]] },
  { id: 'w6', word: 'pasian', gloss: 'worship', keys: [['pasian', 'word', 0]] }
];

test('matchKey joins split and hyphenated spellings', () => {
  assert.equal(matchKey('amaute'), 'amaute');
  assert.equal(matchKey('amau te'), 'amaute');
  assert.equal(matchKey(' Amau-te '), 'amaute');
  assert.equal(matchKey('it·na'), 'itna');
  assert.equal(matchKey('café'), 'cafe');
  assert.equal(matchKey(''), '');
});

test('markedParts separates Zolai mentions and links', () => {
  assert.deepEqual(markedParts('from <it>, and {na} here'), [
    { kind: 'text', text: 'from ' },
    { kind: 'link', text: 'it' },
    { kind: 'text', text: ', and ' },
    { kind: 'zo', text: 'na' },
    { kind: 'text', text: ' here' }
  ]);
  assert.deepEqual(markedParts('<a/b>').map((p) => p.text), ['a', '/', 'b']);
});

test('search finds Zolai, spellings and English from one input', () => {
  const index = buildIndex(docs);
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
  const hits = search(buildIndex(docs), 'it');
  assert.equal(hits[0].word, 'it');
  assert.ok(hits.some((h) => h.word === 'itna'));
});

test('resolve prefers the spelling with the same case', () => {
  const index = buildIndex(docs);
  assert.equal(resolve(index, 'Pasian'), 'w5');
  assert.equal(resolve(index, 'pasian'), 'w6');
  assert.equal(resolve(index, 'nothing like this'), null);
});

test('neighbours follow alphabetical order', () => {
  const n = neighbours(buildIndex(docs), 'w2');
  assert.equal(n.prev, 'it');
  assert.ok(['Pasian', 'pasian'].includes(n.next));
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
