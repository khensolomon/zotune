// Boot: shell, routes, shared search bar, keyboard shortcuts.

import { route, start, match, navigate } from './router.js';
import { h, mount } from './dom.js';
import { logo } from './logo.js';
import { createHeader } from './components/header.js';
import { searchField, clearDim } from './components/search-field.js';
import home from './views/home.js';
import definition from './views/definition.js';
import about from './views/about.js';
import settings from './views/settings.js';
import editor from './views/editor.js';
import notFound from './views/not-found.js';
import * as analytics from './analytics.js';
import { askForConsent } from './components/consent.js';
import { appVersion } from './version.js';

const bridge = window.zotune;
if (bridge) document.documentElement.classList.add('is-desktop', `platform-${bridge.platform}`);

const view = document.getElementById('view');
const footer = document.getElementById('footer');
const bar = document.getElementById('searchbar');
const header = createHeader(document.getElementById('topbar'));

route('/', home);
route('/definition', definition);
route('/definition/:word', definition);
route('/about', about);
route('/settings', settings);
// Earlier addresses of the parts that Settings now holds.
const moved = (to) => ({ nav: null, layout: 'page', title: 'Settings', render: () => navigate(to, { replace: true }) });
route('/me', moved('/settings#words'));
route('/workspace', moved('/settings#data'));
route('/workspace/entry/:id', editor);

// Pinned logo + search bar for definition pages.
let barField = null;
function showBar(value, { hint = false, cycle = false } = {}) {
  barField = searchField({ size: 'md', value, hint, cycle });
  mount(
    bar,
    h(
      'div',
      { class: 'searchbar-row' },
      h('a', { class: 'logo', href: '/definition', 'aria-label': 'zotune, how to use the dictionary' }, logo(30)),
      barField.el
    )
  );
  bar.hidden = false;
}

const raise = () => bar.classList.toggle('raised', window.scrollY > bar.offsetTop - 1 && window.scrollY > 0);
window.addEventListener('scroll', raise, { passive: true });

let cleanup = null;
let homeField = null;
let renderSeq = 0;

async function render({ path }) {
  const found = match(path);
  const v = found?.view ?? notFound;
  const params = found?.params ?? {};

  clearDim();
  if (typeof cleanup === 'function') cleanup();
  cleanup = null;
  homeField = null;

  header.setActive(v.nav ?? null);
  footer.hidden = v.layout === 'home';
  if (v.layout === 'definition') showBar(params.word ?? '', { hint: !params.word, cycle: !params.word });
  else {
    bar.hidden = true;
    barField = null;
  }

  view.replaceChildren();
  let reported = null;
  const ctx = {
    // A view whose address carries typed text reports a placeholder instead.
    reportAs: (reportPath, reportTitle) => {
      reported = { path: reportPath, title: reportTitle };
    },
    setTitle: (t) => {
      document.title = t ? `${t} — zotune` : 'zotune';
    },
    registerField: (f) => {
      homeField = f;
    },
    barField
  };
  ctx.setTitle(typeof v.title === 'function' ? v.title(params) : v.title);
  const mine = ++renderSeq;
  try {
    const done = await v.render(view, params, ctx);
    if (mine !== renderSeq) {
      if (typeof done === 'function') done();
      return;
    }
    cleanup = done;
    analytics.pageView(reported?.path ?? path, reported ? `${reported.title} — zotune` : document.title);
  } catch (err) {
    if (mine !== renderSeq) return;
    console.error(err);
    mount(view, h('div', { class: 'page' }, h('div', { class: 'notice' }, h('h1', null, 'Something went wrong'), h('p', null, err.message))));
  }

  if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
  else window.scrollTo(0, 0);
  raise();
  if (v.layout === 'definition' && !params.word) barField?.focus();
}

// Usage statistics: only after consent (see analytics.js for local testing).
try {
  analytics.setVersion(appVersion().version);
} catch (err) {
  console.warn(`zotune: statistics are sent without a version: ${err.message}`);
}
analytics.start();
start(render);
askForConsent();

// "/" focuses search from anywhere outside a text field.
document.addEventListener('keydown', (e) => {
  if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
  const t = e.target;
  if (t.closest?.('input, textarea, [contenteditable="true"]')) return;
  const f = barField ?? homeField;
  if (!f) return;
  e.preventDefault();
  f.focus({ chosen: true });
});

// Deep links from the operating system (desktop shell only).
bridge?.onDeepLink?.((path) => navigate(path));

// Offline support on the web. The desktop shell serves files locally.
if (!bridge && 'serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('/sw.js').catch((err) => console.warn('zotune: service worker not registered:', err.message));
}
