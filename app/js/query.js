// Reads what kind of thing a search query is, before any lookup, so the page
// can answer each kind in its own way. Pure functions; runs in the window, the
// worker and under Node.

const SCRIPTS = [
  ['Myanmar', /\p{Script=Myanmar}/u],
  ['Devanagari (Hindi)', /\p{Script=Devanagari}/u],
  ['Bengali', /\p{Script=Bengali}/u],
  ['Thai', /\p{Script=Thai}/u],
  ['Chinese', /\p{Script=Han}/u],
  ['Korean', /\p{Script=Hangul}/u],
  ['Japanese', /[\p{Script=Hiragana}\p{Script=Katakana}]/u],
  ['Cyrillic', /\p{Script=Cyrillic}/u],
  ['Greek', /\p{Script=Greek}/u],
  ['Arabic', /\p{Script=Arabic}/u],
  ['Hebrew', /\p{Script=Hebrew}/u]
];

const WORD_CHARS = /[\p{L}\p{M}0-9'’-]/u;

/** Splits text into word tokens (letters, digits, apostrophes, hyphens). */
export function tokens(text) {
  return (String(text ?? '').match(/[\p{L}\p{M}0-9]+(?:['’-][\p{L}\p{M}0-9]+)*'?/gu) ?? []);
}

/**
 * The kind of a query:
 * - `empty`: nothing to look up
 * - `address`: a web or email address
 * - `script`: written in a script other than Latin (`script` names it)
 * - `number`: digits only (`value` holds the number when it is a whole number)
 * - `word`: one word
 * - `phrase`: two to four words
 * - `sentence`: five or more words, or ending like a sentence
 * Every kind carries `text` (trimmed), `clean` (symbols removed) and `words`.
 * `symbols` is true when characters other than letters, digits, spaces,
 * apostrophes and hyphens were removed; `latinOther` is true for Latin letters
 * with marks Zolai does not use (é, ñ, ü…).
 */
export function classify(input) {
  const text = String(input ?? '').replace(/\s+/g, ' ').trim();
  const base = { text, clean: '', words: [], symbols: false, latinOther: false };
  if (!text) return { ...base, kind: 'empty' };
  if (/^(https?:\/\/|www\.)\S+$/i.test(text) || /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(text)) {
    return { ...base, kind: 'address' };
  }
  for (const [name, re] of SCRIPTS) {
    if (re.test(text)) return { ...base, kind: 'script', script: name, words: tokens(text) };
  }
  const words = tokens(text);
  const clean = words.join(' ');
  const symbols = [...text].some((ch) => ch !== ' ' && !WORD_CHARS.test(ch));
  const latinOther = /[À-ɏ]/u.test(text.normalize('NFC'));
  const common = { ...base, clean, words, symbols, latinOther };
  if (!words.length) return { ...common, kind: 'empty' };
  if (words.every((w) => /^\d+$/.test(w)) || /^\d[\d,. ]*$/.test(text)) {
    const digits = text.replace(/[,. ]/g, '');
    const value = /^\d{1,15}$/.test(digits) ? Number(digits) : null;
    return { ...common, kind: 'number', value };
  }
  if (words.length === 1) return { ...common, kind: 'word' };
  if (words.length <= 4 && !/[.!?]$/.test(text)) return { ...common, kind: 'phrase' };
  return { ...common, kind: 'sentence' };
}

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const SCALES = [
  [1e9, 'billion'],
  [1e6, 'million'],
  [1e3, 'thousand'],
  [100, 'hundred']
];

/** English words for a whole number below one trillion: 125 → one hundred twenty-five. */
export function numberWords(n) {
  if (!Number.isInteger(n) || n < 0 || n >= 1e12) return null;
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : '');
  for (const [size, name] of SCALES) {
    if (n >= size) {
      const head = numberWords(Math.floor(n / size));
      const rest = n % size;
      return `${head} ${name}${rest ? ` ${numberWords(rest)}` : ''}`;
    }
  }
  return null;
}

/** Bounded edit distance (insert, delete, substitute, swap); returns max + 1 when above max. */
export function editDistance(a, b, max = 2) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev2 = null;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (prev2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur.push(v);
      if (v < best) best = v;
    }
    if (best > max) return max + 1;
    prev2 = prev;
    prev = cur;
  }
  return prev[b.length];
}
