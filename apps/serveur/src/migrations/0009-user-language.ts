import { sql, type Kysely } from 'kysely';

/**
 * Langue de l'interface, choisie par chaque utilisateur et conservée sur son compte : français par
 * défaut, anglais au choix (RG-EXI-054, 079 ; décision du 2026-09-30, README du lot 1, point 7).
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table foundation."user" add column language text not null default 'fr' check (language in ('fr', 'en'));
  `.execute(db);
}
