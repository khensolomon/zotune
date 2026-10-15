import { h, mount } from '../dom.js';
import { data } from '../search-client.js';
import { definitionPath } from '../router.js';
import * as actions from '../actions.js';

const MIN_FILL_MS = 2500;

function field(name, label, { value = '', multiline = false, serif = false, help = null, required = false } = {}) {
  const id = `f-${name}`;
  const control = multiline
    ? h('textarea', { id, name, class: serif ? 'serif' : null, required })
    : h('input', { id, name, type: 'text', class: serif ? 'serif' : null, required, autocomplete: 'off' });
  control.value = value;
  return h('div', { class: 'field' }, h('label', { for: id }, label), control, help ? h('small', null, help) : null);
}

export default {
  nav: null,
  layout: 'page',
  title: (params) => (params.id === 'new' ? 'Suggest a word' : 'Improve this entry'),
  async render(root, { id }) {
    const isNew = id === 'new';
    const entry = isNew ? null : await data.entry(id);
    if (!isNew && !entry) throw new Error(`No entry with id “${id}”.`);
    const first = entry?.senses?.[0] ?? {};
    const ex = first.examples?.[0];
    const word = isNew ? new URLSearchParams(location.search).get('word') ?? '' : entry.word;
    const opened = Date.now();

    const message = h('p', { class: 'saved', role: 'status' });
    const form = h(
      'form',
      { class: 'form', novalidate: true },
      field('word', 'Zolai word', { value: word, serif: true, required: true }),
      field('pos', 'Kind of word', { value: first.typeName ?? '', help: 'For example noun, verb, adjective.' }),
      field('gloss', 'Meaning in English', { value: (first.terms ?? []).join(', '), required: true, help: 'Short, like a dictionary: “love, affection”.' }),
      field('definition', 'Explanation', { value: first.definition ?? '', multiline: true, help: 'Optional. Write Zolai words in {braces}.' }),
      field('exampleZo', 'Example in Zolai', { value: ex ? ex.parts.map((p) => p.text).join('') : '', multiline: true, serif: true }),
      field('exampleEn', 'The example in English', { value: ex?.en ?? '', multiline: true }),
      field('note', 'Anything a reviewer should know', { multiline: true, help: 'Where the word is used, other spellings, a source.' }),
      h('div', { class: 'trap', 'aria-hidden': 'true' }, h('label', { for: 'f-website' }, 'Website'), h('input', { id: 'f-website', name: 'website', tabindex: '-1', autocomplete: 'off' })),
      h('div', { class: 'row' }, h('button', { type: 'submit', class: 'btn primary' }, 'Save suggestion'), entry ? h('a', { class: 'btn', href: definitionPath(entry.word) }, 'Back to the entry') : null),
      message
    );

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fields = Object.fromEntries([...new FormData(form)].map(([k, v]) => [k, String(v).trim()]));
      if (fields.website || Date.now() - opened < MIN_FILL_MS) {
        message.textContent = 'Please take a moment to check your suggestion, then save again.';
        return;
      }
      delete fields.website;
      if (!fields.word || !fields.gloss) {
        message.textContent = 'A Zolai word and its meaning in English are needed.';
        (fields.word ? form.elements.gloss : form.elements.word).focus();
        return;
      }
      await actions.propose(isNew ? `new:${fields.word}` : entry.id, { ...fields, sense: first.id ?? null });
      message.textContent = 'Saved. A reviewer will check it once sending is switched on.';
    });

    mount(
      root,
      h(
        'div',
        { class: 'page' },
        h(
          'div',
          { class: 'doc' },
          h('h1', null, isNew ? 'Suggest a word' : `Improve “${entry.word}”`),
          h('p', null, 'Change what is wrong or missing. Every suggestion is checked by a reviewer before it appears in the dictionary.'),
          form
        )
      )
    );
  }
};
