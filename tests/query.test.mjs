import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classify, numberWords, editDistance, tokens } from '../app/js/query.js';

test('queries are sorted into kinds', () => {
  assert.equal(classify('  ').kind, 'empty');
  assert.equal(classify('!!!').kind, 'empty');
  assert.equal(classify('itna').kind, 'word');
  assert.equal(classify("ki-itna").kind, 'word');
  assert.equal(classify('a om').kind, 'phrase');
  assert.equal(classify('Pasian in leitung mite a it mahmah').kind, 'sentence');
  assert.equal(classify('ka it hi.').kind, 'sentence');
  assert.deepEqual([classify('144').kind, classify('144').value], ['number', 144]);
  assert.equal(classify('1,000').value, 1000);
  assert.equal(classify('https://zotune.com').kind, 'address');
  assert.equal(classify('me@zotune.com').kind, 'address');
  const my = classify('မင်္ဂလာပါ');
  assert.equal(my.kind, 'script');
  assert.equal(my.script, 'Myanmar');
  assert.equal(classify('नमस्ते').script, 'Devanagari (Hindi)');
});

test('symbols are removed and noted', () => {
  const q = classify('itna!!');
  assert.equal(q.kind, 'word');
  assert.equal(q.clean, 'itna');
  assert.equal(q.symbols, true);
  assert.equal(classify("amau'").symbols, false);
  assert.equal(classify('café').latinOther, true);
  assert.deepEqual(tokens('ka it-na, hi!'), ['ka', 'it-na', 'hi']);
});

test('numbers are spelled in English', () => {
  assert.equal(numberWords(0), 'zero');
  assert.equal(numberWords(25), 'twenty-five');
  assert.equal(numberWords(144), 'one hundred forty-four');
  assert.equal(numberWords(2026), 'two thousand twenty-six');
  assert.equal(numberWords(-1), null);
});

test('edit distance is bounded', () => {
  assert.equal(editDistance('itna', 'itna'), 0);
  assert.equal(editDistance('itan', 'itna'), 1, 'a swap counts once');
  assert.equal(editDistance('itnna', 'itna'), 1);
  assert.equal(editDistance('lungdamna', 'lungdam'), 2);
  assert.equal(editDistance('abc', 'xyzxyz'), 3);
});
