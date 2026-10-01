import type { MovementNature } from '@cairn/contrat';
import { sql, type Kysely } from 'kysely';
import type { DatabaseTransaction, DB } from '../../socle/database/index.js';
import { GestureRefusal } from '../../socle/gesture/index.js';
import { signalChange } from '../../socle/signal/index.js';

export const STOCK_UNIT = 'StockUnit';
export const HANDLING_UNIT = 'HandlingUnit';
export const SERIALIZED_UNIT = 'SerializedUnit';
export const STOCK_HOLD = 'StockHold';

/** Le statut de disponibilité d'une unité, calculé par la base à partir des faits (RG-STK-016). */
export const statusOf = (alias: string) => sql<string>`logistics.stock_unit_status(${sql.table(alias)})`;

/** Qui fait le mouvement, et d'où (RG-STK-021). */
export interface MovementAuthor {
  readonly userId: string | null;
  readonly workstationId: string | null;
}

export interface NewMovement {
  readonly nature: MovementNature;
  readonly stockUnitId: string;
  readonly principalId: string;
  readonly itemId: string;
  readonly siteId: string;
  readonly quantity: number;
  readonly direction?: -1 | 0 | 1;
  readonly fromLocationId?: string | null;
  readonly toLocationId?: string | null;
  readonly fromHandlingUnitId?: string | null;
  readonly toHandlingUnitId?: string | null;
  readonly fromQualityStateId?: string | null;
  readonly toQualityStateId?: string | null;
  readonly reasonId?: string | null;
  readonly comment?: string | null;
  readonly correctsMovementId?: string | null;
  readonly groupId?: string | null;
  readonly flowType?: string | null;
  readonly flowId?: string | null;
}

/** Enregistre un mouvement, immuable (RG-STK-020 à 022), et le signale aux écrans ouverts. */
export async function recordMovement(
  transaction: DatabaseTransaction,
  author: MovementAuthor,
  movement: NewMovement,
): Promise<string> {
  const { id } = await transaction
    .insertInto('logistics.stockMovement')
    .values({
      nature: movement.nature,
      stockUnitId: movement.stockUnitId,
      // Lu sur l'unité au moment du mouvement : on enregistre toujours avant de supprimer une unité.
      serializedUnitId: sql<
        string | null
      >`(select serialized_unit_id from logistics.stock_unit where id = ${movement.stockUnitId})`,
      principalId: movement.principalId,
      itemId: movement.itemId,
      siteId: movement.siteId,
      quantity: movement.quantity,
      direction: movement.direction ?? 0,
      fromLocationId: movement.fromLocationId ?? null,
      toLocationId: movement.toLocationId ?? null,
      fromHandlingUnitId: movement.fromHandlingUnitId ?? null,
      toHandlingUnitId: movement.toHandlingUnitId ?? null,
      fromQualityStateId: movement.fromQualityStateId ?? null,
      toQualityStateId: movement.toQualityStateId ?? null,
      reasonId: movement.reasonId ?? null,
      comment: movement.comment ?? null,
      correctsMovementId: movement.correctsMovementId ?? null,
      groupId: movement.groupId ?? null,
      flowType: movement.flowType ?? null,
      flowId: movement.flowId ?? null,
      authorUserId: author.userId,
      workstationId: author.workstationId,
    })
    .returning('id')
    .executeTakeFirstOrThrow();
  await signalChange(transaction, { objectType: 'Item', objectId: movement.itemId, version: 1 });
  return id;
}

/** Un motif de la nature attendue, et son commentaire s'il l'exige (RG-STK-023, 026). */
export async function checkReason(
  transaction: Kysely<DB>,
  reasonId: string,
  nature: string,
  comment: string | null,
): Promise<void> {
  const reason = await transaction
    .selectFrom('logistics.movementReason')
    .select(['commentRequired'])
    .where('id', '=', reasonId)
    .where('nature', '=', nature)
    .where('active', '=', true)
    .executeTakeFirst();
  if (reason === undefined) throw new GestureRefusal('unknownReason');
  if (reason.commentRequired && (comment === null || comment.trim() === ''))
    throw new GestureRefusal('commentRequired');
}

/** Ce qu'un dépôt amène à un emplacement : de quoi contrôler ses contraintes. */
export interface Arrival {
  readonly principalId: string;
  readonly itemId: string;
  readonly quantity: number;
  readonly qualityStateId: string;
  /** Supports de premier niveau qui arrivent avec le stock. */
  readonly handlingUnits?: number;
}

