import {
  deleteRole,
  listRoles,
  permissionSchema,
  ROLE_ADMINISTRATION,
  roleNatureSchema,
  saveRole,
} from '@cairn/contrat';
import { sql } from 'kysely';
import { z } from 'zod';
import type { DatabaseTransaction } from '../database/index.js';
import { defineGestureHandler, GestureRefusal } from '../gesture/index.js';
import { defineQueryHandler } from '../query/index.js';
import { signalChange } from '../signal/index.js';
import { defineTraceEventType } from '../trace-event/index.js';

export const ROLE = 'Role';

/**
 * Au moins un utilisateur actif détient l'administration des rôles (RG-ORG-024). Vérifiée après la
 * modification, dans la transaction du geste : si elle ne tient plus, le geste est refusé et annulé.
 */
export async function assertRoleAdministratorRemains(transaction: DatabaseTransaction): Promise<void> {
  const holder = await transaction
    .selectFrom('foundation.user as user')
    .innerJoin('foundation.userRole as userRole', 'userRole.userId', 'user.id')
    .innerJoin('foundation.rolePermission as rolePermission', 'rolePermission.roleId', 'userRole.roleId')
    .select('user.id')
    .where('user.active', '=', true)
    .where('rolePermission.permission', '=', ROLE_ADMINISTRATION)
    .executeTakeFirst();
  if (holder === undefined) throw new GestureRefusal('lastRoleAdministrator');
}

/** Rôles modèles et rôles créés, avec le nombre d'utilisateurs porteurs (parcours « Composer un rôle »). */
export const listRolesHandler = defineQueryHandler({
  definition: listRoles,
  permissions: ['administerRoles', 'administerUsers'],
  async execute({ db }) {
    const rows = await db
      .selectFrom('foundation.role as role')
      .select([
        'role.id',
        'role.name',
        'role.nature',
        'role.template',
        sql<number>`(select count(*)::int from foundation.user_role holder where holder.role_id = role.id)`.as(
          'holderCount',
        ),
        sql<
          string[]
        >`coalesce((select array_agg(permission order by permission) from foundation.role_permission
          where role_id = role.id), '{}')`.as('permissions'),
      ])
      .orderBy('role.name')
      .execute();
    return {
      roles: rows.map((row) => ({
        id: row.id,
        name: row.name,
        nature: roleNatureSchema.parse(row.nature),
        template: row.template !== null,
        holderCount: row.holderCount,
        permissions: row.permissions.flatMap((permission) => {
          const parsed = permissionSchema.safeParse(permission);
          return parsed.success ? [parsed.data] : [];
        }),
      })),
    };
  },
});

export const roleSavedEvent = defineTraceEventType(
  'roleSaved',
  z.object({ name: z.string(), nature: z.string(), permissions: z.array(z.string()) }),
);

/**
 * Compose un rôle : libellé, nature, permissions (RG-ORG-019, RG-SUR-022). Porté par des utilisateurs,
 * il change pour tous ; l'écran l'annonce avant validation.
 */
export const saveRoleHandler = defineGestureHandler({
  definition: saveRole,
  async execute({ transaction, input, appendEvent }) {
    const taken = await transaction
      .selectFrom('foundation.role')
      .select('id')
      .where('name', '=', input.name)
      .$if(input.roleId !== null, (query) => query.where('id', '<>', input.roleId ?? ''))
      .executeTakeFirst();
    if (taken !== undefined) throw new GestureRefusal('nameTaken');
    let roleId = input.roleId;
    if (roleId === null) {
      roleId = (
        await transaction
          .insertInto('foundation.role')
          .values({ name: input.name, nature: input.nature })
          .returning('id')
          .executeTakeFirstOrThrow()
      ).id;
    } else {
      const updated = await transaction
        .updateTable('foundation.role')
        .set({ name: input.name, nature: input.nature })
        .where('id', '=', roleId)
        .executeTakeFirst();
      if (updated.numUpdatedRows === 0n) throw new GestureRefusal('unknownRole');
      await transaction.deleteFrom('foundation.rolePermission').where('roleId', '=', roleId).execute();
    }
    const permissions = [...new Set(input.permissions)].sort();
    if (permissions.length > 0) {
      const id = roleId;
      await transaction
        .insertInto('foundation.rolePermission')
        .values(permissions.map((permission) => ({ roleId: id, permission })))
        .execute();
    }
    await assertRoleAdministratorRemains(transaction);
    await appendEvent({
      eventType: roleSavedEvent,
      data: { name: input.name, nature: input.nature, permissions },
      objects: [{ type: ROLE, id: roleId }],
    });
    await signalChange(transaction, { objectType: ROLE, objectId: roleId, version: 1 });
    return { roleId };
  },
});

export const roleDeletedEvent = defineTraceEventType('roleDeleted', z.object({ name: z.string() }));

/** Un rôle, modèle compris, se supprime s'il n'est plus porté (RG-ORG-020). */
export const deleteRoleHandler = defineGestureHandler({
  definition: deleteRole,
  async execute({ transaction, input, appendEvent }) {
    const role = await transaction
      .selectFrom('foundation.role')
      .select('name')
      .where('id', '=', input.roleId)
      .executeTakeFirst();
    if (role === undefined) throw new GestureRefusal('unknownRole');
    const held = await transaction
      .selectFrom('foundation.userRole')
      .select('userId')
      .where('roleId', '=', input.roleId)
      .executeTakeFirst();
    if (held !== undefined) throw new GestureRefusal('roleHeld');
    await transaction.deleteFrom('foundation.rolePermission').where('roleId', '=', input.roleId).execute();
    await transaction.deleteFrom('foundation.role').where('id', '=', input.roleId).execute();
    await appendEvent({
      eventType: roleDeletedEvent,
      data: { name: role.name },
      objects: [{ type: ROLE, id: input.roleId }],
    });
    await signalChange(transaction, { objectType: ROLE, objectId: input.roleId, version: 1 });
    return {};
  },
});
