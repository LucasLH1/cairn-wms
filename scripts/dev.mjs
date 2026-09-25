// `pnpm dev` : une commande pour tout démarrer en local. Base par docker compose, migrations avant
// les rôles (fiche 0021, règle 3), puis compilation continue, les deux rôles du serveur relancés à
// chaque modification, et les écrans Vite.
import { spawn } from 'node:child_process';
import { bin, buildAndMigrate, loadLocalEnvironment, root, startDatabase } from './local.mjs';

loadLocalEnvironment();
startDatabase();
buildAndMigrate();

const processes = [
  {
    name: 'compilation',
    command: bin('tsc'),
    args: ['-b', 'tsconfig.build.json', '--watch', '--preserveWatchOutput'],
  },
  {
    name: 'gestes',
    command: process.execPath,
    args: ['--watch', 'apps/serveur/dist/main.js'],
    env: { CAIRN_ROLE: 'gestures' },
  },
  {
    name: 'traitements',
    command: process.execPath,
    args: ['--watch', 'apps/serveur/dist/main.js'],
    env: { CAIRN_ROLE: 'jobs' },
  },
  {
    name: 'ecrans',
    command: `${root}apps/ecrans/node_modules/.bin/vite`,
    args: [],
    cwd: `${root}apps/ecrans`,
  },
];

const width = Math.max(...processes.map((entry) => entry.name.length));
const children = processes.map((entry) => {
  const child = spawn(entry.command, entry.args, {
    cwd: entry.cwd ?? root,
    env: { ...process.env, ...entry.env, FORCE_COLOR: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const prefix = `[${entry.name.padEnd(width)}] `;
  for (const stream of [child.stdout, child.stderr]) {
    let pending = '';
    stream.on('data', (chunk) => {
      const lines = (pending + chunk.toString()).split('\n');
      pending = lines.pop() ?? '';
      for (const line of lines) process.stdout.write(prefix + line + '\n');
    });
  }
  child.on('exit', (code) => process.stdout.write(`${prefix}arrêté (${code ?? 'signal'})\n`));
  return child;
});

function stop() {
  for (const child of children) child.kill('SIGTERM');
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
