// The consent card for usage statistics: bottom right, quiet, two equal choices.

import { h, icon } from '../dom.js';
import * as analytics from '../analytics.js';

const DELAY_MS = 1200;

/** Shows the card once, a moment after the app starts, if no choice was made yet. */
export function askForConsent({ delay = DELAY_MS } = {}) {
  if (!analytics.needsAsking()) return;
  setTimeout(() => {
    if (!analytics.needsAsking() || document.querySelector('.consent')) return;
    const close = (value) => {
      analytics.setChoice(value);
      card.classList.remove('is-in');
      card.addEventListener('transitionend', () => card.remove(), { once: true });
      // Without transitions (reduced motion) there is no transitionend.
      setTimeout(() => card.remove(), 400);
    };
    const allow = h('button', { type: 'button', class: 'btn primary' }, 'Allow');
    const decline = h('button', { type: 'button', class: 'btn' }, 'No thanks');
    allow.addEventListener('click', () => close('granted'));
    decline.addEventListener('click', () => close('denied'));
    const card = h(
      'aside',
      { class: 'consent', role: 'region', 'aria-labelledby': 'consent-title' },
      icon(['M5 19V11', 'M12 19V5', 'M19 19v-6'], { class: 'consent-icon' }),
      h(
        'div',
        { class: 'consent-body' },
        h('p', { class: 'consent-title', id: 'consent-title' }, 'Help improve zotune'),
        h(
          'p',
          { class: 'consent-text' },
          'Allow Google Analytics to count how the app is used, such as which words are looked up and whether they were found. No ads. You can change this in ',
          h('a', { href: '/settings#privacy' }, 'Settings'),
          '.'
        ),
        h('div', { class: 'consent-actions' }, decline, allow)
      )
    );
    document.body.append(card);
    requestAnimationFrame(() => requestAnimationFrame(() => card.classList.add('is-in')));
  }, delay);
}
