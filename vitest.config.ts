import { existsSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

// En local, les variables CAIRN_TEST_DATABASE_* viennent du .env ; la chaîne les pose elle-même.
if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

export default defineConfig({
  resolve: { conditions: ['@cairn/source'] },
  test: {
    globalSetup: ['apps/serveur/src/test-support/global-setup.ts'],
    include: ['apps/*/src/**/*.test.ts', 'packages/*/src/**/*.test.ts'],
  },
});
