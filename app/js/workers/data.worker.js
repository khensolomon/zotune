// Data worker: owns the dataset. Loads the pack into IndexedDB, builds the
// search index and answers queries, all off the main thread.

import * as store from '../store.js';
import { buildIndex, search, resolve, neighbours } from '../search-index.js';

const PACK_URL = new URL('../../data/sample.json', import.meta.url);
const BATCH = 500;

let index = null;

function status(state, detail = {}) {
  self.postMessage({ type: 'status', state, ...detail });
}

async function fetchPack() {
  const res = await fetch(PACK_URL, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Dataset download failed: HTTP ${res.status} for ${PACK_URL.pathname}`);
  const pack = await res.json();
  if (!pack || typeof pack.version !== 'string' || !Array.isArray(pack.entries)) {
    throw new Error('Dataset pack is malformed: expected { version, entries[] }.');
  }
  for (const [i, e] of pack.entries.entries()) {
    if (!e.id || !e.word || !Array.isArray(e.senses)) {
      throw new Error(`Dataset pack entry ${i} is missing id, word or senses.`);
    }
  }
  return pack;
}

async function install(pack) {
  await store.clear('entries');
  for (let i = 0; i < pack.entries.length; i += BATCH) {
    await store.putMany('entries', pack.entries.slice(i, i + BATCH));
  }
  await store.put('meta', { name: 'pack', version: pack.version, entries: pack.entries.length, installed: Date.now() });
}

async function start() {
  status('loading');
  const stored = await store.get('meta', 'pack');
  let pack = null;
  let offline = false;
  try {
    pack = await fetchPack();
  } catch (err) {
    if (!stored) throw err;
    offline = true;
  }
  if (pack && pack.version !== stored?.version) await install(pack);
  const entries = await store.getAll('entries');
  index = buildIndex(entries);
  const meta = await store.get('meta', 'pack');
  status('ready', { version: meta.version, entries: entries.length, offline });
}

const ready = start().catch((err) => {
  status('error', { message: err.message });
  throw err;
});

const handlers = {
  suggest: ({ query, limit }) => search(index, query, limit ?? 8),
  resolve: ({ query }) => resolve(index, query),
  entry: ({ id }) => index.byId.get(id) ?? null,
  neighbours: ({ id }) => neighbours(index, id),
  info: async () => ({ ...(await store.get('meta', 'pack')), size: index.byId.size })
};

self.onmessage = async (event) => {
  const { id, type, args } = event.data ?? {};
  const handler = handlers[type];
  if (!handler) {
    self.postMessage({ id, ok: false, error: `Unknown request: ${type}` });
    return;
  }
  try {
    await ready;
    self.postMessage({ id, ok: true, value: await handler(args ?? {}) });
  } catch (err) {
    self.postMessage({ id, ok: false, error: err.message });
  }
};
