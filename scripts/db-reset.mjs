// `pnpm db:reset` : recrée la base locale, la migre et charge le jeu de données des scénarios du
// lot 1 (docs/lots/lot-1/), toutes valeurs fictives. N'agit que sur une base du poste.
import { assertLocalDatabase, buildAndMigrate, loadLocalEnvironment, run, startDatabase } from './local.mjs';

loadLocalEnvironment();
assertLocalDatabase();
startDatabase();

const database = process.env.CAIRN_DATABASE_NAME;
if (!/^[a-z][a-z0-9_]*$/u.test(database ?? '')) {
  throw new Error(`CAIRN_DATABASE_NAME invalide : ${database ?? ''}`);
}
const psql = [
  'compose',
  'exec',
  '-T',
  'postgres',
  'psql',
  '-v',
  'ON_ERROR_STOP=1',
  '-q',
  '-U',
  process.env.CAIRN_DATABASE_ADMIN_USER ?? '',
  '-d',
  'postgres',
];
run('docker', [...psql, '-c', `drop database if exists ${database} with (force)`]);
run('docker', [...psql, '-c', `create database ${database}`]);

buildAndMigrate();
run(process.execPath, ['apps/serveur/dist/load-dataset.js']);