const CUBIC_MM_PER_CM3 = 1000;

/**
 * Contrôles d'un dépôt, dans l'ordre du parcours de rangement (0.3 § 6) : capacité, en nommant celle
 * qui serait dépassée et la marge restante (RG-EMP-024) ; état qualité accepté (RG-EMP-026) ;
 * cohabitation de la zone (RG-ORG-011). Un emplacement virtuel n'a pas de capacité (RG-EMP-045).
 */
export async function checkDeposit(
  transaction: Kysely<DB>,
  locationId: string,
  arrivals: readonly Arrival[],
): Promise<void> {
  const location = await transaction
    .selectFrom('logistics.location as location')
    .innerJoin('logistics.zone as zone', 'zone.id', 'location.zoneId')
    .leftJoin('logistics.principal as reserved', 'reserved.id', 'zone.principalId')
    .select([
      'location.id',
      'location.maxWeightGrams',
      'location.maxVolumeCm3',
      'location.supportCapacity',
      'location.acceptedQualityCodes',
      'zone.cohabitation',
      'zone.principalId',
      'reserved.code as reservedCode',
    ])
    .where('location.id', '=', locationId)
    .executeTakeFirstOrThrow();
  // Poids et volume d'une unité de base : ceux du niveau de base de sa référence, s'ils sont connus.
  const unitMeasures = async (itemId: string) =>
    transaction
      .selectFrom('logistics.packagingLevel')
      .select(['grossWeightGrams', 'lengthMm', 'widthMm', 'heightMm'])
      .where('itemId', '=', itemId)
      .where('rank', '=', 0)
      .executeTakeFirst();
  const present = await transaction
    .selectFrom('logistics.stockUnit')
    .select(['itemId', 'quantity', 'handlingUnitId'])
    .where('locationId', '=', locationId)
    .execute();
  const weigh = async (entries: readonly { itemId: string; quantity: number }[]) => {
    let grams = 0;
    let cubic = 0;
    for (const entry of entries) {
      const measures = await unitMeasures(entry.itemId);
      grams += (measures?.grossWeightGrams ?? 0) * entry.quantity;
      if (measures?.lengthMm != null && measures.widthMm != null && measures.heightMm != null)
        cubic +=
          (measures.lengthMm * measures.widthMm * measures.heightMm * entry.quantity) / CUBIC_MM_PER_CM3;
    }
    return { grams, cubic: Math.ceil(cubic) };
  };
  const before = await weigh(present);
  const incoming = await weigh(arrivals);
  if (location.maxWeightGrams !== null && before.grams + incoming.grams > location.maxWeightGrams)
    throw new GestureRefusal('capacityWeightExceeded', {
      remaining: Math.max(0, location.maxWeightGrams - before.grams),
    });
  if (location.maxVolumeCm3 !== null && before.cubic + incoming.cubic > location.maxVolumeCm3)
    throw new GestureRefusal('capacityVolumeExceeded', {
      remaining: Math.max(0, location.maxVolumeCm3 - before.cubic),
    });
  if (location.supportCapacity !== null) {
    const supportsPresent = new Set(present.map((unit) => unit.handlingUnitId).filter((id) => id !== null))
      .size;
    const supportsIncoming = arrivals.reduce((count, arrival) => count + (arrival.handlingUnits ?? 0), 0);
    if (supportsPresent + supportsIncoming > location.supportCapacity)
      throw new GestureRefusal('capacitySupportsExceeded', {
        remaining: Math.max(0, location.supportCapacity - supportsPresent),
      });
  }
  if (location.acceptedQualityCodes.length > 0) {
    for (const arrival of arrivals) {
      const state = await transaction
        .selectFrom('logistics.qualityState')
        .select('code')
        .where('id', '=', arrival.qualityStateId)
        .executeTakeFirstOrThrow();
      if (!location.acceptedQualityCodes.includes(state.code))
        throw new GestureRefusal('qualityNotAccepted', {
          state: state.code,
          accepted: location.acceptedQualityCodes.join(', '),
        });
    }
  }
  if (
    location.cohabitation === 'single' &&
    arrivals.some((arrival) => arrival.principalId !== location.principalId)
  )
    throw new GestureRefusal('zoneReserved', { name: location.reservedCode ?? '' });
}

