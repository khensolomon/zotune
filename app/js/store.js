// IndexedDB wrapper shared by the window and the workers.

const DB_NAME = 'zotune';
const DB_VERSION = 2;

let opening = null;

const STORES = {
  meta: { keyPath: 'name' },
  files: { keyPath: ['ref', 'path'] },
  marks: { keyPath: ['kind', 'entryId'] },
  votes: { keyPath: ['kind', 'senseId'] },
  outbox: { keyPath: 'id', autoIncrement: true }
};

function upgrade(db) {
  for (const [name, options] of Object.entries(STORES)) {
    if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, options);
  }
  // Version 1 kept a sample pack of entries; the tables replace it.
  if (db.objectStoreNames.contains('entries')) db.deleteObjectStore('entries');
}

function wrap(request, what) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error(`IndexedDB ${what} failed: ${request.error?.message ?? 'unknown error'}`));
  });
}

export function openDb() {
  if (!opening) {
    if (typeof indexedDB === 'undefined') {
      return Promise.reject(new Error('IndexedDB is not available in this browser.'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => upgrade(request.result);
    request.onblocked = () => console.warn('zotune: database upgrade is waiting for another tab to close.');
    opening = wrap(request, 'open').then((db) => {
      db.onversionchange = () => {
        db.close();
        opening = null;
      };
      return db;
    });
    opening.catch(() => {
      opening = null;
    });
  }
  return opening;
}

async function run(storeName, mode, fn) {
  const db = await openDb();
  const tx = db.transaction(storeName, mode);
  const result = fn(tx.objectStore(storeName));
  const done = new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(new Error(`IndexedDB ${storeName} ${mode} failed: ${tx.error?.message ?? 'unknown error'}`));
    tx.onabort = () => reject(new Error(`IndexedDB ${storeName} ${mode} aborted: ${tx.error?.message ?? 'unknown error'}`));
  });
  const value = result instanceof IDBRequest ? await wrap(result, `${storeName} ${mode}`) : result;
  await done;
  return value;
}

export const get = (store, key) => run(store, 'readonly', (s) => s.get(key));
export const getAll = (store) => run(store, 'readonly', (s) => s.getAll());
export const count = (store) => run(store, 'readonly', (s) => s.count());
export const keys = (store) => run(store, 'readonly', (s) => s.getAllKeys());
export const put = (store, value) => run(store, 'readwrite', (s) => s.put(value));
export const del = (store, key) => run(store, 'readwrite', (s) => s.delete(key));
export const clear = (store) => run(store, 'readwrite', (s) => s.clear());

/** Deletes many keys in one transaction. */
export const delMany = (store, list) =>
  run(store, 'readwrite', (s) => {
    for (const k of list) s.delete(k);
  });

/** Writes many records in one transaction. */
export const putMany = (store, values) =>
  run(store, 'readwrite', (s) => {
    for (const v of values) s.put(v);
  });
