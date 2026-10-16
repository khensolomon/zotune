import { h, mount } from '../dom.js';
import { data, onStatus } from '../search-client.js';
import { definitionPath } from '../router.js';
import * as actions from '../actions.js';
import { appVersion } from '../version.js';

const capital = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

const THEMES = [
  ['auto', 'Auto'],
  ['light', 'Light'],
  ['dark', 'Dark']
];

const OUTBOX_LABEL = {
  bookmark: (p) => (p.on ? 'Bookmarked' : 'Removed bookmark'),
  like: (p) => (p.on ? 'Liked' : 'Removed like'),
  vote: (p) => (p.value ? `${p.kind === 'helpful' ? 'Helpful' : 'Correct'}: ${p.value}` : `Cleared ${p.kind} answer`),
  proposal: () => 'Suggested a change'
};

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
  return h('div', { class: 'setting' }, h('div', { class: 'seg', role: 'group', 'aria-label': 'Theme' }, buttons), h('p', { class: 'meta-line' }, 'Auto follows the setting of this device.'));
}

function markList(items, emptyText) {
  if (!items.length) return h('p', { class: 'empty' }, emptyText);
  return h('ul', { class: 'list' }, items.map((m) => h('li', null, h('a', { class: 'w', href: definitionPath(m.word), lang: 'ctd' }, m.word), h('span', { class: 'm' }, new Date(m.at).toLocaleDateString()))));
}

function download(label, run, after) {
  const note = h('p', { class: 'loading-note', role: 'status' });
  const button = h('button', { type: 'button', class: 'btn' }, label);
  button.addEventListener('click', async () => {
    button.disabled = true;
    note.classList.remove('is-error');
    note.textContent = 'Downloading…';
    try {
      await run();
      await after();
    } catch (err) {
      note.classList.add('is-error');
      note.textContent = err.message;
      button.disabled = false;
    }
  });
  return h('div', { class: 'setting' }, button, note);
}

export default {
  nav: null,
  layout: 'page',
  title: 'Settings',
  async render(root) {
    let stopStatus = null;
    const draw = async () => {
      const [info, bookmarks, likes, outbox, version] = await Promise.all([
        data.info(),
        actions.marks('bookmark'),
        actions.marks('like'),
        actions.outbox(),
        appVersion().catch((err) => ({ error: err.message }))
      ]);
      const proposals = outbox.filter((o) => o.type === 'proposal');
      const stat = (value, label) => h('div', { class: 'stat' }, h('b', null, String(value)), h('span', null, label));
      const has = (tier) => info.tiers.includes(tier);
      mount(
        root,
        h(
          'div',
          { class: 'page' },
          h(
            'div',
            { class: 'doc settings' },
            h('h1', null, 'Settings'),
            h('p', null, 'You are using zotune as a guest. Everything here is kept on this device.'),

            h('h2', { id: 'appearance' }, 'Appearance'),
            themeChooser(),

            h('h2', { id: 'words' }, 'Your words'),
            h('h3', null, 'Bookmarks'),
            markList(bookmarks, 'Nothing bookmarked yet. Use the bookmark beside a word.'),
            h('h3', null, 'Liked'),
            markList(likes, 'Nothing liked yet.'),

            h('h2', { id: 'data' }, 'Dictionary on this device'),
            h('div', { class: 'stats' }, stat(info.stats.words.toLocaleString(), 'words'), stat(info.stats.senses.toLocaleString(), 'meanings'), stat(has('examples') ? info.stats.examples.toLocaleString() : '—', 'example sentences')),
            h('div', { class: 'stats' }, info.stats.byStatus.map((s) => stat(s.count.toLocaleString(), capital(s.name)))),
            has('examples') ? h('p', { class: 'meta-line' }, 'Example sentences are on this device.') : download('Download example sentences (about 7 MB)', () => data.downloadExamples(), draw),
            has('english')
              ? h('p', { class: 'meta-line' }, 'The English lexicon (WordNet) is on this device.')
              : download('Download the English lexicon (about 4.5 MB)', () => data.downloadEnglish(), draw),
            h('p', { class: 'meta-line' }, `Tables format ${info.format}, version ${info.ref.slice(0, 12)}, from ${info.base}`),

            h('h2', { id: 'suggestions' }, 'Your suggestions'),
            proposals.length
              ? h(
                  'ul',
                  { class: 'list' },
                  [...proposals].reverse().map((p) => h('li', null, h('a', { class: 'w', href: `/workspace/entry/${encodeURIComponent(p.payload.entryId)}` }, p.payload.fields.word || p.payload.entryId), h('span', { class: 'm' }, new Date(p.at).toLocaleString())))
                )
              : h('p', { class: 'empty' }, 'No suggestions yet. Open any word and choose “Improve this entry”.'),
            h('h3', null, 'Waiting to be sent'),
            outbox.length
              ? h('ul', { class: 'list' }, outbox.slice(-50).reverse().map((o) => h('li', null, h('span', null, (OUTBOX_LABEL[o.type] ?? (() => o.type))(o.payload)), h('span', { class: 'm' }, new Date(o.at).toLocaleString()))))
              : h('p', { class: 'empty' }, 'Nothing waiting. Sending starts once the zotune server is connected.'),

            h('h2', { id: 'about' }, 'About this app'),
            version.error
              ? h('p', { class: 'loading-note is-error' }, `The version could not be read: ${version.error}`)
              : h(
                  'p',
                  { class: 'meta-line' },
                  `zotune v${version.version}, released ${version.date}. `,
                  h('a', { href: 'https://github.com/khensolomon/zotune/blob/master/CHANGELOG.md', target: '_blank', rel: 'noopener' }, 'What changed')
                )
          )
        )
      );
      if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
    };
    await draw();
    const stopChange = actions.onChange(() => draw());
    let first = true;
    stopStatus = onStatus((s) => {
      // The current status arrives at once; only later changes redraw.
      if (first) {
        first = false;
        return;
      }
      if (s.state === 'ready' && root.isConnected) draw();
    });
    return () => {
      stopChange();
      stopStatus?.();
    };
  }
};
