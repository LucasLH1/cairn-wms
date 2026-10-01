import {
  availabilityStatusSchema,
  getHandlingUnit,
  getSerializedUnit,
  getSnapshot,
  holdScopeSchema,
  itemStock,
  listSnapshots,
  listStockHolds,
  movementNatureSchema,
  stockAt,
  type StockMovement,
  type StockUnit,
} from '@cairn/contrat';
import { sql, type Kysely } from 'kysely';
import type { DB } from '../../socle/database/index.js';
import { canSeeSite } from '../../socle/permission/index.js';
import { defineQueryHandler, QueryRefusal } from '../../socle/query/index.js';
import { canSeePrincipal, visiblePrincipalIds } from '../organization/index.js';
import { statusOf } from './engine.js';

/** Les unités de stock, avec ce qui les qualifie et leur statut calculé. */
function stockUnits(db: Kysely<DB>) {
  return db
    .selectFrom('logistics.stockUnit as unit')
    .innerJoin('logistics.item as item', 'item.id', 'unit.itemId')
    .innerJoin('logistics.principal as principal', 'principal.id', 'unit.principalId')
    .innerJoin('logistics.location as location', 'location.id', 'unit.locationId')
    .innerJoin('logistics.qualityState as quality', 'quality.id', 'unit.qualityStateId')
    .leftJoin('logistics.batch as batch', 'batch.id', 'unit.batchId')
    .leftJoin('logistics.serializedUnit as serial', 'serial.id', 'unit.serializedUnitId')
    .leftJoin('logistics.handlingUnit as support', 'support.id', 'unit.handlingUnitId')
    .select([
      'unit.id',
      'unit.itemId',
      'item.code as itemCode',
      'item.shortLabel as itemLabel',
      'principal.code as principalCode',
      'unit.principalId',
      'unit.locationId',
      'location.address',
      'unit.quantity',
      'unit.qualityStateId',
      'quality.label as qualityLabel',
      'quality.pickable',
      statusOf('unit').as('status'),
      'unit.batchId',
      'batch.number as batchNumber',
      'unit.serializedUnitId',
      'serial.serialNumber',
      'unit.handlingUnitId',
      'support.code as handlingUnitCode',
      'unit.enteredAt',
      'unit.expiryDate',
    ]);
}

type UnitRow = Awaited<ReturnType<ReturnType<typeof stockUnits>['execute']>>[number];

const toStockUnit = (row: UnitRow): StockUnit => ({
  id: row.id,
  itemId: row.itemId,
  itemCode: row.itemCode,
  itemLabel: row.itemLabel,
  principalCode: row.principalCode,
  locationId: row.locationId,
  address: row.address,
  quantity: row.quantity,
  qualityStateId: row.qualityStateId,
  qualityLabel: row.qualityLabel,
  status: availabilityStatusSchema.parse(row.status),
  batchId: row.batchId,
  batchNumber: row.batchNumber,
  serializedUnitId: row.serializedUnitId,
  serialNumber: row.serialNumber,
  handlingUnitId: row.handlingUnitId,
  handlingUnitCode: row.handlingUnitCode,
  enteredAt: row.enteredAt.toISOString(),
  expiryDate: row.expiryDate,
});

