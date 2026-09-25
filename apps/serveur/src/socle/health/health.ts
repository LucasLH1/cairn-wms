import { sql, type Kysely } from 'kysely';
import { countPendingMigrations } from '../database/index.js';

export type HealthReport =
  | { readonly status: 'ok' }
  | { readonly status: 'degraded'; readonly checks: Readonly<Record<string, string>> };

/** Une vérification de santé : rend `undefined` si tout va bien, sinon la raison du défaut. */
export type HealthCheck = () => Promise<string | undefined>;

/** La base répond, et toutes les migrations connues du code y sont appliquées (fiche 0029, règle 2). */
export function databaseHealthCheck<TDatabase>(db: Kysely<TDatabase>): HealthCheck {
  return async () => {
    try {
      await sql`select 1`.execute(db);
      const pending = await countPendingMigrations(db);
      return pending === 0 ? undefined : `${pending} pending migrations`;
    } catch {
      return 'database unreachable';
    }
  };
}

export async function runHealthChecks(checks: Readonly<Record<string, HealthCheck>>): Promise<HealthReport> {
  const failures: Record<string, string> = {};
  for (const [name, check] of Object.entries(checks)) {
    const failure = await check();
    if (failure !== undefined) {
      failures[name] = failure;
    }
  }
  return Object.keys(failures).length === 0 ? { status: 'ok' } : { status: 'degraded', checks: failures };
}
