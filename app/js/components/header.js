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

const RING_R = 16;
const RING_LEN = 2 * Math.PI * RING_R;

/** A thin ring around the status icon: the share downloaded, or a turning arc. */
function progressRing() {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'ring');
  svg.setAttribute('viewBox', '0 0 36 36');
  svg.setAttribute('aria-hidden', 'true');
  const track = document.createElementNS(NS, 'circle');
  const arc = document.createElementNS(NS, 'circle');
  for (const c of [track, arc]) {
    c.setAttribute('cx', '18');
    c.setAttribute('cy', '18');
    c.setAttribute('r', String(RING_R));
  }
  track.setAttribute('class', 'ring-track');
  arc.setAttribute('class', 'ring-arc');
  arc.setAttribute('stroke-dasharray', String(RING_LEN));
  svg.append(track, arc);
  return {
    svg,
    show(state, done, total) {
      svg.dataset.mode = state === 'loading' ? (total ? 'part' : 'spin') : 'off';
      const share = total ? Math.min(1, (done + 0.5) / total) : 0.25;
      arc.setAttribute('stroke-dashoffset', String(RING_LEN * (1 - share)));
    }
  };
}

export function createHeader(root) {
  const progress = progressRing();
  const ring = progress.svg;
  const links = MENU.map((m) =>
    h('a', { href: m.href, dataset: { key: m.key } }, icon(m.icon), h('span', { class: 'label' }, m.label))
  );
  const pill = h('span', { class: 'nav-pill', 'aria-hidden': 'true' });
  const nav = h('nav', { class: 'nav', 'aria-label': 'Main' }, pill, links);

  const status = h('a', { class: 'tool', href: '/settings#data', dataset: { state: 'loading' } }, ring, icon(ICONS.cloud), h('span', { class: 'dot' }));
  const badge = h('span', { class: 'badge', hidden: true });
  const user = h('a', { class: 'tool user', href: '/settings', 'aria-label': 'Settings (guest)', title: 'Settings' }, icon(ICONS.user), badge);

  const bridge = window.zotune;
  const tools = h('div', { class: 'tools' }, status, user, bridge && bridge.platform !== 'darwin' ? windowControls(bridge) : null);
  mount(root, nav, tools);

  onStatus((s) => {
    status.dataset.state = s.state;
    progress.show(s.state, s.done ?? 0, s.total ?? 0);
    let text = STATUS_TEXT[s.state];
    if (s.state === 'error') text = `${STATUS_TEXT.error} ${s.message ?? ''}`.trim();
    if (s.state === 'loading' && s.step) text = s.total ? `${s.step} (${s.done + 1} of ${s.total})…` : `${s.step}…`;
    if (s.state === 'ready' && s.offline) text = 'No connection. Using the dictionary saved on this device.';
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
