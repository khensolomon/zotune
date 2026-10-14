// User actions. Each one is applied locally first, then queued in the outbox
// for the API. Nothing here needs a network connection.

import * as store from './store.js';

const changes = new EventTarget();
let persistAsked = false;

async function askPersist() {
  if (persistAsked || !navigator.storage?.persist) return;
  persistAsked = true;
  try {
    await navigator.storage.persist();
  } catch (err) {
    console.warn('zotune: persistent storage request failed:', err.message);
  }
}

async function queue(type, payload) {
  await store.put('outbox', { type, payload, at: new Date().toISOString() });
  changes.dispatchEvent(new Event('change'));
  askPersist();
}

/** Mark kinds: `bookmark`, `like`. */
export async function isMarked(kind, entryId) {
  return Boolean(await store.get('marks', [kind, entryId]));
}

export async function toggleMark(kind, entry) {
  const on = !(await isMarked(kind, entry.id));
  if (on) await store.put('marks', { kind, entryId: entry.id, word: entry.word, at: new Date().toISOString() });
  else await store.del('marks', [kind, entry.id]);
  await queue(kind, { entryId: entry.id, on });
  return on;
}

export async function marks(kind) {
  const all = await store.getAll('marks');
  return all.filter((m) => m.kind === kind).sort((a, b) => b.at.localeCompare(a.at));
}

/** Vote kinds: `helpful`, `correct`. Values: `yes`, `no`. Voting the same value again removes the vote. */
export async function vote(kind, senseId, value) {
  if (!['helpful', 'correct'].includes(kind)) throw new Error(`Unknown vote kind: ${kind}`);
  if (!['yes', 'no'].includes(value)) throw new Error(`Unknown vote value: ${value}`);
  const current = await store.get('votes', [kind, senseId]);
  const next = current?.value === value ? null : value;
  if (next) await store.put('votes', { kind, senseId, value: next, at: new Date().toISOString() });
  else await store.del('votes', [kind, senseId]);
  await queue('vote', { kind, senseId, value: next });
  return next;
}

export async function votesFor(senseIds) {
  const all = await store.getAll('votes');
  const wanted = new Set(senseIds);
  const out = {};
  for (const v of all) if (wanted.has(v.senseId)) out[`${v.kind}:${v.senseId}`] = v.value;
  return out;
}

/** A proposed change to an entry, made in the workspace editor. */
export async function propose(entryId, fields) {
  await queue('proposal', { entryId, fields });
}

export const outbox = () => store.getAll('outbox');

export function onChange(fn) {
  changes.addEventListener('change', fn);
  return () => changes.removeEventListener('change', fn);
}
