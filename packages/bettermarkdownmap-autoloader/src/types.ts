import { JSItem, CSSItem } from 'bettermarkdownmap-common';
import { ITransformPlugin } from 'bettermarkdownmap-lib';

export interface AutoLoaderOptions {
  baseJs: (string | JSItem)[];
  baseCss: (string | CSSItem)[];
  provider?: string | ((path: string) => string);
  /** Callback when bettermarkdownmap-lib/bettermarkdownmap-view and their dependencies are loaded. We can tweak global options in this callback. */
  onReady: () => void;
  /** Override built-in plugins if provided. Set to `[]` to disable all built-in plugins for auto-loader. */
  transformPlugins: Array<ITransformPlugin | (() => ITransformPlugin)>;
  /** Whether to render bettermarkdownmaps manually. If false, all elements matching `.bettermarkdownmap` will be rendered once this package loads or DOMContentLoaded is emitted, whichever later. */
  manual: boolean;
  /** Whether to create a toolbar for each bettermarkdownmap. */
  toolbar: boolean;
}
