import { h, mount } from '../dom.js';

export default {
  nav: null,
  layout: 'page',
  title: 'Not found',
  render(root) {
    mount(
      root,
      h('div', { class: 'page' }, h('div', { class: 'notice' }, h('h1', null, 'This page does not exist'), h('p', null, h('a', { href: '/' }, 'Go to the home page'))))
    );
  }
};
