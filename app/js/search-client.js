// Promise-based client for the data worker.

const worker = new Worker(new URL('./workers/data.worker.js', import.meta.url), { type: 'module', name: 'zotune-data' });
worker.postMessage({ type: 'init', args: { full: Boolean(globalThis.zotune) } });
const pending = new Map();
const listeners = new Set();
let seq = 0;
let lastStatus = { state: 'loading' };

worker.onmessage = (event) => {
  const msg = event.data;
  if (msg.type === 'status') {
    lastStatus = msg;
    for (const fn of listeners) fn(msg);
    return;
  }
  const p = pending.get(msg.id);
  if (!p) return;
  pending.delete(msg.id);
  if (msg.ok) p.resolve(msg.value);
  else p.reject(new Error(msg.error));
};

worker.onerror = (event) => {
  const message = `Data worker failed: ${event.message || 'could not start'}`;
  lastStatus = { state: 'error', message };
  for (const fn of listeners) fn(lastStatus);
  for (const p of pending.values()) p.reject(new Error(message));
  pending.clear();
};

function request(type, args) {
  return new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    worker.postMessage({ id, type, args });
  });
}

export const data = {
  suggest: (query, limit) => request('suggest', { query, limit }),
  resolve: (query) => request('resolve', { query }),
  entry: (id) => request('entry', { id }),
  examples: (sense, offset, limit) => request('examples', { sense, offset, limit }),
  analyse: (query) => request('analyse', { query }),
  english: (query, limit) => request('english', { query, limit }),
  englishHelp: (query) => request('englishHelp', { query }),
  similar: (query, limit) => request('similar', { query, limit }),
  starters: () => request('starters', { day: Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000) }),
  breakdown: (words) => request('breakdown', { words }),
  numberHelp: (value) => request('numberHelp', { value }),
  phraseExamples: (text) => request('phraseExamples', { text }),
  neighbours: (id) => request('neighbours', { id }),
  info: () => request('info'),
  downloadExamples: () => request('downloadExamples'),
  downloadEnglish: () => request('downloadEnglish')
};

/** Subscribes to dataset status; the current status is delivered at once. */
export function onStatus(fn) {
  listeners.add(fn);
  fn(lastStatus);
  return () => listeners.delete(fn);
}
