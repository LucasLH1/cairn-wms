import { getUser, listUsers, saveUser, setExecutionSites, setUserActive } from '@cairn/contrat';
import { sql } from 'kysely';
import { z } from 'zod';
import type { DatabaseTransaction } from '../database/index.js';
import { defineGestureHandler, GestureRefusal } from '../gesture/index.js';
import { effectivePermissions } from '../permission/index.js';
import { defineQueryHandler, QueryRefusal } from '../query/index.js';
import { assertRoleAdministratorRemains } from '../role/index.js';
import { signalChange } from '../signal/index.js';
import { defineTraceEventType } from '../trace-event/index.js';
import { hashPassword } from './password.js';

export const USER = 'User';

/** Utilisateurs, actifs et désactivés : un utilisateur ne se supprime pas (RG-ORG-023). */
export const listUsersHandler = defineQueryHandler({
  definition: listUsers,
  permissions: ['administerUsers', 'administerExecutionSites', 'administerTeams'],
  async execute({ db }) {
    const rows = await db
      .selectFrom('foundation.user as user')
      .leftJoin('foundation.teamMember as member', 'member.userId', 'user.id')
      .leftJoin('foundation.team as team', 'team.id', 'member.teamId')
      .select([
        'user.id',
        'user.displayName',
        'user.loginName',
        'user.active',
        'team.name as team',
        sql<
          string[]
        >`coalesce((select array_agg(role.name order by role.name) from foundation.user_role user_role
          join foundation.role role on role.id = user_role.role_id where user_role.user_id = "user".id), '{}')`.as(
          'roles',
        ),
        sql<
          string[]
        >`coalesce((select array_agg(site.code order by site.code) from foundation.user_site user_site
          join foundation.site site on site.id = user_site.site_id where user_site.user_id = "user".id), '{}')`.as(
          'sites',
        ),
      ])
      .orderBy('user.displayName')
      .execute();
    return { users: rows };
  },
});

/** Un utilisateur, et l'aperçu de ses permissions effectives (parcours « Créer un utilisateur »). */
export const getUserHandler = defineQueryHandler({
  definition: getUser,
  permissions: ['administerUsers', 'administerExecutionSites'],
  async execute({ db, input }) {
    const user = await db
      .selectFrom('foundation.user as user')
      .leftJoin('foundation.teamMember as member', 'member.userId', 'user.id')
      .select([
        'user.id',
        'user.displayName',
        'user.loginName',
        'user.email',
        'user.active',
        'user.reportsToUserId',
        'member.teamId',
      ])
      .where('user.id', '=', input.userId)
      .executeTakeFirst();
    if (user === undefined) throw new QueryRefusal('outOfScope');
    const roles = await db
      .selectFrom('foundation.userRole')
      .select('roleId')
      .where('userId', '=', user.id)
      .execute();
    const sites = await db
      .selectFrom('foundation.userSite')
      .select(['siteId', 'execution'])
      .where('userId', '=', user.id)
      .execute();
    return {
      user: {
        ...user,
        roleIds: roles.map((role) => role.roleId),
        siteIds: sites.map((site) => site.siteId),
        executionSiteIds: sites.filter((site) => site.execution).map((site) => site.siteId),
        effectivePermissions: [...(await effectivePermissions(db, user.id))].sort(),
      },
    };
  },
});

/** Un rattachement hiérarchique ne place jamais quelqu'un sous l'un de ceux qu'il encadre (RG-SUR-017). */
async function assertNoCycle(
  transaction: DatabaseTransaction,
  userId: string,
  reportsTo: string,
): Promise<void> {
  const ancestors = await sql<{ id: string }>`
    with recursive chain (id) as (
      select ${reportsTo}::uuid
      union
      select above.reports_to_user_id from foundation."user" above join chain on above.id = chain.id
      where above.reports_to_user_id is not null
    )
    select id from chain`.execute(transaction);
  if (ancestors.rows.some((row) => row.id === userId)) throw new GestureRefusal('hierarchyCycle');
}

export const userSavedEvent = defineTraceEventType(
  'userSaved',
  z.object({
    roleIds: z.array(z.string()),
    siteIds: z.array(z.string()),
    teamId: z.string().nullable(),
    reportsToUserId: z.string().nullable(),
    passwordChanged: z.boolean(),
  }),
);

