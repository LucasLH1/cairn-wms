import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { conditions: ['@cairn/source'] },
  test: {
    globalSetup: ['apps/serveur/src/test-support/global-setup.ts'],
    include: ['apps/*/src/**/*.test.ts', 'packages/*/src/**/*.test.ts'],
  },
});
