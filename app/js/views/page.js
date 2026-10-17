// Pages written in Markdown (app/content/<name>.md), such as Privacy.

import { h, mount } from '../dom.js';
import { render } from '../markdown.js';

/** A route view that shows app/content/<name>.md. */
export function markdownPage(name, title) {
  return {
    nav: null,
    layout: 'page',
    title,
    async render(root) {
      const url = `/content/${name}.md`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
      mount(root, h('div', { class: 'page' }, h('article', { class: 'doc' }, render(await res.text()))));
    }
  };
}
