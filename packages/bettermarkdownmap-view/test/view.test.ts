import type { INode } from 'bettermarkdownmap-common';
import { expect, test, vi } from 'vitest';
import { BetterMarkdownMap } from '../src/view';

function createNode(fold: number): INode {
  return {
    content: 'node',
    children: [],
    payload: { fold },
  } as INode;
}

test('fit the window after expanding a node', async () => {
  const renderData = vi.fn().mockResolvedValue(undefined);
  const fit = vi.fn().mockResolvedValue(undefined);
  const context = { renderData, fit } as unknown as BetterMarkdownMap;
  const node = createNode(1);

  await BetterMarkdownMap.prototype.toggleNode.call(context, node);

  expect(node.payload?.fold).toBe(0);
  expect(renderData).toHaveBeenCalledOnce();
  expect(fit).toHaveBeenCalledOnce();
});

test('do not fit the window after folding a node', async () => {
  const renderData = vi.fn().mockResolvedValue(undefined);
  const fit = vi.fn().mockResolvedValue(undefined);
  const context = { renderData, fit } as unknown as BetterMarkdownMap;
  const node = createNode(0);

  await BetterMarkdownMap.prototype.toggleNode.call(context, node);

  expect(node.payload?.fold).toBe(1);
  expect(renderData).toHaveBeenCalledOnce();
  expect(fit).not.toHaveBeenCalled();
});
