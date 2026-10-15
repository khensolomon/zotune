import { h, mount } from '../dom.js';
import { data } from '../search-client.js';
import * as actions from '../actions.js';

const capital = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export default {
  nav: null,
  layout: 'page',
  title: 'Workspace',
  async render(root) {
    const draw = async () => {
      const [info, outbox] = await Promise.all([data.info(), actions.outbox()]);
      const proposals = outbox.filter((o) => o.type === 'proposal');
      const stat = (value, label) => h('div', { class: 'stat' }, h('b', null, String(value)), h('span', null, label));
      const hasExamples = info.tiers.includes('examples');
      const note = h('p', { class: 'loading-note', role: 'status' });
      const getExamples = h('button', { type: 'button', class: 'btn' }, 'Download example sentences (about 7 MB)');
      getExamples.addEventListener('click', async () => {
        getExamples.disabled = true;
        note.textContent = 'Downloading example sentences…';
        try {
          await data.downloadExamples();
          await draw();
        } catch (err) {
          note.classList.add('is-error');
          note.textContent = err.message;
          getExamples.disabled = false;
        }
      });
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
            h('h2', null, 'Dictionary on this device'),
            h(
              'div',
              { class: 'stats' },
              stat(info.stats.words.toLocaleString(), 'words'),
              stat(info.stats.senses.toLocaleString(), 'meanings'),
              stat(hasExamples ? info.stats.examples.toLocaleString() : '—', 'example sentences')
            ),
            h('div', { class: 'stats' }, info.stats.byStatus.map((s) => stat(s.count.toLocaleString(), capital(s.name)))),
            h('p', { class: 'meta-line' }, `Tables format ${info.format}, version ${info.ref.slice(0, 12)}, from ${info.base}`),
            hasExamples ? null : h('div', { class: 'row' }, getExamples),
            note,
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
    };
    await draw();
  }
};
