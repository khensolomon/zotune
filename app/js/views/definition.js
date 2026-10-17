import { h, icon, ICONS, mount } from '../dom.js';
import { data } from '../search-client.js';
import { definitionPath, navigate } from '../router.js';
import { markedParts, matchKey } from '../text.js';
import { loadingNote } from '../components/loading.js';
import { classify } from '../query.js';
import * as analytics from '../analytics.js';
import { fitGloss } from '../gloss.js';
import { slug } from '../markdown.js';
import * as actions from '../actions.js';
import { rememberWord, recentWords } from '../recent.js';

const MAX_VERSES = 6;
const MORE_STEP = 10;

/** A quoted word, set darker than the text around it. */
const qt = (text) => h('span', { class: 'qt' }, `“${text}”`);

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

/* ---------- Empty query: a guide that fits the reader ---------- */

function guideCard(kicker, w, gloss, extra = null) {
  return h('a', { class: 'card', href: definitionPath(w) }, h('span', { class: 'card-k' }, kicker), h('span', { class: 'card-w', lang: 'ctd' }, w), gloss ? h('span', { class: 'card-g' }, gloss) : null, extra);
}

function todayBlock(t) {
  if (!t) return null;
  return h(
    'a',
    { class: 'today', href: definitionPath(t.word) },
    h('span', { class: 'card-k' }, 'Word of the day'),
    h('span', { class: 'today-w', lang: 'ctd' }, t.word),
    h('span', { class: 'today-t' }, t.typeName),
    h('span', { class: 'today-g' }, t.gloss),
    t.example
      ? h('span', { class: 'today-ex' }, h('q', { lang: 'ctd' }, t.example.parts.map((p) => (p.mark ? h('b', null, p.text) : p.text))), h('span', { class: 'today-en' }, t.example.en))
      : null
  );
}

async function guide(root) {
  const recent = recentWords();
  const firstTime = recent.length === 0;
  const box = h('div', { class: 'guide' }, h('h1', null, firstTime ? 'Find any Zolai word, in Zolai or English' : 'Welcome back'), loadingNote());
  mount(root, h('div', { class: 'page' }, box));
  let st = null;
  try {
    st = await data.starters();
  } catch (err) {
    box.append(h('p', { class: 'loading-note is-error' }, err.message));
    return;
  }
  const cards = [
    st.more[0] && guideCard('Type a Zolai word', st.more[0].word, st.more[0].gloss),
    st.english && guideCard('Or an English word', st.english.word, st.english.gloss),
    st.twoWays && guideCard('Joined or split', st.twoWays.joined, `same as “${st.twoWays.word}”: ${st.twoWays.gloss}`),
    st.phrase && guideCard('A phrase', st.phrase.word, st.phrase.gloss)
  ].filter(Boolean);
  const tips = h(
    'ul',
    { class: 'tips' },
    h('li', null, 'Words written joined or split, with or without a hyphen, are found either way.'),
    h('li', null, 'English words in any form work: loves, creatures, running.'),
    h('li', null, 'A whole sentence is read word by word.'),
    matchMedia('(pointer: fine)').matches ? h('li', null, 'Press / to search from anywhere; on a word, [ and ] step to the previous and next word.') : null
  );
  mount(
    box,
    h('h1', null, firstTime ? 'Find any Zolai word, in Zolai or English' : 'Welcome back'),
    todayBlock(st.today),
    firstTime ? null : h('section', { class: 'panel' }, h('h2', null, 'Your recent words'), h('div', { class: 'row' }, recent.map((r) => h('a', { class: 'chip outline serif', href: definitionPath(r.word), title: r.gloss, lang: 'ctd' }, r.word)))),
    h('section', { class: 'guide-how' }, h('h2', null, firstTime ? 'How to search' : 'Ways to search'), h('div', { class: 'cards' }, cards)),
    st.check
      ? h(
          'section',
          { class: 'panel check' },
          h('h2', null, 'Help check the dictionary'),
          h('p', null, 'Most meanings are drafts. If you speak Zolai, open one and answer “Is this meaning correct?”.'),
          h('div', { class: 'row' }, h('a', { class: 'btn', href: definitionPath(st.check.word) }, 'Check ', h('b', { lang: 'ctd' }, st.check.word)))
        )
      : null,
    firstTime ? tips : h('details', { class: 'tips-more' }, h('summary', null, 'Tips'), tips)
  );
}

