import {
  handlingUnitTypeSchema,
  listHandlingUnitTypes,
  listMovementReasons,
  listQualityStates,
  locationTypeSchema,
  pickingRuleSchema,
  reasonNatureSchema,
  saveHandlingUnitType,
  saveMovementReason,
  saveQualityState,
  setItemPickingRule,
  setPickingRule,
  setSnapshotTime,
} from '@cairn/contrat';
import { sql, type Kysely } from 'kysely';
import { z } from 'zod';
import type { DB } from '../../socle/database/index.js';
import { defineGestureHandler, GestureRefusal } from '../../socle/gesture/index.js';
import { defineQueryHandler, QueryRefusal } from '../../socle/query/index.js';
import { signalChange } from '../../socle/signal/index.js';
import { defineTraceEventType } from '../../socle/trace-event/index.js';
import { canSeePrincipal, PRINCIPAL, SITE } from '../organization/index.js';

export const QUALITY_STATE = 'QualityState';

/** La liste modèle des états qualité, fournie par le produit (RG-STK-009) ; « neuf » par défaut (RG-STK-011). */
const TEMPLATE = [
  { code: 'NEUF', label: 'Neuf', pickable: true, suggestedLocationType: null, rank: 10 },
  { code: 'RECONDITIONNE', label: 'Reconditionné', pickable: true, suggestedLocationType: null, rank: 20 },
  { code: 'OCCASION', label: 'Occasion', pickable: true, suggestedLocationType: null, rank: 30 },
  { code: 'DEFECTUEUX', label: 'Défectueux', pickable: false, suggestedLocationType: 'quarantine', rank: 40 },
  {
    code: 'A-DETRUIRE',
    label: 'À détruire',
    pickable: false,
    suggestedLocationType: 'destruction',
    rank: 50,
  },
] as const;

/** Pose la liste modèle des états qualité d'un donneur d'ordre qui vient d'être créé. */
export async function seedQualityStates(transaction: Kysely<DB>, principalId: string): Promise<void> {
  await transaction
    .insertInto('logistics.qualityState')
    .values(TEMPLATE.map((state) => ({ ...state, principalId, isDefault: state.code === 'NEUF' })))
    .onConflict((conflict) => conflict.columns(['principalId', 'code']).doNothing())
    .execute();
}

export const qualityStateSavedEvent = defineTraceEventType(
  'qualityStateSaved',
  z.object({ code: z.string(), pickable: z.boolean(), isDefault: z.boolean(), active: z.boolean() }),
);
export const pickingRuleEvent = defineTraceEventType(
  'pickingRuleSet',
  z.object({ previous: z.string().nullable(), pickingRule: z.string().nullable() }),
);
export const movementReasonEvent = defineTraceEventType(
  'movementReasonSaved',
  z.object({ nature: z.string(), commentRequired: z.boolean(), active: z.boolean() }),
);
export const handlingUnitTypeEvent = defineTraceEventType(
  'handlingUnitTypeSaved',
  z.object({ code: z.string(), returnable: z.boolean(), active: z.boolean() }),
);
export const snapshotTimeEvent = defineTraceEventType(
  'snapshotTimeSet',
  z.object({ previous: z.string(), snapshotTime: z.string() }),
);

export const listQualityStatesHandler = defineQueryHandler({
  definition: listQualityStates,
  async execute({ db, userId, input }) {
    if (!(await canSeePrincipal(db, userId, input.principalId))) throw new QueryRefusal('outOfScope');
    const principal = await db
      .selectFrom('logistics.principal')
      .select('pickingRule')
      .where('id', '=', input.principalId)
      .executeTakeFirst();
    if (principal === undefined) throw new QueryRefusal('outOfScope');
    const states = await db
      .selectFrom('logistics.qualityState')
      .select(['id', 'code', 'label', 'pickable', 'suggestedLocationType', 'isDefault', 'active'])
      .where('principalId', '=', input.principalId)
      .orderBy('rank')
      .orderBy('code')
      .execute();
    return {
      pickingRule: pickingRuleSchema.parse(principal.pickingRule),
      qualityStates: states.map((state) => ({
        ...state,
        suggestedLocationType:
          state.suggestedLocationType === null ? null : locationTypeSchema.parse(state.suggestedLocationType),
      })),
    };
  },
});

