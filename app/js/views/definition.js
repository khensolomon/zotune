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
const MORE_STEP = 10;

const capital = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const plural = (n, one, many) => `${n.toLocaleString()} ${n === 1 ? one : many}`;

/** A link to a word, or to one sense of it (`khat.2`). */
function wordLink(word, number) {
  return h('a', { href: definitionPath(word), lang: 'ctd' }, word, number ? h('sup', null, String(number)) : null);
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

/* ---------- Empty query and not found ---------- */

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

/** Parts of a built word: it + na = itna. */
function partsLine(parts, whole) {
  return h(
    'div',
    { class: 'parts' },
    joinNodes(
      parts.map((p) =>
        h(
          p.word ? 'a' : 'span',
          { class: ['part', `part-${p.role}`], href: p.word ? definitionPath(p.word) : null, title: p.note ?? null },
          h('span', { class: 'part-w', lang: 'ctd' }, p.role === 'suffix' ? `-${p.text}` : p.role === 'prefix' ? `${p.text}-` : p.text),
          p.gloss ? h('span', { class: 'part-g' }, p.gloss) : null
        )
      ),
      h('span', { class: 'part-op', 'aria-hidden': 'true' }, '+')
    ),
    whole ? [h('span', { class: 'part-op', 'aria-hidden': 'true' }, '='), h('span', { class: 'part-whole', lang: 'ctd' }, whole)] : null
  );
}

async function notFound(root, word) {
  const [hits, readings] = await Promise.all([data.suggest(word, 6), data.analyse(word)]);
  mount(
    root,
    h(
      'div',
      { class: 'page' },
      h(
        'div',
        { class: 'notice' },
        h('h1', null, `No entry for “${word}” yet`),
        readings.length
          ? h(
              'section',
              { class: 'build' },
              h('h2', null, readings.length > 1 ? 'It may be read as one of these' : 'It may be read as'),
              readings.map((r) => partsLine(r, word)),
              h('p', { class: 'build-note' }, 'Worked out from the parts; not checked by a speaker.')
            )
          : null,
        hits.length
          ? [h('p', null, 'Words that start the same way'), h('div', { class: 'row' }, hits.map((hit) => h('a', { class: 'chip serif', href: definitionPath(hit.word) }, hit.word)))]
          : readings.length
            ? null
            : h('p', null, 'Check the spelling, or try the English word.'),
        h('div', null, h('a', { class: 'btn', href: `/workspace/entry/new?word=${encodeURIComponent(word)}` }, icon(ICONS.edit), 'Suggest this word'))
      )
    )
  );
}

/* ---------- Entry ---------- */

function iconToggle(kind, entry, on) {
  const labels = { bookmark: ['Bookmark', 'Remove bookmark'], like: ['Like', 'Unlike'] };
  const btn = h('button', { type: 'button', class: ['icon-btn', `icon-${kind}`], 'aria-pressed': String(on), 'aria-label': labels[kind][on ? 1 : 0], title: labels[kind][on ? 1 : 0] }, icon(kind === 'like' ? ICONS.heart : ICONS.bookmark));
  btn.addEventListener('click', async () => {
    const next = await actions.toggleMark(kind, entry);
    btn.setAttribute('aria-pressed', String(next));
    btn.setAttribute('aria-label', labels[kind][next ? 1 : 0]);
    btn.title = labels[kind][next ? 1 : 0];
  });
  return btn;
}

function feedback(sense, votes) {
  const thanks = h('span', { class: 'thanks', role: 'status' });
  const group = (kind, question, choices) => {
    const buttons = choices.map(([value, label, glyph]) => {
      const b = h(
        'button',
        { type: 'button', class: ['vote', `vote-${value}`], 'aria-pressed': String(votes[`${kind}:${sense.id}`] === value) },
        icon(glyph),
        label
      );
      b.addEventListener('click', async () => {
        const next = await actions.vote(kind, sense.id, value);
        for (const other of buttons) other.setAttribute('aria-pressed', String(other === b && next === value));
        thanks.textContent = next ? 'Thank you' : '';
      });
      return b;
    });
    return h('div', { class: 'ask', role: 'group', 'aria-label': question }, h('span', { class: 'ask-q' }, question), h('span', { class: 'ask-a' }, buttons));
  };
  return h(
    'div',
    { class: 'feedback' },
    group('correct', 'Is this meaning correct?', [
      ['yes', 'Yes', ICONS.check],
      ['no', 'No', ICONS.cross]
    ]),
    group('helpful', 'Did it help you?', [
      ['yes', 'Yes', ICONS.up],
      ['no', 'No', ICONS.down]
    ]),
    thanks
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
  return parts.length ? h('div', { class: 'meta-line' }, h('span', { class: 'meta-k' }, 'Found in'), parts.join(' · ')) : null;
}

function exampleItem(ex) {
  return h(
    'li',
    { class: 'example' },
    h('p', { class: 'example-zo', lang: 'ctd' }, ex.parts.map((p) => (p.mark ? h('b', null, p.text) : p.text))),
    h('p', { class: 'example-en' }, ex.en, ex.ref ? h('span', { class: 'example-ref' }, ex.ref) : null)
  );
}

function examplesBlock(sense) {
  if (!sense.examples?.length) return null;
  const list = h('ul', { class: 'examples', 'aria-label': 'Examples' }, sense.examples.map(exampleItem));
  let shown = sense.examples.length;
  const left = () => sense.exampleCount - shown;
  const more = h('button', { type: 'button', class: 'more' });
  const label = () => {
    more.textContent = `Show ${Math.min(MORE_STEP, left())} more of ${plural(left(), 'example', 'examples')}`;
    more.hidden = left() <= 0;
  };
  label();
  more.addEventListener('click', async () => {
    more.disabled = true;
    const next = await data.examples(sense.id, shown, MORE_STEP);
    list.append(...next.map(exampleItem));
    shown += next.length;
    more.disabled = false;
    label();
  });
  return [list, more];
}

function senseBlock(sense, n, votes, shown) {
  const gloss = sense.terms.length ? sense.terms.join(', ') : null;
  const tags = [...sense.fields, ...sense.categories];
  return h(
    'div',
    { class: 'sense', id: sense.id },
    h('span', { class: 'sense-n' }, String(n)),
    h(
      'div',
      { class: 'sense-body' },
      h(
        'div',
        { class: 'meaning' },
        gloss ? h('p', { class: 'gloss' }, gloss) : null,
        sense.definition ? h('p', { class: gloss ? 'explain' : 'gloss' }, marked(sense.definition)) : null,
        sense.text ? h('p', { class: 'remark' }, marked(sense.text)) : null
      ),
      examplesBlock(sense),
      sense.relations.some((r) => !shown.has(r.kind)) || sense.origin || tags.length || sense.bible.length || sense.named.length
        ? h(
            'div',
            { class: 'meta' },
            sense.relations.filter((r) => !shown.has(r.kind)).map((r) =>
              h('div', { class: 'meta-line' }, h('span', { class: 'meta-k' }, r.label), joinNodes(r.targets.map((t) => wordLink(t.word, t.number)), r.kind === 'j' ? ' + ' : ', '))
            ),
            sense.origin ? h('div', { class: 'meta-line' }, h('span', { class: 'meta-k' }, 'Origin'), sense.origin) : null,
            tags.length ? h('div', { class: 'meta-line' }, h('span', { class: 'meta-k' }, 'Subject'), tags.join(' · ')) : null,
            sources(sense)
          )
        : null,
      h('div', { class: 'sense-foot' }, h('span', { class: 'status', dataset: { status: sense.statusName } }, capital(sense.statusName)), feedback(sense, votes))
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

function familyBlock(title, group) {
  if (!group.total) return null;
  return h(
    'section',
    { class: 'family' },
    h('h2', null, title),
    h('div', { class: 'row' }, group.items.map((w) => h('a', { class: 'chip outline serif', href: definitionPath(w.word), title: w.gloss, lang: 'ctd' }, w.word))),
    group.total > group.items.length ? h('p', { class: 'meta-line' }, `and ${group.total - group.items.length} more`) : null
  );
}

function englishBlock(query, matches, current) {
  if (matches.length < 2) return null;
  return h(
    'section',
    { class: 'english-list' },
    h('h2', null, `Zolai words for “${query}”`),
    h(
      'ul',
      null,
      matches.map((m) =>
        h(
          'li',
          { class: m.id === current ? 'is-current' : null },
          h('a', { href: definitionPath(m.word), lang: 'ctd' }, m.word),
          h('span', { class: 'g' }, m.gloss)
        )
      )
    )
  );
}

function summaryLine(entry) {
  const types = [...new Set(entry.senses.map((s) => s.typeName))];
  const bits = [types.join(', ')];
  bits.push(plural(entry.senses.length, 'meaning', 'meanings'));
  const total = entry.senses.reduce((n, s) => n + (s.exampleCount ?? 0), 0);
  if (entry.senses.some((s) => s.exampleCount !== null)) bits.push(plural(total, 'example', 'examples'));
  return h('p', { class: 'summary' }, bits.join(' · '));
}

async function showEntry(root, entry, query) {
  const [bookmarked, liked, votes] = await Promise.all([
    actions.isMarked('bookmark', entry.id),
    actions.isMarked('like', entry.id),
    actions.votesFor(entry.senses.map((s) => s.id))
  ]);

  const typedZolai = matchKey(query) === matchKey(entry.word) || entry.alsoWritten.some((w) => matchKey(w) === matchKey(query));
  const english = typedZolai ? [] : await data.english(query, 30);

  const groups = [];
  for (const s of entry.senses) {
    let g = groups.find((x) => x.type === s.typeName);
    if (!g) groups.push((g = { type: s.typeName, senses: [] }));
    g.senses.push(s);
  }
  const examplesMissing = entry.senses.some((s) => s.examples === null);
  const build = entry.construction;
  // What the "How it is built" block already says is not repeated per meaning.
  const shownKinds = new Set(build?.kind === 'base' ? ['b'] : build?.kind === 'joins' ? ['j'] : []);

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
          englishBlock(query, english, entry.id),
          h(
            'header',
            { class: 'entry-head' },
            entry.redirectFrom.length ? h('p', { class: 'meta-line' }, `“${entry.redirectFrom.join(', ')}” is written as`) : null,
            h(
              'div',
              { class: 'headline' },
              h('h1', { class: 'headword', lang: 'ctd' }, entry.word),
              h('div', { class: 'head-tools' }, iconToggle('bookmark', entry, bookmarked), iconToggle('like', entry, liked))
            ),
            summaryLine(entry),
            entry.alsoWritten.length ? h('p', { class: 'also' }, 'Also written ', joinNodes(entry.alsoWritten.map((w) => wordLink(w)), ', ')) : null,
            entry.partOf.length ? h('p', { class: 'also' }, 'Part of ', joinNodes(entry.partOf.map((t) => wordLink(t.word, t.number)))) : null
          ),
          build
            ? h(
                'section',
                { class: 'build' },
                h('h2', null, build.kind === 'analysis' ? 'May be read as' : build.kind === 'double' ? 'A word written twice' : 'How it is built'),
                build.parts ? partsLine(build.parts, entry.word) : null,
                build.notes.map((n) => h('p', { class: 'build-note' }, n)),
                build.kind === 'analysis' ? h('p', { class: 'build-note' }, 'Worked out from the parts; not checked by a speaker.') : null
              )
            : null,
          groups.map((g) => h('section', { class: 'pos' }, h('h2', null, g.type), g.senses.map((s, i) => senseBlock(s, i + 1, votes, shownKinds)))),
          examplesMissing ? h('p', { class: 'meta-line' }, 'Example sentences are not on this device yet. ', h('a', { href: '/workspace' }, 'Get them in Workspace')) : null,
          familyBlock(`Words built on ${entry.word}`, entry.builtOn),
          familyBlock(`Words and phrases with ${entry.word}`, entry.usedIn)
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
