import {
  adjustStockQuantity,
  changeQualityState,
  completeStockMove,
  correctMovement,
  createHandlingUnit,
  holdImpact,
  liftStockHold,
  locationTypeSchema,
  placeStockHold,
  releaseReservation,
  startStockMove,
  type HoldScope,
} from '@cairn/contrat';
import { sql, type Kysely } from 'kysely';
import { z } from 'zod';
import type { DatabaseTransaction, DB } from '../../socle/database/index.js';
import { defineGestureHandler, GestureRefusal } from '../../socle/gesture/index.js';
import { nextNumber } from '../../socle/numbering/index.js';
import { defineQueryHandler, QueryRefusal } from '../../socle/query/index.js';
import { signalChange } from '../../socle/signal/index.js';
import { defineTraceEventType } from '../../socle/trace-event/index.js';
import {
  checkDeposit,
  checkReason,
  HANDLING_UNIT,
  mergeIfTwin,
  recordMovement,
  refuseIfMoving,
  statusOf,
  STOCK_HOLD,
  STOCK_UNIT,
  touchUnit,
  type MovementAuthor,
} from './engine.js';

export const handlingUnitCreatedEvent = defineTraceEventType(
  'handlingUnitCreated',
  z.object({ code: z.string(), parentId: z.string().nullable() }),
);
export const stockMoveStartedEvent = defineTraceEventType(
  'stockMoveStarted',
  z.object({ stockUnits: z.int(), handlingUnitId: z.string().nullable() }),
);
export const reservationReleasedEvent = defineTraceEventType(
  'stockReservationReleased',
  z.object({ demandType: z.string(), demandId: z.string(), reason: z.string() }),
);
export const holdPlacedEvent = defineTraceEventType(
  'stockHoldPlaced',
  z.object({
    scope: z.string(),
    targetId: z.string(),
    reason: z.string(),
    allowsMove: z.boolean(),
    releasedDemands: z.array(z.object({ demandType: z.string(), demandId: z.string() })),
  }),
);
export const holdLiftedEvent = defineTraceEventType('stockHoldLifted', z.object({ reason: z.string() }));

const authorOf = (author: { userId: string; workstationId: string | null }): MovementAuthor => ({
  userId: author.userId,
  workstationId: author.workstationId,
});

/** Les unités de stock qu'un blocage couvre, selon sa portée (RG-STK-035). */
function coveredUnits(db: Kysely<DB>, scope: HoldScope, targetId: string) {
  const column = {
    stockUnit: 'unit.id',
    batch: 'unit.batchId',
    serializedUnit: 'unit.serializedUnitId',
    location: 'unit.locationId',
    item: 'unit.itemId',
  } as const satisfies Record<HoldScope, string>;
  return db
    .selectFrom('logistics.stockUnit as unit')
    .leftJoin('logistics.stockReservation as reservation', 'reservation.stockUnitId', 'unit.id')
    .select(['unit.id', 'unit.quantity', 'unit.itemId', 'reservation.demandType', 'reservation.demandId'])
    .where(column[scope], '=', targetId);
}

/** La cible d'un blocage existe, et l'utilisateur la voit. */
async function holdTargetExists(db: Kysely<DB>, scope: HoldScope, targetId: string): Promise<boolean> {
  const table = {
    stockUnit: 'logistics.stockUnit',
    batch: 'logistics.batch',
    serializedUnit: 'logistics.serializedUnit',
    location: 'logistics.location',
    item: 'logistics.item',
  } as const satisfies Record<HoldScope, string>;
  const row = await db.selectFrom(table[scope]).select('id').where('id', '=', targetId).executeTakeFirst();
  return row !== undefined;
}

