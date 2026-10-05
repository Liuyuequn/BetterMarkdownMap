import type { BetterMarkdownMap } from 'bettermarkdownmap-view';
import { expect, test, vi } from 'vitest';
import { Toolbar } from '../src/toolbar';

// `mountDom` is the only part of jsx-dom that needs a real DOM; the toolbar
// logic under test does not depend on it.
vi.mock('@gera2ld/jsx-dom', () => {
  const jsx = (type: unknown, props: unknown) => ({ type, props });
  return {
    Fragment: Symbol('Fragment'),
    jsx,
    jsxs: jsx,
    mountDom: () => ({
      firstChild: null,
      append() {},
      remove() {},
    }),
  };
});

vi.mock('@gera2ld/jsx-dom/jsx-runtime', () => {
  const jsx = (type: unknown, props: unknown) => ({ type, props });
  return {
    Fragment: Symbol('Fragment'),
    jsx,
    jsxs: jsx,
  };
});

function createMap() {
  return {
    state: { data: {} },
    getMaxLevel: () => 3,
    setVisibleLevel: vi.fn().mockResolvedValue(undefined),
    fit: vi.fn().mockResolvedValue(undefined),
  };
}

function createToolbar(mm: ReturnType<typeof createMap>) {
  const toolbar = new Toolbar();
  toolbar.attach(mm as unknown as BetterMarkdownMap);
  return toolbar;
}

test('fit the window after changing the visible level', async () => {
  const mm = createMap();
  const toolbar = createToolbar(mm);

  toolbar.registry.level.onClick?.(new Event('click'));

  await vi.waitFor(() => expect(mm.fit).toHaveBeenCalledOnce());
  expect(mm.setVisibleLevel).toHaveBeenCalledWith(1);
});

test('do nothing when no data is available', async () => {
  const mm = { ...createMap(), state: {} };
  const toolbar = createToolbar(mm);

  toolbar.registry.level.onClick?.(new Event('click'));

  await new Promise((resolve) => setTimeout(resolve, 10));
  expect(mm.setVisibleLevel).not.toHaveBeenCalled();
  expect(mm.fit).not.toHaveBeenCalled();
});
