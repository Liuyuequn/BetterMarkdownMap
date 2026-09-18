import { defineConfig } from 'vite';

const configEs = defineConfig({
  build: {
    emptyOutDir: false,
    minify: false,
    lib: {
      entry: 'src/index.ts',
      fileName: 'index',
      cssFileName: 'style',
      formats: ['es'],
    },
    rollupOptions: {
      external: ['bettermarkdownmap-common'],
    },
  },
});

const configJs = defineConfig({
  build: {
    emptyOutDir: false,
    minify: false,
    lib: {
      entry: 'src/index.ts',
      fileName: () => 'index.js',
      cssFileName: 'style',
      formats: ['iife'],
      name: 'bettermarkdownmap',
    },
    rollupOptions: {
      output: {
        extend: true,
      },
    },
  },
});

export default defineConfig(({ mode }) =>
  mode === 'es' ? configEs : configJs,
);
