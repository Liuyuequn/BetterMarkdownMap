import {
  buildCSSItem,
  buildJSItem,
  loadCSS,
  loadJS,
  urlBuilder,
} from 'bettermarkdownmap-common';
import type { Transformer } from 'bettermarkdownmap-lib';
import type { AutoLoaderOptions } from './types';

export * from './types';

const enabled: Record<string, boolean> = {};

const autoLoaderOptions = {
  baseJs: [],
  baseCss: [],
  manual: false,
  toolbar: false,
  ...(window.bettermarkdownmap?.autoLoader as Partial<AutoLoaderOptions>),
};

async function initialize() {
  if (typeof autoLoaderOptions.provider === 'function') {
    urlBuilder.setProvider(
      (urlBuilder.provider = 'autoLoader'),
      autoLoaderOptions.provider,
    );
  } else if (typeof autoLoaderOptions.provider === 'string') {
    urlBuilder.provider = autoLoaderOptions.provider;
  }
  await Promise.all([
    loadJS(
      autoLoaderOptions.baseJs.map((item) =>
        typeof item === 'string'
          ? buildJSItem(urlBuilder.getFullUrl(item))
          : item,
      ),
    ),
    loadCSS(
      autoLoaderOptions.baseCss.map((item) =>
        typeof item === 'string'
          ? buildCSSItem(urlBuilder.getFullUrl(item))
          : item,
      ),
    ),
  ]);
  const { bettermarkdownmap } = window;
  if (!bettermarkdownmap) {
    throw new Error(
      'BetterMarkdownMap runtime must be loaded from local assets before the autoloader.',
    );
  }
  const style = document.createElement('style');
  style.textContent = bettermarkdownmap.globalCSS;
  // Insert global CSS to body so it has higher priority than prism.css, etc.
  document.body.prepend(style);
  autoLoaderOptions.onReady?.();
}

export const ready = initialize();

function transform(transformer: Transformer, content: string) {
  const result = transformer.transform(content);
  const keys = Object.keys(result.features).filter((key) => !enabled[key]);
  keys.forEach((key) => {
    enabled[key] = true;
  });
  const { styles, scripts } = transformer.getAssets(keys);
  const { bettermarkdownmap } = window;
  if (styles) bettermarkdownmap.loadCSS(styles);
  if (scripts) bettermarkdownmap.loadJS(scripts);
  return result;
}

export function render(el: HTMLElement) {
  const { Transformer, BetterMarkdownMap, deriveOptions, Toolbar } =
    window.bettermarkdownmap;
  const lines = el.textContent?.split('\n') || [];
  let indent = Infinity;
  lines.forEach((line) => {
    const spaces = line.match(/^\s*/)?.[0].length || 0;
    if (spaces < line.length) indent = Math.min(indent, spaces);
  });
  const content = lines
    .map((line) => line.slice(indent))
    .join('\n')
    .trim();
  const transformer = new Transformer(autoLoaderOptions.transformPlugins);
  transformer.urlBuilder = urlBuilder;
  el.innerHTML = '<svg></svg>';
  const svg = el.firstChild as SVGElement;
  const mm = BetterMarkdownMap.create(svg, { embedGlobalCSS: false });
  if (autoLoaderOptions.toolbar) {
    const { el: toolbar } = Toolbar.create(mm);
    Object.assign(toolbar.style, {
      position: 'absolute',
      right: '20px',
      bottom: '20px',
    });
    el.append(toolbar);
  }
  const doRender = async () => {
    const { root, frontmatter } = transform(transformer, content);
    const bettermarkdownmapOptions = frontmatter?.bettermarkdownmap;
    const frontmatterOptions = deriveOptions(bettermarkdownmapOptions);
    await mm.setData(root, frontmatterOptions);
    mm.fit();
  };
  transformer.hooks.retransform.tap(doRender);
  doRender();
}

export async function renderAllUnder(container: ParentNode) {
  await ready;
  container.querySelectorAll<HTMLElement>('.bettermarkdownmap').forEach(render);
}

export function renderAll() {
  return renderAllUnder(document);
}

if (!autoLoaderOptions.manual) {
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', () => {
      renderAll();
    });
  else renderAll();
}
