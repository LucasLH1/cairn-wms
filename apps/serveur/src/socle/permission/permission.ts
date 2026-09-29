import { permissionSchema, type Permission } from '@cairn/contrat';
import { sql, type Kysely } from 'kysely';
import type { DatabaseTransaction, DB } from '../database/index.js';

export interface PermissionScope {
  readonly siteId?: string;
}

/**
 * Permissions effectives d'un utilisateur (RG-ORG-021, RG-SUR-022 à 025) : l'union des permissions de
 * ses rôles ; s'il tient un rôle opérationnel, les permissions des rôles opérationnels de ceux qu'il
 * encadre, directement ou non. L'héritage descend et ne remonte jamais ; il ne franchit pas un rôle
 * administratif — rien de ce qui est situé sous le titulaire d'un rôle administratif ne remonte par
 * lui. Un utilisateur désactivé ne transmet rien.
 */
export async function effectivePermissions(db: Kysely<DB>, userId: string): Promise<ReadonlySet<Permission>> {
  const rows = await sql<{ permission: string }>`
    with recursive
      own_role as (
        select role.id, role.nature
        from foundation.user_role user_role
        join foundation.role role on role.id = user_role.role_id
        where user_role.user_id = ${userId}
      ),
      subordinate (user_id) as (
        select member.id
        from foundation."user" member
        where member.reports_to_user_id = ${userId} and member.active
          and exists (select 1 from own_role where nature = 'operational')
        union
        select member.id
        from foundation."user" member
        join subordinate above on member.reports_to_user_id = above.user_id
        where member.active
          and not exists (
            select 1 from foundation.user_role user_role
            join foundation.role role on role.id = user_role.role_id
            where user_role.user_id = above.user_id and role.nature = 'administrative')
      )
    select role_permission.permission
    from foundation.role_permission role_permission
    where role_permission.role_id in (select id from own_role)
    union
    select role_permission.permission
    from subordinate
    join foundation.user_role user_role on user_role.user_id = subordinate.user_id
    join foundation.role role on role.id = user_role.role_id and role.nature = 'operational'
    join foundation.role_permission role_permission on role_permission.role_id = role.id`.execute(db);
  return new Set(
    rows.rows.flatMap((row) => {
      const permission = permissionSchema.safeParse(row.permission);
      return permission.success ? [permission.data] : [];
    }),
  );
}

/**
 * Sites que l'utilisateur voit (RG-SUR-020, 021) : ceux de son rattachement, augmentés de tout ce que
 * voient ceux qu'il encadre, directement ou non, y compris sur d'autres sites (RG-SUR-018).
 */
export async function visibleSiteIds(db: Kysely<DB>, userId: string): Promise<readonly string[]> {
  const rows = await sql<{ siteId: string }>`
    with recursive seen (user_id) as (
      select ${userId}::uuid
      union
      select member.id from foundation."user" member join seen on member.reports_to_user_id = seen.user_id
    )
    select distinct user_site.site_id as "siteId"
    from foundation.user_site user_site
    join seen on seen.user_id = user_site.user_id`.execute(db);
  return rows.rows.map((row) => row.siteId);
}

/** Vrai si le site est dans la visibilité de l'utilisateur (RG-EXI-050). */
export async function canSeeSite(db: Kysely<DB>, userId: string, siteId: string): Promise<boolean> {
  return (await visibleSiteIds(db, userId)).includes(siteId);
}

/**
 * Contrôle d'un geste, exercé à chaque geste quel que soit l'écran (RG-EXI-012) : la permission est
 * effective (RG-ORG-021, RG-SUR-023), le site est dans le périmètre d'exécution déclaré sur le compte,
 * quelle que soit la position hiérarchique (RG-SUR-026, 027).
 */
export async function authorize(
  transaction: DatabaseTransaction,
  userId: string,
  permission: Permission | null,
  scope: PermissionScope,
): Promise<'permissionDenied' | 'outOfScope' | undefined> {
  if (permission !== null && !(await effectivePermissions(transaction, userId)).has(permission)) {
    return 'permissionDenied';
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
