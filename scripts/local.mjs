// Outils partagés des scripts locaux : environnement, commandes, garde du poste de développement.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

export const root = new URL('..', import.meta.url).pathname;

/** Charge le .env du poste ; sans lui, rien ne démarre. */
export function loadLocalEnvironment() {
  const file = `${root}.env`;
  if (!existsSync(file)) {
    fail('.env absent : copier .env.example en .env et remplacer chaque valeur « a-remplacer ».');
  }
  process.loadEnvFile(file);
  for (const [name, value] of Object.entries(process.env)) {
    if (name.startsWith('CAIRN_') && value?.includes('a-remplacer')) {
      fail(`${name} vaut encore « a-remplacer » dans .env.`);
    }
  }
}

/** Refuse d'agir ailleurs que sur une base du poste : ces scripts détruisent des données. */
export function assertLocalDatabase() {
  const host = process.env.CAIRN_DATABASE_HOST;
  if (host !== 'localhost' && host !== '127.0.0.1') {
    fail(`CAIRN_DATABASE_HOST=${host ?? ''} : ce script n'agit que sur une base locale.`);
  }
}

export function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', ...options });
  if (result.status !== 0) {
    fail(`${command} ${args.join(' ')} a échoué.`);
  }
}

export const bin = (name) => `${root}node_modules/.bin/${name}`;

export function startDatabase() {
  run('docker', ['compose', 'up', '--detach', '--wait', 'postgres']);
}

export function buildAndMigrate() {
  run(bin('tsc'), ['-b', 'tsconfig.build.json']);
  run(process.execPath, ['apps/serveur/dist/migrate.js']);
}

export function fail(message) {
  process.stderr.write(`\n✗ ${message}\n`);
  process.exit(1);
}
