import { randomUUID } from 'node:crypto';
import { locationBarcode, permissionCatalog } from '@cairn/contrat';
import { sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { openApplicationDatabase } from '../../test-support/database.js';
import {
  createCatalog,
  createSite,
  createUser,
  gesture,
  query,
  testApp,
  type TestUser,
} from '../../test-support/fixtures.js';
import { enterStock, takeDailySnapshot } from './index.js';
import { reserveStock } from './operations.js';

// Module 0.4 — modèle de stock. Un gestionnaire de stock qui détient toutes les permissions du stock et
// administre les sites, sur un site de test à deux zones.
const db = openApplicationDatabase();
const { app, cookieSecret } = testApp(db);
afterAll(async () => {
  await db.destroy();
});

let siteId = '';
let siteCode = '';
let keeper: TestUser;
let principalId = '';
let otherPrincipalId = '';
let itemId = '';
let otherItemId = '';
const locations: Record<string, string> = {};
const reasons: Record<string, string> = {};
const author = { userId: null, workstationId: null };

/** Une zone et ses emplacements, posés directement : le plan d'entrepôt est l'affaire de 0.3. */
async function zoneWith(
  addresses: readonly string[],
  options: {
    cohabitation?: string;
    principalId?: string | null;
    maxWeightGrams?: number;
    accepted?: string[];
  } = {},
) {
  const zone = await db
    .insertInto('logistics.zone')
    .values({
      siteId,
      code: `Z${randomUUID().slice(0, 6)}`,
      name: 'Zone de test',
      purpose: 'storage',
      cohabitation: options.cohabitation ?? 'shared',
      principalId: options.principalId ?? null,
      addressPattern: JSON.stringify([{ name: 'code', format: 'alphanumeric', length: 4 }]),
    })
    .returning('id')
    .executeTakeFirstOrThrow();
  for (const [index, address] of addresses.entries()) {
    const location = await db
      .insertInto('logistics.location')
      .values({
        siteId,
        zoneId: zone.id,
        type: 'reserve',
        address,
        barcode: locationBarcode(siteCode, address),
        segments: JSON.stringify([address]),
        traversalRank: (index + 1) * 10,
        maxWeightGrams: options.maxWeightGrams ?? null,
        acceptedQualityCodes: options.accepted ?? [],
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    locations[address] = location.id;
  }
}

const enter = (entry: Parameters<typeof enterStock>[2]) =>
  db.transaction().execute((transaction) => enterStock(transaction, author, entry));

interface Outcome<Result = Record<string, never>> {
  readonly outcome: string;
  readonly reason?: string;
  readonly details?: Record<string, string | number | boolean>;
  readonly result: Result;
}
const run = async <Result = Record<string, never>>(name: string, payload: object) =>
  (await gesture(app, keeper, name, payload)).json<Outcome<Result>>();

const unitsAt = async (address: string) =>
  (await query(app, keeper, 'stockAt', { kind: 'location', locationId: locations[address] })).json<{
    stockUnits: { id: string; quantity: number; status: string; qualityStateId: string; itemCode: string }[];
  }>().stockUnits;

beforeAll(async () => {
  siteId = await createSite(db);
  siteCode = (
    await db.selectFrom('foundation.site').select('code').where('id', '=', siteId).executeTakeFirstOrThrow()
  ).code;
  keeper = await createUser(db, app, cookieSecret, {
    permissions: [...permissionCatalog.stock, 'administerSites', 'manageItems'],
    sites: [{ id: siteId, execution: true }],
  });
  const catalog = await createCatalog(db);
  principalId = catalog.own.principalId;
  otherPrincipalId = catalog.other.principalId;
  itemId = catalog.own.itemIds[0] ?? '';
  otherItemId = catalog.other.itemIds[0] ?? '';
  // Une unité de base de 2 kg, 100 × 100 × 100 mm : de quoi éprouver les capacités.
  await db
    .insertInto('logistics.packagingLevel')
    .values({
      itemId,
      rank: 0,
      name: 'Unité',
      unitsOfLowerLevel: null,
      grossWeightGrams: 2000,
      lengthMm: 100,
      widthMm: 100,
      heightMm: 100,
    })
    .execute();
  await zoneWith(['R001', 'R002', 'R003']);
  await zoneWith(['LOUR'], { maxWeightGrams: 10_000 });
  await zoneWith(['QUAR'], { accepted: ['DEFECTUEUX'] });
  await zoneWith(['DEDI'], { cohabitation: 'single', principalId: otherPrincipalId });
  for (const [nature, label, commentRequired] of [
    ['qualityChange', `Constat ${randomUUID().slice(0, 6)}`, false],
    ['quantityAdjustment', `Casse ${randomUUID().slice(0, 6)}`, true],
    ['correction', `Erreur ${randomUUID().slice(0, 6)}`, false],
  ] as const) {
    const reason = await db
      .insertInto('logistics.movementReason')
      .values({ nature, label, commentRequired })
      .returning('id')
      .executeTakeFirstOrThrow();
    reasons[nature] = reason.id;
  }
});

describe('unité de stock et entrée (RG-STK-001 à 008, 011)', () => {
  it('fait entrer à l’état par défaut, et fusionne deux entrées identiques', async () => {
    await enter({ itemId, locationId: locations['R001'] ?? '', quantity: 5 });
    await enter({ itemId, locationId: locations['R001'] ?? '', quantity: 3 });
    const units = await unitsAt('R001');
    expect(units).toHaveLength(1);
    expect(units[0]).toMatchObject({ quantity: 8, status: 'free' });
    const natures = await db
      .selectFrom('logistics.stockMovement')
      .select('nature')
      .where('itemId', '=', itemId)
      .where('toLocationId', '=', locations['R001'] ?? '')
      .execute();
    expect(natures.map((movement) => movement.nature).sort()).toEqual(['entry', 'entry', 'merge']);
  });

  it('refuse un mouvement modifié ou supprimé : la base elle-même l’interdit (RG-STK-022)', async () => {
    const movement = await db.selectFrom('logistics.stockMovement').select('id').executeTakeFirstOrThrow();
    await expect(
      db
        .updateTable('logistics.stockMovement')
        .set({ comment: 'retouche' })
        .where('id', '=', movement.id)
        .execute(),
    ).rejects.toThrow(/permission denied/u);
    await expect(
      db.deleteFrom('logistics.stockMovement').where('id', '=', movement.id).execute(),
    ).rejects.toThrow(/permission denied/u);
  });
});

describe('dépôt et déplacement (RG-STK-018, 048 ; RG-EMP-024, 026 ; RG-ORG-011)', () => {
  it('prend une part en mouvement, refuse le dépôt au-delà du poids en disant la marge, dépose ailleurs', async () => {
    const [unit] = await unitsAt('R001');
    if (unit === undefined) throw new Error('unit expected');
    const started = await run<{ moveId: string }>('startStockMove', {
      source: { kind: 'stock', lines: [{ stockUnitId: unit.id, quantity: 6 }] },
    });
    expect(started.outcome).toBe('accepted');
    const atOrigin = await unitsAt('R001');
    expect(atOrigin.map((row) => [row.quantity, row.status]).sort()).toEqual([
      [2, 'free'],
      [6, 'moving'],
    ]);
    // 6 × 2 kg = 12 kg pour un emplacement de 10 kg.
    const heavy = await run('completeStockMove', {
      moveId: started.result.moveId,
      destination: { kind: 'location', locationId: locations['LOUR'] },
    });
    expect(heavy.reason).toBe('capacityWeightExceeded');
    expect(heavy.details?.['remaining']).toBe(10_000);
    const done = await run<{ movements: number }>('completeStockMove', {
      moveId: started.result.moveId,
      destination: { kind: 'location', locationId: locations['R002'] },
    });
    expect(done.result.movements).toBe(1);
    expect((await unitsAt('R002'))[0]).toMatchObject({ quantity: 6, status: 'free' });
  });

  it('refuse un état qualité que l’emplacement n’accepte pas, et une zone réservée à un autre', async () => {
    const [unit] = await unitsAt('R002');
    if (unit === undefined) throw new Error('unit expected');
    const started = await run<{ moveId: string }>('startStockMove', {
      source: { kind: 'stock', lines: [{ stockUnitId: unit.id, quantity: 1 }] },
    });
    const quality = await run('completeStockMove', {
      moveId: started.result.moveId,
      destination: { kind: 'location', locationId: locations['QUAR'] },
    });
    expect(quality.reason).toBe('qualityNotAccepted');
    expect(quality.details).toMatchObject({ state: 'NEUF', accepted: 'DEFECTUEUX' });
    const reserved = await run('completeStockMove', {
      moveId: started.result.moveId,
      destination: { kind: 'location', locationId: locations['DEDI'] },
    });
    expect(reserved.reason).toBe('zoneReserved');
    await run('completeStockMove', {
      moveId: started.result.moveId,
      destination: { kind: 'location', locationId: locations['R002'] },
    });
  });

  it('déplace un support et tout son contenu d’un geste, chaque unité tracée sous le même déplacement', async () => {
    const type = await db
      .insertInto('logistics.handlingUnitType')
      .values({ code: `P${randomUUID().slice(0, 6)}`, label: 'Palette' })
      .returning('id')
      .executeTakeFirstOrThrow();
    const support = await run<{ handlingUnitId: string; code: string }>('createHandlingUnit', {
      typeId: type.id,
      locationId: locations['R003'],
      parentId: null,
    });
    expect(support.result.code).toMatch(/^S\d{8}$/u);
    await enter({
      itemId,
      locationId: locations['R003'] ?? '',
      quantity: 1,
      handlingUnitId: support.result.handlingUnitId,
    });
    await enter({
      itemId: otherItemId,
      locationId: locations['R003'] ?? '',
      quantity: 2,
      handlingUnitId: support.result.handlingUnitId,
    });
    const started = await run<{ moveId: string }>('startStockMove', {
      source: { kind: 'handlingUnit', handlingUnitId: support.result.handlingUnitId },
    });
    const done = await run<{ movements: number }>('completeStockMove', {
      moveId: started.result.moveId,
      destination: { kind: 'location', locationId: locations['R001'] },
    });
    expect(done.result.movements).toBe(2);
    const grouped = await db
      .selectFrom('logistics.stockMovement')
      .select('id')
      .where('groupId', '=', started.result.moveId)
      .execute();
    expect(grouped).toHaveLength(2);
    const sheet = (
      await query(app, keeper, 'getHandlingUnit', { handlingUnitId: support.result.handlingUnitId })
    ).json<{
      handlingUnit: { address: string; stockUnits: unknown[] };
    }>().handlingUnit;
    expect(sheet.address).toBe('R001');
    expect(sheet.stockUnits).toHaveLength(2);
  });
});

describe('état qualité, ajustement, correction (RG-STK-012, 023, 024, 027)', () => {
  it('change l’état avec un motif, puis le corrige par un mouvement inverse rattaché', async () => {
    const [unit] = await unitsAt('R002');
    if (unit === undefined) throw new Error('unit expected');
    const defective = await db
      .selectFrom('logistics.qualityState')
      .select('id')
      .where('principalId', '=', principalId)
      .where('code', '=', 'DEFECTUEUX')
      .executeTakeFirstOrThrow();
    const changed = await run<{ suggestedLocationType: string | null }>('changeQualityState', {
      stockUnitIds: [unit.id],
      qualityStateId: defective.id,
      reasonId: reasons['qualityChange'],
      comment: null,
    });
    expect(changed.result.suggestedLocationType).toBe('quarantine');
    const movement = await db
      .selectFrom('logistics.stockMovement')
      .select('id')
      .where('stockUnitId', '=', unit.id)
      .where('nature', '=', 'qualityChange')
      .executeTakeFirstOrThrow();
    const corrected = await run<{ movementId: string }>('correctMovement', {
      movementId: movement.id,
      reasonId: reasons['correction'],
      comment: null,
    });
    expect(corrected.outcome).toBe('accepted');
    expect((await unitsAt('R002'))[0]?.qualityStateId).toBe(unit.qualityStateId);
    const twice = await run('correctMovement', {
      movementId: movement.id,
      reasonId: reasons['correction'],
      comment: null,
    });
    expect(twice.reason).toBe('alreadyCorrected');
  });

  it('exige le commentaire que le motif impose, et fait disparaître une unité ajustée à zéro (RG-STK-006)', async () => {
    const [unit] = await unitsAt('R002');
    if (unit === undefined) throw new Error('unit expected');
    const silent = await run('adjustStockQuantity', {
      stockUnitId: unit.id,
      quantity: 0,
      reasonId: reasons['quantityAdjustment'],
      comment: null,
    });
    expect(silent.reason).toBe('commentRequired');
    const emptied = await run('adjustStockQuantity', {
      stockUnitId: unit.id,
      quantity: 0,
      reasonId: reasons['quantityAdjustment'],
      comment: 'Cartons écrasés',
    });
    expect(emptied.outcome).toBe('accepted');
    expect(await unitsAt('R002')).toEqual([]);
    const kept = await db
      .selectFrom('logistics.stockMovement')
      .select('id')
      .where('stockUnitId', '=', unit.id)
      .execute();
    expect(kept.length).toBeGreaterThan(0);
  });
});

describe('réservations et blocages (RG-STK-029, 035 à 038)', () => {
  it('lève les réservations du stock bloqué en rendant ses demandes, interdit le déplacement si le blocage le dit', async () => {
    const [unit] = await unitsAt('R001');
    if (unit === undefined) throw new Error('unit expected');
    const demand = { demandType: 'Order', demandId: randomUUID() };
    await db.transaction().execute((transaction) => reserveStock(transaction, unit.id, demand));
    expect((await unitsAt('R001')).find((row) => row.id === unit.id)?.status).toBe('reserved');
    const impact = (
      await query(app, keeper, 'holdImpact', { scope: 'location', targetId: locations['R001'] })
    ).json<{ reservations: number; demands: unknown[] }>();
    expect(impact.reservations).toBe(1);
    const placed = await run<{ holdId: string; releasedDemands: unknown[] }>('placeStockHold', {
      scope: 'location',
      targetId: locations['R001'],
      reason: 'Fuite de toiture',
      plannedLiftOn: null,
      allowsMove: false,
    });
    expect(placed.result.releasedDemands).toEqual([demand]);
    expect((await unitsAt('R001')).every((row) => row.status === 'blocked')).toBe(true);
    const blockedMove = await run('startStockMove', {
      source: { kind: 'stock', lines: [{ stockUnitId: unit.id, quantity: 1 }] },
    });
    expect(blockedMove.reason).toBe('holdForbidsMove');
    await run('liftStockHold', { holdId: placed.result.holdId, reason: 'Toiture réparée' });
    expect((await unitsAt('R001')).find((row) => row.id === unit.id)?.status).toBe('free');
  });
});

describe('objets sérialisés et lots (RG-STK-004, 005 ; RG-REF-015 à 017)', () => {
  it('refuse un numéro de série déjà en stock en nommant son emplacement, puis compte ses passages', async () => {
    const serialItem = await db
      .insertInto('logistics.item')
      .values({
        principalId,
        code: `SER-${randomUUID().slice(0, 6)}`,
        shortLabel: 'Console',
        trackingMode: 'serial',
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    const serial = `SN-${randomUUID().slice(0, 8)}`;
    const first = await enter({
      itemId: serialItem.id,
      locationId: locations['R003'] ?? '',
      quantity: 1,
      serialNumber: serial,
    });
    await expect(
      enter({
        itemId: serialItem.id,
        locationId: locations['R002'] ?? '',
        quantity: 1,
        serialNumber: serial,
      }),
    ).rejects.toMatchObject({ reason: 'serialInStock', details: { name: 'R003' } });
    await db.transaction().execute(async (transaction) => {
      await sql`select 1`.execute(transaction);
      await transaction.deleteFrom('logistics.stockUnit').where('id', '=', first.stockUnitId).execute();
    });
    const back = await enter({
      itemId: serialItem.id,
      locationId: locations['R002'] ?? '',
      quantity: 1,
      serialNumber: serial,
    });
    expect(back.serializedUnitId).toBe(first.serializedUnitId);
    expect(back.passages).toBe(1);
  });

  it('exige un lot pour une référence en gestion lot', async () => {
    const batchItem = await db
      .insertInto('logistics.item')
      .values({
        principalId,
        code: `LOT-${randomUUID().slice(0, 6)}`,
        shortLabel: 'Piles',
        trackingMode: 'batch',
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    await expect(
      enter({ itemId: batchItem.id, locationId: locations['R003'] ?? '', quantity: 4 }),
    ).rejects.toMatchObject({
      reason: 'batchRequired',
    });
  });
});

describe('ce que le stock dit aux autres modules', () => {
  it('fige l’axe de gestion d’une référence qui a bougé (RG-REF-013), et retient un emplacement occupé (RG-EMP-005)', async () => {
    const locked = await gesture(app, keeper, 'saveItem', {
      itemId,
      principalId,
      code: 'A',
      shortLabel: 'Référence A',
      longLabel: null,
      familyId: null,
      trackingMode: 'batch',
      serialBatchTracking: false,
      tracksExpiryDate: false,
      tracksManufacturingDate: false,
      adr: null,
      isKit: false,
    });
    expect(locked.json<Outcome>().reason).toBe('trackingModeLocked');
    const occupied = await run('setLocationActive', { locationId: locations['R001'], active: false });
    expect(occupied.reason).toBe('activityRemaining');
  });
});

describe('photo quotidienne (RG-STK-057 à 059, 061)', () => {
  it('fige le stock d’un site une fois par jour, et ne se rejoue pas en double', async () => {
    const date = '2026-09-30';
    expect(await takeDailySnapshot(db, siteId, date)).toBe('complete');
    expect(await takeDailySnapshot(db, siteId, date)).toBe('complete');
    const snapshots = await db
      .selectFrom('logistics.dailyStockSnapshot')
      .select('id')
      .where('siteId', '=', siteId)
      .where('snapshotDate', '=', date)
      .execute();
    expect(snapshots).toHaveLength(1);
    const lines = await db
      .selectFrom('logistics.dailyStockSnapshotLine')
      .select(['quantity', 'volumeCm3'])
      .where('snapshotId', '=', snapshots[0]?.id ?? '')
      .where('itemId', '=', itemId)
      .execute();
    expect(lines.length).toBeGreaterThan(0);
    const listed = (await query(app, keeper, 'listSnapshots', { siteId })).json<{
      days: { state: string }[];
    }>();
    expect(listed.days.some((day) => day.state === 'absent')).toBe(true);
  });
});