/**
 * Fusionne l'unité avec sa jumelle à son emplacement, si toutes deux sont libres et identiques sur
 * leurs axes qualifiants (RG-STK-008) ; la fusion est un mouvement. La date d'entrée retenue est la
 * plus ancienne : un premier entré reste le premier sorti.
 */
export async function mergeIfTwin(
  transaction: DatabaseTransaction,
  author: MovementAuthor,
  stockUnitId: string,
): Promise<string> {
  const unit = await transaction
    .selectFrom('logistics.stockUnit as unit')
    .selectAll('unit')
    .select(statusOf('unit').as('status'))
    .where('unit.id', '=', stockUnitId)
    .executeTakeFirst();
  if (unit?.status !== 'free' || unit.serializedUnitId !== null) return stockUnitId;
  const same = (value: string | null) => (value === null ? sql<boolean>`is null` : sql<boolean>`= ${value}`);
  const twin = await sql<{ id: string; enteredAt: Date }>`
    select twin.id, twin.entered_at as "enteredAt"
    from logistics.stock_unit twin
    where twin.id <> ${unit.id} and twin.location_id = ${unit.locationId} and twin.item_id = ${unit.itemId}
      and twin.quality_state_id = ${unit.qualityStateId} and twin.serialized_unit_id is null
      and twin.batch_id ${same(unit.batchId)} and twin.handling_unit_id ${same(unit.handlingUnitId)}
      and twin.expiry_date ${same(unit.expiryDate)} and twin.manufacturing_date ${same(unit.manufacturingDate)}
      and logistics.stock_unit_status(twin) = 'free'
    order by twin.entered_at
    limit 1
  `.execute(transaction);
  const kept = twin.rows[0];
  if (kept === undefined) return stockUnitId;
  await transaction
    .updateTable('logistics.stockUnit')
    .set((eb) => ({
      quantity: eb('quantity', '+', unit.quantity),
      enteredAt: sql`least(entered_at, ${unit.enteredAt})`,
      version: eb('version', '+', 1),
    }))
    .where('id', '=', kept.id)
    .execute();
  await transaction.deleteFrom('logistics.stockUnit').where('id', '=', unit.id).execute();
  await recordMovement(transaction, author, {
    nature: 'merge',
    stockUnitId: unit.id,
    principalId: unit.principalId,
    itemId: unit.itemId,
    siteId: unit.siteId,
    quantity: unit.quantity,
    fromLocationId: unit.locationId,
    toLocationId: unit.locationId,
    groupId: kept.id,
  });
  return kept.id;
}

/** L'état qualité par défaut du donneur d'ordre, appliqué à toute entrée qui n'en précise pas (RG-STK-011). */
export async function defaultQualityState(transaction: Kysely<DB>, principalId: string): Promise<string> {
  const state = await transaction
    .selectFrom('logistics.qualityState')
    .select('id')
    .where('principalId', '=', principalId)
    .where('isDefault', '=', true)
    .executeTakeFirst();
  if (state === undefined) throw new GestureRefusal('unknownQualityState');
  return state.id;
}

export interface StockEntry {
  readonly itemId: string;
  readonly locationId: string;
  readonly quantity: number;
  readonly qualityStateId?: string | null;
  readonly batchNumber?: string | null;
  readonly serialNumber?: string | null;
  readonly handlingUnitId?: string | null;
  readonly expiryDate?: string | null;
  readonly manufacturingDate?: string | null;
  readonly entryValueCents?: number | null;
  readonly flowType?: string | null;
  readonly flowId?: string | null;
}

/**
 * Fait entrer du stock — ce qu'appellent les flux entrants (1.1). Contrôle le dépôt, crée l'unité et son
 * mouvement d'entrée, puis la fusionne avec sa jumelle. Un lot est exigé en gestion lot (RG-STK-005) ;
 * un numéro de série déjà en stock est refusé avec sa localisation, un numéro connu mais sorti
 * rattache l'entrée à l'objet existant (RG-REF-015 à 017 ; 0.2 § 5).
 */
