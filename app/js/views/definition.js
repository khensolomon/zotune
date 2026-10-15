import { h, icon, ICONS, mount } from '../dom.js';
import { data } from '../search-client.js';
import { definitionPath, navigate } from '../router.js';
import { markedParts, matchKey } from '../text.js';
import { loadingNote } from '../components/loading.js';
import * as actions from '../actions.js';

const EXAMPLES = [
  { k: 'A Zolai word', w: 'itna', g: 'love, affection' },
  { k: 'An English word', w: 'love', g: 'finds the Zolai words for it' },
  { k: 'Written two ways', w: 'a om', g: 'joined or split, both work' }
];
const MAX_VERSES = 6;

const capital = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** A link to a word, or to one sense of it (`khat.2`). */
function wordLink(word, number) {
  return h('a', { href: definitionPath(word) }, word, number ? h('sup', null, String(number)) : null);
}

/** Prose with `{zolai}` mentions and `<word>` / `<word.n>` links. */
function marked(text) {
  return markedParts(text).map((p) => {
    if (p.kind === 'zo') return h('span', { class: 'zo', lang: 'ctd' }, p.text);
    if (p.kind === 'link') {
      const m = /^(.+)\.(\d+)$/.exec(p.text);
      return m ? wordLink(m[1], m[2]) : wordLink(p.text);
    }
    return p.text;
  });
}

function joinNodes(nodes, sep = ', ') {
  return nodes.flatMap((n, i) => (i ? [sep, n] : [n]));
}

function howTo(root) {
  mount(
    root,
    h(
      'div',
      { class: 'page' },
      h(
        'div',
        { class: 'howto' },
        h('h1', null, 'Type a word to see what it means'),
        loadingNote(),
        h(
          'div',
          { class: 'cards' },
          EXAMPLES.map((e) =>
            h('a', { class: 'card', href: definitionPath(e.w) }, h('span', { class: 'card-k' }, e.k), h('span', { class: 'card-w' }, e.w), h('span', { class: 'card-g' }, e.g))
          )
        ),
        h('p', { class: 'tip' }, 'Zolai or English, no need to choose. Press / to jump to the search box from anywhere.')
      )
    )
  );
}

async function notFound(root, word) {
  const hits = await data.suggest(word, 6);
  mount(
    root,
    h(
      'div',
      { class: 'page' },
      h(
        'div',
        { class: 'notice' },
        h('h1', null, `No entry for “${word}” yet`),
        hits.length
          ? [h('p', null, 'Did you mean'), h('div', { class: 'row' }, hits.map((hit) => h('a', { class: 'chip serif', href: definitionPath(hit.word) }, hit.word)))]
          : h('p', null, 'Check the spelling, or try the English word.'),
        h('div', null, h('a', { class: 'btn', href: `/workspace/entry/new?word=${encodeURIComponent(word)}` }, icon(ICONS.edit), 'Suggest this word'))
      )
    )
  );
}

function toggle(label, kind, entry, on) {
  const btn = h('button', { type: 'button', class: 'btn toggle', 'aria-pressed': String(on) }, icon(kind === 'like' ? ICONS.heart : ICONS.bookmark), label);
  btn.addEventListener('click', async () => {
    const next = await actions.toggleMark(kind, entry);
    btn.setAttribute('aria-pressed', String(next));
  });
  return btn;
}

function feedback(sense, votes) {
  const group = (kind, question) => {
    const buttons = ['yes', 'no'].map((value) => {
      const b = h('button', { type: 'button', class: 'vote', 'aria-pressed': String(votes[`${kind}:${sense.id}`] === value) }, value === 'yes' ? 'Yes' : 'No');
      b.addEventListener('click', async () => {
        const next = await actions.vote(kind, sense.id, value);
        for (const other of buttons) other.setAttribute('aria-pressed', String(other === b && next === value));
      });
      return b;
    });
    return h('div', { class: 'feedback-group', role: 'group', 'aria-label': question }, h('span', null, question), buttons);
  };
  return h(
    'div',
    { class: 'feedback' },
    h('span', { class: 'status', dataset: { status: sense.statusName } }, capital(sense.statusName)),
    group('helpful', 'Helpful?'),
    group('correct', 'Correct?')
  );
}

function sources(sense) {
  const parts = [];
  if (sense.bible.length) {
    const shown = sense.bible.slice(0, MAX_VERSES).join(', ');
    const more = sense.bible.length - MAX_VERSES;
    parts.push(more > 0 ? `${shown} and ${more} more` : shown);
  }
  parts.push(...sense.named);
  return parts.length ? h('div', { class: 'related' }, 'Found in ', parts.join(' · ')) : null;
}

