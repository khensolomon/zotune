import { h, mount } from '../dom.js';
import { definitionPath } from '../router.js';
import * as actions from '../actions.js';

const OUTBOX_LABEL = {
  bookmark: (p) => (p.on ? 'Bookmarked' : 'Removed bookmark'),
  like: (p) => (p.on ? 'Liked' : 'Removed like'),
  vote: (p) => (p.value ? `${p.kind === 'helpful' ? 'Helpful' : 'Correct'}: ${p.value}` : `Cleared ${p.kind} answer`),
  proposal: () => 'Suggested a change'
};

function markList(items, emptyText) {
  if (!items.length) return h('p', { class: 'empty' }, emptyText);
  return h('ul', { class: 'list' }, items.map((m) => h('li', null, h('a', { class: 'w', href: definitionPath(m.word) }, m.word), h('span', { class: 'm' }, new Date(m.at).toLocaleDateString()))));
}

const THEMES = [
  ['auto', 'Auto'],
  ['light', 'Light'],
  ['dark', 'Dark']
];

function themeChooser() {
  const control = window.zotuneTheme;
  if (!control) return h('p', { class: 'empty' }, 'Theme control is not available.');
  const buttons = THEMES.map(([value, label]) => {
    const b = h('button', { type: 'button', 'aria-pressed': String(control.get() === value) }, label);
    b.addEventListener('click', () => {
      control.set(value);
      buttons.forEach((x, i) => x.setAttribute('aria-pressed', String(THEMES[i][0] === value)));
    });
    return b;
  });
  return h('div', null, h('div', { class: 'seg', role: 'group', 'aria-label': 'Theme' }, buttons), h('p', { class: 'meta-line' }, 'Auto follows the setting of this device.'));
}

export default {
  nav: null,
  layout: 'page',
  title: 'You',
  async render(root) {
    const draw = async () => {
      const [bookmarks, likes, outbox] = await Promise.all([actions.marks('bookmark'), actions.marks('like'), actions.outbox()]);
      mount(
        root,
        h(
          'div',
          { class: 'page' },
          h(
            'div',
            { class: 'doc' },
            h('h1', null, 'You'),
            h('p', null, 'You are using zotune as a guest. Everything below is saved on this device.'),
            h('h2', null, 'Appearance'),
            themeChooser(),
            h('h2', null, 'Bookmarks'),
            markList(bookmarks, 'Nothing bookmarked yet.'),
            h('h2', null, 'Liked'),
            markList(likes, 'Nothing liked yet.'),
            h('h2', null, 'Waiting to be sent'),
            outbox.length
              ? h('ul', { class: 'list' }, outbox.slice(-50).reverse().map((o) => h('li', null, h('span', null, (OUTBOX_LABEL[o.type] ?? (() => o.type))(o.payload)), h('span', { class: 'm' }, new Date(o.at).toLocaleString()))))
              : h('p', { class: 'empty' }, 'Nothing waiting.')
          )
        )
      );
    };
    await draw();
    return actions.onChange(() => draw());
  }
};
