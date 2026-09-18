import { wrapFunction } from 'bettermarkdownmap-common';
import { expect, test } from 'vitest';
import { Transformer, builtInPlugins } from '../src/index';

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
