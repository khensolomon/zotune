// Shared header: menu on the left, status and user on the right, window
// controls when running in the desktop shell.

import { h, icon, ICONS, mount } from '../dom.js';
import { onStatus } from '../search-client.js';
import { outbox, onChange } from '../actions.js';

const MENU = [
  { key: 'home', href: '/', label: 'Home', icon: ICONS.home },
  { key: 'definition', href: '/definition', label: 'Definition', icon: ICONS.book },
  { key: 'about', href: '/about', label: 'About', icon: ICONS.info }
];

const STATUS_TEXT = {
  loading: 'Getting the dictionary ready…',
  ready: 'Dictionary saved on this device. Works offline.',
  error: 'The dictionary could not be loaded.'
};

function windowControls(bridge) {
  const max = h('button', { type: 'button', 'aria-label': 'Maximise', onclick: () => bridge.toggleMaximise() }, icon(ICONS.max));
  bridge.onMaximised?.((on) => {
    max.replaceChildren(icon(on ? ICONS.restore : ICONS.max));
    max.setAttribute('aria-label', on ? 'Restore' : 'Maximise');
  });
  return h(
    'div',
    { class: 'winctl' },
    h('button', { type: 'button', 'aria-label': 'Minimise', onclick: () => bridge.minimise() }, icon(ICONS.min)),
    max,
    h('button', { type: 'button', class: 'close', 'aria-label': 'Close', onclick: () => bridge.close() }, icon(ICONS.close))
  );
}

export function createHeader(root) {
  const links = MENU.map((m) =>
    h('a', { href: m.href, dataset: { key: m.key } }, icon(m.icon), h('span', { class: 'label' }, m.label))
  );
  const pill = h('span', { class: 'nav-pill', 'aria-hidden': 'true' });
  const nav = h('nav', { class: 'nav', 'aria-label': 'Main' }, pill, links);

  const status = h('a', { class: 'tool', href: '/workspace', dataset: { state: 'loading' } }, icon(ICONS.cloud), h('span', { class: 'dot' }));
  const badge = h('span', { class: 'badge', hidden: true });
  const user = h('a', { class: 'tool user', href: '/me', 'aria-label': 'You (guest)', title: 'You (guest)' }, icon(ICONS.user), badge);

  const bridge = window.zotune;
  const tools = h('div', { class: 'tools' }, status, user, bridge && bridge.platform !== 'darwin' ? windowControls(bridge) : null);
  mount(root, nav, tools);

  onStatus((s) => {
    status.dataset.state = s.state;
    const text = s.state === 'error' ? `${STATUS_TEXT.error} ${s.message ?? ''}`.trim() : STATUS_TEXT[s.state];
    status.title = text;
    status.setAttribute('aria-label', text);
  });

  const refreshBadge = async () => {
    const n = (await outbox()).length;
    badge.hidden = n === 0;
    badge.textContent = n > 99 ? '99+' : String(n);
    user.setAttribute('aria-label', n ? `You (guest), ${n} changes waiting to be sent` : 'You (guest)');
  };
  onChange(refreshBadge);
  refreshBadge().catch((err) => console.error(err));

  function place(active) {
    const a = links.find((l) => l.dataset.key === active);
    if (!a) {
      pill.style.opacity = '0';
      return;
    }
    pill.style.opacity = '1';
    pill.style.width = `${a.offsetWidth}px`;
    pill.style.transform = `translateX(${a.offsetLeft}px)`;
  }

  let current = null;
  const ro = new ResizeObserver(() => place(current));
  ro.observe(nav);

  return {
    setActive(active) {
      current = active;
      for (const l of links) {
        if (l.dataset.key === active) l.setAttribute('aria-current', 'page');
        else l.removeAttribute('aria-current');
      }
      requestAnimationFrame(() => place(active));
    }
  };
}
