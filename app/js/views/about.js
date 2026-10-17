import { h, mount } from '../dom.js';
import { navigate } from '../router.js';

// Privacy, terms and cookies used to be sections of this page.
const MOVED = { '#privacy': '/privacy', '#terms': '/terms', '#cookies': '/cookies' };

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
          h('p', { class: 'meta-line' }, h('a', { href: '/privacy' }, 'Privacy'), ' · ', h('a', { href: '/terms' }, 'Terms'), ' · ', h('a', { href: '/cookies' }, 'Cookies'), ' · ', h('a', { href: '/credits' }, 'Credits'))
        )
      )
    );
  }
};
