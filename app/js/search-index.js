// In-memory search index over search documents ({ id, word, gloss, keys }).
// Built and queried inside the data worker; free of browser APIs so it can be
// unit-tested under Node. Keys are held in parallel typed arrays to keep memory
// low on phones.

import { matchKey } from './text.js';

const SIDES = ['word', 'spelling', 'english'];
const SIDE_CODE = { word: 0, spelling: 1, english: 2 };
const SCAN_LIMIT = 4000;

const byString = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/** Builds the index. Each key is [text, side, weight]; a lower weight ranks first. */
export function buildIndex(docs) {
  let n = 0;
  for (const d of docs) n += d.keys.length;
  const key = new Array(n);
  const text = new Array(n);
  const doc = new Uint32Array(n);
  const side = new Uint8Array(n);
  const weight = new Float32Array(n);
  let i = 0;
  docs.forEach((d, di) => {
    for (const [t, s, w = 0] of d.keys) {
      const k = matchKey(t);
      if (!k) continue;
      if (!(s in SIDE_CODE)) throw new Error(`Unknown search side: ${s}`);
      key[i] = k;
      text[i] = t;
      doc[i] = di;
      side[i] = SIDE_CODE[s];
      weight[i] = w;
      i++;
    }
  });
  const perm = Array.from({ length: i }, (_, j) => j).sort((a, b) => byString(key[a], key[b]));
  const index = {
    key: perm.map((j) => key[j]),
    text: perm.map((j) => text[j]),
    doc: Uint32Array.from(perm, (j) => doc[j]),
    side: Uint8Array.from(perm, (j) => side[j]),
    weight: Float32Array.from(perm, (j) => weight[j]),
    docs: docs.map((d) => ({ id: d.id, word: d.word, gloss: d.gloss })),
    byId: new Map()
  };
  index.docs.forEach((d, di) => index.byId.set(d.id, di));
  const order = index.docs
    .map((d, di) => [matchKey(d.word), d.word, di])
    .sort((a, b) => byString(a[0], b[0]) || byString(a[1], b[1]))
    .map((x) => x[2]);
  index.order = order;
  index.position = new Map(order.map((di, p) => [di, p]));
  return index;
}

function lowerBound(keys, k) {
  let lo = 0;
  let hi = keys.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (keys[mid] < k) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * Prefix search over Zolai headwords, other spellings and English terms at once.
 * Exact matches rank first, then by side (headword, spelling, English), then by
 * weight, then shorter words.
 */
export function search(index, query, limit = 8) {
  const k = matchKey(query);
  if (!k) return [];
  const best = new Map();
  const start = lowerBound(index.key, k);
  const end = Math.min(index.key.length, start + SCAN_LIMIT);
  for (let i = start; i < end; i++) {
    const key = index.key[i];
    if (!key.startsWith(k)) break;
    const score = (key === k ? 0 : 10) + index.side[i] + Math.min(index.weight[i], 0.99);
    const di = index.doc[i];
    const prev = best.get(di);
    if (!prev || score < prev.score) best.set(di, { di, side: SIDES[index.side[i]], matched: index.text[i], score });
  }
  return [...best.values()]
    .map(({ di, ...hit }) => {
      const d = index.docs[di];
      return { id: d.id, ...hit, word: d.word, gloss: d.gloss };
    })
    .sort((a, b) => a.score - b.score || a.word.length - b.word.length || a.word.localeCompare(b.word))
    .slice(0, limit);
}

/**
 * Finds the document a query should open. A headword written exactly as typed
 * (case included) wins over one that only matches without case.
 */
export function resolve(index, query) {
  const typed = query.trim();
  const hits = search(index, typed, 50);
  if (!hits.length) return null;
  const exactCase = hits.find((h) => h.word === typed);
  return (exactCase ?? hits[0]).id;
}

/** Previous and next headwords in alphabetical order. */
export function neighbours(index, id) {
  const p = index.position.get(index.byId.get(id));
  if (p === undefined) return { prev: null, next: null };
  const word = (j) => (j >= 0 && j < index.order.length ? index.docs[index.order[j]].word : null);
  return { prev: word(p - 1), next: word(p + 1) };
}