function partGloss(p) {
  const terms = p.terms?.length ? p.terms : p.gloss ? [p.gloss] : [];
  if (!terms.length) return null;
  const { shown, hidden } = fitGloss(terms);
  return h(
    'span',
    { class: 'part-g', title: hidden ? terms.join(', ') : null },
    h('span', { class: 'part-gt' }, shown.join(', ')),
    hidden ? h('span', { class: 'part-more', 'aria-label': `and ${hidden} more` }, `+${hidden}`) : null
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
          partGloss(p)
        )
      ),
      h('span', { class: 'part-op', 'aria-hidden': 'true' }, '+')
    ),
    whole ? [h('span', { class: 'part-op', 'aria-hidden': 'true' }, '='), h('span', { class: 'part-whole', lang: 'ctd' }, whole)] : null
  );
}

function rootsBlock(word, result) {
  const useful = result.roots.filter((r) => r.zolai.length || r.concepts.length);
  if (!useful.length) return result.available ? null : h('p', { class: 'meta-line' }, 'The English lexicon could not be downloaded; connect to look the word up in other forms.');
  const via = { typed: 'as typed', form: 'form of', ending: 'from', related: 'related to' };
  return h(
    'section',
    { class: 'roots' },
    h('h2', null, qt(word), ' in other forms'),
    useful.map((r) =>
      h(
        'div',
        { class: 'root' },
        h('p', { class: 'root-head' }, h('b', null, r.word), r.from ? h('span', { class: 'root-via' }, `${via[r.via]} ${r.from}`) : null),
        r.zolai.length
          ? h('p', { class: 'root-zo' }, 'In Zolai: ', joinNodes(r.zolai.map((z) => h('a', { href: definitionPath(z.word), lang: 'ctd', title: z.gloss }, z.word))))
          : null,
        r.concepts.map((c) =>
          h(
            'p',
            { class: 'root-def' },
            h('span', { class: 'root-type' }, c.type),
            ' ',
            c.definition,
            c.zolai.length ? [' — ', joinNodes(c.zolai.map((z) => h('a', { href: definitionPath(z.word), lang: 'ctd', title: z.gloss }, z.word)))] : null
          )
        ),
        r.zolai.length || r.concepts.some((c) => c.zolai.length)
          ? null
          : h('p', { class: 'root-none' }, 'No Zolai word yet. ', h('a', { href: `/workspace/entry/new?word=&en=${encodeURIComponent(r.word)}` }, 'Suggest one'))
      )
    ),
    h('p', { class: 'build-note' }, 'English meanings from Open English WordNet.')
  );
}

const SUGGEST_LINK = (word, what = 'word') => h('a', { class: 'btn', href: `/workspace/entry/new?word=${encodeURIComponent(word)}` }, icon(ICONS.edit), `Suggest this ${what}`);

function panel(title, ...body) {
  return h('section', { class: 'panel' }, title ? h('h2', null, ...[].concat(title)) : null, body);
}

function wordChips(list) {
  return h('div', { class: 'row' }, list.map((w) => h('a', { class: 'chip outline serif', href: definitionPath(w.word), title: w.gloss || null, lang: 'ctd' }, w.word)));
}

function wordRows(list) {
  return h('ul', { class: 'word-rows' }, list.map((w) => h('li', null, h('a', { href: definitionPath(w.word), lang: 'ctd' }, w.word), w.gloss ? h('span', { class: 'g' }, w.gloss) : null)));
}

function symbolsNote(q) {
  return q.symbols ? h('p', { class: 'meta-line' }, 'Symbols were left out; searched for ', qt(q.clean), '.') : null;
}

