declare interface Window {
  mm: import('bettermarkdownmap-view').BetterMarkdownMap;
  bettermarkdownmap: typeof import('bettermarkdownmap-toolbar') &
    typeof import('bettermarkdownmap-view') & {
      cliOptions?: unknown;
    };
}