/** L'historique des mouvements, le plus récent d'abord, chacun avec ce qui l'a corrigé (RG-STK-024). */
function movements(db: Kysely<DB>) {
  return db
    .selectFrom('logistics.stockMovement as movement')
    .leftJoin('logistics.location as fromLocation', 'fromLocation.id', 'movement.fromLocationId')
    .leftJoin('logistics.location as toLocation', 'toLocation.id', 'movement.toLocationId')
    .leftJoin('logistics.qualityState as fromQuality', 'fromQuality.id', 'movement.fromQualityStateId')
    .leftJoin('logistics.qualityState as toQuality', 'toQuality.id', 'movement.toQualityStateId')
    .leftJoin('logistics.movementReason as reason', 'reason.id', 'movement.reasonId')
    .leftJoin('foundation.user as author', 'author.id', 'movement.authorUserId')
    .select([
      'movement.id',
      'movement.nature',
      'movement.stockUnitId',
      'movement.quantity',
      'movement.direction',
      'fromLocation.address as fromAddress',
      'toLocation.address as toAddress',
      'fromQuality.label as fromQuality',
      'toQuality.label as toQuality',
      'reason.label as reason',
      'movement.comment',
      'movement.correctsMovementId',
      sql<string | null>`(select correction.id from logistics.stock_movement correction
        where correction.corrects_movement_id = movement.id)`.as('correctedBy'),
      'author.displayName as author',
      'movement.occurredAt',
    ])
    .orderBy('movement.occurredAt', 'desc')
    .orderBy('movement.id', 'desc');
}

type MovementRow = Awaited<ReturnType<ReturnType<typeof movements>['execute']>>[number];

const toMovement = (row: MovementRow): StockMovement => ({
  ...row,
  nature: movementNatureSchema.parse(row.nature),
  occurredAt: row.occurredAt.toISOString(),
});

/** Visible : le site et le donneur d'ordre, selon le périmètre de l'utilisateur (RG-ORG-017, RG-SUR-020). */
async function visibleFilter(db: Kysely<DB>, userId: string) {
  const principals = await visiblePrincipalIds(db, userId);
  return (principalId: string) => principals === null || principals.includes(principalId);
}

/**
 * Le stock d'une référence sur un site : le tableau croisé état qualité × emplacement, chaque case avec
 * ses quantités totale, libre, réservée, bloquée et en mouvement (RG-STK-019 ; 0.4 § 6), ses unités et
 * ses mouvements.
 */
export const itemStockHandler = defineQueryHandler({
  definition: itemStock,
  async execute({ db, userId, input }) {
    const item = await db
      .selectFrom('logistics.item')
      .select(['id', 'code', 'shortLabel', 'principalId'])
      .where('id', '=', input.itemId)
      .executeTakeFirst();
    if (
      item === undefined ||
      !(await canSeePrincipal(db, userId, item.principalId)) ||
      !(await canSeeSite(db, userId, input.siteId))
    )
      throw new QueryRefusal('outOfScope');
    const rows = await stockUnits(db)
      .where('unit.itemId', '=', item.id)
      .where('unit.siteId', '=', input.siteId)
      .orderBy('location.traversalRank')
      .execute();
    const cells = new Map<string, ReturnType<typeof emptyCell>>();
    function emptyCell(row: UnitRow) {
      return {
        qualityStateId: row.qualityStateId,
        qualityLabel: row.qualityLabel,
        pickable: row.pickable,
        locationId: row.locationId,
        address: row.address,
        total: 0,
        free: 0,
        reserved: 0,
        blocked: 0,
        moving: 0,
      };
    }
    for (const row of rows) {
      const key = `${row.qualityStateId}|${row.locationId}`;
      const cell = cells.get(key) ?? emptyCell(row);
      cell.total += row.quantity;
      cell[availabilityStatusSchema.parse(row.status)] += row.quantity;
      cells.set(key, cell);
    }
    const history = await movements(db)
      .where('movement.itemId', '=', item.id)
      .where('movement.siteId', '=', input.siteId)
      .limit(200)
      .execute();
    return {
      itemCode: item.code,
      itemLabel: item.shortLabel,
      principalId: item.principalId,
      cells: [...cells.values()],
      stockUnits: rows.map(toStockUnit),
      movements: history.map(toMovement),
    };
  },
});

