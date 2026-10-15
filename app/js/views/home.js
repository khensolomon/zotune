import { h, mount } from '../dom.js';
import { searchField } from '../components/search-field.js';
import { definitionPath } from '../router.js';
import { loadingNote } from '../components/loading.js';

const TRY = ['itna', 'lungdamna', 'love'];

export default {
  nav: 'home',
  layout: 'home',
  title: '',
  render(root, _params, ctx) {
    const field = searchField({ size: 'lg' });
    ctx.registerField(field);
    mount(
      root,
      h(
        'div',
        { class: 'home' },
        h(
          'div',
          { class: 'home-brand' },
          h('h1', { class: 'visually-hidden' }, 'zotune'),
          h('img', { src: '/assets/logo.svg', alt: 'zotune', width: 495, height: 64 }),
          h('p', { class: 'tagline' }, 'Zo kammal — every Zolai word, in English')
        ),
        h(
          'div',
          { class: 'home-search' },
          field.el,
          h('div', { class: 'try' }, h('span', null, 'Try'), TRY.map((w) => h('a', { class: 'chip', href: definitionPath(w) }, w))),
          loadingNote()
        )
      )
    );
    if (matchMedia('(pointer: fine)').matches) field.focus();
  }
};
