import { builtinModules } from 'module';
import { readPackageUp } from 'read-package-up';
import { defineConfig } from 'vite';

const { packageJson: pkg } = await readPackageUp({ cwd: import.meta.dirname });

// Bundle @babel/runtime to avoid requiring esm version in the output
const external = [...builtinModules, ...Object.keys(pkg.dependencies)];

export default defineConfig({
  build: {
    emptyOutDir: false,
    minify: false,
    lib: {
      entry: {
        index: 'src/index.ts',
        cli: 'src/cli.ts',
        'fetch-assets': 'src/fetch-assets.ts',
        client: 'src/client/index.ts',
      },
      formats: ['es'],
    },
    rollupOptions: {
      external,
    },
  },
});