/** Le stock d'un emplacement ou d'un support : ce qu'un déplacement peut prendre (0.4 § 6). */
export const stockAtHandler = defineQueryHandler({
  definition: stockAt,
  async execute({ db, userId, input }) {
    const visible = await visibleFilter(db, userId);
    const rows = await (
      input.kind === 'location'
        ? stockUnits(db).where('unit.locationId', '=', input.locationId)
        : stockUnits(db).where((eb) =>
            eb.or([
              eb('unit.handlingUnitId', '=', input.handlingUnitId),
              eb(
                'unit.handlingUnitId',
                'in',
                eb
                  .selectFrom('logistics.handlingUnit')
                  .select('id')
                  .where('parentId', '=', input.handlingUnitId),
              ),
            ]),
          )
    )
      .orderBy('item.code')
      .execute();
    // Sur un emplacement partagé, seul ce qui relève du périmètre s'affiche (RG-SUR-066).
    return { stockUnits: rows.filter((row) => visible(row.principalId)).map(toStockUnit) };
  },
});

/** Fiche d'un support : contenu, localisation, type, consigne (0.4 § 6). */
export const getHandlingUnitHandler = defineQueryHandler({
  definition: getHandlingUnit,
  async execute({ db, userId, input }) {
    const support = await db
      .selectFrom('logistics.handlingUnit as support')
      .innerJoin('logistics.handlingUnitType as type', 'type.id', 'support.typeId')
      .innerJoin('foundation.site as site', 'site.id', 'support.siteId')
      .leftJoin('logistics.location as location', 'location.id', 'support.locationId')
      .leftJoin('logistics.handlingUnit as parent', 'parent.id', 'support.parentId')
      .leftJoin('logistics.party as owner', 'owner.id', 'support.ownerPartyId')
      .select([
        'support.id',
        'support.code',
        'type.label as typeLabel',
        'type.returnable',
        'owner.name as ownerName',
        'support.siteId',
        'site.code as siteCode',
        'support.locationId',
        'location.address',
        'parent.code as parentCode',
        'support.active',
      ])
      .where('support.id', '=', input.handlingUnitId)
      .executeTakeFirst();
    if (support === undefined || !(await canSeeSite(db, userId, support.siteId)))
      throw new QueryRefusal('outOfScope');
    const children = await db
      .selectFrom('logistics.handlingUnit')
      .select(['id', 'code'])
      .where('parentId', '=', support.id)
      .orderBy('code')
      .execute();
    const visible = await visibleFilter(db, userId);
    const rows = await stockUnits(db)
      .where((eb) =>
        eb.or([
          eb('unit.handlingUnitId', '=', support.id),
          children.length === 0
            ? eb.val(false)
            : eb(
                'unit.handlingUnitId',
                'in',
                children.map((child) => child.id),
              ),
        ]),
      )
      .orderBy('item.code')
      .execute();
    // Le schéma de sortie ne retient que ce que le contrat déclare : le site ne part pas.
    return {
      handlingUnit: {
        ...support,
        children,
        stockUnits: rows.filter((row) => visible(row.principalId)).map(toStockUnit),
      },
    };
  },
});

/** Fiche d'un objet sérialisé : où il est, ou qu'il n'est plus en stock, et tous ses passages (RG-REF-016, 017). */
export const getSerializedUnitHandler = defineQueryHandler({
  definition: getSerializedUnit,
  async execute({ db, userId, input }) {
    const serial = await db
      .selectFrom('logistics.serializedUnit as serial')
      .innerJoin('logistics.item as item', 'item.id', 'serial.itemId')
      .innerJoin('logistics.principal as principal', 'principal.id', 'serial.principalId')
      .select([
        'serial.id',
        'serial.serialNumber',
        'serial.itemId',
        'item.code as itemCode',
        'item.shortLabel as itemLabel',
        'serial.principalId',
        'principal.code as principalCode',
        'serial.warrantyEndDate',
      ])
      .where('serial.id', '=', input.serializedUnitId)
      .executeTakeFirst();
    if (serial === undefined || !(await canSeePrincipal(db, userId, serial.principalId)))
      throw new QueryRefusal('outOfScope');
    const [current, history] = await Promise.all([
      stockUnits(db).where('unit.serializedUnitId', '=', serial.id).executeTakeFirst(),
      movements(db).where('movement.serializedUnitId', '=', serial.id).execute(),
    ]);
    return {
      serializedUnit: {
        ...serial,
        passages: history.filter((movement) => movement.nature === 'entry').length,
        stockUnit: current === undefined ? null : toStockUnit(current),
        movements: history.map(toMovement),
      },
    };
  },
});

