import { CamelCasePlugin, Kysely, PostgresDialect, type Transaction } from 'kysely';
import pg from 'pg';
import type { ConnectionSettings } from './config.js';
import type { DB } from './database.generated.js';

export type Database = Kysely<DB>;
export type DatabaseTransaction = Transaction<DB>;

/** Ouvre l'accès typé à la base (fiche 0021) ; tables en snake_case, code en camelCase. */
export function createDatabase(settings: ConnectionSettings, maxConnections = 10): Database {
  return new Kysely<DB>({
    dialect: new PostgresDialect({
      pool: new pg.Pool({ ...settings, max: maxConnections, application_name: 'cairn' }),
    }),
    plugins: [new CamelCasePlugin()],
  });
}
