import { Kysely, PostgresDialect, sql } from 'kysely';
import { Migrator } from 'kysely/migration';
import pg from 'pg';
import { migrations } from '../../migrations/index.js';
import { bootstrapRoles } from './bootstrap.js';
import type { MigrationSettings } from './config.js';

/** Schéma de la table des migrations appliquées ; seul le propriétaire y écrit. */
export const MIGRATION_SCHEMA = 'migration';

/** Mois de partitions du journal créés d'avance à chaque migration. */
const TRACE_PARTITION_MONTHS_AHEAD = 3;

/**
 * Amorce les rôles, applique les migrations en attente puis prépare les partitions du journal.
 * Kysely pose un verrou consultatif de la base : deux applications simultanées s'attendent
 * (fiche 0021, règle 3).
 */
export async function migrateToLatest(settings: MigrationSettings): Promise<readonly string[]> {
  await bootstrapRoles(settings);
  const db = new Kysely<unknown>({
    dialect: new PostgresDialect({ pool: new pg.Pool({ ...settings.owner, max: 1 }) }),
  });
  try {
    const migrator = new Migrator({
      db,
      provider: { getMigrations: () => Promise.resolve(migrations) },
      migrationTableSchema: MIGRATION_SCHEMA,
    });
    const { error, results = [] } = await migrator.migrateToLatest();
    if (error !== undefined) {
      throw error instanceof Error ? error : new Error('migration failed', { cause: error });
    }
    await sql`select foundation.ensure_trace_partitions(${TRACE_PARTITION_MONTHS_AHEAD})`.execute(db);
    return results.map((result) => result.migrationName);
  } finally {
    await db.destroy();
  }
}

/** Nombre de migrations connues du code qui ne sont pas encore appliquées à la base. */
export async function countPendingMigrations<TDatabase>(db: Kysely<TDatabase>): Promise<number> {
  const applied = await sql<{
    name: string;
  }>`select name from ${sql.table(`${MIGRATION_SCHEMA}.kysely_migration`)}`.execute(db);
  const appliedNames = new Set(applied.rows.map((row) => row.name));
  return Object.keys(migrations).filter((name) => !appliedNames.has(name)).length;
}
