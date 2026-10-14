import { h, mount } from '../dom.js';
import { data } from '../search-client.js';
import * as actions from '../actions.js';

export default {
  nav: null,
  layout: 'page',
  title: 'Workspace',
  async render(root) {
    const [info, outbox] = await Promise.all([data.info(), actions.outbox()]);
    const proposals = outbox.filter((o) => o.type === 'proposal');
    const stat = (value, label) => h('div', { class: 'stat' }, h('b', null, String(value)), h('span', null, label));
    mount(
      root,
      h(
        'div',
        { class: 'page' },
        h(
          'div',
          { class: 'doc' },
          h('h1', null, 'Workspace'),
          h('p', null, 'Manage the dictionary data. Reviewing and publishing need the zotune server, which is not connected yet; until then suggestions stay on this device.'),
          h('div', { class: 'stats' }, stat(info.size, 'entries on this device'), stat(info.version, 'dataset version'), stat(proposals.length, 'suggestions waiting')),
          h('h2', null, 'Your suggestions'),
          proposals.length
            ? h(
                'ul',
                { class: 'list' },
                proposals.reverse().map((p) => h('li', null, h('a', { class: 'w', href: `/workspace/entry/${encodeURIComponent(p.payload.entryId)}` }, p.payload.fields.word || p.payload.entryId), h('span', { class: 'm' }, new Date(p.at).toLocaleString())))
              )
            : h('p', { class: 'empty' }, 'No suggestions yet. Open any entry and choose “Improve this entry”.')
        )
      )
    );
  }
};
