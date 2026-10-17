import { h, mount } from '../dom.js';

export default {
  nav: 'about',
  layout: 'page',
  title: 'About',
  render(root) {
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
          h('h2', { id: 'privacy' }, 'Privacy'),
          h('p', null, 'There is no account to create. Bookmarks, likes and answers are kept on your device first. When sending is switched on, only the answers and suggestions themselves are sent.'),
          h(
            'p',
            null,
            'Usage statistics are collected only if you allow them, through Google Analytics: the pages you open, what you search for (a single word, and whether it was found; phrases and sentences are counted without their text), and when you bookmark, like or answer. Advertising features are off. You can change your choice at any time in ',
            h('a', { href: '/settings#privacy' }, 'Settings'),
            '. If your browser sends the Global Privacy Control signal, statistics stay off.'
          ),
          h('h2', { id: 'terms' }, 'Terms'),
          h('p', null, 'Suggestions are shared with the community under the same licence as the dictionary data.'),
          h('h2', { id: 'cookies' }, 'Cookies'),
          h('p', null, 'Zotune uses no advertising cookies. Google Analytics sets its cookies (_ga) only after you allow usage statistics, and they are removed when you turn statistics off. The dictionary is stored in your browser so it works offline.')
        )
      )
    );
  }
};
