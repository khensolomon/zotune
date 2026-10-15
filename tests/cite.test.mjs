import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import * as cite from '../app/js/cite.js';
import { buildIndex, search, resolve } from '../app/js/search-index.js';

const FIXTURE = new URL('./fixtures/cite/', import.meta.url).pathname;
const books = JSON.parse(readFileSync(new URL('../app/data/books.json', import.meta.url), 'utf8')).book;

function load(dir, tiers = ['core', 'examples']) {
  const config = JSON.parse(readFileSync(join(dir, 'configuration.json'), 'utf8'));
  cite.checkConfiguration(config, 4);
  const read = (tier) => Object.fromEntries(cite.TIERS[tier].filter((p) => p.endsWith('.tsv')).map((p) => [p, cite.parseTable(readFileSync(join(dir, p), 'utf8'), p, config)]));
  const model = cite.buildModel(config, read('core'));
  if (tiers.includes('examples')) cite.addExamples(model, read('examples'));
  return model;
}

test('a configuration of another format version stops with a clear message', () => {
  const config = JSON.parse(readFileSync(join(FIXTURE, 'configuration.json'), 'utf8'));
  assert.throws(() => cite.checkConfiguration({ ...config, version: 5 }, 4), /format 5; this app reads format 4/);
  assert.throws(() => cite.checkConfiguration({}, 4), /not a cite configuration/);
});

test('a header that differs from the configuration stops the reader', () => {
  const config = JSON.parse(readFileSync(join(FIXTURE, 'configuration.json'), 'utf8'));
  assert.throws(() => cite.parseTable('id\tspelling\n', 'word.tsv', config), /word\.tsv: the columns are "id, spelling"/);
  assert.throws(() => cite.parseTable('id\tspelling\tstatus\nw1\tit\n', 'word.tsv', config), /word\.tsv, line 2: 2 values, expected 3/);
  assert.throws(() => cite.parseTable('x\n', 'other.tsv', config), /No table is known/);
});

test('entry assembles meanings, relations, sources and examples', () => {
  const model = load(FIXTURE);
  const e = cite.entry(model, 'w2', { books });
  assert.equal(e.word, 'itna');
  assert.deepEqual(e.english, ['love', 'affection', 'charity']);
  assert.equal(e.senses.length, 2);
  const [one, two] = e.senses;
  assert.equal(one.key, 'itna.1');
  assert.equal(one.typeName, 'noun');
  assert.equal(one.statusName, 'draft');
  assert.deepEqual(one.bible, [`${books['65']} 1:2`]);
  assert.deepEqual(one.relations.map((r) => [r.label, r.targets.map((t) => t.word)]), [
    ['Built from', ['it']],
    ['Opposite', ['huatna']]
  ]);
  assert.deepEqual(e.alsoWritten, ['it na'], 'variants are shown once for the word');
  assert.equal(e.construction.kind, 'base');
  assert.deepEqual(e.construction.parts.map((p) => [p.text, p.role]), [['it', 'word'], ['na', 'suffix']]);
  assert.equal(one.examples.length, 1);
  assert.deepEqual(one.examples[0].parts, [
    { text: 'Pasian ', mark: false },
    { text: 'itna', mark: true },
    { text: ' in ka lungsim a dim hi', mark: false }
  ]);
  assert.equal(one.examples[0].en, 'The love of God fills my heart');
  assert.deepEqual(two.relations[0].targets[0], { word: 'itna', number: 1, sense: 's2' });
  assert.equal(two.statusName, 'low');
});

test('retired rows are left out and variants lead to the main word', () => {
  const model = load(FIXTURE, ['core']);
  assert.equal(cite.entry(model, 'w7'), null);
  const v = cite.entry(model, 'w4', { books });
  assert.equal(v.word, 'itna');
  assert.deepEqual(v.redirectFrom, ['it na']);
  assert.equal(v.senses[0].examples, null, 'examples are null until that tier is loaded');
  const see = cite.entry(model, 'w8', { books });
  assert.equal(see.word, 'Be-ersheba');
  assert.equal(see.senses[0].origin, 'Hebrew, beer sheba');
});

test('words not in the lexicon are read as parts', () => {
  const model = load(FIXTURE, ['core']);
  const readings = cite.analyse(model, 'itnana');
  assert.ok(readings.length > 0);
  assert.deepEqual(readings[0].map((p) => [p.text, p.role]), [['itna', 'word'], ['na', 'suffix']]);
  assert.deepEqual(cite.analyse(model, 'xy'), []);
  const page = cite.examplesFor(model, 's2', books, 10, 0);
  assert.equal(page, null, 'no examples before that tier is loaded');
});

test('English words are reduced to their roots', () => {
  assert.ok(cite.englishStems('activities').includes('activity'));
  assert.ok(cite.englishStems('lovings').includes('loving'));
  assert.ok(cite.englishStems('running').includes('run'));
  const model = load(FIXTURE, ['core']);
  const terms = new Set(['love', 'hatred', 'hate']);
  const roots = cite.englishRoots(model, 'Lovings', (w) => terms.has(w));
  assert.deepEqual(roots.map((r) => [r.word, r.via]), [['love', 'ending']]);
  assert.deepEqual(cite.englishRoots(model, 'loved', (w) => terms.has(w)).map((r) => r.word), ['love']);
  assert.deepEqual(cite.englishRoots(model, 'itna?', () => true), [], 'only plain English words are reduced');
});

test('search documents cover headwords, variants, redirects, terms and links', () => {
  const model = load(FIXTURE, ['core']);
  const index = buildIndex(cite.searchDocs(model));
  assert.equal(search(index, 'it na')[0].word, 'itna');
  assert.equal(search(index, 'ersheba')[0].word, 'Be-ersheba');
  assert.equal(search(index, 'fondness')[0].word, 'itna');
  assert.equal(search(index, 'old').length, 0, 'retired words are not searchable');
  assert.equal(resolve(index, 'Pasian'), 'w5');
  assert.equal(resolve(index, 'pasian'), 'w6');
  assert.equal(cite.englishBase(model, 'Loved'), 'love');
  const s = cite.stats(model);
  assert.equal(s.words, 7);
  assert.deepEqual(s.byStatus.map((x) => [x.name, x.count]), [['low', 1], ['draft', 6], ['reviewed', 1]]);
});

const REAL = process.env.ZOTUNE_CITE;
test('the real tables load', { skip: REAL && existsSync(REAL) ? false : 'set ZOTUNE_CITE to a cite folder to run' }, () => {
  const started = Date.now();
  const model = load(REAL);
  const index = buildIndex(cite.searchDocs(model));
  const ms = Date.now() - started;
  const itna = cite.entry(model, resolve(index, 'itna'), { books });
  assert.equal(itna.word, 'itna');
  assert.ok(itna.senses[0].terms.includes('love'));
  assert.equal(cite.entry(model, resolve(index, 'Pasian'), { books }).word, 'Pasian');
  console.log(`  real tables: ${model.sensesByWord.size} words, ${model.senses.size} senses, ${index.key.length} search keys, ${ms} ms`);
});
