import { scaleOrdinal } from 'd3';
import { INode, walkTree } from 'bettermarkdownmap-common';
import { defaultOptions, lineWidthFactory } from './constants';
import {
  IBetterMarkdownMapJSONOptions,
  IBetterMarkdownMapOptions,
} from './types';

export function deriveOptions(
  jsonOptions?: Partial<IBetterMarkdownMapJSONOptions>,
) {
  const derivedOptions: Partial<IBetterMarkdownMapOptions> = {};
  const options = { ...jsonOptions };

  const { color, colorFreezeLevel, lineWidth } = options;
  if (color?.length === 1) {
    const solidColor = color[0];
    derivedOptions.color = () => solidColor;
  } else if (color?.length) {
    const colorFn = scaleOrdinal(color);
    derivedOptions.color = (node: INode) => colorFn(`${node.state.path}`);
  }
  if (colorFreezeLevel) {
    const color = derivedOptions.color || defaultOptions.color;
    derivedOptions.color = (node: INode) => {
      node = {
        ...node,
        state: {
          ...node.state,
          path: node.state.path.split('.').slice(0, colorFreezeLevel).join('.'),
        },
      };
      return color(node);
    };
  }
  if (lineWidth) {
    const args = Array.isArray(lineWidth) ? lineWidth : [lineWidth, 0, 1];
    derivedOptions.lineWidth = lineWidthFactory(
      ...(args as Parameters<typeof lineWidthFactory>),
    );
  }

  const numberKeys = [
    'duration',
    'fitRatio',
    'initialExpandLevel',
    'maxInitialScale',
    'maxWidth',
    'nodeMinHeight',
    'paddingX',
    'spacingHorizontal',
    'spacingVertical',
  ] as const;
  numberKeys.forEach((key) => {
    const value = options[key];
    if (typeof value === 'number') derivedOptions[key] = value;
  });

  const booleanKeys = ['autoFit', 'zoom', 'pan'] as const;
  booleanKeys.forEach((key) => {
    const value = options[key];
    if (value != null) derivedOptions[key] = !!value;
  });

  return derivedOptions;
}

/**
 * Adapted from a compact string hashing implementation.
 */
export function simpleHash(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}

export function getMaxLevel(root: INode): number {
  const rootDepth = root.state.depth;
  let maxLevel = 0;
  walkTree(root, (node, next) => {
    maxLevel = Math.max(maxLevel, node.state.depth - rootDepth);
    next();
  });
  return maxLevel;
}

export function applyVisibleLevel(root: INode, level: number): number {
  const maxLevel = getMaxLevel(root);
  const visibleLevel = Math.min(
    Math.max(1, Math.floor(level) || 1),
    Math.max(1, maxLevel),
  );
  const expandAll = visibleLevel >= maxLevel;
  const rootDepth = root.state.depth;
  walkTree(root, (node, next) => {
    const nodeLevel = node.state.depth - rootDepth;
    node.payload = {
      ...node.payload,
      fold: !expandAll && nodeLevel >= visibleLevel ? 1 : 0,
    };
    next();
  });
  return maxLevel;
}

export function childSelector<T extends Element>(
  filter?: string | ((el: T) => boolean),
): () => T[] {
  if (typeof filter === 'string') {
    const selector = filter;
    filter = (el: T): boolean => el.matches(selector);
  }
  const filterFn = filter;
  return function selector(this: Element): T[] {
    let nodes = Array.from(this.childNodes as NodeListOf<T>);
    if (filterFn) nodes = nodes.filter((node) => filterFn(node));
    return nodes;
  };
}
