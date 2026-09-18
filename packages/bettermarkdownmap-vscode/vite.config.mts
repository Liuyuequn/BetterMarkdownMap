import { builtinModules } from 'module';
import { defineConfig } from 'vite';

const nodeBuiltins = [
  ...builtinModules,
  ...builtinModules.map((name) => `node:${name}`),
];

const extensionConfig = defineConfig({
  resolve: {
    conditions: ['node'],
    mainFields: ['module', 'main'],
  },
  build: {
    target: 'node20',
    emptyOutDir: false,
    minify: false,
    sourcemap: false,
    lib: {
      entry: 'src/extension.ts',
      formats: ['cjs'],
      fileName: () => 'extension.cjs',
    },
    rollupOptions: {
      external: ['vscode', ...nodeBuiltins],
    },
  },
});

const webviewConfig = defineConfig({
  build: {
    target: 'es2020',
    emptyOutDir: false,
    minify: false,
    lib: {
      entry: 'src/webview.ts',
      formats: ['iife'],
      name: 'bettermarkdownmapWebview',
      fileName: () => 'webview.js',
      cssFileName: 'style',
    },
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
});

export default defineConfig(({ mode }) =>
  mode === 'webview' ? webviewConfig : extensionConfig,
);