/** Blocages en cours sur un site, et la quantité qu'ils retiennent. */
export const listStockHoldsHandler = defineQueryHandler({
  definition: listStockHolds,
  async execute({ db, userId, input }) {
    if (!(await canSeeSite(db, userId, input.siteId))) throw new QueryRefusal('outOfScope');
    const holds = await sql<{
      id: string;
      scope: string;
      target: string;
      reason: string;
      origin: string;
      allowsMove: boolean;
      plannedLiftOn: string | null;
      placedBy: string | null;
      placedAt: Date;
      quantity: number;
    }>`
      select hold.id, hold.scope, hold.reason, hold.origin, hold.allows_move as "allowsMove",
        hold.planned_lift_on::text as "plannedLiftOn", author.display_name as "placedBy", hold.placed_at as "placedAt",
        coalesce(location.address, item.code, batch.number, serial.serial_number, unit_item.code || ' · ' || unit_location.address, '') as target,
        coalesce((select sum(unit.quantity) from logistics.stock_unit unit
          where unit.site_id = ${input.siteId} and (unit.id = hold.stock_unit_id or unit.batch_id = hold.batch_id
            or unit.serialized_unit_id = hold.serialized_unit_id or unit.location_id = hold.location_id
            or unit.item_id = hold.item_id)), 0)::int as quantity
      from logistics.stock_hold hold
      left join foundation."user" author on author.id = hold.placed_by
      left join logistics.location location on location.id = hold.location_id
      left join logistics.item item on item.id = hold.item_id
      left join logistics.batch batch on batch.id = hold.batch_id
      left join logistics.serialized_unit serial on serial.id = hold.serialized_unit_id
      left join logistics.stock_unit held_unit on held_unit.id = hold.stock_unit_id
      left join logistics.item unit_item on unit_item.id = held_unit.item_id
      left join logistics.location unit_location on unit_location.id = held_unit.location_id
      where hold.lifted_at is null
        and (location.site_id = ${input.siteId} or held_unit.site_id = ${input.siteId}
          or exists (select 1 from logistics.stock_unit unit where unit.site_id = ${input.siteId}
            and (unit.item_id = hold.item_id or unit.batch_id = hold.batch_id
              or unit.serialized_unit_id = hold.serialized_unit_id)))
      order by hold.placed_at desc
    `.execute(db);
    return {
      holds: holds.rows.map((hold) => ({
        ...hold,
        scope: holdScopeSchema.parse(hold.scope),
        origin:
          hold.origin === 'expiry'
            ? ('expiry' as const)
            : hold.origin === 'rule'
              ? ('rule' as const)
              : ('manual' as const),
        placedAt: hold.placedAt.toISOString(),
      })),
    };
  },
});

/** Jours couverts par la liste des photos : un mois. */
const SNAPSHOT_DAYS = 31;

