// Data worker: owns the dictionary. Downloads the table files of the version
// named in data/source.json, keeps them in IndexedDB, parses them, builds the
// search index and answers queries, all off the main thread.

import * as store from '../store.js';
import * as cite from '../cite.js';
import { buildIndex, search, resolve, neighbours } from '../search-index.js';
import { matchKey } from '../text.js';
import { numberWords } from '../query.js';

const SOURCE_URL = new URL('../../data/source.json', import.meta.url);
const BOOKS_URL = new URL('../../data/books.json', import.meta.url);

class NetworkError extends Error {}

let model = null;
let index = null;
let books = null;
let active = null;
let options = { full: false };
let started = null;

function status(state, detail = {}) {
  self.postMessage({ type: 'status', state, ...detail });
}

async function getJson(url, what) {
  let res;
  try {
    res = await fetch(url, { cache: 'no-cache' });
  } catch (err) {
    throw new NetworkError(`${what} could not be fetched: ${err.message}`);
  }
  if (!res.ok) throw new Error(`${what}: HTTP ${res.status}`);
  try {
    return await res.json();
  } catch {
    throw new Error(`${what} is not valid JSON.`);
  }
}

async function readSource() {
  const s = await getJson(SOURCE_URL, 'data/source.json');
  if (!Number.isInteger(s.format) || typeof s.ref !== 'string' || !s.ref || typeof s.base !== 'string' || !s.base) {
    throw new Error('data/source.json must give "format" (a number), "ref" and "base".');
  }
  return { format: s.format, ref: s.ref, base: s.base };
}

const baseUrl = (src) => new URL(src.base.replace('{ref}', encodeURIComponent(src.ref)), SOURCE_URL).href;

async function download(src, path) {
  const url = baseUrl(src) + path;
  let res;
  try {
    res = await fetch(url);
  } catch (err) {
    throw new NetworkError(`Download of ${path} failed: ${err.message}`);
  }
  if (!res.ok) throw new NetworkError(`Download of ${path} failed: HTTP ${res.status} from ${url}`);
  const text = await res.text();
  await store.put('files', { ref: src.ref, path, text, at: Date.now() });
  return text;
}

/** Returns the texts of a tier, downloading the files that are not stored yet. */
async function ensureTier(src, tier, label) {
  const files = cite.TIERS[tier];
  const texts = {};
  for (const [i, path] of files.entries()) {
    let text = (await store.get('files', [src.ref, path]))?.text;
    if (text === undefined) {
      status('loading', { step: `Downloading ${label}`, done: i, total: files.length });
      text = await download(src, path);
    }
    texts[path] = text;
  }
  return texts;
}

function parseTier(config, texts, tier) {
  const tables = {};
  for (const path of cite.TIERS[tier]) {
    if (path.endsWith('.tsv')) tables[path] = cite.parseTable(texts[path], path, config);
  }
  return tables;
}

async function load(src, tiers) {
  const core = await ensureTier(src, 'core', 'the dictionary');
  let config;
  try {
    config = JSON.parse(core['configuration.json']);
  } catch {
    throw new Error('configuration.json of the tables is not valid JSON.');
  }
  cite.checkConfiguration(config, src.format);
  status('loading', { step: 'Preparing the dictionary' });
  const m = cite.buildModel(config, parseTier(config, core, 'core'));
  if (tiers.includes('examples')) {
    const ex = await ensureTier(src, 'examples', 'example sentences');
    cite.addExamples(m, parseTier(config, ex, 'examples'));
  }
  if (tiers.includes('english')) {
    const en = await ensureTier(src, 'english', 'the English lexicon');
    cite.addEnglish(m, parseTier(config, en, 'english'));
  }
  return m;
}

async function removeOtherVersions(ref) {
  const stale = (await store.keys('files')).filter(([r]) => r !== ref);
  if (stale.length) await store.delMany('files', stale);
}

