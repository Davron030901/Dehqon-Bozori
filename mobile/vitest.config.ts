import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

// Only the pure TypeScript in src/lib is unit-tested here — the modules that
// import react-native are covered by `tsc` and the Metro bundle instead.
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
