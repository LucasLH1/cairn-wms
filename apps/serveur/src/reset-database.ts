import pg from 'pg';
import { readMigrationSettings } from './socle/database/index.js';

// Recrée la base désignée par l'environnement, vide : `pnpm db:reset` et l'instance des tests de bout en
// bout. Détruit des données : n'agit que sur une base du poste ou de la chaîne, jamais ailleurs.
const settings = readMigrationSettings(process.env);
const { host, database } = settings.admin;
if (host !== 'localhost' && host !== '127.0.0.1') {
  throw new Error(`reset refused: ${host} is not a local database host`);
}
const client = new pg.Client({ ...settings.admin, database: 'postgres' });
await client.connect();
try {
  const name = client.escapeIdentifier(database);
  await client.query(`drop database if exists ${name} with (force)`);
  await client.query(`create database ${name}`);
} finally {
  await client.end();
}
process.stdout.write(`${JSON.stringify({ event: 'database-reset', database })}\n`);