/** Les photos d'un site, jour par jour : complète, en échec ou absente — jamais un silence (RG-STK-061). */
export const listSnapshotsHandler = defineQueryHandler({
  definition: listSnapshots,
  async execute({ db, userId, input }) {
    if (!(await canSeeSite(db, userId, input.siteId))) throw new QueryRefusal('outOfScope');
    const site = await db
      .selectFrom('foundation.site')
      .select(['timeZone', 'snapshotTime'])
      .where('id', '=', input.siteId)
      .executeTakeFirstOrThrow();
    const rows = await sql<{
      date: string;
      snapshotId: string | null;
      state: string | null;
      takenAt: Date | null;
      lines: number;
    }>`
      select day::date::text as date, snapshot.id as "snapshotId", snapshot.state, snapshot.taken_at as "takenAt",
        (select count(*)::int from logistics.daily_stock_snapshot_line line where line.snapshot_id = snapshot.id) as lines
      from generate_series((now() at time zone ${site.timeZone})::date - ${SNAPSHOT_DAYS - 1}::int,
        (now() at time zone ${site.timeZone})::date, interval '1 day') as day
      left join logistics.daily_stock_snapshot snapshot
        on snapshot.site_id = ${input.siteId} and snapshot.snapshot_date = day::date
      order by day desc
    `.execute(db);
    return {
      snapshotTime: site.snapshotTime.slice(0, 5),
      days: rows.rows.map((row) => ({
        date: row.date,
        snapshotId: row.snapshotId,
        state:
          row.state === 'complete'
            ? ('complete' as const)
            : row.state === 'failed'
              ? ('failed' as const)
              : ('absent' as const),
        takenAt: row.takenAt?.toISOString() ?? null,
        lines: row.lines,
      })),
    };
  },
});

/** Le détail d'une photo, et l'écart avec une autre date (0.4 § 6, « Consulter une photo quotidienne »). */
export const getSnapshotHandler = defineQueryHandler({
  definition: getSnapshot,
  async execute({ db, userId, input }) {
    const snapshot = await db
      .selectFrom('logistics.dailyStockSnapshot')
      .select(['id', 'siteId', 'snapshotDate'])
      .where('id', '=', input.snapshotId)
      .executeTakeFirst();
    if (snapshot === undefined || !(await canSeeSite(db, userId, snapshot.siteId)))
      throw new QueryRefusal('outOfScope');
    const compared =
      input.comparedTo === null
        ? undefined
        : await db
            .selectFrom('logistics.dailyStockSnapshot')
            .select(['id', 'snapshotDate'])
            .where('id', '=', input.comparedTo)
            .where('siteId', '=', snapshot.siteId)
            .executeTakeFirst();
    const visible = await visibleFilter(db, userId);
    const lines = (snapshotId: string) =>
      db
        .selectFrom('logistics.dailyStockSnapshotLine as line')
        .innerJoin('logistics.principal as principal', 'principal.id', 'line.principalId')
        .innerJoin('logistics.item as item', 'item.id', 'line.itemId')
        .innerJoin('logistics.qualityState as quality', 'quality.id', 'line.qualityStateId')
        .innerJoin('logistics.location as location', 'location.id', 'line.locationId')
        .select([
          'line.principalId',
          'principal.code as principalCode',
          'item.code as itemCode',
          'quality.label as qualityLabel',
          'location.address',
          'line.quantity',
          'line.handlingUnits',
          'line.volumeCm3',
        ])
        .where('line.snapshotId', '=', snapshotId)
        .orderBy('principal.code')
        .orderBy('item.code')
        .orderBy('location.address')
        .execute();
    const current = (await lines(snapshot.id)).filter((line) => visible(line.principalId));
    const before =
      compared === undefined ? [] : (await lines(compared.id)).filter((line) => visible(line.principalId));
    const key = (line: { principalCode: string; itemCode: string; qualityLabel: string; address: string }) =>
      `${line.principalCode}|${line.itemCode}|${line.qualityLabel}|${line.address}`;
    const previous = new Map(before.map((line) => [key(line), line.quantity]));
    const shown = current.map((line) => ({
      ...line,
      volumeCm3: line.volumeCm3 === null ? null : Number(line.volumeCm3),
      difference: compared === undefined ? null : line.quantity - (previous.get(key(line)) ?? 0),
    }));
    // Ce qui était là et n'y est plus : un écart aussi.
    const currentKeys = new Set(current.map(key));
    const vanished = before
      .filter((line) => !currentKeys.has(key(line)))
      .map((line) => ({
        ...line,
        quantity: 0,
        volumeCm3: null,
        difference: -line.quantity,
      }));
    return {
      date: snapshot.snapshotDate,
      comparedDate: compared?.snapshotDate ?? null,
      lines: [...shown, ...vanished],
    };
  },
});
