import { mountDom, VChildren } from '@gera2ld/jsx-dom';
import type { INode } from 'bettermarkdownmap-common';
import type { BetterMarkdownMap } from 'bettermarkdownmap-view';
import './style.css';

export interface IToolbarItem {
  id?: string;
  title?: string;
  content: VChildren;
  onClick?: (e: Event) => void;
}

const clsToolbarItem = 'mm-toolbar-item';
const clsActive = 'active';

function renderItem({ title, content, onClick }: IToolbarItem) {
  return (
    <div className={clsToolbarItem} title={title} onClick={onClick}>
      {content}
    </div>
  );
}

let promise: Promise<void> | undefined;
function safeCaller<T extends unknown[]>(fn: (...args: T) => Promise<void>) {
  return async (...args: T) => {
    if (promise) return;
    promise = fn(...args);
    try {
      await promise;
    } finally {
      promise = undefined;
    }
  };
}

export class Toolbar {
  registry: { [id: string]: IToolbarItem } = {};

  private bettermarkdownmap: BetterMarkdownMap | undefined;

  private levelData: INode | undefined;

  private visibleLevel = 0;

  static defaultItems: (string | IToolbarItem)[] = [
    'zoomIn',
    'zoomOut',
    'fit',
    'level',
    'recurse',
  ];

  el = mountDom(<div className="mm-toolbar" />) as HTMLDivElement;

  items = [...Toolbar.defaultItems];

  static create(mm: BetterMarkdownMap) {
    const toolbar = new Toolbar();
    toolbar.attach(mm);
    return toolbar;
  }

  static icon(path: string, attrs = {}) {
    attrs = {
      stroke: 'none',
      fill: 'currentColor',
      'fill-rule': 'evenodd',
      ...attrs,
    };
    return (
      <svg width="20" height="20" viewBox="0 0 20 20">
        <path {...attrs} d={path} />
      </svg>
    );
  }

  constructor() {
    this.register({
      id: 'zoomIn',
      title: '放大',
      content: Toolbar.icon('M9 5v4h-4v2h4v4h2v-4h4v-2h-4v-4z'),
      onClick: this.getHandler((mm) => mm.rescale(1.25)),
    });
    this.register({
      id: 'zoomOut',
      title: '缩小',
      content: Toolbar.icon('M5 9h10v2h-10z'),
      onClick: this.getHandler((mm) => mm.rescale(0.8)),
    });
    this.register({
      id: 'fit',
      title: '适应窗口',
      content: Toolbar.icon(
        'M4 7h2v-2h2v4h-4zM4 13h2v2h2v-4h-4zM16 7h-2v-2h-2v4h4zM16 13h-2v2h-2v-4h4z',
      ),
      onClick: this.getHandler((mm) => mm.fit()),
    });
    this.register({
      id: 'level',
      title: '层级',
      content: Toolbar.icon('M4 4h12v2h-12zM6 9h10v2h-10zM8 14h8v2h-8z'),
      onClick: this.getHandler(async (mm) => {
        const data = mm.state.data;
        if (!data) return;
        if (this.levelData !== data) {
          this.levelData = data;
          this.visibleLevel = 0;
        }
        const maxLevel = mm.getMaxLevel();
        this.visibleLevel =
          this.visibleLevel < 1 || this.visibleLevel >= maxLevel
            ? 1
            : this.visibleLevel + 1;
        await mm.setVisibleLevel(this.visibleLevel);
        // Keep the map nicely framed after the level change. Not awaited so
        // that stepping through the levels in quick succession is not blocked
        // by the serialized toolbar handlers.
        void mm.fit();
      }),
    });
    this.register({
      id: 'recurse',
      title: '递归折叠',
      content: Toolbar.icon('M16 4h-12v12h12v-8h-8v4h2v-2h4v4h-8v-8h10z'),
      onClick: (e) => {
        const button = (e.target as HTMLDivElement).closest<HTMLDivElement>(
          `.${clsToolbarItem}`,
        );
        const active = button?.classList.toggle(clsActive);
        this.bettermarkdownmap?.setOptions({
          toggleRecursively: active,
        });
      },
    });
    this.render();
  }

  register(data: IToolbarItem & { id: string }) {
    this.registry[data.id] = data;
  }

  getHandler(handle: (mm: BetterMarkdownMap) => Promise<void>) {
    handle = safeCaller(handle);
    return () => {
      if (this.bettermarkdownmap) handle(this.bettermarkdownmap);
    };
  }

  setItems(items: (string | IToolbarItem)[]) {
    this.items = [...items];
    return this.render();
  }

  attach(mm: BetterMarkdownMap) {
    this.bettermarkdownmap = mm;
  }

  render() {
    const items = this.items
      .map((item: string | IToolbarItem): IToolbarItem => {
        if (typeof item === 'string') {
          const data = this.registry[item];
          if (!data)
            console.warn(`[bettermarkdownmap-toolbar] ${item} not found`);
          return data;
        }
        return item;
      })
      .filter(Boolean);
    while (this.el.firstChild) {
      this.el.firstChild.remove();
    }
    this.el.append(mountDom(<>{items.map(renderItem)}</>));
    return this.el;
  }
}
