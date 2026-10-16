// Recently opened words, newest first. A per-device convenience kept in
// localStorage; when storage is blocked the list simply stays empty.

const KEY = 'zotune.recent';
const MAX = 8;

export function recentWords() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(list) ? list.filter((r) => r && typeof r.word === 'string') : [];
  } catch {
    return [];
  }
}

export function rememberWord(word, gloss = '') {
  const list = [{ word, gloss }, ...recentWords().filter((r) => r.word !== word)].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* Storage blocked: nothing to remember. */
  }
}
