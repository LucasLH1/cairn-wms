import { randomBytes } from 'node:crypto';
import pg from 'pg';
import type { TestProject } from 'vitest/node';
import { migrateToLatest, type MigrationSettings } from '../socle/database/index.js';

/** Base jetable des tests : recréée à chaque lancement, migrée comme en exploitation (fiche 0024). */
const TEST_DATABASE = 'cairn_test';

declare module 'vitest' {
  export interface ProvidedContext {
    migrationSettings: MigrationSettings;
  }
}

function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new Error(
      `${name} manque : les tests s'exécutent contre un vrai PostgreSQL (fiche 0024). Voir .env.example.`,
    );
  }
  return value;
}

export default async function setup(project: TestProject): Promise<void> {
  const host = required('CAIRN_TEST_DATABASE_HOST');
  const port = Number(process.env['CAIRN_TEST_DATABASE_PORT'] ?? '5432');
  const adminUser = required('CAIRN_TEST_DATABASE_ADMIN_USER');
  const adminPassword = required('CAIRN_TEST_DATABASE_ADMIN_PASSWORD');

  const maintenance = new pg.Client({
    host,
    port,
    user: adminUser,
    password: adminPassword,
    database: 'postgres',
  });
  await maintenance.connect();
  try {
    await maintenance.query(`drop database if exists ${TEST_DATABASE} with (force)`);
    await maintenance.query(`create database ${TEST_DATABASE}`);
  } finally {
    await maintenance.end();
  }

  // Mots de passe tirés à chaque lancement : aucun n'est écrit nulle part.
  const ownerPassword = randomBytes(18).toString('base64url');
  const applicationPassword = randomBytes(18).toString('base64url');
  const settings: MigrationSettings = {
    admin: { host, port, database: TEST_DATABASE, user: adminUser, password: adminPassword },
    owner: { host, port, database: TEST_DATABASE, user: 'cairn_owner', password: ownerPassword },
    applicationPassword,
  };
  await migrateToLatest(settings);
  project.provide('migrationSettings', settings);
}
