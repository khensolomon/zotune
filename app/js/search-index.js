// In-memory search index. Built and queried inside the data worker; kept free
// of browser APIs so it can be unit-tested under Node.

import { matchKey } from './text.js';

const SIDE_RANK = { word: 0, spelling: 1, english: 2 };

/** Builds the index from dictionary entries. */
export function buildIndex(entries) {
  const keys = [];
  const byId = new Map();
  for (const entry of entries) {
    byId.set(entry.id, entry);
    const add = (text, side) => {
      const key = matchKey(text);
      if (key) keys.push([key, entry.id, side, text]);
    };
    add(entry.word, 'word');
    for (const s of entry.spellings ?? []) add(s, 'spelling');
    for (const e of entry.english ?? []) add(e, 'english');
  }
  keys.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : SIDE_RANK[a[2]] - SIDE_RANK[b[2]]));
  const order = [...byId.values()]
    .map((e) => [matchKey(e.word), e.id])
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map((pair) => pair[1]);
  return { keys, byId, order };
}

function lowerBound(keys, key) {
  let lo = 0;
  let hi = keys.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (keys[mid][0] < key) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * Prefix search over Zolai headwords, spellings and English glosses at once.
 * Exact matches rank first, then by side (headword, spelling, English), then
 * shorter words.
 */
export function search(index, query, limit = 8) {
  const key = matchKey(query);
  if (!key) return [];
  const best = new Map();
  for (let i = lowerBound(index.keys, key); i < index.keys.length; i++) {
    const [k, id, side, text] = index.keys[i];
    if (!k.startsWith(key)) break;
    const score = (k === key ? 0 : 10) + SIDE_RANK[side];
    const prev = best.get(id);
    if (!prev || score < prev.score) best.set(id, { id, side, matched: text, score });
  }
  return [...best.values()]
    .map((hit) => {
      const entry = index.byId.get(hit.id);
      return { ...hit, word: entry.word, gloss: entry.senses?.[0]?.gloss ?? '' };
    })
    .sort((a, b) => a.score - b.score || a.word.length - b.word.length || a.word.localeCompare(b.word))
    .slice(0, limit);
}

/** Finds the entry a query should open: exact match first, otherwise the best hit. */
export function resolve(index, query) {
  const hits = search(index, query, 1);
  return hits.length ? index.byId.get(hits[0].id) : null;
}

/** Previous and next headwords in alphabetical order. */
export function neighbours(index, id) {
  const i = index.order.indexOf(id);
  if (i < 0) return { prev: null, next: null };
  const word = (j) => (j >= 0 && j < index.order.length ? index.byId.get(index.order[j]).word : null);
  return { prev: word(i - 1), next: word(i + 1) };
}
