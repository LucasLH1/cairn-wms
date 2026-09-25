import type { Permission } from '@cairn/contrat';
import type { Kysely } from 'kysely';
import type { DatabaseTransaction, DB } from '../database/index.js';

export interface PermissionScope {
  readonly siteId?: string;
}

/**
 * Contrôle d'un geste, exercé à chaque geste quel que soit l'écran (RG-EXI-012) : la permission est
 * dans l'union des rôles de l'utilisateur (RG-ORG-021), le site est dans son périmètre d'exécution
 * (RG-SUR-026 à 028). L'héritage par la hiérarchie (RG-SUR-022 à 025) viendra avec les équipes.
 */
export async function authorize(
  transaction: DatabaseTransaction,
  userId: string,
  permission: Permission | null,
  scope: PermissionScope,
): Promise<'permissionDenied' | 'outOfScope' | undefined> {
  if (permission !== null) {
    const granted = await transaction
      .selectFrom('foundation.userRole as userRole')
      .innerJoin('foundation.rolePermission as rolePermission', 'rolePermission.roleId', 'userRole.roleId')
      .select('rolePermission.permission')
      .where('userRole.userId', '=', userId)
      .where('rolePermission.permission', '=', permission)
      .executeTakeFirst();
    if (granted === undefined) {
      return 'permissionDenied';
    }
  }
  if (scope.siteId !== undefined) {
    const executable = await transaction
      .selectFrom('foundation.userSite')
      .select('siteId')
      .where('userId', '=', userId)
      .where('siteId', '=', scope.siteId)
      .where('execution', '=', true)
      .executeTakeFirst();
    if (executable === undefined) {
      return 'outOfScope';
    }
  }
  return undefined;
}

/** Sites que l'utilisateur voit : ceux de son rattachement (RG-ORG-015). La hiérarchie viendra avec les équipes. */
export async function visibleSiteIds(db: Kysely<DB>, userId: string): Promise<readonly string[]> {
  const rows = await db
    .selectFrom('foundation.userSite')
    .select('siteId')
    .where('userId', '=', userId)
    .execute();
  return rows.map((row) => row.siteId);
}

/** Vrai si le site est dans la visibilité de l'utilisateur (RG-EXI-050). */
export async function canSeeSite(db: Kysely<DB>, userId: string, siteId: string): Promise<boolean> {
  return (await visibleSiteIds(db, userId)).includes(siteId);
}
