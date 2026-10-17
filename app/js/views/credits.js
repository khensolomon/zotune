// Credits: the page in app/content/credits.md, then every source the
// dictionary names in its configuration.json, each at /credits#source-<code>
// so that a source tag under an example can open its credit.

import { h, mount } from '../dom.js';
import { render } from '../markdown.js';
import { data } from '../search-client.js';

// Sentences of a description written for those who maintain the data (where
// the locator points, which file or column) are left out of the page.
const MAINTAINER_NOTE = /\blocator\b|\bthis directory\b|\blang\/|\bcolumn\b/i;

export function readerDescription(text) {
  return text
    .split(/(?<=\.)\s+/)
    .map((t) => t.trim())
    .filter((t) => t && !MAINTAINER_NOTE.test(t))
    .join(' ');
}

function sourceEntry(s) {
  const about = readerDescription(s.description);
  const facts = [
    s.owner ? ['By', s.owner] : null,
    s.license ? ['Licence', s.license] : null,
    s.permission ? ['Permission', s.permission] : null
  ].filter(Boolean);
  return h(
    'section',
    { class: 'credit', id: `source-${s.code}` },
    h('h3', null, s.name, s.label !== s.name ? h('span', { class: 'credit-short' }, s.label) : null),
    s.credit ? h('p', { class: 'credit-line' }, s.credit) : null,
    about ? h('p', null, about) : null,
    facts.length ? h('dl', { class: 'credit-facts' }, facts.map(([k, v]) => [h('dt', null, k), h('dd', null, v)])) : null,
    s.url ? h('p', null, h('a', { href: s.url, target: '_blank', rel: 'noopener' }, s.url.replace(/^https?:\/\//, ''))) : null
  );
}

export default {
  nav: null,
  layout: 'page',
  title: 'Credits',
  async render(root) {
    const res = await fetch('/content/credits.md');
    if (!res.ok) throw new Error(`/content/credits.md: HTTP ${res.status}`);
    const intro = render(await res.text());
    const sources = await data.credits();
    mount(
      root,
      h(
        'div',
        { class: 'page' },
        h(
          'article',
          { class: 'doc credits' },
          intro,
          h('h2', { id: 'sources' }, 'Sources'),
          h('p', null, 'Words, meanings and example sentences come from these sources. The short name in brackets is the one shown under examples.'),
          sources.map(sourceEntry)
        )
      )
    );
    // Opened from a source tag: bring that source into view and mark it.
    const target = location.hash ? document.getElementById(location.hash.slice(1)) : null;
    if (target) {
      target.scrollIntoView();
      target.classList.add('is-target');
    }
  }
};
