// Service worker (web only): keeps the app shell available offline.
// The dictionary itself lives in IndexedDB, managed by the data worker.

const CACHE = 'zotune-shell-v1';
const SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/css/app.css',
  '/fonts/figtree.woff2',
  '/fonts/source-serif-4.woff2',
  '/fonts/source-serif-4-italic.woff2',
  '/assets/logo.svg',
  '/assets/favicon.svg',
  '/js/main.js',
  '/js/router.js',
  '/js/dom.js',
  '/js/text.js',
  '/js/store.js',
  '/js/actions.js',
  '/js/search-index.js',
  '/js/cite.js',
  '/js/logo.js',
  '/js/recent.js',
  '/js/theme.js',
  '/js/components/loading.js',
  '/data/source.json',
  '/data/books.json',
  '/js/search-client.js',
  '/js/workers/data.worker.js',
  '/js/components/header.js',
  '/js/components/search-field.js',
  '/js/views/home.js',
  '/js/views/definition.js',
  '/js/views/about.js',
  '/js/views/settings.js',
  '/js/query.js',
  '/js/views/editor.js',
  '/js/views/not-found.js'
];

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