/** A single word that is not a headword: nearest spellings, English forms, parts. */
async function unknownWord(root, q) {
  const word = q.clean;
  const [similar, starting, readings] = await Promise.all([data.similar(word, 6), data.suggest(word, 6), data.analyse(word)]);
  const startingOnly = starting.filter((s) => s.side !== 'english' && !similar.some((x) => x.word === s.word));
  const help = h('div', { class: 'english-help' }, /^[a-z][a-z'-]{2,}$/i.test(word) ? h('p', { class: 'loading-note' }, 'Looking for the English word in other forms…') : null);
  const nothingYet = !similar.length && !startingOnly.length && !readings.length;
  mount(
    root,
    h(
      'div',
      { class: 'page' },
      h(
        'div',
        { class: 'answer' },
        h('header', { class: 'answer-head' }, h('p', { class: 'kicker' }, 'Not a headword yet'), h('h1', { lang: 'ctd' }, word), symbolsNote(q)),
        similar.length ? panel('Did you mean', wordRows(similar)) : null,
        help,
        readings.length
          ? h(
              'section',
              { class: 'build zo-reading' },
              h('h2', null, readings.length > 1 ? 'It may be read as one of these' : 'It may be read as'),
              readings.map((r) => partsLine(r, word)),
              h('p', { class: 'build-note' }, 'Worked out from the parts; not checked by a speaker.')
            )
          : null,
        startingOnly.length ? panel(['Words that start with ', qt(word)], wordChips(startingOnly)) : null,
        nothingYet ? h('p', { class: 'meta-line zo-reading' }, 'Nothing close to it in the dictionary. Check the spelling, or try the word in English.') : null,
        h('div', { class: 'answer-actions' }, SUGGEST_LINK(word))
      )
    )
  );
  if (help.firstChild) {
    try {
      const result = await data.englishHelp(word);
      const block = rootsBlock(word, result);
      help.replaceChildren(block ?? '');
      // An English word read as Zolai parts is noise once its English forms are found.
      if (block?.classList.contains('roots')) root.querySelectorAll('.zo-reading').forEach((el) => el.remove());
    } catch (err) {
      help.replaceChildren(h('p', { class: 'loading-note is-error' }, err.message));
    }
  }
}

/** Several words: each with its meaning, and sentences that contain them. */
async function phrase(root, q) {
  const [rows, found] = await Promise.all([data.breakdown(q.words), data.phraseExamples(q.clean)]);
  const cell = (r) => {
    if (r.kind === 'zolai' || (r.kind === 'number' && r.word)) return [h('a', { href: definitionPath(r.word), lang: 'ctd', class: 'tok-w' }, r.word), h('span', { class: 'tok-g' }, r.gloss)];
    if (r.kind === 'english')
      return [
        h('span', { class: 'tok-w' }, r.token),
        h('span', { class: 'tok-g' }, r.root ? ['from ', qt(r.root), ': '] : 'Zolai: ', joinNodes(r.zolai.map((z) => h('a', { href: definitionPath(z.word), lang: 'ctd', title: z.gloss }, z.word))))
      ];
    return [
      h('span', { class: 'tok-w is-unknown', lang: 'ctd' }, r.token),
      h(
        'span',
        { class: 'tok-g' },
        r.near ? ['not found; maybe ', h('a', { href: definitionPath(r.near.word), lang: 'ctd' }, r.near.word), ` (${r.near.gloss})`] : r.reading ? ['may be ', r.reading.map((p) => p.text).join(' + ')] : 'not in the dictionary yet'
      )
    ];
  };
  const known = rows.filter((r) => r.kind !== 'unknown').length;
  mount(
    root,
    h(
      'div',
      { class: 'page' },
      h(
        'div',
        { class: 'answer' },
        h(
          'header',
          { class: 'answer-head' },
          h('p', { class: 'kicker' }, q.kind === 'sentence' ? 'A sentence, word by word' : 'A phrase, word by word'),
          h('h1', { lang: 'ctd', class: 'answer-phrase' }, q.clean),
          h('p', { class: 'meta-line' }, `${known} of ${rows.length} words found. The phrase as a whole is not an entry yet.`),
          symbolsNote(q)
        ),
        h('ol', { class: 'tokens' }, rows.map((r) => h('li', { class: `tok tok-${r.kind}` }, cell(r)))),
        found === null
          ? h('p', { class: 'meta-line' }, 'Download the example sentences in Settings to see where this phrase is used.')
          : found.length
            ? panel(['Used in these sentences'], h('ul', { class: 'examples' }, found.map(exampleItem)))
            : null,
        h('div', { class: 'answer-actions' }, SUGGEST_LINK(q.clean, 'phrase'))
      )
    )
  );
}

/** A number: its Zolai words through the English number words. */
async function number(root, q) {
  const help = q.value === null ? null : await data.numberHelp(q.value);
  mount(
    root,
    h(
      'div',
      { class: 'page' },
      h(
        'div',
        { class: 'answer' },
        h('header', { class: 'answer-head' }, h('p', { class: 'kicker' }, 'A number'), h('h1', null, q.value === null ? q.text : q.value.toLocaleString()), help?.words ? h('p', { class: 'summary' }, help.words) : null),
        help
          ? panel(
              'Its parts in Zolai',
              h(
                'ul',
                { class: 'word-rows' },
                help.parts.map((p) =>
                  h('li', null, h('span', { class: 'tok-w' }, p.english), p.zolai.length ? joinNodes(p.zolai.map((z) => h('a', { href: definitionPath(z.word), lang: 'ctd', title: z.gloss }, z.word))) : h('span', { class: 'g' }, 'no Zolai word yet'))
                )
              ),
              h('p', { class: 'build-note' }, 'Read part by part; how Zolai combines number words is not written out here yet.')
            )
          : h('p', { class: 'meta-line' }, 'This number is too long to read out.')
      )
    )
  );
}

/** Queries the dictionary cannot read: another script, an address, nothing. */
function outside(root, q) {
  const body = {
    script: [
      'Written in ' + q.script + ' script',
      `zotune reads Zolai and English, written in Latin letters. ${q.script === 'Myanmar' ? 'Burmese is planned as a further language.' : 'Other languages may come later.'}`
    ],
    address: ['A web or email address', 'zotune looks up words. Type a Zolai or English word instead.'],
    empty: ['Nothing to look up', 'Type a word in Zolai or English.']
  }[q.kind];
  mount(
    root,
    h(
      'div',
      { class: 'page' },
      h(
        'div',
        { class: 'answer' },
        h('header', { class: 'answer-head' }, h('p', { class: 'kicker' }, body[0]), h('h1', null, q.text || '—')),
        h('p', null, body[1]),
        h('div', { class: 'row' }, h('span', { class: 'meta-line' }, 'Try'), ['itna', 'lungdamna', 'love'].map((w) => h('a', { class: 'chip', href: definitionPath(w) }, w)))
      )
    )
  );
}

/** Everything that is not a headword gets an answer of its own kind. */
async function answer(root, q) {
  if (q.kind === 'script' || q.kind === 'address' || q.kind === 'empty') return outside(root, q);
  if (q.kind === 'number') return number(root, q);
  if (q.kind === 'phrase' || q.kind === 'sentence') return phrase(root, q);
  return unknownWord(root, q);
}

/* ---------- Entry ---------- */

function iconToggle(kind, entry, on) {
  const labels = { bookmark: ['Bookmark', 'Remove bookmark'], like: ['Like', 'Unlike'] };
  const btn = h('button', { type: 'button', class: ['icon-btn', `icon-${kind}`], 'aria-pressed': String(on), 'aria-label': labels[kind][on ? 1 : 0], title: labels[kind][on ? 1 : 0] }, icon(kind === 'like' ? ICONS.heart : ICONS.bookmark));
  btn.addEventListener('click', async () => {
    const next = await actions.toggleMark(kind, entry);
    analytics.track(kind, { headword: entry.word, on: next });
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
        analytics.track('vote', { vote_kind: kind, value: next ?? 'cleared' });
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
    h('q', { class: 'example-zo', lang: 'ctd' }, ex.parts.map((p) => (p.mark ? h('b', null, p.text) : p.text))),
    h('p', { class: 'example-en' }, ex.en, ex.ref ? h('cite', { class: 'example-ref' }, ex.ref) : null)
  );
}

function examplesBlock(sense) {
  if (!sense.examples?.length) return null;
  const first = sense.examples.length;
  const list = h('ul', { class: 'examples', 'aria-label': 'Examples' }, sense.examples.map(exampleItem));
  let shown = first;
  const left = () => sense.exampleCount - shown;
  const more = h('button', { type: 'button', class: 'more' });
  const fewer = h('button', { type: 'button', class: 'more' }, 'Show fewer');
  const update = () => {
    more.textContent = left() > MORE_STEP ? `Show ${MORE_STEP} more (${left().toLocaleString()} left)` : `Show ${plural(left(), 'more example', 'more examples')}`;
    more.hidden = left() <= 0;
    fewer.hidden = shown <= first;
  };
  update();
  more.addEventListener('click', async () => {
    more.disabled = true;
    const next = await data.examples(sense.id, shown, MORE_STEP);
    list.append(...next.map(exampleItem));
    shown += next.length;
    more.disabled = false;
    update();
  });
  fewer.addEventListener('click', () => {
    while (list.children.length > first) list.lastChild.remove();
    shown = first;
    update();
    list.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
  return [list, h('div', { class: 'more-row' }, more, fewer)];
}

// Similar and opposite words get a panel of their own: each word with its
// meaning, so the comparison can be read without opening every link.
const NEAR = {
  s: { label: 'Similar', glyph: '≈' },
  a: { label: 'Opposite', glyph: '↔' }
};

function nearGloss(gloss) {
  if (!gloss) return null;
  const terms = gloss.split(', ');
  const { shown, hidden } = fitGloss(terms, 20);
  return h(
    'span',
    { class: 'near-g', title: hidden ? gloss : null },
    shown.join(', '),
    hidden ? h('span', { class: 'part-more', 'aria-label': `and ${hidden} more` }, `+${hidden}`) : null
  );
}

function nearWords(relations) {
  const groups = relations.filter((r) => NEAR[r.kind]);
  if (!groups.length) return null;
  return h(
    'div',
    { class: 'near' },
    groups.map((r) =>
      h(
        'section',
        { class: ['near-group', `near-${r.kind}`], 'aria-label': NEAR[r.kind].label },
        h('h3', { class: 'near-k' }, h('span', { class: 'near-glyph', 'aria-hidden': 'true' }, NEAR[r.kind].glyph), NEAR[r.kind].label),
        h(
          'ul',
          { class: 'near-list' },
          r.targets.map((t) =>
            h(
              'li',
              null,
              h(
                'a',
                { class: 'near-word', href: definitionPath(t.word) },
                h('span', { class: 'near-w', lang: 'ctd' }, t.word, t.number ? h('sup', null, String(t.number)) : null),
                nearGloss(t.gloss)
              )
            )
          )
        )
      )
    )
  );
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
      nearWords(sense.relations),
      sense.relations.some((r) => !shown.has(r.kind) && !NEAR[r.kind]) || sense.origin || tags.length || sense.bible.length || sense.named.length
        ? h(
            'div',
            { class: 'meta' },
            sense.relations.filter((r) => !shown.has(r.kind) && !NEAR[r.kind]).map((r) =>
              h('div', { class: 'meta-line' }, h('span', { class: 'meta-k' }, r.label), joinNodes(r.targets.map((t) => wordLink(t.word, t.number)), r.kind === 'j' ? ' + ' : ', '))
            ),
            sense.origin ? h('div', { class: 'meta-line' }, h('span', { class: 'meta-k' }, 'Origin'), sense.origin) : null,
            tags.length ? h('div', { class: 'meta-line' }, h('span', { class: 'meta-k' }, 'Subject'), tags.join(' · ')) : null,
            sources(sense)
          )
        : null,
      h(
        'div',
        { class: 'sense-foot' },
        h('div', { class: 'foot-head' }, h('span', { class: 'foot-title' }, 'Check this meaning'), h('span', { class: 'status', dataset: { status: sense.statusName } }, capital(sense.statusName))),
        feedback(sense, votes)
      )
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
    h('h2', null, 'Zolai words for ', qt(query)),
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

const posId = (type) => `pos-${slug(type)}`;

/** First terms of a meaning that fit a short line, with a +N count. */
function shortTerms(sense, room = 28) {
  const terms = sense.terms.length ? sense.terms : sense.definition ? [sense.definition] : [];
  const { shown, hidden } = fitGloss(terms, room);
  return [h('span', { class: 'toc-g' }, shown.join(', ')), hidden ? h('span', { class: 'part-more', 'aria-label': `and ${hidden} more` }, `+${hidden}`) : null];
}

/**
 * The side column: a summary that depends on the entry. Blocks marked
 * data-fit (lowest number first) and lines marked data-trim are hidden when
 * the column would grow taller than the entry beside it (fitAside).
 */
function asideSummary(entry, groups) {
  const blocks = [];
  if (entry.senses.length > 1) {
    const lines = [];
    for (const g of groups) {
      if (groups.length > 1) {
        lines.push(h('li', { class: 'toc-pos' }, h('a', { class: 'toc-link', href: `#${posId(g.type)}` }, g.type), h('span', { class: 'toc-n' }, plural(g.senses.length, 'meaning', 'meanings'))));
      }
      g.senses.forEach((s, i) => lines.push(h('li', { class: 'toc-sense', dataset: { trim: '' } }, h('a', { class: 'toc-link', href: `#${s.id}` }, h('span', { class: 'toc-i' }, String(i + 1)), shortTerms(s)))));
    }
    const title = groups.length > 1 ? `${plural(entry.senses.length, 'meaning', 'meanings')} in ${groups.length} parts of speech` : plural(entry.senses.length, 'meaning', 'meanings');
    // Filled in by fitAside when meaning lines have to give way.
    lines.push(h('li', { class: 'toc-more', hidden: true }));
    blocks.push(h('div', { class: 'aside-block', dataset: { fit: '2' } }, h('span', { class: 'aside-label' }, title), h('ul', { class: 'toc' }, lines)));
  }
  if (entry.english.length) {
    const FIRST = 12;
    const extra = entry.english.slice(FIRST);
    const chip = (e) => h('a', { class: 'chip sm', href: definitionPath(e) }, e);
    const row = h('div', { class: 'row' }, entry.english.slice(0, FIRST).map(chip));
    if (extra.length) {
      const more = h('button', { type: 'button', class: 'chip sm more-chip', 'aria-label': `Show ${extra.length} more English words` }, `+${extra.length}`);
      more.addEventListener('click', () => more.replaceWith(...extra.map(chip)));
      row.append(more);
    }
    blocks.push(h('div', { class: 'aside-block', dataset: { fit: '1' } }, h('span', { class: 'aside-label' }, 'In English'), row));
  }
  return h(
    'aside',
    { class: 'aside', 'aria-label': 'About this entry' },
    blocks,
    h('div', { class: 'aside-block' }, h('span', { class: 'aside-label' }, 'Status'), statusSummary(entry)),
    h('div', null, h('a', { class: 'btn', href: `/workspace/entry/${encodeURIComponent(entry.id)}` }, icon(ICONS.edit), 'Improve this entry'))
  );
}

/**
 * Keeps the side column no taller than the entry while the two stand side by
 * side: first meaning lines are dropped from the end, then whole blocks by
 * their data-fit order. Re-checked whenever the entry changes size.
 */
function fitAside(article, aside) {
  if (!article || !aside) return null;
  const apply = () => {
    for (const el of aside.querySelectorAll('[data-fit], [data-trim]')) el.hidden = false;
    for (const el of aside.querySelectorAll('.toc-more')) el.hidden = true;
    const sideBySide = aside.offsetLeft > article.offsetLeft && aside.offsetTop < article.offsetTop + 40;
    if (!sideBySide) return;
    const tooTall = () => aside.offsetHeight > article.offsetHeight;
    const lines = [...aside.querySelectorAll('[data-trim]')].reverse();
    const blocks = [...aside.querySelectorAll('[data-fit]')].sort((a, b) => Number(a.dataset.fit) - Number(b.dataset.fit));
    for (const block of blocks) {
      if (!tooTall()) return;
      // A block with lines to trim gives up lines first, keeping at least one.
      const own = lines.filter((l) => block.contains(l));
      const note = block.querySelector('.toc-more');
      for (const [i, l] of own.slice(0, -1).entries()) {
        if (!tooTall()) return;
        l.hidden = true;
        // Say how many meanings are not listed, so the list never looks complete when it is not.
        if (note) {
          note.hidden = false;
          note.textContent = `${plural(i + 1, 'more meaning', 'more meanings')} on the page`;
        }
      }
      if (tooTall()) block.hidden = true;
    }
  };
  const ro = new ResizeObserver(() => apply());
  ro.observe(article);
  apply();
  return () => ro.disconnect();
}

async function showEntry(root, entry, query) {
  const [bookmarked, liked, votes] = await Promise.all([
    actions.isMarked('bookmark', entry.id),
    actions.isMarked('like', entry.id),
    actions.votesFor(entry.senses.map((s) => s.id))
  ]);

  const typedZolai = matchKey(query) === matchKey(entry.word) || entry.alsoWritten.some((w) => matchKey(w) === matchKey(query));
  const english = typedZolai ? [] : await data.english(entry.via?.to ?? query, 30);

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
          englishBlock(entry.via?.to ?? query, english, entry.id),
          h(
            'header',
            { class: 'entry-head' },
            entry.redirectFrom.length ? h('p', { class: 'meta-line' }, qt(entry.redirectFrom.join(', ')), ' is written as') : null,
            entry.via ? h('p', { class: 'meta-line' }, 'Nothing for ', qt(entry.via.from), '; showing the Zolai for ', qt(entry.via.to)) : null,
            h(
              'div',
              { class: 'headline' },
              h('h1', { class: 'headword', lang: 'ctd' }, entry.word),
              h('div', { class: 'head-tools' }, iconToggle('bookmark', entry, bookmarked), iconToggle('like', entry, liked))
            ),
            summaryLine(entry),
            entry.alsoWritten.length ? h('p', { class: 'also' }, 'Also written ', joinNodes(entry.alsoWritten.map((w) => wordLink(w)), ', ')) : null,
            entry.otherCases.length
              ? h('p', { class: 'also' }, 'Not the same as ', joinNodes(entry.otherCases.map((o) => h('span', null, wordLink(o.word), h('span', { class: 'case-g' }, ` (${o.typeName}: ${o.gloss})`))), ', '))
              : null,
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
          groups.map((g) => h('section', { class: 'pos', id: posId(g.type) }, h('h2', null, g.type), g.senses.map((s, i) => senseBlock(s, i + 1, votes, shownKinds)))),
          examplesMissing ? h('p', { class: 'meta-line' }, 'Example sentences are not on this device yet. ', h('a', { href: '/settings#data' }, 'Get them in Settings')) : null,
          familyBlock(`Words built on ${entry.word}`, entry.builtOn),
          familyBlock(`Words and phrases with ${entry.word}`, entry.usedIn)
        ),
        asideSummary(entry, groups)
      )
    )
  );
  const article = root.querySelector('article.entry');
  const aside = root.querySelector('aside.aside');
  return fitAside(article, aside);
}

export default {
  nav: 'definition',
  layout: 'definition',
  title: (params) => params.word ?? 'Definition',
  async render(root, { word }, ctx) {
    if (!word) {
      await guide(root);
      return null;
    }
    mount(root, h('div', { class: 'page' }, loadingNote()));
    const q = classify(word);
    const entry = q.clean ? await data.resolve(q.clean) : null;
    if (!entry) {
      ctx.reportAs(analytics.placeholderPath(q), 'Definition');
      // A word that is not a headword is the case worth counting; phrases,
      // sentences, numbers and other input get their own answer.
      analytics.track('search', { search_term: analytics.reportableTerm(q) ?? undefined, query_kind: q.kind, result: q.kind === 'word' ? 'not_found' : 'answered' });
      await answer(root, q);
      return null;
    }
    analytics.track('search', { search_term: analytics.reportableTerm(q) ?? undefined, query_kind: q.kind, result: 'found', headword: entry.word });
    const stopFit = await showEntry(root, entry, q.clean);
    rememberWord(entry.word, entry.senses[0]?.terms.join(', ') || '');

    // Hidden navigation: [ and ] step through headwords.
    const { prev, next } = await data.neighbours(entry.id);
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.target.closest?.('input, textarea')) return;
      if (e.key === '[' && prev) navigate(definitionPath(prev));
      if (e.key === ']' && next) navigate(definitionPath(next));
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      stopFit?.();
    };
  }
};
