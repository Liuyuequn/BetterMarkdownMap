import type { IPureNode } from 'bettermarkdownmap-common';
import { wrapFunction } from 'bettermarkdownmap-common';
import { expect, test } from 'vitest';
import { Transformer, builtInPlugins } from '../src/index';

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

test('plugins', () => {
  const transformer = new Transformer();
  expect(transformer.plugins.map((plugin) => plugin.name)).toEqual([
    'frontmatter',
    'katex',
    'hljs',
    'npmUrl',
    'checkbox',
    'sourceLines',
  ]);
  const assets = transformer.getAssets();
  expect(assets).toMatchSnapshot();
});

test('custom url provider', () => {
  const transformer = new Transformer();
  transformer.urlBuilder.setProvider('local', (path) => `/local/${path}`);
  transformer.urlBuilder.provider = 'local';
  const assets = transformer.getAssets();
  expect(assets).toMatchSnapshot();
});

test('content without frontmatter', () => {
  const transformer = new Transformer();
  const result = transformer.transform(`\
- l1
  - l1.1
  - l1.2
    - l1.2.1
`);
  expect(result).toMatchSnapshot();
});

test('content with frontmatter', () => {
  const transformer = new Transformer();
  const result = transformer.transform(`\
---
bettermarkdownmap:
  color: blue
---

- l1
  - l1.1
  - l1.2
    - l1.2.1
`);
  expect(result).toMatchSnapshot();
});

test('content with line endings of CRLF', () => {
  const transformer = new Transformer();
  const result = transformer.transform(
    `\
---
bettermarkdownmap:
  color: blue
---

- l1
  - l1.1
  - l1.2
    - l1.2.1
`.replace(/\n/g, '\r\n'),
  );
  expect(result).toMatchSnapshot();
});

test('content with only katex enabled', () => {
  const transformer = new Transformer();
  const result = transformer.transform(`\
---
bettermarkdownmap:
  color: blue
---

- $x = {-b \\pm \\sqrt{b^2-4ac} \\over 2a}$
`);
  expect(result).toMatchSnapshot();
  expect(transformer.getUsedAssets(result.features)).toMatchSnapshot();
});

test('unsupported standalone blocks are ignored', () => {
  const transformer = new Transformer();
  const result = transformer.transform(`\
---
title: This title is ignored
---

This paragraph is ignored.

> This blockquote is ignored.

***

| products | price |
|-|-|
| apple | 10 |
| banana | 12 |

\`\`\`ts
const ignored = true;
\`\`\`

![ignored image](image.png)
`);
  expect(result.root).toEqual({
    content: '',
    children: [],
  });
});

test('checkboxes', () => {
  const transformer = new Transformer();
  const result = transformer.transform(`\
# Housework

## Main

- [x] Dishes
- [ ] Cleaning the bathroom
- [x] Change the light bulbs
- [ ] something else

## [x] should it works on titles?

## [x] idk if it should!

### [ ] test

### [x] test

- [x] test
- [x] test


## [x] only works on list items is better
\`\`\`
[ ] this is not a checkbox either
\`\`\`
`);
  expect(result).toMatchSnapshot();
});

test('magic comments', () => {
  const transformer = new Transformer();
  const result = transformer.transform(`\
## heading 1 <!-- bettermarkdownmap: fold -->

- 1 <!-- bettermarkdownmap: foldAll -->
  - 1.1
  - 1.2
- 2
  - 2.1
  - 2.2
`);
  expect(result).toMatchSnapshot();
});

test('links - target=_blank', () => {
  const transformer = new Transformer([
    ...builtInPlugins,
    {
      name: 'target-blank',
      transform(transformHooks) {
        transformHooks.parser.tap((md) => {
          md.renderer.renderAttrs = wrapFunction(
            md.renderer.renderAttrs,
            (renderAttrs, token) => {
              let attrs = renderAttrs(token);
              if (token.type === 'link_open') {
                attrs += ' target="_blank"';
              }
              return attrs;
            },
          );
        });
        return {};
      },
    },
  ]);
  const result = transformer.transform(`\
## heading 1

- [Google](https://www.google.com)
`);
  expect(result).toMatchSnapshot();
});

test('group ordered lists interrupted by other blocks', () => {
  const transformer = new Transformer();
  const { root } = transformer.transform(`\
### Section

29. alpha ................. 13

ii

<!-- page 3 of 125 -->

29A. beta ................. 13

30. gamma ................ 13

30A. delta ............... 13

31. epsilon .............. 14

1. one
2. two
`);
  // `ii`, the comment and the `29A.`/`30A.` paragraphs are ignored, so 29-31
  // end up in one group; the numbering going backwards at `1.` opens another.
  expect(outline(root)).toEqual([
    'Section',
    '  (list)',
    '    29. alpha ................. 13',
    '    30. gamma ................ 13',
    '    31. epsilon .............. 14',
    '  (list)',
    '    1. one',
    '    2. two',
  ]);
});

test('render the same tree as an uninterrupted ordered list', () => {
  const transformer = new Transformer();
  const interrupted = transformer.transform(`\
### Section

29. alpha

ii

30. beta

31. gamma
`);
  const continuous = transformer.transform(`\
### Section

29. alpha

30. beta

31. gamma
`);
  expect(outline(interrupted.root)).toEqual(outline(continuous.root));
});

test('start a new group when numbers are skipped or repeated', () => {
  const transformer = new Transformer();
  const skipped = transformer.transform(`\
### Section

29. alpha

30. beta

40. gamma

41. delta
`);
  expect(outline(skipped.root)).toEqual([
    'Section',
    '  (list)',
    '    29. alpha',
    '    30. beta',
    '  (list)',
    '    40. gamma',
    '    41. delta',
  ]);
  const repeated = transformer.transform(`\
### Section

29. alpha

30. beta

30. gamma

31. delta
`);
  expect(outline(repeated.root)).toEqual([
    'Section',
    '  (list)',
    '    29. alpha',
    '    30. beta',
    '  (list)',
    '    30. gamma',
    '    31. delta',
  ]);
});
