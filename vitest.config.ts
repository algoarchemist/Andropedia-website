import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['shared/**/*.test.ts', 'server/**/*.test.ts', 'client/src/**/*.test.{ts,tsx}'],
    setupFiles: ['client/src/test/setup.ts'],
    // A local .env (copied from .env.example) sets an absolute API base; tests expect same-origin paths.
    env: { VITE_API_BASE_URL: '' },
  },
});
