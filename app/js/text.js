// Text normalisation shared by the window and the workers.

const MARKS = /[̀-ͯ]/g;
const QUOTES = /[‘’ʼʻ`´]/g;
const JOINERS = /[\s\-‐‑‒–·]+/g;

/** Display-preserving clean-up: trims and collapses whitespace. */
export function tidy(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * Matching key: lower case, accents and curly quotes folded, hyphens, dots and
 * spaces removed. `amaute`, `amau te` and `amau-te` share one key.
 */
export function matchKey(value) {
  return tidy(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(MARKS, '')
    .replace(QUOTES, "'")
    .replace(JOINERS, '');
}

/**
 * Splits prose marked with `{word}` (Zolai, not a link) and `<word>` (Zolai, a
 * link) into parts. `<a/b>` and `<a> <b>` give one link per word.
 */
export function markedParts(value) {
  const parts = [];
  const re = /\{([^}]+)\}|<([^>]+)>/g;
  let last = 0;
  let m;
  const text = String(value ?? '');
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push({ kind: 'text', text: text.slice(last, m.index) });
    if (m[1] !== undefined) {
      parts.push({ kind: 'zo', text: m[1] });
    } else {
      m[2].split('/').forEach((word, i) => {
        if (i > 0) parts.push({ kind: 'text', text: '/' });
        parts.push({ kind: 'link', text: word.trim() });
      });
    }
    last = re.lastIndex;
  }
  if (last < text.length) parts.push({ kind: 'text', text: text.slice(last) });
  return parts;
}
