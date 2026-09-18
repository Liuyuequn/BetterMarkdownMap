import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    emptyOutDir: false,
    minify: false,
    lib: {
      entry: 'src/index.ts',
      formats: ['iife'],
      name: 'bettermarkdownmap.autoLoader',
      fileName: () => 'index.js',
    },
    rollupOptions: {
      output: {
        extend: true,
      },
    },
  },
});
