// Reader for the cite dictionary tables (laisiangtho/bible/cite, Format.md).
// Pure functions: parse the table files, assemble the model, build search
// documents and screen-ready entries. Runs in the data worker and under Node.

/** Table files per tier, as paths relative to the cite folder. */
export const TIERS = {
  core: ['configuration.json', 'word.tsv', 'sense.tsv', 'relation.tsv', 'lang/eng/gloss.tsv', 'lang/eng/link.tsv', 'lang/eng/form.tsv', 'pattern.tsv'],
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
  'pattern.tsv': 'pattern',
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

  // Relations seen from the target: which senses name this word.
  const reverse = new Map();
  for (const [from, arr] of relations) {
    if (!senses.has(from)) continue;
    for (const r of arr) {
      if (r[R.kind] !== 'b' && r[R.kind] !== 'j') continue;
      const to = r[R.to][0] === 's' ? senses.get(r[R.to])?.[S.word] : r[R.to];
      if (!to) continue;
      const list = reverse.get(to);
      const item = [r[R.kind], from];
      if (list) list.push(item);
      else reverse.set(to, [item]);
    }
  }

  const patterns = t['pattern.tsv'].map(([kind, form, result, context, note]) => ({ kind, form, result, context: list(context), note }));

  return { config, words, senses, sensesByWord, gloss, relations, reverse, variantOf, links, forms, patterns, lexicon: null, examples: null };
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

/** Examples of one sense, a page at a time; null when the examples tier is not loaded. */
export function examplesFor(model, senseId, books, limit, offset = 0) {
  if (!model.examples) return null;
  const uses = model.examples.bySense.get(senseId) ?? [];
  return uses.slice(offset, offset + limit).map(([id, , start, length]) => {
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

const typeOf = (model, wordId) => model.sensesByWord.get(wordId)?.[0]?.[S.type] ?? null;
const lower = (v) => v.toLowerCase();

/**
 * One part of a built word. Without a named sense, the affix sense of the word
 * is preferred where the position calls for one (prefix first, suffix last).
 */
function partFor(model, text, wordId, sense = null, prefer = null) {
  const all = model.sensesByWord.get(wordId) ?? [];
  const s = sense ? model.senses.get(sense) : (prefer && all.find((x) => x[S.type] === prefer)) || all[0];
  const type = s?.[S.type];
  return {
    text,
    word: wordId ? model.words.get(wordId)?.[W.spelling] ?? text : null,
    number: sense && s?.[S.number] ? Number(s[S.number]) : null,
    role: type === 'prefix' ? 'prefix' : type === 'suffix' ? 'suffix' : 'word',
    gloss: s ? shortGloss(model, s) : ''
  };
}

/** Lowercase spelling → word ids with a meaning, built on first use. */
function lexicon(model) {
  if (!model.lexicon) {
    const byKey = new Map();
    for (const wordId of model.sensesByWord.keys()) {
      const k = lower(model.words.get(wordId)[W.spelling]).replace(/[ '-]/g, '');
      if (!byKey.has(k)) byKey.set(k, []);
      byKey.get(k).push(wordId);
    }
    model.lexicon = byKey;
  }
  return model.lexicon;
}

function patternNotes(model, spelling, type) {
  const w = lower(spelling);
  const notes = [];
  const letters = model.patterns.filter((p) => p.kind === 'letter' && w.includes(p.form));
  if (letters.length) {
    const names = letters.map((p) => p.form).join(', ');
    notes.push(`Written with ${letters.length > 1 ? 'the letters' : 'the letter'} ${names}, which native Zolai words do not use: a loanword, a name or a foreign spelling.`);
  }
  for (const p of model.patterns) {
    if (p.kind === 'stem' && p.context.some((c) => w.includes(p.result + c))) notes.push(p.note);
  }
  return notes;
}

/** How a word is built, from its relations, doubling and spelling patterns. */
function construction(model, word) {
  const spelling = word[W.spelling];
  const senses = model.sensesByWord.get(word[W.id]) ?? [];
  const type = senses[0]?.[S.type];
  let parts = null;
  let kind = null;
  for (const s of senses) {
    const rels = model.relations.get(s[S.id]) ?? [];
    const joins = rels.filter((r) => r[R.kind] === 'j');
    if (joins.length > 1) {
      parts = joins.map((r, i) => {
        const t = r[R.to];
        const wid = t[0] === 's' ? model.senses.get(t)?.[S.word] : t;
        const prefer = i === 0 ? 'prefix' : i === joins.length - 1 ? 'suffix' : null;
        return partFor(model, model.words.get(wid)?.[W.spelling] ?? t, wid, t[0] === 's' ? t : null, prefer);
      });
      kind = 'joins';
      break;
    }
    const base = rels.find((r) => r[R.kind] === 'b');
    if (base && !parts) {
      const t = base[R.to];
      const wid = t[0] === 's' ? model.senses.get(t)?.[S.word] : t;
      const baseSpelling = model.words.get(wid)?.[W.spelling];
      if (!baseSpelling) continue;
      parts = [partFor(model, baseSpelling, wid, t[0] === 's' ? t : null)];
      const w = lower(spelling);
      const b = lower(baseSpelling);
      const lex = lexicon(model);
      const affix = (text, prefer) => {
        const key = text.replace(/^-|-$/g, '');
        const id = (lex.get(key) ?? [])[0];
        return id ? partFor(model, key, id, null, prefer) : key ? { text: key, word: null, number: null, role: 'word', gloss: '' } : null;
      };
      if (w.startsWith(b) && w.length > b.length) parts.push(affix(w.slice(b.length), 'suffix'));
      else if (w.endsWith(b) && w.length > b.length) parts.unshift(affix(w.slice(0, w.length - b.length), 'prefix'));
      parts = parts.filter(Boolean);
      kind = 'base';
    }
  }
  const w = lower(spelling);
  if (!parts && w.length % 2 === 0 && w.length >= 4) {
    const half = w.slice(0, w.length / 2);
    const id = (lexicon(model).get(half) ?? [])[0];
    if (half === w.slice(w.length / 2) && id) {
      parts = [partFor(model, half, id), partFor(model, half, id)];
      kind = 'double';
    }
  }
  if (!parts) {
    // No relation says how the word is built: offer the reading of the parts,
    // marked as an automatic analysis.
    const reading = analyse(model, spelling, 1)[0];
    if (reading && reading.length > 1) {
      parts = reading;
      kind = 'analysis';
    }
  }
  const notes = patternNotes(model, spelling, type);
  if (kind === 'double') {
    const p = model.patterns.find((x) => x.kind === 'double' && x.form === typeOf(model, (lexicon(model).get(parts[0].text) ?? [])[0]));
    if (p) notes.unshift(p.note);
  }
  if (!parts && !notes.length) return null;
  return { kind, parts, notes };
}

/** Words built on a word and words that contain it; respellings separately. */
function family(model, wordId, max = 40) {
  const builtOn = new Map();
  const usedIn = new Map();
  const respelled = new Set();
  for (const [kind, from] of model.reverse.get(wordId) ?? []) {
    const s = model.senses.get(from);
    const w = s && model.words.get(s[S.word]);
    if (!w || w[W.id] === wordId) continue;
    const joins = (model.relations.get(from) ?? []).filter((r) => r[R.kind] === 'j').length;
    if (kind === 'j' && joins === 1) {
      respelled.add(w[W.spelling]);
      continue;
    }
    const target = kind === 'b' ? builtOn : usedIn;
    if (!target.has(w[W.id])) target.set(w[W.id], { word: w[W.spelling], gloss: shortGloss(model, model.sensesByWord.get(w[W.id])[0]) });
  }
  const sorted = (m) => [...m.values()].sort((a, b) => a.word.localeCompare(b.word));
  const cut = (arr) => ({ items: arr.slice(0, max), total: arr.length });
  return { builtOn: cut(sorted(builtOn)), usedIn: cut(sorted(usedIn)), respelled: [...respelled] };
}

/**
 * Readings of a word that is not in the lexicon, as parts that are: a prefix at
 * the start, suffixes at the end, words between them, a stem restored by a stem
 * pattern, or a word written twice. Up to three readings, fewest parts first.
 */
export function analyse(model, text, max = 3) {
  const w = lower(text).replace(/[ '-]/g, '');
  if (w.length < 3) return [];
  const lex = lexicon(model);
  const roleOf = (key) => {
    const roles = new Set((lex.get(key) ?? []).flatMap((id) => (model.sensesByWord.get(id) ?? []).map((s) => s[S.type])));
    return roles;
  };
  const stems = model.patterns.filter((p) => p.kind === 'stem');
  const found = [];
  const walk = (pos, parts) => {
    if (parts.length > 4 || found.length > 200) return;
    if (pos === w.length) {
      if (parts.length > 1) found.push(parts);
      return;
    }
    for (let end = w.length; end > pos; end--) {
      const piece = w.slice(pos, end);
      const types = roleOf(piece);
      const isLast = end === w.length;
      const ok =
        (types.has('prefix') && pos === 0 && !isLast) ||
        (types.has('suffix') && pos > 0) ||
        ([...types].some((t) => t !== 'prefix' && t !== 'suffix') && piece.length >= 2);
      if (ok) {
        const prefer = types.has('prefix') && pos === 0 && !isLast ? 'prefix' : types.has('suffix') && isLast && pos > 0 ? 'suffix' : null;
        walk(end, [...parts, partFor(model, piece, lex.get(piece)[0], null, prefer)]);
      }
      for (const st of stems) {
        if (!piece.endsWith(st.result)) continue;
        const restored = piece.slice(0, piece.length - st.result.length) + st.form;
        const next = st.context.find((c) => w.startsWith(c, end));
        if (next && lex.has(restored) && restored !== piece) {
          walk(end, [...parts, { ...partFor(model, piece, lex.get(restored)[0]), note: st.note }]);
        }
      }
    }
  };
  walk(0, []);
  const half = w.slice(0, w.length / 2);
  if (w.length % 2 === 0 && half === w.slice(w.length / 2) && lex.has(half)) {
    const p = partFor(model, half, lex.get(half)[0]);
    found.unshift([p, { ...p }]);
  }
  // Parts at the end that can be suffixes read as suffixes (they stack: te, pi,
  // na); a first part that can be a prefix reads as one.
  const hasType = (key, type) => (lex.get(key) ?? []).some((id) => (model.sensesByWord.get(id) ?? []).some((s) => s[S.type] === type));
  for (const r of found) {
    for (let i = r.length - 1; i > 0 && hasType(r[i].text, 'suffix'); i--) {
      r[i] = { ...partFor(model, r[i].text, lex.get(r[i].text)[0], null, 'suffix'), note: r[i].note };
    }
  }
  const seen = new Set();
  return found
    .sort((a, b) => a.length - b.length || b[0].text.length - a[0].text.length)
    .filter((r) => {
      const k = r.map((p) => p.text).join('+');
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, max);
}

/** Screen-ready entry for one word, or null. */
export function entry(model, wordId, { books = null, exampleLimit = 3 } = {}) {
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
  const alsoWritten = new Set(redirectFrom);
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
    // Other spellings are shown once for the word, not under each meaning.
    const sameAs = groups.get('j')?.length === 1 ? groups.get('j') : [];
    for (const t of [...(groups.get('v') ?? []), ...sameAs]) alsoWritten.add(t.word);
    groups.delete('v');
    if (sameAs.length) groups.delete('j');
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
  const fam = family(model, word[W.id]);
  for (const w of fam.respelled) alsoWritten.add(w);
  alsoWritten.delete(spelling);
  return {
    id: word[W.id],
    word: spelling,
    status: word[W.status],
    redirectFrom,
    alsoWritten: [...alsoWritten],
    partOf,
    english,
    construction: construction(model, word),
    builtOn: fam.builtOn,
    usedIn: fam.usedIn,
    senses
  };
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
