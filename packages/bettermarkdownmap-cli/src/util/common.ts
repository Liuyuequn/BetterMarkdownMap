import type { ReadStream } from 'fs';
import { buildCSSItem, buildJSItem, JSItem } from 'bettermarkdownmap-common';
import { IAssets } from 'bettermarkdownmap-lib';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const TOOLBAR_CSS = 'bettermarkdownmap-toolbar/dist/style.css';
const TOOLBAR_JS = 'bettermarkdownmap-toolbar/dist/index.js';

const distDir = dirname(fileURLToPath(import.meta.url));
export const ASSETS_PREFIX = '/assets/';

const renderToolbar = () => {
  const { bettermarkdownmap, mm } = window;
  const toolbar = new bettermarkdownmap.Toolbar();
  toolbar.attach(mm);
  const el = toolbar.render() as HTMLElement;
  el.setAttribute('style', 'position:absolute;bottom:20px;right:20px');
  document.body.append(el);
};

export const toolbarAssets: IAssets = {
  styles: [buildCSSItem(TOOLBAR_CSS)],
  scripts: [
    buildJSItem(TOOLBAR_JS),
    {
      type: 'iife',
      data: {
        fn: (r: () => void) => {
          setTimeout(r);
        },
        getParams: () => [renderToolbar],
      },
    } as JSItem,
  ],
};

export function localProvider(path: string) {
  return `${ASSETS_PREFIX}${path}`;
}

export function createStreamBody(stream: ReadStream) {
  const body = new ReadableStream({
    start(controller) {
      stream.on('data', (chunk) => {
        controller.enqueue(chunk);
      });
      stream.on('end', () => {
        controller.close();
      });
    },

    cancel() {
      stream.destroy();
    },
  });
  return body;
}

export const config = {
  distDir,
  assetsDir: `${distDir}${ASSETS_PREFIX}`,
};
