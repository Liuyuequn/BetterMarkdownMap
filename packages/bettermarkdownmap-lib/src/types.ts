import type MarkdownIt from 'markdown-it';
import {
  CSSItem,
  Hook,
  IPureNode,
  JSItem,
  UrlBuilder,
} from 'bettermarkdownmap-common';
import { IBetterMarkdownMapJSONOptions as IBetterMarkdownMapJSONOptionsForView } from 'bettermarkdownmap-view';

export interface ITransformHooks {
  transformer: ITransformer;
  /**
   * Tapped once when the parser is created.
   */
  parser: Hook<[md: MarkdownIt]>;
  /**
   * Tapped every time before Markdown content is parsed.
   */
  beforeParse: Hook<[md: MarkdownIt, context: ITransformContext]>;
  /**
   * Tapped every time after Markdown content is parsed.
   */
  afterParse: Hook<[md: MarkdownIt, context: ITransformContext]>;
  /**
   * Used in autoloader to force rerender when resource is loaded.
   */
  retransform: Hook<[]>;
}

export interface IAssets {
  styles?: CSSItem[];
  scripts?: JSItem[];
}

export interface IBetterMarkdownMapCreateOptions {
  /**
   * Markdown content as string.
   */
  content?: string;
  /**
   * Output file path of the bettermarkdownmap HTML file.
   * If not provided, the same basename as the Markdown input file will be used.
   */
  output?: string;
}

export interface IFeatures {
  [key: string]: boolean;
}

export interface ITransformer {
  urlBuilder: UrlBuilder;
}

export type IBetterMarkdownMapJSONOptions =
  IBetterMarkdownMapJSONOptionsForView;

export interface ITransformContext {
  features: IFeatures;
  content: string;
  frontmatter?: {
    title?: string;
    bettermarkdownmap?: Partial<IBetterMarkdownMapJSONOptions>;
  };
  frontmatterInfo?: {
    lines: number;
    offset: number;
  };
}

export interface ITransformResult extends ITransformContext {
  root: IPureNode;
}

export interface ITransformPlugin {
  name: string;
  config?: IAssets & {
    versions?: Record<string, string>;
    /** For browsers only. Scripts that needs to be preloaded for the transformer to work. */
    preloadScripts?: JSItem[];
    /** Additional resources needed for the plugin to work offline. */
    resources?: string[];
  };
  /**
   * @returns The assets that should be loaded for rendering the output.
   */
  transform: (transformHooks: ITransformHooks) => IAssets;
}
