import { h, mount } from '../dom.js';
import { searchField } from '../components/search-field.js';
import { definitionPath } from '../router.js';
import { loadingNote } from '../components/loading.js';
import { logo } from '../logo.js';
import { data, onStatus } from '../search-client.js';

// Shown until the dictionary is ready; then replaced by words of the day.
const FIRST = [
  { word: 'itna', gloss: 'love, affection' },
  { word: 'lungdamna', gloss: 'joy, gladness' },
  { word: 'love', gloss: 'English works too' }
];

function chips(list) {
  return [h('span', null, 'Try'), list.map((w) => h('a', { class: 'chip', href: definitionPath(w.word), title: w.gloss }, w.word))];
}

export default {
  nav: 'home',
  layout: 'home',
  title: '',
  render(root, _params, ctx) {
    const field = searchField({ size: 'lg' });
    ctx.registerField(field);
    const tryRow = h('div', { class: 'try' }, chips(FIRST));
    mount(
      root,
      h(
        'div',
        { class: 'home' },
        h('div', { class: 'home-brand' }, h('h1', { class: 'visually-hidden' }, 'zotune'), logo(48), h('p', { class: 'tagline' }, 'Zo kammal — every Zolai word, in English')),
        h('div', { class: 'home-search' }, field.el, tryRow, loadingNote())
      )
    );
    if (matchMedia('(pointer: fine)').matches) field.focus();

    const stop = onStatus(async (s) => {
      if (s.state !== 'ready') return;
      queueMicrotask(() => stop());
      try {
        const st = await data.starters();
        const list = [st.today, st.more[0], st.english].filter(Boolean);
        if (list.length && tryRow.isConnected) tryRow.replaceChildren(...chips(list).flat());
      } catch (err) {
        console.error('zotune: starters failed:', err.message);
      }
    });
    return () => stop();
  }
};
