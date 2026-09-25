// Instance des tests de bout en bout (fiche 0024), lancée par Playwright : une base à part, recréée,
// migrée et chargée du jeu de données des scénarios, puis le rôle « gestes » sur un port à part.
// Elle ne touche ni la base ni le port de `pnpm dev`. Le code doit être compilé (`pnpm e2e` le fait).
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const root = new URL('..', import.meta.url).pathname;
if (existsSync(`${root}.env`)) process.loadEnvFile(`${root}.env`);

const env = {
  ...process.env,
  CAIRN_DATABASE_NAME: process.env.CAIRN_E2E_DATABASE_NAME ?? 'cairn_e2e',
  CAIRN_PORT: process.env.CAIRN_E2E_PORT ?? '3100',
  CAIRN_HOST: '127.0.0.1',
  CAIRN_ROLE: 'gestures',
};
for (const entry of ['reset-database', 'migrate', 'load-dataset']) {
  const result = spawnSync(process.execPath, [`apps/serveur/dist/${entry}.js`], {
    cwd: root,
    env,
    stdio: 'inherit',
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
const server = spawn(process.execPath, ['apps/serveur/dist/main.js'], { cwd: root, env, stdio: 'inherit' });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.kill(signal));
server.on('exit', (code) => process.exit(code ?? 0));
