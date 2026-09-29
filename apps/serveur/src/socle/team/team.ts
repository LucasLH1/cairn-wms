import { listTeams, saveTeam, setTeamActive } from '@cairn/contrat';
import { sql } from 'kysely';
import { z } from 'zod';
import { defineGestureHandler, GestureRefusal } from '../gesture/index.js';
import { defineQueryHandler } from '../query/index.js';
import { signalChange } from '../signal/index.js';
import { defineTraceEventType } from '../trace-event/index.js';

export const TEAM = 'Team';

/** Équipes, avec leur encadrant et le nombre de leurs membres ; une équipe sans encadrant est une anomalie visible (RG-SUR-013). */
export const listTeamsHandler = defineQueryHandler({
  definition: listTeams,
  permissions: ['administerTeams', 'administerUsers'],
  async execute({ db }) {
    const teams = await db
      .selectFrom('foundation.team as team')
      .innerJoin('foundation.site as site', 'site.id', 'team.siteId')
      .leftJoin('foundation.user as lead', 'lead.id', 'team.leadUserId')
      .select([
        'team.id',
        'team.siteId',
        'site.name as siteName',
        'team.name',
        'team.leadUserId',
        'lead.displayName as leadName',
        'team.active',
        sql<number>`(select count(*)::int from foundation.team_member member where member.team_id = team.id)`.as(
          'memberCount',
        ),
      ])
      .orderBy('site.name')
      .orderBy('team.name')
      .execute();
    return { teams };
  },
});

export const teamSavedEvent = defineTraceEventType(
  'teamSaved',
  z.object({ siteId: z.string(), name: z.string(), leadUserId: z.string().nullable() }),
);

/**
 * Une équipe : un site, un nom, un encadrant désigné (RG-SUR-008, 009). Changer d'encadrant ne touche
 * aucun membre (RG-SUR-012) ; l'encadrant appartient au site de l'équipe.
 */
export const saveTeamHandler = defineGestureHandler({
  definition: saveTeam,
  scope: (input) => Promise.resolve({ siteId: input.siteId }),
  async execute({ transaction, input, appendEvent }) {
    const site = await transaction
      .selectFrom('foundation.site')
      .select('id')
      .where('id', '=', input.siteId)
      .executeTakeFirst();
    if (site === undefined) throw new GestureRefusal('unknownSite');
    const taken = await transaction
      .selectFrom('foundation.team')
      .select('id')
      .where('siteId', '=', input.siteId)
      .where('name', '=', input.name)
      .$if(input.teamId !== null, (query) => query.where('id', '<>', input.teamId ?? ''))
      .executeTakeFirst();
    if (taken !== undefined) throw new GestureRefusal('nameTaken');
    if (input.leadUserId !== null) {
      const lead = await transaction
        .selectFrom('foundation.user as user')
        .leftJoin('foundation.userSite as userSite', (join) =>
          join.onRef('userSite.userId', '=', 'user.id').on('userSite.siteId', '=', input.siteId),
        )
        .select(['user.id', 'userSite.siteId'])
        .where('user.id', '=', input.leadUserId)
        .executeTakeFirst();
      if (lead === undefined) throw new GestureRefusal('unknownUser');
      if (lead.siteId === null) throw new GestureRefusal('leadOutsideSite');
    }
    let teamId = input.teamId;
    if (teamId === null) {
      teamId = (
        await transaction
          .insertInto('foundation.team')
          .values({ siteId: input.siteId, name: input.name, leadUserId: input.leadUserId })
          .returning('id')
          .executeTakeFirstOrThrow()
      ).id;
    } else {
      const updated = await transaction
        .updateTable('foundation.team')
        .set({ name: input.name, leadUserId: input.leadUserId })
        .where('id', '=', teamId)
        .where('siteId', '=', input.siteId)
        .executeTakeFirst();
      if (updated.numUpdatedRows === 0n) throw new GestureRefusal('unknownTeam');
    }
    await appendEvent({
      eventType: teamSavedEvent,
      data: { siteId: input.siteId, name: input.name, leadUserId: input.leadUserId },
      objects: [
        { type: TEAM, id: teamId },
        { type: 'Site', id: input.siteId },
      ],
    });
    await signalChange(transaction, { objectType: TEAM, objectId: teamId, version: 1 });
    return { teamId };
  },
});

export const teamActivationEvent = defineTraceEventType(
  'teamActivationChanged',
  z.object({ active: z.boolean() }),
);

/** Une équipe ne se supprime pas : elle se désactive, une fois ses membres replacés (RG-SUR-014). */
export const setTeamActiveHandler = defineGestureHandler({
  definition: setTeamActive,
  async execute({ transaction, input, appendEvent }) {
    const team = await transaction
      .selectFrom('foundation.team')
      .select('id')
      .where('id', '=', input.teamId)
      .executeTakeFirst();
    if (team === undefined) throw new GestureRefusal('unknownTeam');
    if (!input.active) {
      const members = await transaction
        .selectFrom('foundation.teamMember')
        .select(sql<number>`count(*)::int`.as('count'))
        .where('teamId', '=', input.teamId)
        .executeTakeFirstOrThrow();
      if (members.count > 0) throw new GestureRefusal('teamHasMembers', { members: members.count });
    }
    await transaction
      .updateTable('foundation.team')
      .set({ active: input.active })
      .where('id', '=', input.teamId)
      .execute();
    await appendEvent({
      eventType: teamActivationEvent,
      data: { active: input.active },
      objects: [{ type: TEAM, id: input.teamId }],
    });
    await signalChange(transaction, { objectType: TEAM, objectId: input.teamId, version: 1 });
    return {};
  },
});
