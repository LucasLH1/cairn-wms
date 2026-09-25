import pg from 'pg';
import { APPLICATION_ROLE, OWNER_ROLE, type MigrationSettings } from './config.js';

/**
 * Crée ou met à jour les deux rôles de base, puis leur donne accès à la base (fiche 0021, règle 4).
 * S'exécute avec les droits de l'administrateur de PostgreSQL, avant les migrations.
 */
export async function bootstrapRoles(settings: MigrationSettings): Promise<void> {
  const client = new pg.Client(settings.admin);
  await client.connect();
  try {
    const database = client.escapeIdentifier(settings.admin.database);
    for (const [role, password] of [
      [OWNER_ROLE, settings.owner.password],
      [APPLICATION_ROLE, settings.applicationPassword],
    ] as const) {
      const exists = await client.query('select 1 from pg_roles where rolname = $1', [role]);
      const verb = exists.rowCount === 0 ? 'create' : 'alter';
      await client.query(
        `${verb} role ${client.escapeIdentifier(role)} login password ${client.escapeLiteral(password)}`,
      );
    }
    await client.query(`grant connect, create on database ${database} to ${OWNER_ROLE}`);
    await client.query(`grant connect on database ${database} to ${APPLICATION_ROLE}`);
    await client.query(`revoke create on schema public from public`);
  } finally {
    await client.end();
  }
}
