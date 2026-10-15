// Reader for the cite dictionary tables (laisiangtho/bible/cite, Format.md).
// Pure functions: parse the table files, assemble the model, build search
// documents and screen-ready entries. Runs in the data worker and under Node.

/** Table files per tier, as paths relative to the cite folder. */
export const TIERS = {
  core: ['configuration.json', 'word.tsv', 'sense.tsv', 'relation.tsv', 'lang/eng/gloss.tsv', 'lang/eng/link.tsv', 'lang/eng/form.tsv'],
  examples: ['usage.tsv', 'example.tsv', 'lang/eng/translation.tsv']
};

/** Configuration key of the table each file holds. */
const TABLE_KEY = {
  'word.tsv': 'word',
  'sense.tsv': 'sense',
  'relation.tsv': 'relation',
  'lang/eng/gloss.tsv': 'gloss',
  'lang/eng/link.tsv': 'link',
  'lang/eng/form.tsv': 'form',
  'usage.tsv': 'usage',
  'example.tsv': 'example',
  'lang/eng/translation.tsv': 'translation'
};

const RELATION_LABEL = {
  s: 'Similar',
  a: 'Opposite',
  b: 'Built from',
  j: 'Joins',
  v: 'Also written',
  g: 'Grades'
};
const RELATION_ORDER = ['v', 'b', 'j', 's', 'a', 'g'];

const list = (value) => (value ? value.split('/') : []);

export class CiteError extends Error {}

/** Checks that the configuration is the format this reader understands. */
export function checkConfiguration(config, format) {
  if (!config || typeof config !== 'object' || !config.table) {
    throw new CiteError('configuration.json is not a cite configuration.');
  }
  if (config.version !== format) {
    throw new CiteError(`The dictionary tables are format ${config.version}; this app reads format ${format}. Update the app or pin an older version of the tables.`);
  }
}

/**
 * Parses one table file. Fails on a header that differs from the columns of the
 * configuration and on a row with the wrong number of values.
 */
export function parseTable(text, path, config) {
  const key = TABLE_KEY[path];
  if (!key) throw new CiteError(`No table is known for ${path}.`);
  const expected = Object.keys(config.table[key]?.columns ?? {});
  if (!expected.length) throw new CiteError(`configuration.json lists no columns for the table ${key}.`);
  const lines = text.split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  const header = (lines[0] ?? '').split('\t');
  if (header.join('\t') !== expected.join('\t')) {
    throw new CiteError(`${path}: the columns are "${header.join(', ')}", configuration.json expects "${expected.join(', ')}".`);
  }
  const rows = new Array(lines.length - 1);
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split('\t');
    if (row.length !== header.length) {
      throw new CiteError(`${path}, line ${i + 1}: ${row.length} values, expected ${header.length}.`);
    }
    rows[i - 1] = row;
  }
  return rows;
}

function plain(prose) {
  return prose.replace(/[<>{}]/g, '');
}

// Column positions. parseTable has checked every header against the
// configuration, so the positions are fixed for the format this reader accepts.
const W = { id: 0, spelling: 1, status: 2 };
const S = { id: 0, word: 1, number: 2, type: 3, category: 4, field: 5, set: 6, status: 7, origin: 8, source: 9, note: 10 };
const G = { terms: 1, definition: 2, text: 3 };
const R = { from: 0, kind: 1, to: 2, order: 3 };

function groupBy(rows, col, keep = () => true) {
  const map = new Map();
  for (const row of rows) {
    if (!keep(row)) continue;
    const k = row[col];
    const arr = map.get(k);
    if (arr) arr.push(row);
    else map.set(k, [row]);
  }
  return map;
}

/**
 * Assembles the model from the parsed core tables. Rows are kept as parsed
 * (arrays of strings) to keep memory low on phones; retired rows are left out.
 */
