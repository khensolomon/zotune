// One smart search input: Zolai and English at once, suggestions as a
// combobox, icon only (no "Search" or "Look up" label).

import { h, icon, ICONS } from '../dom.js';
import { data } from '../search-client.js';
import { navigate, definitionPath } from '../router.js';
import { recentWords } from '../recent.js';

const PLACEHOLDER = 'A word in Zolai or English';
const CYCLE = ['Try “itna”…', 'Try “love”…', 'Try “lungdamna”…', PLACEHOLDER];
const STARTERS = [
  { word: 'itna', gloss: 'love, affection' },
  { word: 'lungdamna', gloss: 'joy, gladness' },
  { word: 'love', gloss: 'English works too' }
];

let uid = 0;

// Starters from the data replace the fixed ones once the dictionary is ready.
let starters = STARTERS;
data
  .starters()
  .then((st) => {
    const list = [st.today, ...st.more, st.english].filter(Boolean).map((w) => ({ word: w.word, gloss: w.gloss }));
    if (list.length) starters = list;
  })
  .catch(() => {});

/** Removes the dimming, as when the page changes. */
export function clearDim() {
  if (dimOwner) setDim(dimOwner, false);
}

// One dimming layer for the page, shared by every search field.
let dimLayer = null;
let dimOwner = null;
function setDim(owner, on) {
  if (!dimLayer) {
    dimLayer = document.createElement('div');
    dimLayer.className = 'dim';
    dimLayer.setAttribute('aria-hidden', 'true');
    dimLayer.addEventListener('mousedown', (e) => e.preventDefault());
    dimLayer.addEventListener('click', () => dimOwner?.dismiss());
    document.body.append(dimLayer);
  }
  if (on) dimOwner = owner;
  else if (dimOwner !== owner) return;
  dimLayer.classList.toggle('on', on);
  document.body.classList.toggle('is-dimmed', on);
  owner.form.classList.toggle('is-active', on);
}

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
  // The page dims only when the person chose the field (tap, click, typing,
  // the / key), never when the page focuses it on its own.
  let chosen = false;
  const owner = {
    form,
    dismiss: () => {
      close();
      input.blur();
    }
  };
  const updateDim = () => setDim(owner, document.activeElement === input && (chosen || !list.hidden));
  let active = -1;
  let ticket = 0;
  let timer = 0;

  function close() {
    list.hidden = true;
    form.classList.remove('is-open');
    input.setAttribute('aria-expanded', 'false');
    updateDim();
    input.removeAttribute('aria-activedescendant');
    active = -1;
  }

  function highlight(i) {
    active = i;
    list.querySelectorAll('[role="option"]').forEach((li, j) => li.setAttribute('aria-selected', String(j === i)));
    if (i >= 0) input.setAttribute('aria-activedescendant', `${id}-o${i}`);
    else input.removeAttribute('aria-activedescendant');
  }

  function go(word) {
    close();
    const q = word.trim();
    input.blur();
    navigate(q ? definitionPath(q) : '/definition');
  }

  /** Shows options; an item with a `group` starts a labelled group. */
  function show(items) {
    hits = items;
    const rows = [];
    items.forEach((hit, i) => {
      if (hit.group) rows.push(h('li', { class: 'group', role: 'presentation' }, hit.group));
      rows.push(
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
          hit.side === 'english' ? h('span', { class: 'side' }, h('span', { class: 'qt' }, `“${hit.matched}”`)) : null
        )
      );
    });
    list.replaceChildren(...rows);
    const open = items.length > 0 && document.activeElement === input;
    list.hidden = !open;
    form.classList.toggle('is-open', open);
    input.setAttribute('aria-expanded', String(open));
    highlight(-1);
    updateDim();
  }

  /** What the list offers before anything is typed: recent words, then starters. */
  function showStart() {
    const recent = recentWords().slice(0, 5);
    const seen = new Set(recent.map((r) => r.word));
    const tries = starters.filter((r) => !seen.has(r.word)).slice(0, 4);
    show([
      ...recent.map((r, i) => ({ ...r, group: i === 0 ? 'Recent' : null })),
      ...tries.map((r, i) => ({ ...r, group: i === 0 ? (recent.length ? 'Try' : 'Try one of these') : null }))
    ]);
  }

  async function suggestFor(q) {
    const mine = ++ticket;
    try {
      const items = await data.suggest(q, 8);
      if (mine !== ticket) return;
      if (items.length) show(items);
      else show([{ word: q.trim(), gloss: 'Search for this', group: 'No word starts like this' }]);
    } catch (err) {
      console.error('zotune: suggestions failed:', err.message);
    }
  }

  input.addEventListener('pointerdown', () => {
    const already = document.activeElement === input;
    chosen = true;
    if (already && list.hidden) openList();
    updateDim();
  });
  input.addEventListener('input', () => {
    chosen = true;
    updateDim();
    clearTimeout(timer);
    const q = input.value;
    if (!q.trim()) {
      showStart();
      return;
    }
    timer = setTimeout(() => suggestFor(q), 70);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' && list.hidden) {
      e.preventDefault();
      chosen = true;
      openList();
      return;
    }
    if (e.key === 'ArrowDown' && hits.length) {
      e.preventDefault();
      if (list.hidden) show(hits);
      highlight((active + 1) % hits.length);
    } else if (e.key === 'ArrowUp' && hits.length) {
      e.preventDefault();
      highlight(active <= 0 ? hits.length - 1 : active - 1);
    } else if (e.key === 'Escape') {
      if (!list.hidden) {
        chosen = false;
        close();
      } else input.blur();
    }
  });

  input.addEventListener('blur', () =>
    setTimeout(() => {
      chosen = false;
      close();
    }, 0)
  );
  // The list opens with something in it whenever the person is in the box,
  // so the highlighted box never shows an empty list.
  const openList = () => {
    if (!chosen || document.activeElement !== input) return;
    if (!input.value.trim()) showStart();
    else if (hits.length && !hits[0].group) show(hits);
    else suggestFor(input.value);
  };
  input.addEventListener('focus', () => {
    openList();
    updateDim();
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
        setDim(owner, false);
        return;
      }
      if (input.value) return;
      input.placeholder = CYCLE[i++ % CYCLE.length];
    }, 2200);
  }

  return {
    el: form,
    input,
    /** Focuses the field; `{ chosen: true }` when the person asked for it (dims the page). */
    focus: ({ chosen: byPerson = false } = {}) => {
      chosen = byPerson;
      input.focus();
      openList();
      updateDim();
    }
  };
}