async function remember(src) {
  const tiers = ['core'];
  if (model.examples) tiers.push('examples');
  if (model.english) tiers.push('english');
  active = { name: 'active', ref: src.ref, format: src.format, base: src.base, books, tiers };
  await store.put('meta', active);
}

function readyStatus(offline) {
  const s = cite.stats(model);
  status('ready', { ref: active.ref, words: s.words, examples: Boolean(model.examples), offline });
}

async function start() {
  status('loading', { step: 'Opening the dictionary' });
  const previous = await store.get('meta', 'active');
  const offlineFallback = (err, value) => {
    if (err instanceof NetworkError && previous) return value();
    throw err;
  };
  const source = await readSource().catch((err) => offlineFallback(err, () => ({ format: previous.format, ref: previous.ref, base: previous.base })));
  books = await getJson(BOOKS_URL, 'data/books.json')
    .then((b) => b.book)
    .catch((err) => offlineFallback(err, () => previous.books));
  const tiers = ['core'];
  for (const extra of ['examples', 'english']) {
    if (options.full || (previous?.ref === source.ref && previous.tiers.includes(extra))) tiers.push(extra);
  }

  let used = source;
  let offline = false;
  try {
    model = await load(source, tiers);
  } catch (err) {
    // Without a network the version already on the device stays in use.
    if (!(err instanceof NetworkError) || !previous) throw err;
    used = { format: previous.format, ref: previous.ref, base: previous.base };
    model = await load(used, previous.tiers);
    offline = true;
  }
  index = buildIndex(cite.searchDocs(model));
  await remember(used);
  if (!offline) await removeOtherVersions(used.ref);
  readyStatus(offline);
}

/** True when a Zolai sense has the word as an English term. */
function hasTerm(word) {
  const key = matchKey(word);
  return search(index, word, 30).some((h) => h.side === 'english' && h.score < 10 && matchKey(h.matched) === key);
}

/** Zolai words that have the word as an English term, best first. */
function zolaiFor(word, limit) {
  const key = matchKey(word);
  return search(index, word, 200)
    .filter((h) => h.side === 'english' && matchKey(h.matched) === key)
    .slice(0, limit);
}

const roots = (query) => cite.englishRoots(model, query, hasTerm);

let englishLoading = null;
/** Loads the English lexicon once; false when it cannot be downloaded now. */
async function ensureEnglish() {
  if (model.english) return true;
  englishLoading ??= ensureTier(active, 'english', 'the English lexicon')
    .then(async (texts) => {
      cite.addEnglish(model, parseTier(model.config, texts, 'english'));
      await remember(active);
      readyStatus(false);
      return true;
    })
    .catch((err) => {
      englishLoading = null;
      if (err instanceof NetworkError) return false;
      throw err;
    });
  return englishLoading;
}

