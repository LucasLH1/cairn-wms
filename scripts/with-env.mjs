// Lance une commande avec le .env du poste s'il existe ; dans la chaîne, l'environnement suffit.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const root = new URL('..', import.meta.url).pathname;
if (existsSync(`${root}.env`)) {
  process.loadEnvFile(`${root}.env`);
}
const [command, ...args] = process.argv.slice(2);
if (command === undefined) {
  process.stderr.write('usage : node scripts/with-env.mjs <commande> [arguments…]\n');
  process.exit(2);
}
const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' });
process.exit(result.status ?? 1);
