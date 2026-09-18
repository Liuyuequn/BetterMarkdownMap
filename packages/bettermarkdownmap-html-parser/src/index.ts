import { Cheerio, CheerioAPI, load } from 'cheerio/slim';
import { IPureNode, walkTree } from 'bettermarkdownmap-common';

export enum Levels {
  None,
  H1,
  H2,
  H3,
  H4,
  H5,
  H6,
  Block,
  List,
  ListItem,
}

export interface IHtmlNode {
  id: number;
  tag: string;
  html: string;
  level: Levels;
  parent: number;
  childrenLevel: Levels;
  children?: IHtmlNode[];
  comments?: string[];
  data?: Record<string, unknown>;
}

export interface IHtmlParserContext {
  $node: Cheerio<any>;
  $: CheerioAPI;
  getContent(
    $node: Cheerio<any>,
    preserveTag?: boolean,
  ): { html?: string; comments?: string[] };
}

export interface IHtmlParserResult {
  html?: string | null;
  comments?: string[];
  queue?: Cheerio<any>;
  nesting?: boolean;
}

export type IHtmlParserSelectorRules = Record<
  string,
  (context: IHtmlParserContext) => IHtmlParserResult
>;

export interface IHtmlParserOptions {
  selector: string;
  selectorRules: IHtmlParserSelectorRules;
}

const defaultSelectorRules: IHtmlParserSelectorRules = {
  'div,p': ({ $node }) => ({
    queue: $node.children(),
  }),
  'h1,h2,h3,h4,h5,h6': ({ $node, getContent }) => ({
    ...getContent($node.contents()),
  }),
  'ul,ol': ({ $node }) => ({
    queue: $node.children(),
    nesting: true,
  }),
  li: ({ $node, getContent }) => {
    const queue = $node.children().filter('ul,ol');
    let content: ReturnType<typeof getContent>;
    if ($node.contents().first().is('div,p')) {
      content = getContent($node.children().first());
    } else {
      let $contents = $node.contents();
      const i = $contents.index(queue);
      if (i >= 0) $contents = $contents.slice(0, i);
      content = getContent($contents);
    }
    return {
      queue,
      nesting: true,
      ...content,
    };
  },
};
Object.freeze(defaultSelectorRules);

export const defaultOptions: Readonly<IHtmlParserOptions> = Object.freeze({
  selector: 'h1,h2,h3,h4,h5,h6,ul,ol,li',
  selectorRules: defaultSelectorRules,
});

const BETTERMARKDOWNMAP_COMMENT_PREFIX = 'bettermarkdownmap: ';
const SELECTOR_HEADING = /^h[1-6]$/;
const SELECTOR_LIST = /^[uo]l$/;
const SELECTOR_LIST_ITEM = /^li$/;

function getLevel(tagName: string) {
  if (SELECTOR_HEADING.test(tagName)) return +tagName[1] as Levels;
  if (SELECTOR_LIST.test(tagName)) return Levels.List;
  if (SELECTOR_LIST_ITEM.test(tagName)) return Levels.ListItem;
  return Levels.Block;
}