const handlers = {
  suggest({ query, limit = 8 }) {
    const hits = search(index, query, limit);
    if (hits.length) return hits;
    // Nothing starts with the query: offer the Zolai words of its English roots.
    const out = [];
    for (const r of roots(query)) {
      for (const h of zolaiFor(r.word, 3)) if (!out.some((o) => o.id === h.id)) out.push({ ...h, matched: r.word });
      if (out.length >= limit) break;
    }
    return out.slice(0, limit);
  },
  resolve({ query }) {
    const typed = query.trim();
    const hits = search(index, typed, 50);
    const exact = hits.filter((h) => h.score < 10);
    const open = (id, via = null) => {
      const e = cite.entry(model, id, { books });
      return e ? { ...e, via } : null;
    };
    if (exact.length) return open((exact.find((h) => h.word === typed) ?? exact[0]).id);
    // An English word in another form (loves, creatures) before a prefix match.
    for (const r of roots(typed)) {
      const z = zolaiFor(r.word, 1)[0];
      if (z) return open(z.id, { from: typed, to: r.word });
    }
    // No silent jump to a word that only starts like the query: the page
    // explains what was not found and offers the nearest words instead.
    return null;
  },
  similar: ({ query, limit = 6 }) => cite.similarWords(model, query, limit),
  /** Each word of a phrase with its meaning: Zolai, English, or nearest. */
  breakdown({ words }) {
    return words.slice(0, 40).map((token) => {
      if (/^\d+$/.test(token)) {
        const ids = cite.exactWords(model, token);
        return { token, kind: 'number', word: ids.length ? token : null, gloss: ids.length ? cite.glossOf(model, ids[0]) : '' };
      }
      const ids = cite.exactWords(model, token);
      if (ids.length) {
        const w = cite.entry(model, ids[0], { books, exampleLimit: 0 });
        return { token, kind: 'zolai', word: w.word, gloss: cite.glossOf(model, w.id) };
      }
      const zo = zolaiFor(token, 3);
      if (zo.length) return { token, kind: 'english', zolai: zo.map((z) => ({ word: z.word, gloss: z.gloss })) };
      for (const r of roots(token)) {
        const z = zolaiFor(r.word, 3);
        if (z.length) return { token, kind: 'english', root: r.word, zolai: z.map((x) => ({ word: x.word, gloss: x.gloss })) };
      }
      const near = cite.similarWords(model, token, 1)[0];
      const reading = cite.analyse(model, token, 1)[0];
      return { token, kind: 'unknown', near: near ?? null, reading: reading ?? null };
    });
  },
  /** A number: its Zolai entry if any, its English words and their Zolai. */
  numberHelp({ value }) {
    const words = numberWords(value);
    const parts = (words ?? '').split(/[ -]/).filter(Boolean);
    const seen = new Set();
    return {
      words,
      parts: parts
        .filter((p) => (seen.has(p) ? false : seen.add(p)))
        .map((p) => ({ english: p, zolai: zolaiFor(p, 2).map((z) => ({ word: z.word, gloss: z.gloss })) }))
    };
  },
  phraseExamples: ({ text }) => cite.examplesContaining(model, text, books, 5),
  entry: ({ id }) => cite.entry(model, id, { books }),
  examples: ({ sense, offset = 0, limit = 10 }) => cite.examplesFor(model, sense, books, limit, offset),
  analyse: ({ query }) => cite.analyse(model, query),
  english: ({ query, limit = 30 }) => zolaiFor(query, limit),
  /**
   * English roots of a query with their Zolai words and, from the English
   * lexicon, their meanings and equivalent Zolai senses. The lexicon is
   * downloaded on first use.
   */
  async englishHelp({ query }) {
    const available = await ensureEnglish();
    return {
      available,
      roots: roots(query).map((r) => ({ ...r, zolai: zolaiFor(r.word, 6), concepts: cite.englishConcepts(model, r.word, 3) }))
    };
  },
  neighbours: ({ id }) => neighbours(index, id),
  info: () => ({ ref: active.ref, format: active.format, base: baseUrl(active), tiers: active.tiers, stats: cite.stats(model) }),
  async downloadExamples() {
    if (!model.examples) {
      const ex = await ensureTier(active, 'examples', 'example sentences');
      cite.addExamples(model, parseTier(model.config, ex, 'examples'));
      await remember(active);
      readyStatus(false);
    }
    return cite.stats(model);
  }
};

self.onmessage = async (event) => {
  const { id, type, args } = event.data ?? {};
  if (type === 'init') {
    if (!started) {
      options = { full: Boolean(args?.full) };
      started = start().catch((err) => {
        status('error', { message: err.message });
        throw err;
      });
      // Requests report the failure; this keeps it from also surfacing as unhandled.
      started.catch(() => {});
    }
    return;
  }
  const handler = handlers[type];
  if (!handler) {
    self.postMessage({ id, ok: false, error: `Unknown request: ${type}` });
    return;
  }
  try {
    if (!started) throw new Error('The data worker was not initialised.');
    await started;
    self.postMessage({ id, ok: true, value: await handler(args ?? {}) });
  } catch (err) {
    self.postMessage({ id, ok: false, error: err.message });
  }
};
