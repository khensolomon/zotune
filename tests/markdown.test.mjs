import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { parse, parseInline, slug } from '../app/js/markdown.js';

test('headings, paragraphs and lists', () => {
  const blocks = parse('# Privacy\n\nLast updated today.\nSecond line.\n\n## On your device\n\n- one\n- two\n\n1. first\n2. second\nAfter.');
  assert.deepEqual(blocks.map((b) => b.type), ['heading', 'paragraph', 'heading', 'list', 'list', 'paragraph']);
  assert.equal(blocks[0].level, 1);
  assert.equal(blocks[2].id, 'on-your-device');
  assert.deepEqual(blocks[1].inline, [{ type: 'text', text: 'Last updated today. Second line.' }]);
  assert.equal(blocks[3].ordered, false);
  assert.equal(blocks[3].items.length, 2);
  assert.equal(blocks[4].ordered, true);
});

test('inline marks and links', () => {
  assert.deepEqual(parseInline('a **b** *c* `d` [e](/f)'), [
    { type: 'text', text: 'a ' },
    { type: 'strong', children: [{ type: 'text', text: 'b' }] },
    { type: 'text', text: ' ' },
    { type: 'em', children: [{ type: 'text', text: 'c' }] },
    { type: 'text', text: ' ' },
    { type: 'code', text: 'd' },
    { type: 'text', text: ' ' },
    { type: 'link', href: '/f', children: [{ type: 'text', text: 'e' }] }
  ]);
  assert.deepEqual(parseInline('`**not bold**`'), [{ type: 'code', text: '**not bold**' }]);
  assert.deepEqual(parseInline('<b>x</b>'), [{ type: 'text', text: '<b>x</b>' }], 'HTML stays text');
});

test('only safe links are allowed', () => {
  for (const href of ['https://example.com', 'mailto:a@b.c', '/privacy', '#top']) assert.equal(parseInline(`[x](${href})`)[0].href, href);
  assert.throws(() => parseInline('[x](javascript:alert(1))'), /not allowed/);
  assert.throws(() => parseInline('[x](privacy.html)'), /not allowed/);
});

test('heading ids', () => {
  assert.equal(slug('Usage statistics'), 'usage-statistics');
  assert.equal(slug('Zolai–English, at a glance!'), 'zolai-english-at-a-glance');
});

test('every page in app/content reads, starts with a title and links only to known places', () => {
  const dir = new URL('../app/content/', import.meta.url);
  const pages = readdirSync(dir).filter((f) => f.endsWith('.md'));
  assert.deepEqual(pages.sort(), ['cookies.md', 'privacy.md', 'terms.md']);
  const routes = ['/privacy', '/terms', '/cookies', '/settings', '/about', '/'];
  const ids = Object.fromEntries(pages.map((f) => [`/${f.replace('.md', '')}`, parse(readFileSync(new URL(f, dir), 'utf8')).filter((b) => b.type === 'heading').map((b) => b.id)]));
  for (const f of pages) {
    const blocks = parse(readFileSync(new URL(f, dir), 'utf8'));
    assert.equal(blocks[0].type, 'heading', `${f} starts with a title`);
    assert.equal(blocks[0].level, 1);
    const links = [];
    const walk = (nodes) => nodes.forEach((n) => (n.type === 'link' ? links.push(n.href) : n.children && walk(n.children)));
    blocks.forEach((b) => (b.items ? b.items.forEach(walk) : walk(b.inline)));
    for (const href of links.filter((l) => l.startsWith('/'))) {
      const [path, hash] = href.split('#');
      assert.ok(routes.includes(path), `${f} links to unknown page ${path}`);
      if (hash && ids[path]) assert.ok(ids[path].includes(hash), `${f} links to missing section ${href}`);
    }
  }
});

test('the footer links to the separate pages', () => {
  const html = readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
  for (const p of ['/privacy', '/terms', '/cookies']) assert.match(html, new RegExp(`<a href="${p}">`));
  assert.doesNotMatch(html, /about#(privacy|terms|cookies)/);
});