/** Un état qualité se désactive, jamais ne se supprime ; l'état par défaut reste actif (RG-STK-011, 013). */
export const saveQualityStateHandler = defineGestureHandler({
  definition: saveQualityState,
  async execute({ transaction, input, appendEvent }) {
    const principal = await transaction
      .selectFrom('logistics.principal')
      .select('id')
      .where('id', '=', input.principalId)
      .executeTakeFirst();
    if (principal === undefined) throw new GestureRefusal('unknownPrincipal');
    if (input.isDefault && !input.active) throw new GestureRefusal('defaultInactive');
    const taken = await transaction
      .selectFrom('logistics.qualityState')
      .select('id')
      .where('principalId', '=', principal.id)
      .where('code', '=', input.code)
      .$if(input.qualityStateId !== null, (query) => query.where('id', '<>', input.qualityStateId ?? ''))
      .executeTakeFirst();
    if (taken !== undefined) throw new GestureRefusal('codeTaken');
    if (input.isDefault)
      await transaction
        .updateTable('logistics.qualityState')
        .set({ isDefault: false })
        .where('principalId', '=', principal.id)
        .execute();
    const values = {
      code: input.code,
      label: input.label,
      pickable: input.pickable,
      suggestedLocationType: input.suggestedLocationType,
      isDefault: input.isDefault,
      active: input.active,
    };
    let qualityStateId = input.qualityStateId;
    if (qualityStateId === null) {
      const { rank } = await transaction
        .selectFrom('logistics.qualityState')
        .select(sql<number>`coalesce(max(rank), 0)::int + 10`.as('rank'))
        .where('principalId', '=', principal.id)
        .executeTakeFirstOrThrow();
      qualityStateId = (
        await transaction
          .insertInto('logistics.qualityState')
          .values({ ...values, principalId: principal.id, rank })
          .returning('id')
          .executeTakeFirstOrThrow()
      ).id;
    } else {
      const current = await transaction
        .selectFrom('logistics.qualityState')
        .select('isDefault')
        .where('id', '=', qualityStateId)
        .where('principalId', '=', principal.id)
        .executeTakeFirst();
      if (current === undefined) throw new GestureRefusal('unknownQualityState');
      // Le donneur d'ordre garde toujours un état par défaut : on en désigne un autre, on ne l'enlève pas.
      if (current.isDefault && !input.isDefault) throw new GestureRefusal('defaultInactive');
      await transaction
        .updateTable('logistics.qualityState')
        .set(values)
        .where('id', '=', qualityStateId)
        .execute();
    }
    await appendEvent({
      eventType: qualityStateSavedEvent,
      data: { code: input.code, pickable: input.pickable, isDefault: input.isDefault, active: input.active },
      objects: [
        { type: QUALITY_STATE, id: qualityStateId },
        { type: PRINCIPAL, id: principal.id },
      ],
    });
    await signalChange(transaction, { objectType: PRINCIPAL, objectId: principal.id, version: 1 });
    return { qualityStateId };
  },
});

export const setPickingRuleHandler = defineGestureHandler({
  definition: setPickingRule,
  async execute({ transaction, input, appendEvent }) {
    const principal = await transaction
      .selectFrom('logistics.principal')
      .select('pickingRule')
      .where('id', '=', input.principalId)
      .executeTakeFirst();
    if (principal === undefined) throw new GestureRefusal('unknownPrincipal');
    await transaction
      .updateTable('logistics.principal')
      .set({ pickingRule: input.pickingRule })
      .where('id', '=', input.principalId)
      .execute();
    await appendEvent({
      eventType: pickingRuleEvent,
      data: { previous: principal.pickingRule, pickingRule: input.pickingRule },
      objects: [{ type: PRINCIPAL, id: input.principalId }],
    });
    await signalChange(transaction, { objectType: PRINCIPAL, objectId: input.principalId, version: 1 });
    return {};
  },
});

export const setItemPickingRuleHandler = defineGestureHandler({
  definition: setItemPickingRule,
  async execute({ transaction, author, input, appendEvent }) {
    const item = await transaction
      .selectFrom('logistics.item')
      .select(['id', 'principalId', 'pickingRule'])
      .where('id', '=', input.itemId)
      .executeTakeFirst();
    if (item === undefined || !(await canSeePrincipal(transaction, author.userId, item.principalId)))
      throw new GestureRefusal('unknownItem');
    await transaction
      .updateTable('logistics.item')
      .set({ pickingRule: input.pickingRule })
      .where('id', '=', item.id)
      .execute();
    await appendEvent({
      eventType: pickingRuleEvent,
      data: { previous: item.pickingRule, pickingRule: input.pickingRule },
      objects: [{ type: 'Item', id: item.id }],
    });
    await signalChange(transaction, { objectType: 'Item', objectId: item.id, version: 1 });
    return {};
  },
});

export const listMovementReasonsHandler = defineQueryHandler({
  definition: listMovementReasons,
  async execute({ db }) {
    const reasons = await db
      .selectFrom('logistics.movementReason')
      .select(['id', 'nature', 'label', 'commentRequired', 'active'])
      .orderBy('nature')
      .orderBy('label')
      .execute();
    return {
      reasons: reasons.map((reason) => ({ ...reason, nature: reasonNatureSchema.parse(reason.nature) })),
    };
  },
});