export async function enterStock(
  transaction: DatabaseTransaction,
  author: MovementAuthor,
  entry: StockEntry,
): Promise<{ stockUnitId: string; serializedUnitId: string | null; passages: number }> {
  const item = await transaction
    .selectFrom('logistics.item')
    .select(['id', 'principalId', 'trackingMode', 'serialBatchTracking', 'state'])
    .where('id', '=', entry.itemId)
    .executeTakeFirst();
  if (item === undefined) throw new GestureRefusal('unknownItem');
  const location = await transaction
    .selectFrom('logistics.location')
    .select(['id', 'siteId', 'active'])
    .where('id', '=', entry.locationId)
    .executeTakeFirst();
  if (location?.active !== true) throw new GestureRefusal('unknownLocation');
  const serial = item.trackingMode === 'serial';
  const batched = item.trackingMode === 'batch' || (serial && item.serialBatchTracking);
  if (serial && (entry.serialNumber == null || entry.quantity !== 1))
    throw new GestureRefusal('serialRequired');
  if (batched && (entry.batchNumber == null || entry.batchNumber === ''))
    throw new GestureRefusal('batchRequired');
  const qualityStateId = entry.qualityStateId ?? (await defaultQualityState(transaction, item.principalId));
  await checkDeposit(transaction, location.id, [
    { principalId: item.principalId, itemId: item.id, quantity: entry.quantity, qualityStateId },
  ]);
  let batchId: string | null = null;
  if (batched && entry.batchNumber != null) {
    batchId =
      (
        await transaction
          .insertInto('logistics.batch')
          .values({ itemId: item.id, number: entry.batchNumber })
          .onConflict((conflict) =>
            conflict.columns(['itemId', 'number']).doUpdateSet({ number: entry.batchNumber ?? '' }),
          )
          .returning('id')
          .executeTakeFirst()
      )?.id ?? null;
  }
  let serializedUnitId: string | null = null;
  let passages = 0;
  if (serial && entry.serialNumber != null) {
    const known = await transaction
      .selectFrom('logistics.serializedUnit')
      .select('id')
      .where('principalId', '=', item.principalId)
      .where('serialNumber', '=', entry.serialNumber)
      .executeTakeFirst();
    if (known !== undefined) {
      const inStock = await transaction
        .selectFrom('logistics.stockUnit as unit')
        .innerJoin('logistics.location as location', 'location.id', 'unit.locationId')
        .select('location.address')
        .where('unit.serializedUnitId', '=', known.id)
        .executeTakeFirst();
      if (inStock !== undefined) throw new GestureRefusal('serialInStock', { name: inStock.address });
      serializedUnitId = known.id;
      const { count } = await transaction
        .selectFrom('logistics.stockMovement')
        .select(sql<number>`count(*)::int`.as('count'))
        .where('nature', '=', 'entry')
        .where('serializedUnitId', '=', known.id)
        .executeTakeFirstOrThrow();
      passages = count;
    } else {
      serializedUnitId = (
        await transaction
          .insertInto('logistics.serializedUnit')
          .values({ principalId: item.principalId, itemId: item.id, serialNumber: entry.serialNumber })
          .returning('id')
          .executeTakeFirstOrThrow()
      ).id;
    }
  }
  const { id: stockUnitId } = await transaction
    .insertInto('logistics.stockUnit')
    .values({
      principalId: item.principalId,
      itemId: item.id,
      siteId: location.siteId,
      locationId: location.id,
      quantity: entry.quantity,
      qualityStateId,
      batchId,
      serializedUnitId,
      handlingUnitId: entry.handlingUnitId ?? null,
      expiryDate: entry.expiryDate ?? null,
      manufacturingDate: entry.manufacturingDate ?? null,
      entryValueCents: entry.entryValueCents ?? null,
      originFlowType: entry.flowType ?? null,
      originFlowId: entry.flowId ?? null,
    })
    .returning('id')
    .executeTakeFirstOrThrow();
  await recordMovement(transaction, author, {
    nature: 'entry',
    stockUnitId,
    principalId: item.principalId,
    itemId: item.id,
    siteId: location.siteId,
    quantity: entry.quantity,
    toLocationId: location.id,
    toHandlingUnitId: entry.handlingUnitId ?? null,
    toQualityStateId: qualityStateId,
    flowType: entry.flowType ?? null,
    flowId: entry.flowId ?? null,
  });
  return { stockUnitId: await mergeIfTwin(transaction, author, stockUnitId), serializedUnitId, passages };
}

/** Une unité qui bouge déjà ne se touche pas (RG-STK-018). */
export function refuseIfMoving(unit: { readonly moveId: string | null }): void {
  if (unit.moveId !== null) throw new GestureRefusal('stockMoving');
}

/** Signale une unité de stock modifiée. */
export const touchUnit = (transaction: DatabaseTransaction, stockUnitId: string) =>
  signalChange(transaction, { objectType: STOCK_UNIT, objectId: stockUnitId, version: 1 });
