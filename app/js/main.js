// Boot: shell, routes, shared search bar, keyboard shortcuts.

import { route, start, match, navigate } from './router.js';
import { h, mount } from './dom.js';
import { createHeader } from './components/header.js';
import { searchField } from './components/search-field.js';
import home from './views/home.js';
import definition from './views/definition.js';
import about from './views/about.js';
import me from './views/me.js';
import workspace from './views/workspace.js';
import editor from './views/editor.js';
import notFound from './views/not-found.js';

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
route('/me', me);
route('/workspace', workspace);
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
      h('a', { class: 'logo', href: '/', 'aria-label': 'zotune, home' }, h('img', { src: '/assets/logo.svg', alt: 'zotune', width: 232, height: 30 })),
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
  const ctx = {
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

start(render);

// "/" focuses search from anywhere outside a text field.
document.addEventListener('keydown', (e) => {
  if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
  const t = e.target;
  if (t.closest?.('input, textarea, [contenteditable="true"]')) return;
  const f = barField ?? homeField;
  if (!f) return;
  e.preventDefault();
  f.focus();
});

// Deep links from the operating system (desktop shell only).
bridge?.onDeepLink?.((path) => navigate(path));

// Offline support on the web. The desktop shell serves files locally.
if (!bridge && 'serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('/sw.js').catch((err) => console.warn('zotune: service worker not registered:', err.message));
}
