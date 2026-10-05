import { defineConfig } from 'vitest/config';

export default defineConfig({
  // The package's JSX runtime only ships the production flavour, while the
  // development flavour (`jsx-dev-runtime`) is missing.
  esbuild: { jsxDev: false },
});
