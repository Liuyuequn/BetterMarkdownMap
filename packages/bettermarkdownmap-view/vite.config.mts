import { defineConfig } from 'vite';

const configEs = defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: ['d3', 'bettermarkdownmap-common'],
    },
  },
});

const configJs = defineConfig({
  build: {
    emptyOutDir: false,
    outDir: 'dist/browser',
    minify: false,
    lib: {
      entry: 'src/index.ts',
      formats: ['iife'],
      fileName: () => 'index.js',
      name: 'bettermarkdownmap',
    },
    rollupOptions: {
      external: ['d3'],
      output: {
        extend: true,
        globals: {
          d3: 'd3',
        }
      }
    }
  },
});

export default defineConfig(({ mode }) =>
  mode === 'es' ? configEs : configJs,
);
