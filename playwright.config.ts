import { defineConfig } from '@playwright/test';

// Tests de bout en bout (fiche 0024) : un vrai navigateur sur les écrans construits, servis par Vite,
// contre une instance à part (scripts/e2e-instance.mjs). Lancer par `pnpm e2e`, qui compile d'abord.
const apiPort = process.env['CAIRN_E2E_PORT'] ?? '3100';
const screensPort = '4173';

export default defineConfig({
  testDir: 'tests',
  fullyParallel: false,
  workers: 1,
  forbidOnly: process.env['CI'] !== undefined,
  retries: 0,
  reporter: process.env['CI'] === undefined ? 'list' : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://127.0.0.1:${screensPort}`,
    // Le navigateur complet, pas la coque allégée : c'est lui que les postes emploient (fiche 0025, règle 5).
    channel: 'chromium',
    trace: 'retain-on-failure',
    locale: 'fr-FR',
  },
  webServer: [
    {
      command: 'node scripts/e2e-instance.mjs',
      url: `http://127.0.0.1:${apiPort}/health`,
      timeout: 60_000,
      reuseExistingServer: false,
      stdout: 'pipe',
    },
    {
      command: `pnpm -F @cairn/ecrans exec vite preview --host 127.0.0.1 --port ${screensPort} --strictPort`,
      url: `http://127.0.0.1:${screensPort}`,
      env: { CAIRN_API_ORIGIN: `http://127.0.0.1:${apiPort}` },
      reuseExistingServer: false,
    },
  ],
});
