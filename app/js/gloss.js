// Short glosses that say when they leave terms out.

const GLOSS_ROOM = 24;

/**
 * The terms that fit a short gloss of `room` characters (always at least one)
 * and how many are left out, so a shortened gloss can say that there is more.
 */
export function fitGloss(terms, room = GLOSS_ROOM) {
  const shown = [];
  let length = 0;
  for (const t of terms) {
    const next = length + (shown.length ? 2 : 0) + t.length;
    if (shown.length && next > room) break;
    shown.push(t);
    length = next;
  }
  return { shown, hidden: terms.length - shown.length };
}
