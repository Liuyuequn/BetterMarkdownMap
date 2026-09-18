import {
  IAssets,
  IPureNode,
  JSItem,
  persistCSS,
  persistJS,
} from 'bettermarkdownmap-common';
import type {
  IBetterMarkdownMapJSONOptions,
  IBetterMarkdownMapOptions,
} from 'bettermarkdownmap-view';

export const template = __define__.TEMPLATE || '';

export const baseJsPaths = [
  `d3@${__define__.D3_VERSION}/dist/d3.min.js`,
  'bettermarkdownmap-view/dist/browser/index.js',
];

export function fillTemplate(
  root: IPureNode | null,
  assets: IAssets,
  extra?: {
    baseJs?: JSItem[];
    jsonOptions?: Partial<IBetterMarkdownMapJSONOptions>;
    getOptions?: (
      jsonOptions: Partial<IBetterMarkdownMapJSONOptions>,
    ) => Partial<IBetterMarkdownMapOptions>;
  },
): string {
  extra = {
    ...extra,
  };
  extra.baseJs ??= [];
  const { scripts, styles } = assets;
  const cssList = [...(styles ? persistCSS(styles) : [])];
  const context = {
    getBetterMarkdownMap: () => window.bettermarkdownmap,
    getOptions: extra.getOptions,
    jsonOptions: extra.jsonOptions,
    root,
  };
  const jsList = [
    ...persistJS(
      [
        ...extra.baseJs,
        ...(scripts || []),
        {
          type: 'iife',
          data: {
            fn: (
              getBetterMarkdownMap: (typeof context)['getBetterMarkdownMap'],
              getOptions: (typeof context)['getOptions'],
              root: (typeof context)['root'],
              jsonOptions: IBetterMarkdownMapJSONOptions,
            ) => {
              const bettermarkdownmap = getBetterMarkdownMap();
              window.mm = bettermarkdownmap.BetterMarkdownMap.create(
                'svg#mindmap',
                (getOptions || bettermarkdownmap.deriveOptions)(jsonOptions),
                root,
              );
            },
            getParams: ({
              getBetterMarkdownMap,
              getOptions,
              root,
              jsonOptions,
            }) => {
              return [getBetterMarkdownMap, getOptions, root, jsonOptions];
            },
          },
        } as JSItem,
      ],
      context,
    ),
  ];
  const html = template
    .replace('<!--CSS-->', () => cssList.join(''))
    .replace('<!--JS-->', () => jsList.join(''));
  return html;
}