/**
 * Crée ou modifie un utilisateur : identité, rôles, sites de rattachement, équipe, hiérarchie
 * (RG-ORG-015, 021 ; RG-SUR-009, 010, 016 à 018). Les sites d'exécution ont leur propre geste
 * (RG-SUR-128) ; un site retiré sort aussi de l'exécution.
 */
export const saveUserHandler = defineGestureHandler({
  definition: saveUser,
  async execute({ transaction, input, appendEvent }) {
    const loginTaken = await transaction
      .selectFrom('foundation.user')
      .select('id')
      .where(sql<string>`lower(login_name)`, '=', input.loginName.toLowerCase())
      .$if(input.userId !== null, (query) => query.where('id', '<>', input.userId ?? ''))
      .executeTakeFirst();
    if (loginTaken !== undefined) throw new GestureRefusal('loginNameTaken');

    const roleIds = [...new Set(input.roleIds)];
    const siteIds = [...new Set(input.siteIds)];
    if (roleIds.length > 0) {
      const found = await transaction
        .selectFrom('foundation.role')
        .select('id')
        .where('id', 'in', roleIds)
        .execute();
      if (found.length !== roleIds.length) throw new GestureRefusal('unknownRole');
    }
    if (siteIds.length > 0) {
      const found = await transaction
        .selectFrom('foundation.site')
        .select('id')
        .where('id', 'in', siteIds)
        .execute();
      if (found.length !== siteIds.length) throw new GestureRefusal('unknownSite');
    }
    if (input.teamId !== null) {
      const team = await transaction
        .selectFrom('foundation.team')
        .select('siteId')
        .where('id', '=', input.teamId)
        .where('active', '=', true)
        .executeTakeFirst();
      if (team === undefined) throw new GestureRefusal('unknownTeam');
      if (!siteIds.includes(team.siteId)) throw new GestureRefusal('teamOutsideSites');
    }
    if (input.reportsToUserId !== null) {
      const manager = await transaction
        .selectFrom('foundation.user')
        .select('id')
        .where('id', '=', input.reportsToUserId)
        .executeTakeFirst();
      if (manager === undefined) throw new GestureRefusal('unknownUser');
    }

    let userId = input.userId;
    const identity = {
      displayName: input.displayName,
      loginName: input.loginName,
      email: input.email,
      reportsToUserId: input.reportsToUserId,
    };
    if (userId === null) {
      if (input.password === null) throw new GestureRefusal('passwordRequired');
      userId = (
        await transaction
          .insertInto('foundation.user')
          .values({
            ...identity,
            passwordHash: await hashPassword(input.password),
            active: siteIds.length > 0,
          })
          .returning('id')
          .executeTakeFirstOrThrow()
      ).id;
    } else {
      const updated = await transaction
        .updateTable('foundation.user')
        .set({
          ...identity,
          ...(input.password === null ? {} : { passwordHash: await hashPassword(input.password) }),
        })
        .where('id', '=', userId)
        .executeTakeFirst();
      if (updated.numUpdatedRows === 0n) throw new GestureRefusal('unknownUser');
      if (input.password !== null) {
        // Un mot de passe remplacé ferme les sessions ouvertes avec l'ancien.
        await transaction
          .updateTable('foundation.session')
          .set({ revoked: true })
          .where('userId', '=', userId)
          .execute();
      }
    }
    const id = userId;
    if (input.reportsToUserId !== null) await assertNoCycle(transaction, id, input.reportsToUserId);

    await transaction.deleteFrom('foundation.userRole').where('userId', '=', id).execute();
    if (roleIds.length > 0) {
      await transaction
        .insertInto('foundation.userRole')
        .values(roleIds.map((roleId) => ({ userId: id, roleId })))
        .execute();
    }
    await transaction
      .deleteFrom('foundation.userSite')
      .where('userId', '=', id)
      .$if(siteIds.length > 0, (query) => query.where('siteId', 'not in', siteIds))
      .execute();
    if (siteIds.length > 0) {
      await transaction
        .insertInto('foundation.userSite')
        .values(siteIds.map((siteId) => ({ userId: id, siteId, execution: false })))
        .onConflict((conflict) => conflict.columns(['userId', 'siteId']).doNothing())
        .execute();
    }
    await transaction.deleteFrom('foundation.teamMember').where('userId', '=', id).execute();
    if (input.teamId !== null) {
      await transaction
        .insertInto('foundation.teamMember')
        .values({ userId: id, teamId: input.teamId })
        .execute();
    }
    await assertRoleAdministratorRemains(transaction);
    await appendEvent({
      eventType: userSavedEvent,
      data: {
        roleIds,
        siteIds,
        teamId: input.teamId,
        reportsToUserId: input.reportsToUserId,
        passwordChanged: input.password !== null,
      },
      objects: [{ type: USER, id }],
    });
    await signalChange(transaction, { objectType: USER, objectId: id, version: 1 });
    return { userId: id };
  },
});