export function buildModel(config, t) {
  const words = new Map();
  for (const row of t['word.tsv']) if (row[W.status] !== '0') words.set(row[W.id], row);

  const senses = new Map();
  for (const row of t['sense.tsv']) {
    if (row[S.status] !== '0' && words.has(row[S.word])) senses.set(row[S.id], row);
  }
  const sensesByWord = groupBy(senses.values(), S.word);
  const num = (row) => (row[S.number] ? Number(row[S.number]) : 1e9);
  for (const arr of sensesByWord.values()) arr.sort((a, b) => num(a) - num(b));

  const gloss = new Map(t['lang/eng/gloss.tsv'].map((row) => [row[0], row]));

  const relations = groupBy(t['relation.tsv'], R.from);
  for (const arr of relations.values()) arr.sort((a, b) => (a[R.kind] < b[R.kind] ? -1 : a[R.kind] > b[R.kind] ? 1 : Number(a[R.order]) - Number(b[R.order])));
  const variantOf = new Map();
  for (const [from, arr] of relations) {
    const s = senses.get(from);
    if (s) for (const r of arr) if (r[R.kind] === 'v') variantOf.set(r[R.to], s[S.word]);
  }

  const links = new Map();
  for (const [term, senseIds, , status] of t['lang/eng/link.tsv']) if (status !== '0') links.set(term, senseIds);
  const forms = new Map(t['lang/eng/form.tsv'].map(([form, word]) => [form, word]));

  return { config, words, senses, sensesByWord, gloss, relations, variantOf, links, forms, examples: null };
}

/** Adds the examples tier to a model. */
export function addExamples(model, t) {
  model.examples = {
    bySense: groupBy(t['usage.tsv'], 1),
    text: new Map(t['example.tsv'].map((row) => [row[0], row])),
    translation: new Map(t['lang/eng/translation.tsv'].map(([id, value]) => [id, value]))
  };
}

const termsOf = (model, senseId) => list(model.gloss.get(senseId)?.[G.terms] ?? '');

function shortGloss(model, senseRow) {
  const g = model.gloss.get(senseRow[S.id]);
  if (!g) return '';
  return g[G.terms] ? g[G.terms].replaceAll('/', ', ') : plain(g[G.definition]);
}

/**
 * Search documents: one per word that has a meaning, plus variant spellings and
 * English terms pointing at the words that carry them.
 */
export function searchDocs(model) {
  const docs = new Map();
  const doc = (wordRow) => {
    let d = docs.get(wordRow[W.id]);
    if (!d) {
      const first = model.sensesByWord.get(wordRow[W.id])?.[0];
      d = { id: wordRow[W.id], word: wordRow[W.spelling], gloss: first ? shortGloss(model, first) : '', keys: [] };
      docs.set(wordRow[W.id], d);
    }
    return d;
  };

  for (const [wordId, arr] of model.sensesByWord) {
    const word = model.words.get(wordId);
    const d = doc(word);
    d.keys.push([word[W.spelling], 'word', 0]);
    arr.forEach((s, si) => termsOf(model, s[S.id]).forEach((term, ti) => d.keys.push([term, 'english', si * 0.5 + ti * 0.1])));
  }
  for (const [variant, mainId] of model.variantOf) {
    const v = model.words.get(variant);
    const main = model.words.get(mainId);
    if (v && main && model.sensesByWord.has(mainId)) doc(main).keys.push([v[W.spelling], 'spelling', 0]);
  }
  for (const [from, rels] of model.relations) {
    if (from[0] !== 'w') continue;
    const w = model.words.get(from);
    for (const r of rels) {
      const target = model.words.get(r[R.to]);
      if (r[R.kind] === 'see' && w && target && model.sensesByWord.has(target[W.id])) doc(target).keys.push([w[W.spelling], 'spelling', 0.5]);
    }
  }
  for (const [term, senseIds] of model.links) {
    list(senseIds).forEach((sid, i) => {
      const s = model.senses.get(sid);
      if (s) doc(model.words.get(s[S.word])).keys.push([term, 'english', 1 + i * 0.1]);
    });
  }
  return [...docs.values()];
}

/** Base form of an English word by the irregular forms, or null. */
export function englishBase(model, query) {
  return model.forms.get(query.trim().toLowerCase()) ?? null;
}

function target(model, id) {
  if (id[0] === 's') {
    const s = model.senses.get(id);
    const w = s && model.words.get(s[S.word]);
    return w ? { word: w[W.spelling], number: s[S.number] ? Number(s[S.number]) : null, sense: id } : null;
  }
  const w = model.words.get(id);
  return w ? { word: w[W.spelling], number: null, sense: null } : null;
}

function formatSources(model, sources, books) {
  const bible = [];
  const named = new Set();
  for (const src of sources) {
    const verse = /^(\d+)\.(\d+)\.(\d+(?:-\d+)?)$/.exec(src);
    if (verse) {
      bible.push(`${books?.[verse[1]] ?? `Book ${verse[1]}`} ${verse[2]}:${verse[3]}`);
    } else {
      const code = src.split(':')[0];
      named.add(model.config.source?.[code]?.name ?? code);
    }
  }
  return { bible, named: [...named] };
}

