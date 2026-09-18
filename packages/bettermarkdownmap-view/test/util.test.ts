import { expect, test } from 'vitest';
import type { INode } from 'bettermarkdownmap-common';
import {
  applyVisibleLevel,
  deriveOptions,
  getMaxLevel,
} from '../src/util';

function createNode(depth: number, children: INode[] = []): INode {
  return {
    content: `level-${depth - 1}`,
    children,
    payload: {},
    state: { depth },
  } as INode;
}

test.each([true, false])('derive autoFit: %s', (autoFit) => {
  expect(deriveOptions({ autoFit })).toEqual({ autoFit });
});

test('leave autoFit unset when omitted', () => {
  expect(deriveOptions()).not.toHaveProperty('autoFit');
  expect(deriveOptions({})).not.toHaveProperty('autoFit');
});

test('cycle visibility by levels', () => {
  const level3 = createNode(4);
  const level2 = createNode(3, [level3]);
  const level1 = createNode(2, [level2]);
  const root = createNode(1, [level1, createNode(2)]);

  expect(getMaxLevel(root)).toBe(3);

  expect(applyVisibleLevel(root, 1)).toBe(3);
  expect(root.payload?.fold).toBe(0);
  expect(level1.payload?.fold).toBe(1);
  expect(level2.payload?.fold).toBe(1);

  applyVisibleLevel(root, 2);
  expect(level1.payload?.fold).toBe(0);
  expect(level2.payload?.fold).toBe(1);
  expect(level3.payload?.fold).toBe(1);

  applyVisibleLevel(root, 3);
  expect(level1.payload?.fold).toBe(0);
  expect(level2.payload?.fold).toBe(0);
  expect(level3.payload?.fold).toBe(0);
});