export function parseHtml(html: string) {
  const options = defaultOptions;
  const $ = load(html);
  let $root: Cheerio<any> = $('body');
  if (!$root.length) $root = $.root();
  let id = 0;
  const rootNode: IHtmlNode = {
    id,
    tag: '',
    html: '',
    level: Levels.None,
    parent: 0,
    childrenLevel: Levels.None,
    children: [],
  };
  const headingStack: IHtmlNode[] = [];
  let skippingHeading = Levels.None;
  checkNodes($root.children());
  return rootNode;

  function addChild(props: {
    parent: IHtmlNode;
    nesting: boolean;
    tagName: string;
    level: Levels;
    html: string;
    comments?: string[];
    data?: Record<string, unknown>;
  }) {
    const { parent } = props;
    const node: IHtmlNode = {
      id: ++id,
      tag: props.tagName,
      level: props.level,
      html: props.html,
      childrenLevel: Levels.None,
      children: props.nesting ? [] : undefined,
      parent: parent.id,
    };
    if (props.comments?.length) {
      node.comments = props.comments;
    }
    if (Object.keys(props.data || {}).length) {
      node.data = props.data;
    }
    if (parent.children) {
      if (
        parent.childrenLevel === Levels.None ||
        parent.childrenLevel > node.level
      ) {
        parent.children = [];
        parent.childrenLevel = node.level;
      }
      if (parent.childrenLevel === node.level) {
        parent.children.push(node);
      }
    }
    return node;
  }

  function getCurrentHeading(level: Levels) {
    let heading: IHtmlNode | undefined;
    while (
      (heading = headingStack[headingStack.length - 1]) &&
      heading.level >= level
    ) {
      headingStack.pop();
    }
    return heading || rootNode;
  }

  function getContent($node: Cheerio<any>) {
    const result = extractMagicComments($node);
    const html = $.html(result.$node)?.trimEnd();
    return { comments: result.comments, html };
  }

  function extractMagicComments($node: Cheerio<any>) {
    const comments: string[] = [];
    $node = $node.filter((_, child) => {
      if (child.type === 'comment') {
        const data = child.data.trim();
        if (data.startsWith(BETTERMARKDOWNMAP_COMMENT_PREFIX)) {
          comments.push(
            data.slice(BETTERMARKDOWNMAP_COMMENT_PREFIX.length).trim(),
          );
          return false;
        }
      }
      return true;
    });
    return { $node, comments };
  }

  function checkNodes($els: Cheerio<any>, node?: IHtmlNode) {
    $els.each((_, child) => {
      const $child = $(child);
      const rule = Object.entries(options.selectorRules).find(([selector]) =>
        $child.is(selector),
      )?.[1];
      const result = rule?.({ $node: $child, $, getContent });
      // Wrapper
      if (result?.queue && !result.nesting) {
        checkNodes(result.queue, node);
        return;
      }
      const level = getLevel(child.tagName);
      if (!result) {
        if (level <= Levels.H6) {
          skippingHeading = level;
        }
        return;
      }
      if (skippingHeading > Levels.None && level > skippingHeading) return;
      if (!$child.is(options.selector)) return;
      skippingHeading = Levels.None;
      const isHeading = level <= Levels.H6;
      let data = {
        // Preserve source metadata from the selected element or its wrapper.
        ...$child.closest('p').data(),
        ...$child.data(),
      };
      let html = result.html || '';
      if ($child.is('ol>li') && node?.children) {
        const start = +($child.parent().attr('start') || 1);
        const listIndex = start + node.children.length;
        html = `${listIndex}. ${html}`;
        data = {
          ...data,
          listIndex,
        };
      }
      const childNode = addChild({
        parent: node || getCurrentHeading(level),
        nesting: !!result.queue || isHeading,
        tagName: child.tagName,
        level,
        html,
        comments: result.comments,
        data,
      });
      if (isHeading) headingStack.push(childNode);
      if (result.queue) checkNodes(result.queue, childNode);
    });
  }
}

export function convertNode(htmlRoot: IHtmlNode) {
  return walkTree<IHtmlNode, IPureNode>(htmlRoot, (htmlNode, next) => {
    const node: IPureNode = {
      content: htmlNode.html,
      children: next() || [],
    };
    if (htmlNode.data) {
      node.payload = {
        tag: htmlNode.tag,
        ...htmlNode.data,
      };
    }
    if (htmlNode.comments) {
      if (htmlNode.comments.includes('foldAll')) {
        node.payload = { ...node.payload, fold: 2 };
      } else if (htmlNode.comments.includes('fold')) {
        node.payload = { ...node.payload, fold: 1 };
      }
    }
    return node;
  });
}

export function buildTree(html: string) {
  const htmlRoot = parseHtml(html);
  return convertNode(htmlRoot);
}