function markExample(text, marks) {
  const on = new Set();
  for (const [starts, length] of marks) {
    for (const p of starts) for (let k = 0; k < length; k++) on.add(p - 1 + k);
  }
  const parts = [];
  const push = (value, mark) => {
    const last = parts[parts.length - 1];
    if (last && last.mark === mark) last.text += value;
    else parts.push({ text: value, mark });
  };
  text.split(' ').forEach((w, i) => {
    if (i) push(' ', on.has(i) && on.has(i - 1));
    push(w, on.has(i));
  });
  return parts;
}

function examplesFor(model, senseId, books, limit) {
  if (!model.examples) return null;
  const uses = model.examples.bySense.get(senseId) ?? [];
  return uses.slice(0, limit).map(([id, , start, length]) => {
    const ex = model.examples.text.get(id);
    const src = ex?.[1] ? formatSources(model, [ex[1]], books) : { bible: [], named: [] };
    return {
      id,
      parts: ex ? markExample(ex[2], [[list(start).map(Number), Number(length)]]) : [],
      en: model.examples.translation.get(id) ?? '',
      ref: [...src.bible, ...src.named].join(', ')
    };
  });
}

/** Screen-ready entry for one word, or null. */
export function entry(model, wordId, { books = null, exampleLimit = 5 } = {}) {
  let word = model.words.get(wordId);
  if (!word) return null;
  const redirectFrom = [];
  if (!model.sensesByWord.has(word[W.id])) {
    const see = model.relations.get(word[W.id])?.find((r) => r[R.kind] === 'see');
    const main = model.variantOf.get(word[W.id]) ?? see?.[R.to];
    if (!main || !model.sensesByWord.has(main)) return null;
    redirectFrom.push(word[W.spelling]);
    word = model.words.get(main);
  }
  const cfg = model.config;
  const spelling = word[W.spelling];
  const senses = model.sensesByWord.get(word[W.id]).map((s) => {
    const id = s[S.id];
    const g = model.gloss.get(id);
    const groups = new Map();
    for (const r of model.relations.get(id) ?? []) {
      const t = target(model, r[R.to]);
      if (!t || !RELATION_LABEL[r[R.kind]]) continue;
      if (!groups.has(r[R.kind])) groups.set(r[R.kind], []);
      groups.get(r[R.kind]).push(t);
    }
    const relations = RELATION_ORDER.filter((k) => groups.has(k)).map((kind) => ({
      kind,
      label: kind === 'j' && groups.get(kind).length === 1 ? 'Same as' : RELATION_LABEL[kind],
      targets: groups.get(kind)
    }));
    const src = formatSources(model, list(s[S.source]), books);
    const number = s[S.number] ? Number(s[S.number]) : null;
    return {
      id,
      number,
      key: number ? `${spelling}.${number}` : id,
      type: s[S.type],
      typeName: cfg.type?.[s[S.type]]?.name ?? s[S.type],
      categories: list(s[S.category]).map((c) => cfg.category?.[c]?.name ?? c),
      fields: list(s[S.field]).map((f) => cfg.field?.[f]?.name ?? f),
      set: s[S.set],
      status: s[S.status],
      statusName: cfg.status?.sense?.[s[S.status]]?.name ?? s[S.status],
      origin: s[S.origin],
      bible: src.bible,
      named: src.named,
      note: s[S.note],
      terms: list(g?.[G.terms] ?? ''),
      definition: g?.[G.definition] ?? '',
      text: g?.[G.text] ?? '',
      relations,
      examples: examplesFor(model, id, books, exampleLimit),
      exampleCount: model.examples ? (model.examples.bySense.get(id)?.length ?? 0) : null
    };
  });
  const partOf = (model.relations.get(word[W.id]) ?? []).filter((r) => r[R.kind] === 'see').map((r) => target(model, r[R.to])).filter(Boolean);
  const english = [...new Set(senses.flatMap((s) => s.terms))];
  return { id: word[W.id], word: spelling, status: word[W.status], redirectFrom, partOf, english, senses };
}

/** Counts for the workspace. */
export function stats(model) {
  const byStatus = {};
  for (const s of model.senses.values()) byStatus[s[S.status]] = (byStatus[s[S.status]] ?? 0) + 1;
  return {
    words: model.sensesByWord.size,
    senses: model.senses.size,
    byStatus: Object.entries(byStatus)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([code, count]) => ({ code, name: model.config.status?.sense?.[code]?.name ?? code, count })),
    examples: model.examples ? model.examples.text.size : null
  };
}
