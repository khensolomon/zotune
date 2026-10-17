// Service worker (web only): keeps the app shell available offline.
// The dictionary itself lives in IndexedDB, managed by the data worker.

// The cache name and the file list are written by scripts/build.mjs for each
// build (file names carry a content hash). The values here only apply to an
// unbuilt copy of app/, which is not deployed.
const CACHE = 'zotune-unbuilt';
const SHELL = ['/', '/index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;

  // Pages: network first, cached shell when offline (deep links keep working).
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match('/index.html')));
    return;
  }
  // Version and book names: network first, so a new version is seen at once.
  // The tables themselves come from another origin and live in IndexedDB.
  if (url.pathname.startsWith('/data/')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit ?? Response.error()))
    );
    return;
  }

  // Static files: cache first, refreshed in the background.
  event.respondWith(
    caches.match(req).then((hit) => {
      const fresh = fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      });
      return hit ?? fresh;
    })
  );
});
