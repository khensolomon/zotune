// One smart search input: Zolai and English at once, suggestions as a
// combobox, icon only (no "Search" or "Look up" label).

import { h, icon, ICONS } from '../dom.js';
import { data } from '../search-client.js';
import { navigate, definitionPath } from '../router.js';

const PLACEHOLDER = 'A word in Zolai or English';
const CYCLE = ['Try “itna”…', 'Try “love”…', 'Try “lungdamna”…', PLACEHOLDER];

let uid = 0;

export function searchField({ size = 'md', value = '', hint = false, cycle = false } = {}) {
  const id = `q${++uid}`;
  const listId = `${id}-list`;
  const input = h('input', {
    id,
    class: 'search-input',
    type: 'search',
    name: 'q',
    autocomplete: 'off',
    autocapitalize: 'off',
    spellcheck: 'false',
    enterkeyhint: 'search',
    role: 'combobox',
    'aria-autocomplete': 'list',
    'aria-expanded': 'false',
    'aria-controls': listId,
    'aria-label': 'Search a word in Zolai or English',
    placeholder: PLACEHOLDER
  });
  input.value = value;
  const list = h('ul', { id: listId, class: 'suggest', role: 'listbox', 'aria-label': 'Suggestions', hidden: true });
  const form = h(
    'form',
    { class: ['search', `search-${size}`], role: 'search', action: '/definition' },
    h(
      'div',
      { class: 'search-box' },
      input,
      hint ? h('kbd', { class: 'search-key', 'aria-hidden': 'true', title: 'Press / to search' }, '/') : null,
      h('button', { type: 'submit', class: 'search-go', 'aria-label': 'Search' }, icon(ICONS.search))
    ),
    list
  );

  let hits = [];
  let active = -1;
  let ticket = 0;
  let timer = 0;

  function close() {
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    active = -1;
  }

  function highlight(i) {
    active = i;
    [...list.children].forEach((li, j) => li.setAttribute('aria-selected', String(j === i)));
    if (i >= 0) input.setAttribute('aria-activedescendant', `${id}-o${i}`);
    else input.removeAttribute('aria-activedescendant');
  }

  function go(word) {
    close();
    const q = word.trim();
    input.blur();
    navigate(q ? definitionPath(q) : '/definition');
  }

  function show(items) {
    hits = items;
    list.replaceChildren(
      ...items.map((hit, i) =>
        h(
          'li',
          {
            id: `${id}-o${i}`,
            role: 'option',
            'aria-selected': 'false',
            onmousedown: (e) => e.preventDefault(),
            onclick: () => go(hit.word)
          },
          h('span', { class: 'w' }, hit.word),
          h('span', { class: 'g' }, hit.gloss),
          hit.side === 'english' ? h('span', { class: 'side' }, `“${hit.matched}”`) : null
        )
      )
    );
    const open = items.length > 0 && document.activeElement === input;
    list.hidden = !open;
    input.setAttribute('aria-expanded', String(open));
    highlight(-1);
  }

  input.addEventListener('input', () => {
    clearTimeout(timer);
    const q = input.value;
    if (!q.trim()) {
      show([]);
      return;
    }
    timer = setTimeout(async () => {
      const mine = ++ticket;
      try {
        const items = await data.suggest(q, 8);
        if (mine === ticket) show(items);
      } catch (err) {
        console.error('zotune: suggestions failed:', err.message);
      }
    }, 70);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' && hits.length) {
      e.preventDefault();
      if (list.hidden) show(hits);
      highlight((active + 1) % hits.length);
    } else if (e.key === 'ArrowUp' && hits.length) {
      e.preventDefault();
      highlight(active <= 0 ? hits.length - 1 : active - 1);
    } else if (e.key === 'Escape') {
      if (!list.hidden) close();
      else input.blur();
    }
  });

  input.addEventListener('blur', () => setTimeout(close, 0));
  input.addEventListener('focus', () => {
    if (hits.length && input.value.trim()) show(hits);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    go(active >= 0 ? hits[active].word : input.value);
  });

  if (cycle) {
    let i = 0;
    const t = setInterval(() => {
      if (!form.isConnected) {
        clearInterval(t);
        return;
      }
      if (input.value) return;
      input.placeholder = CYCLE[i++ % CYCLE.length];
    }, 2200);
  }

  return { el: form, input, focus: () => input.focus() };
}
