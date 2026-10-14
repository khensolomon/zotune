import { h, icon, ICONS, mount } from '../dom.js';
import { data } from '../search-client.js';
import { definitionPath, navigate } from '../router.js';
import { markedParts, matchKey } from '../text.js';
import * as actions from '../actions.js';

const STATUS_LABEL = {
  low: 'Low confidence',
  draft: 'Draft',
  reviewed: 'Reviewed',
  confirmed: 'Confirmed',
  disputed: 'Disputed',
  retired: 'Retired'
};

const EXAMPLES = [
  { k: 'A Zolai word', w: 'itna', g: 'love; affection' },
  { k: 'An English word', w: 'love', g: 'finds the Zolai words for it' },
  { k: 'Written two ways', w: 'it na', g: 'joined or split, both work' }
];

/** Prose with `{zolai}` and `<link>` marks. */
function marked(text) {
  return markedParts(text).map((p) => {
    if (p.kind === 'zo') return h('span', { class: 'zo' }, p.text);
    if (p.kind === 'link') return h('a', { href: definitionPath(p.text) }, p.text);
    return p.text;
  });
}

/** Example sentence with the headword (and its spellings) in bold. */
function emphasise(sentence, words) {
  const escaped = words.filter(Boolean).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!escaped.length) return sentence;
  const re = new RegExp(`(^|[^\\p{L}])(${escaped.join('|')})(?=$|[^\\p{L}])`, 'giu');
  const out = [];
  let last = 0;
  let m;
  while ((m = re.exec(sentence))) {
    const start = m.index + m[1].length;
    if (start > last) out.push(sentence.slice(last, start));
    out.push(h('b', null, m[2]));
    last = start + m[2].length;
  }
  if (last < sentence.length) out.push(sentence.slice(last));
  return out;
}

function links(label, words) {
  if (!words?.length) return null;
  return [`${label}: `, words.flatMap((w, i) => [i ? ', ' : null, h('a', { href: definitionPath(w) }, w)])];
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
  return h('div', { class: 'feedback' }, group('helpful', 'Helpful?'), group('correct', 'Correct?'));
}

function senseBlock(sense, n, words, votes) {
  return h(
    'div',
    { class: 'sense', id: sense.id },
    h('span', { class: 'sense-n' }, String(n)),
    h(
      'div',
      { class: 'sense-body' },
      h('div', { class: 'gloss' }, sense.gloss),
      sense.definition ? h('div', { class: 'prose' }, marked(sense.definition)) : null,
      (sense.examples ?? []).map((ex) =>
        h(
          'div',
          { class: 'example' },
          h('div', { class: 'example-zo', lang: 'ctd' }, emphasise(ex.zo, words)),
          h('div', { class: 'example-en' }, ex.en, ex.ref ? ` · ${ex.ref}` : '')
        )
      ),
      sense.note ? h('div', { class: 'related' }, marked(sense.note)) : null,
      sense.similar?.length || sense.opposite?.length
        ? h('div', { class: 'related' }, links('Similar', sense.similar), sense.similar?.length && sense.opposite?.length ? ' · ' : null, links('Opposite', sense.opposite))
        : null,
      feedback(sense, votes)
    )
  );
}

async function showEntry(root, entry, query) {
  const words = [entry.word, ...(entry.spellings ?? [])];
  const [bookmarked, liked, votes] = await Promise.all([
    actions.isMarked('bookmark', entry.id),
    actions.isMarked('like', entry.id),
    actions.votesFor(entry.senses.map((s) => s.id))
  ]);

  const exact = matchKey(query) === matchKey(entry.word) || (entry.spellings ?? []).some((s) => matchKey(s) === matchKey(query));
  let others = [];
  if (!exact) others = (await data.suggest(query, 6)).filter((hit) => hit.id !== entry.id);

  const groups = [];
  for (const s of entry.senses) {
    let g = groups.find((x) => x.pos === s.pos);
    if (!g) groups.push((g = { pos: s.pos, senses: [] }));
    g.senses.push(s);
  }

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
          { class: 'entry', lang: 'en' },
          h(
            'div',
            { class: 'entry-head' },
            exact ? null : h('div', { class: 'related' }, `Showing the Zolai word for “${query}”`, others.length ? ' · also: ' : null, others.flatMap((o, i) => [i ? ', ' : null, h('a', { href: definitionPath(o.word) }, o.word)])),
            h('h1', { class: 'headword', lang: 'ctd' }, entry.word),
            entry.syllables || entry.origin ? h('div', { class: 'origin' }, entry.syllables ?? '', entry.syllables && entry.origin ? ' · ' : '', entry.origin ? marked(entry.origin) : null) : null,
            entry.spellings?.length
              ? h('div', { class: 'row' }, entry.spellings.map((s) => h('a', { class: 'chip outline', href: definitionPath(s) }, 'also written ', h('b', null, s))))
              : null,
            h('div', { class: 'row' }, toggle('Bookmark', 'bookmark', entry, bookmarked), toggle('Like', 'like', entry, liked))
          ),
          groups.map((g) => h('section', { class: 'pos' }, h('h2', null, g.pos), g.senses.map((s, i) => senseBlock(s, i + 1, words, votes))))
        ),
        h(
          'aside',
          { class: 'aside', 'aria-label': 'About this entry' },
          entry.english?.length
            ? h('div', { class: 'aside-block' }, h('span', { class: 'aside-label' }, 'In English'), h('div', { class: 'row' }, entry.english.map((e) => h('a', { class: 'chip sm', href: definitionPath(e) }, e))))
            : null,
          h(
            'div',
            { class: 'aside-block' },
            h('span', { class: 'aside-label' }, 'Status'),
            h('span', { class: 'status', dataset: { status: entry.status ?? 'draft' } }, STATUS_LABEL[entry.status] ?? 'Draft'),
            entry.statusNote ? h('span', null, entry.statusNote) : null
          ),
          entry.source ? h('div', { class: 'aside-block' }, h('span', { class: 'aside-label' }, 'Found in'), h('span', null, entry.source)) : null,
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
