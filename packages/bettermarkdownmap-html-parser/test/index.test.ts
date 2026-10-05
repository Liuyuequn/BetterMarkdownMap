import type { IPureNode } from 'bettermarkdownmap-common';
import { expect, test } from 'vitest';
import { convertNode, parseHtml } from '../src/index';

/** Compact view of a tree: `/` for an empty root, `(list)` for empty nodes. */
function outline(node: IPureNode, depth = 0): string[] {
  const content = node.content
    .replace(/<br\s*\/?>/gi, ' / ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const label = content || (depth === 0 ? '/' : '(list)');
  return [
    `${'  '.repeat(depth)}${label}`,
    ...node.children.flatMap((child) => outline(child, depth + 1)),
  ];
}

test('only headings and lists become nodes', () => {
  const root = parseHtml(`
<h1>heading</h1>
<p>plain paragraph</p>
<ul>
  <li>unordered
    <ul><li>nested</li></ul>
  </li>
</ul>
<ol><li>ordered</li></ol>
<table><tr><td>table</td></tr></table>
<pre><code>code block</code></pre>
<p><img src="image.png"></p>
<blockquote><h2>quoted heading</h2></blockquote>
`);
  const tags: string[] = [];
  const collectTags = (node: ReturnType<typeof parseHtml>) => {
    if (node.tag) tags.push(node.tag);
    node.children?.forEach(collectTags);
  };
  collectTags(root);
  expect(tags).toEqual(['h1', 'ul', 'li', 'ul', 'li', 'ol', 'li']);
});

test('parseHtml', () => {
  const root = parseHtml(`
<body>
<div class="container">
<h1 data-id="h1">heading 1</h1>
<p>text here will be ignored.</p>
<ul>
<li>this list</li>
<li>is ignored</li>
</ul>
<h2 data-id="h2">heading 2 <!-- bettermarkdownmap: foldAll --></h2>
<p>text also ignored</p>
<ul>
<li><p>item 1</p></li>
<li><p>item 2</p>
<ul>
<li><p>item 3</p></li>
<li><p>item 4</p><p>additional text</p></li>
</li>
</ul>
</ul>
<ol>
<li>item 5</li>
<li>item 6</li>
<li>item 7
<ul>
<li>item 7.1
<ul>
<li>item 7.1.1</li>
<li>item 7.1.2</li>
</ul>
</li>
<li>item 7.2</li>
</ul>
</li>
</ol>
<h2>A table</h2>
<table>
<tr>
<td>
<ul><li>this list is ignored</li></ul>
</td>
</tr>
</table>
<p><img src="image1.png"></p>
<p><img src="image2.png"></p>
</div>
</body>
`);
  expect(root).toMatchSnapshot();
  expect(convertNode(root)).toMatchSnapshot();
});

test('parseHtml with data', () => {
  const root = parseHtml(`
<ul data-lines="0,4">
<li data-lines="0,4">l1
<ul data-lines="1,4">
<li data-lines="1,2">l1.1</li>
<li data-lines="2,4">l1.2
<ul data-lines="3,4">
<li data-lines="3,4">l1.2.1</li>
</ul></li>
</ul></li>
</ul>`);
  expect(root).toMatchSnapshot();
  expect(convertNode(root)).toMatchSnapshot();
});

test('li > pre', () => {
  const root = parseHtml(`<body>
<ul>
<li>hello</li>
<li><pre><code>code block</code></pre></li>
</ul>
</body>`);
  expect(root).toMatchSnapshot();
  expect(convertNode(root)).toMatchSnapshot();
});

test('ol > li', () => {
  const root = parseHtml(`<body>
<ol start="3">
<li>hello</li>
<li>world</li>
</ol>
</body>`);
  expect(root).toMatchSnapshot();
  expect(convertNode(root)).toMatchSnapshot();
});

test('merge lists that belong to the same run', () => {
  // Paragraphs, comments and anything else between the lists are ignored, so
  // the three lists become a single group.
  const root = convertNode(
    parseHtml(`<body>
<h3>heading</h3>
<ol start="29"><li data-index="29">a</li></ol>
<p>ignored paragraph</p>
<ol start="30"><li data-index="30">b</li></ol>
<!-- ignored comment -->
<ol start="31"><li data-index="31">c</li></ol>
</body>`),
  );
  expect(outline(root)).toEqual([
    '/',
    '  heading',
    '    (list)',
    '      29. a',
    '      30. b',
    '      31. c',
  ]);
});

test('merge lists without explicit numbers', () => {
  const root = convertNode(
    parseHtml(`<body>
<ol start="29"><li>a</li></ol>
<p>ignored paragraph</p>
<ol start="30"><li>b</li></ol>
</body>`),
  );
  expect(outline(root)).toEqual(['/', '  (list)', '    29. a', '    30. b']);
});

test('start a new group when the numbering goes backwards', () => {
  const root = convertNode(
    parseHtml(`<body>
<ol start="31">
<li data-index="31">a</li>
<li data-index="1">b</li>
<li data-index="2">c</li>
</ol>
</body>`),
  );
  expect(outline(root)).toEqual([
    '/',
    '  (list)',
    '    31. a',
    '  (list)',
    '    1. b',
    '    2. c',
  ]);
});

test('start a new group when a number is repeated', () => {
  const root = convertNode(
    parseHtml(`<body>
<ol>
<li data-index="1">a</li>
<li data-index="1">b</li>
<li data-index="1">c</li>
</ol>
</body>`),
  );
  expect(outline(root)).toEqual([
    '/',
    '  (list)',
    '    1. a',
    '  (list)',
    '    1. b',
    '  (list)',
    '    1. c',
  ]);
});

test('start a new group when a number is skipped', () => {
  const root = convertNode(
    parseHtml(`<body>
<ol start="29">
<li data-index="29">a</li>
<li data-index="40">b</li>
</ol>
</body>`),
  );
  expect(outline(root)).toEqual([
    '/',
    '  (list)',
    '    29. a',
    '  (list)',
    '    40. b',
  ]);
});

test('merge bullet lists interrupted by other blocks', () => {
  const root = convertNode(
    parseHtml(`<body>
<ul><li>a</li></ul>
<p>ignored paragraph</p>
<ul><li>b</li></ul>
</body>`),
  );
  expect(outline(root)).toEqual(['/', '  (list)', '    a', '    b']);
});

test('headings break a group', () => {
  const root = convertNode(
    parseHtml(`<body>
<h2>one</h2>
<ol start="29"><li data-index="29">a</li></ol>
<h2>two</h2>
<ol start="30"><li data-index="30">b</li></ol>
</body>`),
  );
  expect(outline(root)).toEqual([
    '/',
    '  one',
    '    (list)',
    '      29. a',
    '  two',
    '    (list)',
    '      30. b',
  ]);
});

test('keep nested lists of merged items', () => {
  const root = convertNode(
    parseHtml(`<body>
<ol start="29">
<li data-index="29">a
<ul><li>a.1</li></ul>
</li>
</ol>
<p>ignored paragraph</p>
<ol start="30"><li data-index="30">b</li></ol>
</body>`),
  );
  expect(outline(root)).toEqual([
    '/',
    '  (list)',
    '    29. a',
    '      (list)',
    '        a.1',
    '    30. b',
  ]);
});