export const saveMovementReasonHandler = defineGestureHandler({
  definition: saveMovementReason,
  async execute({ transaction, input, appendEvent }) {
    const taken = await transaction
      .selectFrom('logistics.movementReason')
      .select('id')
      .where('nature', '=', input.nature)
      .where('label', '=', input.label)
      .$if(input.reasonId !== null, (query) => query.where('id', '<>', input.reasonId ?? ''))
      .executeTakeFirst();
    if (taken !== undefined) throw new GestureRefusal('nameTaken');
    const values = {
      nature: input.nature,
      label: input.label,
      commentRequired: input.commentRequired,
      active: input.active,
    };
    let reasonId = input.reasonId;
    if (reasonId === null) {
      reasonId = (
        await transaction
          .insertInto('logistics.movementReason')
          .values(values)
          .returning('id')
          .executeTakeFirstOrThrow()
      ).id;
    } else {
      const updated = await transaction
        .updateTable('logistics.movementReason')
        .set(values)
        .where('id', '=', reasonId)
        .executeTakeFirst();
      if (updated.numUpdatedRows === 0n) throw new GestureRefusal('unknownReason');
    }
    await appendEvent({
      eventType: movementReasonEvent,
      data: { nature: input.nature, commentRequired: input.commentRequired, active: input.active },
      objects: [{ type: 'MovementReason', id: reasonId }],
    });
    return { reasonId };
  },
});

export const listHandlingUnitTypesHandler = defineQueryHandler({
  definition: listHandlingUnitTypes,
  async execute({ db }) {
    const types = await db
      .selectFrom('logistics.handlingUnitType')
      .select([
        'id',
        'code',
        'label',
        'lengthMm',
        'widthMm',
        'heightMm',
        'tareWeightGrams',
        'returnable',
        'active',
      ])
      .orderBy('code')
      .execute();
    return { types: types.map((type) => handlingUnitTypeSchema.parse(type)) };
  },
});

export const saveHandlingUnitTypeHandler = defineGestureHandler({
  definition: saveHandlingUnitType,
  async execute({ transaction, input, appendEvent }) {
    const taken = await transaction
      .selectFrom('logistics.handlingUnitType')
      .select('id')
      .where('code', '=', input.code)
      .$if(input.typeId !== null, (query) => query.where('id', '<>', input.typeId ?? ''))
      .executeTakeFirst();
    if (taken !== undefined) throw new GestureRefusal('codeTaken');
    const values = {
      code: input.code,
      label: input.label,
      lengthMm: input.lengthMm,
      widthMm: input.widthMm,
      heightMm: input.heightMm,
      tareWeightGrams: input.tareWeightGrams,
      returnable: input.returnable,
      active: input.active,
    };
    let typeId = input.typeId;
    if (typeId === null) {
      typeId = (
        await transaction
          .insertInto('logistics.handlingUnitType')
          .values(values)
          .returning('id')
          .executeTakeFirstOrThrow()
      ).id;
    } else {
      const updated = await transaction
        .updateTable('logistics.handlingUnitType')
        .set(values)
        .where('id', '=', typeId)
        .executeTakeFirst();
      if (updated.numUpdatedRows === 0n) throw new GestureRefusal('unknownHandlingUnitType');
    }
    await appendEvent({
      eventType: handlingUnitTypeEvent,
      data: { code: input.code, returnable: input.returnable, active: input.active },
      objects: [{ type: 'HandlingUnitType', id: typeId }],
    });
    return { typeId };
  },
});

/** L'heure de la photo tombe hors des plages d'ouverture du site (RG-STK-060). */
export const setSnapshotTimeHandler = defineGestureHandler({
  definition: setSnapshotTime,
  async execute({ transaction, input, appendEvent }) {
    const site = await transaction
      .selectFrom('foundation.site')
      .select(['id', 'snapshotTime'])
      .where('id', '=', input.siteId)
      .executeTakeFirst();
    if (site === undefined) throw new GestureRefusal('unknownSite');
    const opening = await transaction
      .selectFrom('foundation.siteOpeningRange')
      .select('weekday')
      .where('siteId', '=', site.id)
      .where('opensAt', '<=', input.snapshotTime)
      .where('closesAt', '>', input.snapshotTime)
      .executeTakeFirst();
    if (opening !== undefined) throw new GestureRefusal('snapshotDuringOpening');
    await transaction
      .updateTable('foundation.site')
      .set({ snapshotTime: input.snapshotTime })
      .where('id', '=', site.id)
      .execute();
    await appendEvent({
      eventType: snapshotTimeEvent,
      data: { previous: site.snapshotTime.slice(0, 5), snapshotTime: input.snapshotTime },
      objects: [{ type: SITE, id: site.id }],
    });
    await signalChange(transaction, { objectType: SITE, objectId: site.id, version: 1 });
    return {};
  },
});
