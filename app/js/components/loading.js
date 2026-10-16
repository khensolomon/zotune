// Shows dictionary loading progress and errors where search results will appear.

import { h } from '../dom.js';
import { onStatus } from '../search-client.js';

export function loadingNote() {
  const el = h('p', { class: 'loading-note', role: 'status', hidden: true });
  const stop = onStatus((s) => {
    if (!el.isConnected && el.dataset.seen) {
      stop();
      return;
    }
    el.dataset.seen = '1';
    if (s.state === 'loading') {
      el.hidden = false;
      el.classList.remove('is-error');
      el.textContent = s.total ? `${s.step} (${s.done + 1} of ${s.total})…` : `${s.step ?? 'Getting the dictionary ready'}…`;
    } else if (s.state === 'error') {
      el.hidden = false;
      el.classList.add('is-error');
      el.textContent = `The dictionary could not be loaded. ${s.message ?? ''}`;
    } else {
      el.hidden = true;
    }
  });
  return el;
}