/** Gestes et consultations du module 0.4 sur le stock lui-même. */
export function stockOperations() {
  /** Un support naît à un emplacement, ou dans un autre support, sur un niveau (RG-STK-045, 050). */
  const createHandlingUnitHandler = defineGestureHandler({
    definition: createHandlingUnit,
    async execute({ transaction, input, appendEvent }) {
      const type = await transaction
        .selectFrom('logistics.handlingUnitType')
        .select('id')
        .where('id', '=', input.typeId)
        .where('active', '=', true)
        .executeTakeFirst();
      if (type === undefined) throw new GestureRefusal('unknownHandlingUnitType');
      let siteId: string;
      let locationId = input.locationId;
      if (input.parentId !== null) {
        const parent = await transaction
          .selectFrom('logistics.handlingUnit')
          .select(['id', 'siteId', 'locationId', 'parentId'])
          .where('id', '=', input.parentId)
          .executeTakeFirst();
        if (parent === undefined) throw new GestureRefusal('unknownHandlingUnit');
        if (parent.parentId !== null) throw new GestureRefusal('nestingTooDeep');
        siteId = parent.siteId;
        locationId = parent.locationId;
      } else {
        if (locationId === null) throw new GestureRefusal('unknownLocation');
        const location = await transaction
          .selectFrom('logistics.location')
          .select('siteId')
          .where('id', '=', locationId)
          .where('active', '=', true)
          .executeTakeFirst();
        if (location === undefined) throw new GestureRefusal('unknownLocation');
        siteId = location.siteId;
      }
      const code = await nextNumber(transaction, 'HandlingUnit', {});
      const { id: handlingUnitId } = await transaction
        .insertInto('logistics.handlingUnit')
        .values({ code, typeId: type.id, siteId, locationId, parentId: input.parentId })
        .returning('id')
        .executeTakeFirstOrThrow();
      await appendEvent({
        eventType: handlingUnitCreatedEvent,
        data: { code, parentId: input.parentId },
        objects: [{ type: HANDLING_UNIT, id: handlingUnitId }],
      });
      return { handlingUnitId, code };
    },
  });

  /**
   * La prise : un support entier — ses supports imbriqués compris —, ou des lignes et leurs quantités,
   * toutes au même emplacement. Une quantité partielle détache une unité, qui part ; le reste demeure.
   * Le stock pris est « en cours de mouvement » jusqu'au dépôt (RG-STK-018). Un blocage n'empêche le
   * déplacement que s'il le dit (RG-STK-036).
   */
  const startStockMoveHandler = defineGestureHandler({
    definition: startStockMove,
    async execute({ transaction, author, input, appendEvent }) {
      let lines: { stockUnitId: string; quantity: number }[];
      let handlingUnitId: string | null = null;
      if (input.source.kind === 'handlingUnit') {
        const unit = await transaction
          .selectFrom('logistics.handlingUnit')
          .select(['id', 'locationId'])
          .where('id', '=', input.source.handlingUnitId)
          .executeTakeFirst();
        if (unit?.locationId == null) throw new GestureRefusal('unknownHandlingUnit');
        handlingUnitId = unit.id;
        const contents = await transaction
          .selectFrom('logistics.stockUnit')
          .select(['id', 'quantity'])
          .where((eb) =>
            eb.or([
              eb('handlingUnitId', '=', unit.id),
              eb(
                'handlingUnitId',
                'in',
                eb.selectFrom('logistics.handlingUnit').select('id').where('parentId', '=', unit.id),
              ),
            ]),
          )
          .execute();
        lines = contents.map((content) => ({ stockUnitId: content.id, quantity: content.quantity }));
      } else {
        lines = input.source.lines;
      }
      const units = await transaction
        .selectFrom('logistics.stockUnit as unit')
        .selectAll('unit')
        .$if(lines.length === 0, (query) => query.where(sql<boolean>`false`))
        .$if(lines.length > 0, (query) =>
          query.where(
            'unit.id',
            'in',
            lines.map((line) => line.stockUnitId),
          ),
        )
        .execute();
      if (
        input.source.kind === 'stock' &&
        units.length !== new Set(lines.map((line) => line.stockUnitId)).size
      )
        throw new GestureRefusal('unknownStockUnit');
      const origins = new Set(units.map((unit) => unit.locationId));
      if (origins.size > 1) throw new GestureRefusal('mixedLocations');
      const firstUnit = units[0];
      const fromLocationId =
        firstUnit?.locationId ??
        (handlingUnitId === null
          ? undefined
          : (
              await transaction
                .selectFrom('logistics.handlingUnit')
                .select('locationId')
                .where('id', '=', handlingUnitId)
                .executeTakeFirstOrThrow()
            ).locationId);
      if (fromLocationId == null) throw new GestureRefusal('unknownStockUnit');
      const location = await transaction
        .selectFrom('logistics.location')
        .select('siteId')
        .where('id', '=', fromLocationId)
        .executeTakeFirstOrThrow();
      for (const unit of units) {
        refuseIfMoving(unit);
        const forbidding = await transaction
          .selectFrom('logistics.stockHold as hold')
          .select('hold.id')
          .where('hold.liftedAt', 'is', null)
          .where('hold.allowsMove', '=', false)
          .where((eb) =>
            eb.or([
              eb('hold.stockUnitId', '=', unit.id),
              eb('hold.locationId', '=', unit.locationId),
              eb('hold.itemId', '=', unit.itemId),
              ...(unit.batchId === null ? [] : [eb('hold.batchId', '=', unit.batchId)]),
              ...(unit.serializedUnitId === null
                ? []
                : [eb('hold.serializedUnitId', '=', unit.serializedUnitId)]),
            ]),
          )
          .executeTakeFirst();
        if (forbidding !== undefined) throw new GestureRefusal('holdForbidsMove');
      }
      const { id: moveId } = await transaction
        .insertInto('logistics.stockMove')
        .values({ siteId: location.siteId, fromLocationId, handlingUnitId, startedBy: author.userId })
        .returning('id')
        .executeTakeFirstOrThrow();
      for (const line of lines) {
        const unit = units.find((candidate) => candidate.id === line.stockUnitId);
        if (unit === undefined) continue;
        if (line.quantity > unit.quantity)
          throw new GestureRefusal('insufficientQuantity', { name: String(unit.quantity) });
        if (line.quantity === unit.quantity) {
          await transaction
            .updateTable('logistics.stockUnit')
            .set((eb) => ({ moveId, version: eb('version', '+', 1) }))
            .where('id', '=', unit.id)
            .execute();
        } else {
          // Une part seulement : elle se détache en une unité qui part, la réservation reste au reste.
          await transaction
            .updateTable('logistics.stockUnit')
            .set((eb) => ({ quantity: eb('quantity', '-', line.quantity), version: eb('version', '+', 1) }))
            .where('id', '=', unit.id)
            .execute();
          await transaction
            .insertInto('logistics.stockUnit')
            .values({
              principalId: unit.principalId,
              itemId: unit.itemId,
              siteId: unit.siteId,
              locationId: unit.locationId,
              qualityStateId: unit.qualityStateId,
              batchId: unit.batchId,
              serializedUnitId: unit.serializedUnitId,
              enteredAt: unit.enteredAt,
              expiryDate: unit.expiryDate,
              manufacturingDate: unit.manufacturingDate,
              originFlowType: unit.originFlowType,
              originFlowId: unit.originFlowId,
              entryValueCents: unit.entryValueCents,
              quantity: line.quantity,
              moveId,
              handlingUnitId: null,
            })
            .execute();
        }
        await touchUnit(transaction, unit.id);
      }
      await appendEvent({
        eventType: stockMoveStartedEvent,
        data: { stockUnits: lines.length, handlingUnitId },
        objects: [{ type: 'StockMove', id: moveId }],
      });
      return { moveId };
    },
  });

  /**
   * Le dépôt : contrôles d'emplacement dans l'ordre du parcours (checkDeposit), un mouvement par unité,
   * réunis sous le déplacement (RG-STK-048) ; le support suit son contenu. Puis la fusion des jumelles
   * (RG-STK-008).
   */
  const completeStockMoveHandler = defineGestureHandler({
    definition: completeStockMove,
    async execute({ transaction, author, input }) {
      const move = await transaction
        .selectFrom('logistics.stockMove')
        .selectAll()
        .where('id', '=', input.moveId)
        .executeTakeFirst();
      if (move === undefined) throw new GestureRefusal('unknownStockMove');
      if (move.completedAt !== null) throw new GestureRefusal('stockMoveCompleted');
      let locationId: string;
      let intoHandlingUnitId: string | null = null;
      if (input.destination.kind === 'location') {
        locationId = input.destination.locationId;
      } else {
        const target = await transaction
          .selectFrom('logistics.handlingUnit')
          .select(['id', 'locationId', 'parentId'])
          .where('id', '=', input.destination.handlingUnitId)
          .executeTakeFirst();
        if (target?.locationId == null) throw new GestureRefusal('unknownHandlingUnit');
        // Un support se pose dans un autre sur un seul niveau (RG-STK-050).
        if (move.handlingUnitId !== null) {
          if (target.parentId !== null || target.id === move.handlingUnitId)
            throw new GestureRefusal('nestingTooDeep');
          const children = await transaction
            .selectFrom('logistics.handlingUnit')
            .select('id')
            .where('parentId', '=', move.handlingUnitId)
            .executeTakeFirst();
          if (children !== undefined) throw new GestureRefusal('nestingTooDeep');
        }
        locationId = target.locationId;
        intoHandlingUnitId = target.id;
      }
      const location = await transaction
        .selectFrom('logistics.location')
        .select(['id', 'siteId', 'active'])
        .where('id', '=', locationId)
        .executeTakeFirst();
      if (location?.active !== true) throw new GestureRefusal('unknownLocation');
      if (location.siteId !== move.siteId) throw new GestureRefusal('otherSite');
      const moving = await transaction
        .selectFrom('logistics.stockUnit')
        .selectAll()
        .where('moveId', '=', move.id)
        .execute();
      const movingSupports = move.handlingUnitId === null || intoHandlingUnitId !== null ? 0 : 1;
      await checkDeposit(
        transaction,
        location.id,
        moving.map((unit, index) => ({
          principalId: unit.principalId,
          itemId: unit.itemId,
          quantity: unit.quantity,
          qualityStateId: unit.qualityStateId,
          handlingUnits: index === 0 ? movingSupports : 0,
        })),
      );
      if (move.handlingUnitId !== null) {
        await transaction
          .updateTable('logistics.handlingUnit')
          .set((eb) => ({
            locationId: location.id,
            parentId: intoHandlingUnitId,
            version: eb('version', '+', 1),
          }))
          .where('id', '=', move.handlingUnitId)
          .execute();
        await transaction
          .updateTable('logistics.handlingUnit')
          .set({ locationId: location.id })
          .where('parentId', '=', move.handlingUnitId)
          .execute();
        await signalChange(transaction, {
          objectType: HANDLING_UNIT,
          objectId: move.handlingUnitId,
          version: 1,
        });
      }
      for (const unit of moving) {
        const handlingUnitId = move.handlingUnitId !== null ? unit.handlingUnitId : intoHandlingUnitId;
        await recordMovement(transaction, authorOf(author), {
          nature: 'move',
          stockUnitId: unit.id,
          principalId: unit.principalId,
          itemId: unit.itemId,
          siteId: unit.siteId,
          quantity: unit.quantity,
          fromLocationId: move.fromLocationId,
          toLocationId: location.id,
          fromHandlingUnitId: unit.handlingUnitId,
          toHandlingUnitId: handlingUnitId,
          groupId: move.id,
        });
        await transaction
          .updateTable('logistics.stockUnit')
          .set((eb) => ({
            locationId: location.id,
            handlingUnitId,
            moveId: null,
            version: eb('version', '+', 1),
          }))
          .where('id', '=', unit.id)
          .execute();
        await touchUnit(transaction, await mergeIfTwin(transaction, authorOf(author), unit.id));
      }
      await transaction
        .updateTable('logistics.stockMove')
        .set({ completedAt: sql`now()` })
        .where('id', '=', move.id)
        .execute();
      return { movements: moving.length };
    },
  });

  /**
   * Change l'état qualité, motif à l'appui, un mouvement par unité (RG-STK-012). Rend le déplacement
   * suggéré (RG-STK-014) et ce que l'opération rend non prélevable alors que c'est réservé (0.4 § 6).
   */
  const changeQualityStateHandler = defineGestureHandler({
    definition: changeQualityState,
    async execute({ transaction, author, input }) {
      await checkReason(transaction, input.reasonId, 'qualityChange', input.comment);
      const units = await transaction
        .selectFrom('logistics.stockUnit as unit')
        .selectAll('unit')
        .select(statusOf('unit').as('status'))
        .where('unit.id', 'in', input.stockUnitIds)
        .execute();
      if (units.length !== new Set(input.stockUnitIds).size) throw new GestureRefusal('unknownStockUnit');
      const principals = new Set(units.map((unit) => unit.principalId));
      if (principals.size !== 1) throw new GestureRefusal('samePrincipalRequired');
      const state = await transaction
        .selectFrom('logistics.qualityState')
        .select(['id', 'pickable', 'suggestedLocationType'])
        .where('id', '=', input.qualityStateId)
        .where('principalId', 'in', [...principals])
        .where('active', '=', true)
        .executeTakeFirst();
      if (state === undefined) throw new GestureRefusal('unknownQualityState');
      let reservedMadeUnpickable = 0;
      for (const unit of units) {
        refuseIfMoving(unit);
        if (unit.qualityStateId === state.id) continue;
        if (unit.status === 'reserved' && !state.pickable) reservedMadeUnpickable += 1;
        await recordMovement(transaction, authorOf(author), {
          nature: 'qualityChange',
          stockUnitId: unit.id,
          principalId: unit.principalId,
          itemId: unit.itemId,
          siteId: unit.siteId,
          quantity: unit.quantity,
          fromLocationId: unit.locationId,
          toLocationId: unit.locationId,
          fromQualityStateId: unit.qualityStateId,
          toQualityStateId: state.id,
          reasonId: input.reasonId,
          comment: input.comment,
        });
        await transaction
          .updateTable('logistics.stockUnit')
          .set((eb) => ({ qualityStateId: state.id, version: eb('version', '+', 1) }))
          .where('id', '=', unit.id)
          .execute();
        await touchUnit(transaction, await mergeIfTwin(transaction, authorOf(author), unit.id));
      }
      return {
        suggestedLocationType:
          state.suggestedLocationType === null ? null : locationTypeSchema.parse(state.suggestedLocationType),
        reservedMadeUnpickable,
      };
    },
  });

  /** Ajustement hors inventaire : jamais négatif, toujours motivé (RG-STK-007, 027). */
  const adjustStockQuantityHandler = defineGestureHandler({
    definition: adjustStockQuantity,
    async execute({ transaction, author, input }) {
      await checkReason(transaction, input.reasonId, 'quantityAdjustment', input.comment);
      const unit = await transaction
        .selectFrom('logistics.stockUnit')
        .selectAll()
        .where('id', '=', input.stockUnitId)
        .executeTakeFirst();
      if (unit === undefined) throw new GestureRefusal('unknownStockUnit');
      refuseIfMoving(unit);
      if (unit.serializedUnitId !== null && input.quantity > 1)
        throw new GestureRefusal('serializedQuantity');
      const delta = input.quantity - unit.quantity;
      if (delta === 0) return {};
      await recordMovement(transaction, authorOf(author), {
        nature: 'quantityAdjustment',
        stockUnitId: unit.id,
        principalId: unit.principalId,
        itemId: unit.itemId,
        siteId: unit.siteId,
        quantity: Math.abs(delta),
        direction: delta > 0 ? 1 : -1,
        fromLocationId: unit.locationId,
        toLocationId: unit.locationId,
        reasonId: input.reasonId,
        comment: input.comment,
      });
      // À zéro, l'unité cesse d'exister ; ses mouvements demeurent (RG-STK-006).
      if (input.quantity === 0)
        await transaction.deleteFrom('logistics.stockUnit').where('id', '=', unit.id).execute();
      else
        await transaction
          .updateTable('logistics.stockUnit')
          .set((eb) => ({ quantity: input.quantity, version: eb('version', '+', 1) }))
          .where('id', '=', unit.id)
          .execute();
      await touchUnit(transaction, unit.id);
      return {};
    },
  });

  /**
   * Corrige un mouvement par son inverse, motivé, rattaché à lui (RG-STK-023, 024) : un déplacement se
   * défait en ramenant l'unité, un changement d'état qualité en lui rendant l'ancien, un ajustement en
   * appliquant l'écart contraire. L'unité doit être restée telle que le mouvement l'a laissée.
   */
  const correctMovementHandler = defineGestureHandler({
    definition: correctMovement,
    async execute({ transaction, author, input }) {
      await checkReason(transaction, input.reasonId, 'correction', input.comment);
      const movement = await transaction
        .selectFrom('logistics.stockMovement')
        .selectAll()
        .where('id', '=', input.movementId)
        .executeTakeFirst();
      if (movement === undefined) throw new GestureRefusal('unknownMovement');
      if (!['move', 'qualityChange', 'quantityAdjustment'].includes(movement.nature))
        throw new GestureRefusal('movementNotCorrectable');
      const corrected = await transaction
        .selectFrom('logistics.stockMovement')
        .select('id')
        .where('correctsMovementId', '=', movement.id)
        .executeTakeFirst();
      if (corrected !== undefined) throw new GestureRefusal('alreadyCorrected');
      const unit = await transaction
        .selectFrom('logistics.stockUnit')
        .selectAll()
        .where('id', '=', movement.stockUnitId)
        .executeTakeFirst();
      if (unit?.moveId !== null) throw new GestureRefusal('stockMoved');
      const base = {
        nature: 'correction' as const,
        stockUnitId: unit.id,
        principalId: unit.principalId,
        itemId: unit.itemId,
        siteId: unit.siteId,
        reasonId: input.reasonId,
        comment: input.comment,
        correctsMovementId: movement.id,
      };
      let correctionId: string;
      if (movement.nature === 'move') {
        if (unit.locationId !== movement.toLocationId || movement.fromLocationId === null)
          throw new GestureRefusal('stockMoved');
        correctionId = await recordMovement(transaction, authorOf(author), {
          ...base,
          quantity: unit.quantity,
          fromLocationId: unit.locationId,
          toLocationId: movement.fromLocationId,
        });
        await transaction
          .updateTable('logistics.stockUnit')
          .set((eb) => ({
            locationId: movement.fromLocationId ?? unit.locationId,
            version: eb('version', '+', 1),
          }))
          .where('id', '=', unit.id)
          .execute();
      } else if (movement.nature === 'qualityChange') {
        if (unit.qualityStateId !== movement.toQualityStateId || movement.fromQualityStateId === null)
          throw new GestureRefusal('stockMoved');
        correctionId = await recordMovement(transaction, authorOf(author), {
          ...base,
          quantity: unit.quantity,
          fromLocationId: unit.locationId,
          toLocationId: unit.locationId,
          fromQualityStateId: unit.qualityStateId,
          toQualityStateId: movement.fromQualityStateId,
        });
        await transaction
          .updateTable('logistics.stockUnit')
          .set((eb) => ({
            qualityStateId: movement.fromQualityStateId ?? unit.qualityStateId,
            version: eb('version', '+', 1),
          }))
          .where('id', '=', unit.id)
          .execute();
      } else {
        const after = unit.quantity - movement.direction * movement.quantity;
        if (after < 0) throw new GestureRefusal('stockMoved');
        correctionId = await recordMovement(transaction, authorOf(author), {
          ...base,
          quantity: movement.quantity,
          direction: movement.direction === 1 ? -1 : 1,
          fromLocationId: unit.locationId,
          toLocationId: unit.locationId,
        });
        if (after === 0)
          await transaction.deleteFrom('logistics.stockUnit').where('id', '=', unit.id).execute();
        else
          await transaction
            .updateTable('logistics.stockUnit')
            .set((eb) => ({ quantity: after, version: eb('version', '+', 1) }))
            .where('id', '=', unit.id)
            .execute();
      }
      await touchUnit(transaction, unit.id);
      return { movementId: correctionId };
    },
  });

  /** Levée manuelle d'une réservation, motivée ; la demande est rendue dans l'événement (RG-STK-031). */
  const releaseReservationHandler = defineGestureHandler({
    definition: releaseReservation,
    async execute({ transaction, input, appendEvent }) {
      const reservation = await transaction
        .deleteFrom('logistics.stockReservation')
        .where('stockUnitId', '=', input.stockUnitId)
        .returning(['demandType', 'demandId'])
        .executeTakeFirst();
      if (reservation === undefined) throw new GestureRefusal('notReserved');
      await appendEvent({
        eventType: reservationReleasedEvent,
        data: { ...reservation, reason: input.reason },
        objects: [{ type: STOCK_UNIT, id: input.stockUnitId }],
      });
      await touchUnit(transaction, input.stockUnitId);
      return {};
    },
  });

  const holdImpactHandler = defineQueryHandler({
    definition: holdImpact,
    permissions: ['placeStockHold'],
    async execute({ db, input }) {
      if (!(await holdTargetExists(db, input.scope, input.targetId))) throw new QueryRefusal('invalidInput');
      const units = await coveredUnits(db, input.scope, input.targetId).execute();
      const demands = units.flatMap((unit) =>
        unit.demandType === null || unit.demandId === null
          ? []
          : [{ demandType: unit.demandType, demandId: unit.demandId }],
      );
      return {
        quantity: units.reduce((total, unit) => total + unit.quantity, 0),
        stockUnits: units.length,
        reservations: demands.length,
        demands,
      };
    },
  });

  /**
   * Pose un blocage motivé (RG-STK-034, 035). Les réservations du stock touché sont levées sans attendre
   * la préparation, et leurs demandes rendues pour être averties (RG-STK-037).
   */
  const placeStockHoldHandler = defineGestureHandler({
    definition: placeStockHold,
    async execute({ transaction, author, input, appendEvent }) {
      if (!(await holdTargetExists(transaction, input.scope, input.targetId)))
        throw new GestureRefusal('unknownHoldTarget');
      const units = await coveredUnits(transaction, input.scope, input.targetId).execute();
      const released = units.flatMap((unit) =>
        unit.demandType === null || unit.demandId === null
          ? []
          : [{ demandType: unit.demandType, demandId: unit.demandId }],
      );
      if (units.length > 0)
        await transaction
          .deleteFrom('logistics.stockReservation')
          .where(
            'stockUnitId',
            'in',
            units.map((unit) => unit.id),
          )
          .execute();
      const target = {
        stockUnit: { stockUnitId: input.targetId },
        batch: { batchId: input.targetId },
        serializedUnit: { serializedUnitId: input.targetId },
        location: { locationId: input.targetId },
        item: { itemId: input.targetId },
      }[input.scope];
      const { id: holdId } = await transaction
        .insertInto('logistics.stockHold')
        .values({
          scope: input.scope,
          ...target,
          reason: input.reason,
          allowsMove: input.allowsMove,
          plannedLiftOn: input.plannedLiftOn,
          placedBy: author.userId,
        })
        .returning('id')
        .executeTakeFirstOrThrow();
      await appendEvent({
        eventType: holdPlacedEvent,
        data: {
          scope: input.scope,
          targetId: input.targetId,
          reason: input.reason,
          allowsMove: input.allowsMove,
          releasedDemands: released,
        },
        objects: [{ type: STOCK_HOLD, id: holdId }],
      });
      for (const unit of units) await touchUnit(transaction, unit.id);
      return { holdId, releasedDemands: released };
    },
  });

  /** Levée d'un blocage, sous permission, motivée, tracée (RG-STK-038). */
  const liftStockHoldHandler = defineGestureHandler({
    definition: liftStockHold,
    async execute({ transaction, author, input, appendEvent }) {
      const hold = await transaction
        .selectFrom('logistics.stockHold')
        .select(['id', 'liftedAt'])
        .where('id', '=', input.holdId)
        .executeTakeFirst();
      if (hold === undefined) throw new GestureRefusal('unknownHold');
      if (hold.liftedAt !== null) throw new GestureRefusal('holdLifted');
      await transaction
        .updateTable('logistics.stockHold')
        .set({ liftedAt: sql`now()`, liftedBy: author.userId, liftReason: input.reason })
        .where('id', '=', hold.id)
        .execute();
      await appendEvent({
        eventType: holdLiftedEvent,
        data: { reason: input.reason },
        objects: [{ type: STOCK_HOLD, id: hold.id }],
      });
      await signalChange(transaction, { objectType: STOCK_HOLD, objectId: hold.id, version: 1 });
      return {};
    },
  });

  return {
    gestures: [
      createHandlingUnitHandler,
      startStockMoveHandler,
      completeStockMoveHandler,
      changeQualityStateHandler,
      adjustStockQuantityHandler,
      correctMovementHandler,
      releaseReservationHandler,
      placeStockHoldHandler,
      liftStockHoldHandler,
    ],
    queries: [holdImpactHandler],
  };
}

