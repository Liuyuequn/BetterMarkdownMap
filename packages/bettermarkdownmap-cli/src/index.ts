import { readFile, writeFile } from 'fs/promises';
import {
  CSSItem,
  JSItem,
  buildJSItem,
  mergeAssets,
} from 'bettermarkdownmap-common';
import {
  Transformer,
  type IAssets,
  type IBetterMarkdownMapCreateOptions,
} from 'bettermarkdownmap-lib';
import { baseJsPaths, fillTemplate } from 'bettermarkdownmap-render';
import open from 'open';
import { resolve } from 'path';
import { IDevelopOptions } from './types';
import {
  ASSETS_PREFIX,
  config,
  localProvider,
  toolbarAssets,
} from './util/common';

export * from './types';
export * from './util/dev-server';
export { config };

export * as bettermarkdownmap from 'bettermarkdownmap-lib';

async function loadFile(path: string) {
  if (path.startsWith(ASSETS_PREFIX)) {
    const relpath = path.slice(ASSETS_PREFIX.length);
    return readFile(resolve(config.assetsDir, relpath), 'utf8');
  }
  const res = await fetch(path);
  if (!res.ok) throw res;
  return res.text();
}

async function inlineAssets(assets: IAssets): Promise<IAssets> {
  const [scripts, styles] = await Promise.all([
    Promise.all(
      (assets.scripts || []).map(
        async (item): Promise<JSItem> =>
          item.type === 'script' && item.data.src
            ? {
                type: 'script',
                data: {
                  textContent: await loadFile(item.data.src),
                },
              }
            : item,
      ),
    ),
    Promise.all(
      (assets.styles || []).map(
        async (item): Promise<CSSItem> =>
          item.type === 'stylesheet'
            ? {
                type: 'style',
                data: await loadFile(item.data.href),
              }
            : item,
      ),
    ),
  ]);
  return {
    scripts,
    styles,
  };
}

export async function createBetterMarkdownMap(
  options: IBetterMarkdownMapCreateOptions &
    IDevelopOptions & { open: boolean },
): Promise<void> {
  const transformer = new Transformer();
  transformer.urlBuilder.setProvider('local', localProvider);
  transformer.urlBuilder.provider = 'local';
  const { root, features, frontmatter } = transformer.transform(
    options.content || '',
  );
  const otherAssets = mergeAssets(
    {
      scripts: baseJsPaths.map(buildJSItem),
    },
    options.toolbar ? toolbarAssets : null,
  );
  const assets = await inlineAssets(
    mergeAssets(
      {
        scripts: otherAssets.scripts?.map((item) =>
          transformer.resolveJS(item),
        ),
        styles: otherAssets.styles?.map((item) => transformer.resolveCSS(item)),
      },
      transformer.getUsedAssets(features),
    ),
  );
  const html = fillTemplate(root, assets, {
    baseJs: [],
    jsonOptions: (frontmatter as any)?.bettermarkdownmap,
  });
  const output = options.output || 'bettermarkdownmap.html';
  await writeFile(output, html, 'utf8');
  if (options.open) open(output);
}
