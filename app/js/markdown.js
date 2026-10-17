// A small Markdown reader for the app's own pages (app/content/*.md); no
// dependency. It covers what those pages use and nothing more:
//
//   # Heading, ## Heading, ### Heading   (each gets an id from its text)
//   paragraphs separated by blank lines
//   - item / * item / 1. item           lists (one line per item)
//   **strong**, *emphasis*, `code`, [text](link)
//
// Links may only be absolute http(s), mailto, a path starting with / or an
// anchor (#…); anything else stops with an error, so a typo in a page shows
// up at once instead of producing a broken or unsafe link. Text is never
// parsed as HTML: rendering builds DOM nodes, so markup in a page is shown as
// written.

import { h } from './dom.js';

const SAFE_HREF = /^(https?:\/\/|mailto:|\/|#)/;
const INLINE = /`([^`]+)`|\*\*(.+?)\*\*|\*(.+?)\*|\[([^\]]+)\]\(([^)\s]+)\)/g;

/** Heading text → id: lower case, letters and digits joined by hyphens. */
export function slug(text) {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Inline text → [{ type: 'text' | 'code' | 'strong' | 'em' | 'link', … }]. */
export function parseInline(text) {
  const out = [];
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    if (m.index > last) out.push({ type: 'text', text: text.slice(last, m.index) });
    if (m[1] !== undefined) out.push({ type: 'code', text: m[1] });
    else if (m[2] !== undefined) out.push({ type: 'strong', children: parseInline(m[2]) });
    else if (m[3] !== undefined) out.push({ type: 'em', children: parseInline(m[3]) });
    else {
      const href = m[5];
      if (!SAFE_HREF.test(href)) throw new Error(`Markdown link not allowed: ${href}`);
      out.push({ type: 'link', href, children: parseInline(m[4]) });
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ type: 'text', text: text.slice(last) });
  return out;
}

const plain = (nodes) => nodes.map((n) => (n.children ? plain(n.children) : n.text)).join('');

/** Markdown → blocks: heading, paragraph and list. */
export function parse(markdown) {
  const blocks = [];
  let para = [];
  let list = null;
  const flush = () => {
    if (para.length) blocks.push({ type: 'paragraph', inline: parseInline(para.join(' ')) });
    para = [];
    if (list) blocks.push(list);
    list = null;
  };
  for (const raw of String(markdown).replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      flush();
      const inline = parseInline(heading[2]);
      blocks.push({ type: 'heading', level: heading[1].length, id: slug(plain(inline)), inline });
      continue;
    }
    const item = /^(?:([-*])|(\d+)\.)\s+(.+)$/.exec(line);
    if (item) {
      const ordered = item[2] !== undefined;
      if (para.length || (list && list.ordered !== ordered)) flush();
      list ??= { type: 'list', ordered, items: [] };
      list.items.push(parseInline(item[3]));
      continue;
    }
    if (list) flush();
    para.push(line);
  }
  flush();
  return blocks;
}

function inlineNodes(nodes) {
  return nodes.map((n) => {
    if (n.type === 'text') return n.text;
    if (n.type === 'code') return h('code', null, n.text);
    if (n.type === 'strong') return h('strong', null, inlineNodes(n.children));
    if (n.type === 'em') return h('em', null, inlineNodes(n.children));
    const external = /^https?:\/\//.test(n.href);
    return h('a', external ? { href: n.href, target: '_blank', rel: 'noopener' } : { href: n.href }, inlineNodes(n.children));
  });
}

/** Markdown → DOM nodes. */
export function render(markdown) {
  return parse(markdown).map((b) => {
    if (b.type === 'heading') return h(`h${b.level}`, { id: b.id }, inlineNodes(b.inline));
    if (b.type === 'paragraph') return h('p', null, inlineNodes(b.inline));
    return h(b.ordered ? 'ol' : 'ul', null, b.items.map((item) => h('li', null, inlineNodes(item))));
  });
}
