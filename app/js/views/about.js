import { h, icon, mount } from '../dom.js';
import { navigate } from '../router.js';

// Privacy, terms and cookies used to be sections of this page.
const MOVED = { '#privacy': '/privacy', '#terms': '/terms', '#cookies': '/cookies' };

const CUP = ['M5 8h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z', 'M16 9.5h1.5a2.5 2.5 0 0 1 0 5H16', 'M8 3.5c0 1 1 1.2 1 2.2', 'M12 3.5c0 1 1 1.2 1 2.2'];
const HEART = ['M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z'];

/**
 * In the desktop app a form would leave the window, and the system browser
 * would receive the address without the form's fields; the fields are put in
 * the address instead and the browser opens it.
 */
function openOutside(form) {
  form.addEventListener('submit', (event) => {
    if (!window.zotune) return;
    event.preventDefault();
    const url = new URL(form.action);
    for (const [k, v] of new FormData(form)) url.searchParams.set(k, String(v));
    window.open(url.href, '_blank', 'noopener');
  });
  return form;
}

function supportSection() {
  const paypal = openOutside(
    h(
      'form',
      { class: 'paypal', action: 'https://www.paypal.com/donate', method: 'post', target: '_blank', rel: 'noopener' },
      h('input', { type: 'hidden', name: 'hosted_button_id', value: 'C9PDG3T47WJ26' }),
      h('button', { class: 'icon-paypal', type: 'submit', name: 'submit', title: 'Donate with Paypal' }, icon(CUP), 'Donate with Paypal')
    )
  );
  const github = openOutside(
    h(
      'form',
      { class: 'github', action: 'https://github.com/sponsors/khensolomon', method: 'get', target: '_blank', rel: 'noopener' },
      h('button', { class: 'icon-github', type: 'submit', title: 'Github Sponsor' }, icon(HEART), 'Github Sponsor')
    )
  );
  return h(
    'section',
    { class: 'support', id: 'support', 'aria-labelledby': 'support-title' },
    h('h2', { id: 'support-title' }, 'Support zotune'),
    h('p', null, 'Zotune is free to use and has no ads. If it helps you, you can support the work that keeps it growing: checking words, improving the data and keeping the site running.'),
    h('div', { class: 'support-actions' }, paypal, github),
    h('p', { class: 'support-note' }, 'Not able to give? Answering “Is this meaning correct?” under any word helps just as much.')
  );
}

export default {
  nav: 'about',
  layout: 'page',
  title: 'About',
  render(root) {
    if (MOVED[location.hash]) {
      navigate(MOVED[location.hash], { replace: true });
      return;
    }
    mount(
      root,
      h(
        'div',
        { class: 'page' },
        h(
          'div',
          { class: 'doc' },
          h('h1', null, 'About zotune'),
          h('p', null, 'Zotune is a Zolai–English dictionary made with and for the Zo community. Every entry starts as a draft and becomes reviewed or confirmed when Zolai speakers check it.'),
          h('p', null, 'Search in Zolai or English from the same box. Words written joined or split, such as “it na” and “itna”, are found either way.'),
          h('h2', null, 'Help improve it'),
          h('p', null, 'Each meaning asks two questions: was it helpful, and is it correct. Your answers help reviewers see which entries need work. “Improve this entry” lets you suggest a better meaning or example; a reviewer checks every suggestion before it is published.'),
          supportSection()
        )
      )
    );
  }
};