function senseBlock(sense, n, votes) {
  const gloss = sense.terms.length ? sense.terms.join(', ') : null;
  const tags = [...sense.fields, ...sense.categories];
  return h(
    'div',
    { class: 'sense', id: sense.id },
    h('span', { class: 'sense-n' }, String(n)),
    h(
      'div',
      { class: 'sense-body' },
      gloss ? h('div', { class: 'gloss' }, gloss) : null,
      sense.definition ? h('div', { class: gloss ? 'prose' : 'gloss' }, marked(sense.definition)) : null,
      sense.text ? h('div', { class: 'prose' }, marked(sense.text)) : null,
      (sense.examples ?? []).map((ex) =>
        h(
          'div',
          { class: 'example' },
          h('div', { class: 'example-zo', lang: 'ctd' }, ex.parts.map((p) => (p.mark ? h('b', null, p.text) : p.text))),
          h('div', { class: 'example-en' }, ex.en, ex.ref ? ` · ${ex.ref}` : '')
        )
      ),
      sense.exampleCount > (sense.examples?.length ?? 0) ? h('div', { class: 'related' }, `${sense.exampleCount - sense.examples.length} more examples`) : null,
      sense.relations.map((r) => h('div', { class: 'related' }, `${r.label}: `, joinNodes(r.targets.map((t) => wordLink(t.word, t.number)), r.kind === 'j' ? ' + ' : ', '))),
      sense.origin ? h('div', { class: 'related' }, `From ${sense.origin}`) : null,
      tags.length ? h('div', { class: 'related' }, tags.join(' · ')) : null,
      sources(sense),
      feedback(sense, votes)
    )
  );
}

function statusSummary(entry) {
  const counts = new Map();
  for (const s of entry.senses) counts.set(s.statusName, (counts.get(s.statusName) ?? 0) + 1);
  return [...counts].map(([name, count]) =>
    h('span', { class: 'status', dataset: { status: name } }, entry.senses.length > 1 ? `${capital(name)}: ${count}` : capital(name))
  );
}

async function showEntry(root, entry, query) {
  const [bookmarked, liked, votes] = await Promise.all([
    actions.isMarked('bookmark', entry.id),
    actions.isMarked('like', entry.id),
    actions.votesFor(entry.senses.map((s) => s.id))
  ]);

  const exact = matchKey(query) === matchKey(entry.word) || entry.redirectFrom.some((w) => matchKey(w) === matchKey(query));
  let others = [];
  if (!exact) others = (await data.suggest(query, 6)).filter((hit) => hit.id !== entry.id);

  const groups = [];
  for (const s of entry.senses) {
    let g = groups.find((x) => x.type === s.typeName);
    if (!g) groups.push((g = { type: s.typeName, senses: [] }));
    g.senses.push(s);
  }
  const examplesMissing = entry.senses.some((s) => s.examples === null);

  mount(
    root,
    h(
      'div',
      { class: 'page' },
      h(
        'div',
        { class: 'definition' },
        h(
          'article',
          { class: 'entry' },
          h(
            'div',
            { class: 'entry-head' },
            entry.redirectFrom.length ? h('div', { class: 'related' }, `“${entry.redirectFrom.join(', ')}” leads to this word`) : null,
            exact
              ? null
              : h('div', { class: 'related' }, `Showing the Zolai word for “${query}”`, others.length ? ' · also: ' : null, joinNodes(others.map((o) => wordLink(o.word)))),
            h('h1', { class: 'headword', lang: 'ctd' }, entry.word),
            entry.partOf.length ? h('div', { class: 'origin' }, 'Part of ', joinNodes(entry.partOf.map((t) => wordLink(t.word, t.number)))) : null,
            h('div', { class: 'row' }, toggle('Bookmark', 'bookmark', entry, bookmarked), toggle('Like', 'like', entry, liked))
          ),
          groups.map((g) => h('section', { class: 'pos' }, h('h2', null, g.type), g.senses.map((s, i) => senseBlock(s, i + 1, votes)))),
          examplesMissing ? h('p', { class: 'related' }, 'Example sentences are not on this device yet. ', h('a', { href: '/workspace' }, 'Get them in Workspace')) : null
        ),
        h(
          'aside',
          { class: 'aside', 'aria-label': 'About this entry' },
          entry.english.length
            ? h('div', { class: 'aside-block' }, h('span', { class: 'aside-label' }, 'In English'), h('div', { class: 'row' }, entry.english.slice(0, 12).map((e) => h('a', { class: 'chip sm', href: definitionPath(e) }, e))))
            : null,
          h('div', { class: 'aside-block' }, h('span', { class: 'aside-label' }, 'Status'), statusSummary(entry)),
          h('div', null, h('a', { class: 'btn', href: `/workspace/entry/${encodeURIComponent(entry.id)}` }, icon(ICONS.edit), 'Improve this entry'))
        )
      )
    )
  );
}

export default {
  nav: 'definition',
  layout: 'definition',
  title: (params) => params.word ?? 'Definition',
  async render(root, { word }) {
    if (!word) {
      howTo(root);
      return null;
    }
    mount(root, h('div', { class: 'page' }, loadingNote()));
    const entry = await data.resolve(word);
    if (!entry) {
      await notFound(root, word);
      return null;
    }
    await showEntry(root, entry, word);

    // Hidden navigation: [ and ] step through headwords.
    const { prev, next } = await data.neighbours(entry.id);
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.target.closest?.('input, textarea')) return;
      if (e.key === '[' && prev) navigate(definitionPath(prev));
      if (e.key === ']' && next) navigate(definitionPath(next));
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }
};