export const userActivationEvent = defineTraceEventType(
  'userActivationChanged',
  z.object({ active: z.boolean() }),
);

/**
 * Un utilisateur ne se supprime pas, il se désactive (RG-ORG-023) : ses sessions sont révoquées
 * aussitôt. Il ne s'active qu'avec au moins un site (parcours « Créer un utilisateur »).
 */
export const setUserActiveHandler = defineGestureHandler({
  definition: setUserActive,
  async execute({ transaction, input, appendEvent }) {
    const user = await transaction
      .selectFrom('foundation.user')
      .select('id')
      .where('id', '=', input.userId)
      .executeTakeFirst();
    if (user === undefined) throw new GestureRefusal('unknownUser');
    if (input.active) {
      const site = await transaction
        .selectFrom('foundation.userSite')
        .select('siteId')
        .where('userId', '=', input.userId)
        .executeTakeFirst();
      if (site === undefined) throw new GestureRefusal('siteRequired');
    }
    await transaction
      .updateTable('foundation.user')
      .set({ active: input.active })
      .where('id', '=', input.userId)
      .execute();
    if (!input.active) {
      await transaction
        .updateTable('foundation.session')
        .set({ revoked: true })
        .where('userId', '=', input.userId)
        .execute();
      await assertRoleAdministratorRemains(transaction);
    }
    await appendEvent({
      eventType: userActivationEvent,
      data: { active: input.active },
      objects: [{ type: USER, id: input.userId }],
    });
    await signalChange(transaction, { objectType: USER, objectId: input.userId, version: 1 });
    return {};
  },
});

export const executionSitesSetEvent = defineTraceEventType(
  'executionSitesSet',
  z.object({ siteIds: z.array(z.string()) }),
);

/**
 * Sites d'exécution d'un utilisateur, parmi ses sites de rattachement (RG-SUR-026). Relève de
 * l'administration du prestataire ; nul ne modifie les siens (RG-SUR-128).
 */
export const setExecutionSitesHandler = defineGestureHandler({
  definition: setExecutionSites,
  async execute({ transaction, author, input, appendEvent }) {
    if (input.userId === author.userId) throw new GestureRefusal('ownExecutionSites');
    const attached = await transaction
      .selectFrom('foundation.userSite')
      .select('siteId')
      .where('userId', '=', input.userId)
      .execute();
    const user = await transaction
      .selectFrom('foundation.user')
      .select('id')
      .where('id', '=', input.userId)
      .executeTakeFirst();
    if (user === undefined) throw new GestureRefusal('unknownUser');
    const siteIds = [...new Set(input.siteIds)];
    if (!siteIds.every((siteId) => attached.some((row) => row.siteId === siteId))) {
      throw new GestureRefusal('executionOutsideSites');
    }
    await transaction
      .updateTable('foundation.userSite')
      .set({ execution: false })
      .where('userId', '=', input.userId)
      .execute();
    if (siteIds.length > 0) {
      await transaction
        .updateTable('foundation.userSite')
        .set({ execution: true })
        .where('userId', '=', input.userId)
        .where('siteId', 'in', siteIds)
        .execute();
    }
    await appendEvent({
      eventType: executionSitesSetEvent,
      data: { siteIds },
      objects: [{ type: USER, id: input.userId }],
    });
    await signalChange(transaction, { objectType: USER, objectId: input.userId, version: 1 });
    return {};
  },
});
