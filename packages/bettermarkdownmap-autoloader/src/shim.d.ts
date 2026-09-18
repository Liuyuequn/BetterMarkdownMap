declare interface Window {
  bettermarkdownmap: typeof import('bettermarkdownmap-lib') &
    typeof import('bettermarkdownmap-view') &
    typeof import('bettermarkdownmap-toolbar') & {
      autoLoader?: Partial<import('.').AutoLoaderOptions>;
    };
}
