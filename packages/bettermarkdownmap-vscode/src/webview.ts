import type { IPureNode } from 'bettermarkdownmap-common';
import { Toolbar } from 'bettermarkdownmap-toolbar';
import { BetterMarkdownMap, deriveOptions } from 'bettermarkdownmap-view';
import type { IBetterMarkdownMapJSONOptions } from 'bettermarkdownmap-view';
import 'katex/dist/katex.min.css';
import '../../bettermarkdownmap-toolbar/src/style.css';
import './webview.css';

declare function acquireVsCodeApi(): {
  postMessage(message: unknown): void;
};

type HostMessage =
  | {
      type: 'render';
      root: IPureNode;
      options?: Partial<IBetterMarkdownMapJSONOptions>;
      fileName: string;
    }
  | { type: 'error'; message: string };

const vscode = acquireVsCodeApi();
const svg = document.querySelector<SVGElement>('svg#mindmap')!;
const toolbarContainer = document.querySelector<HTMLDivElement>('#toolbar')!;
const errorContainer = document.querySelector<HTMLDivElement>('#error')!;
const mindmap = BetterMarkdownMap.create(svg, {
  autoFit: false,
  embedGlobalCSS: true,
});
toolbarContainer.append(Toolbar.create(mindmap).render());

window.addEventListener('message', (event: MessageEvent<HostMessage>) => {
  const message = event.data;
  if (message.type === 'error') {
    errorContainer.textContent = message.message;
    errorContainer.hidden = false;
    return;
  }
  errorContainer.hidden = true;
  void mindmap
    .setData(message.root, deriveOptions(message.options))
    .then(() => mindmap.fit());
});

vscode.postMessage({ type: 'ready' });
