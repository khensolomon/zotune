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
