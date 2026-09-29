import type { Kysely } from 'kysely';
import type { DB } from '../../socle/database/index.js';

/**
 * Donneurs d'ordre que l'utilisateur voit : tous par défaut (RG-ORG-016), ou seulement ceux de sa
 * restriction explicite, qui s'ajoute à celle par site (RG-ORG-017). `null` veut dire « tous ».
 */
export async function visiblePrincipalIds(db: Kysely<DB>, userId: string): Promise<readonly string[] | null> {
  const rows = await db
    .selectFrom('logistics.userPrincipalRestriction')
    .select('principalId')
    .where('userId', '=', userId)
    .execute();
  return rows.length === 0 ? null : rows.map((row) => row.principalId);
}

export async function canSeePrincipal(db: Kysely<DB>, userId: string, principalId: string): Promise<boolean> {
  const visible = await visiblePrincipalIds(db, userId);
  return visible === null || visible.includes(principalId);
}