/**
 * Réserve une unité libre pour une demande — ce qu'appellent les commandes (3.1, 3.2). Une unité ne
 * porte qu'une réservation à la fois (RG-STK-029) ; une réservation ne déplace rien (RG-STK-032).
 */
export async function reserveStock(
  transaction: DatabaseTransaction,
  stockUnitId: string,
  demand: { readonly demandType: string; readonly demandId: string },
): Promise<void> {
  const unit = await transaction
    .selectFrom('logistics.stockUnit as unit')
    .select(['unit.id', statusOf('unit').as('status')])
    .where('unit.id', '=', stockUnitId)
    .executeTakeFirst();
  if (unit === undefined) throw new GestureRefusal('unknownStockUnit');
  if (unit.status !== 'free') throw new GestureRefusal('stockUnavailable');
  await transaction
    .insertInto('logistics.stockReservation')
    .values({ stockUnitId, ...demand })
    .execute();
  await touchUnit(transaction, stockUnitId);
}

/** L'annulation d'une demande lève ses réservations (RG-STK-033). */
export async function releaseDemand(
  transaction: DatabaseTransaction,
  demand: { readonly demandType: string; readonly demandId: string },
): Promise<number> {
  const released = await transaction
    .deleteFrom('logistics.stockReservation')
    .where('demandType', '=', demand.demandType)
    .where('demandId', '=', demand.demandId)
    .returning('stockUnitId')
    .execute();
  for (const unit of released) await touchUnit(transaction, unit.stockUnitId);
  return released.length;
}
