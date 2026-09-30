import { randomUUID } from 'node:crypto';
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
import { excludes, generateAddresses } from './generator.js';

// Module 0.3 — plan d'entrepôt. Un administrateur des sites, sur un site de test.
const db = openApplicationDatabase();
const { app, cookieSecret } = testApp(db);
afterAll(async () => {
  await db.destroy();
});

let siteId = '';
let admin: TestUser;
let itemId = '';

beforeAll(async () => {
  siteId = await createSite(db);
  admin = await createUser(db, app, cookieSecret, {
    permissions: ['administerSites'],
    sites: [{ id: siteId, execution: true }],
  });
  itemId = (await createCatalog(db)).own.itemIds[0] ?? '';
});

interface Outcome<Result = Record<string, never>> {
  readonly outcome: string;
  readonly reason?: string;
  readonly details?: Record<string, string | number | boolean>;
  readonly result: Result;
}
const run = async <Result = Record<string, never>>(name: string, payload: object) =>
  (await gesture(app, admin, name, payload)).json<Outcome<Result>>();

const rack = [
  { name: 'allée', format: 'alphabetic', length: 1 },
  { name: 'travée', format: 'numeric', length: 2 },
  { name: 'niveau', format: 'numeric', length: 1 },
] as const;

/** Une zone du site de test, et son masque. */
async function zone(purpose: string, pattern: readonly object[] = rack, pickMode = 'dynamic') {
  const saved = await run<{ zoneId: string }>('saveZone', {
    zoneId: null,
    siteId,
    code: `Z${randomUUID().slice(0, 6).toUpperCase()}`,
    name: 'Zone de test',
    purpose,
    cohabitation: 'shared',
    principalId: null,
  });
  expect(saved.outcome).toBe('accepted');
  const layout = await run('saveZoneLayout', {
    zoneId: saved.result.zoneId,
    addressPattern: pattern,
    addressSeparator: '-',
    traversal: 'alternating',
    pickMode,
  });
  expect(layout.outcome).toBe('accepted');
  return saved.result.zoneId;
}

const characteristics = {
  type: 'reserve',
  dockId: null,
  maxWeightGrams: 800_000,
  maxVolumeCm3: null,
  supportCapacity: 1,
};

describe('générateur de plan (RG-EMP-014, 016, 018, 021)', () => {
  it('parcourt en serpentin : une allée sur deux à rebours', () => {
    const addresses = generateAddresses(
      rack,
      '-',
      [
        { from: 'A', to: 'B', step: 1 },
        { from: '1', to: '3', step: 1 },
        { from: '1', to: '1', step: 1 },
      ],
      true,
    );
    expect(Array.isArray(addresses) ? addresses.map((entry) => entry.address) : addresses).toEqual([
      'A-01-1',
      'A-02-1',
      'A-03-1',
      'B-03-1',
      'B-02-1',
      'B-01-1',
    ]);
  });

  it('respecte le pas, refuse une borne hors format, exclut par motif', () => {
    const addresses = generateAddresses(
      rack,
      '-',
      [
        { from: 'A', to: 'A', step: 1 },
        { from: '2', to: '10', step: 4 },
        { from: '1', to: '1', step: 1 },
      ],
      false,
    );
    expect(Array.isArray(addresses) ? addresses.map((entry) => entry.address) : addresses).toEqual([
      'A-02-1',
      'A-06-1',
      'A-10-1',
    ]);
    expect(
      generateAddresses(
        rack,
        '-',
        [
          { from: '1', to: '2', step: 1 },
          { from: '1', to: '1', step: 1 },
          { from: '1', to: '1', step: 1 },
        ],
        false,
      ),
    ).toBe('rangeOutsidePattern');
    const excluded = excludes(['A-06-*', 'a-10-1']);
    expect(['A-02-1', 'A-06-1', 'A-10-1'].filter((address) => !excluded(address))).toEqual(['A-02-1']);
  });
});

describe('génération dans une zone (RG-EMP-012, 013, 019, 020, 022)', () => {
  it('prévoit, crée, n’écrase jamais, et fige alors le masque', async () => {
    const zoneId = await zone('storage');
    const request = {
      zoneId,
      ranges: [
        { from: 'A', to: 'B', step: 1 },
        { from: '1', to: '2', step: 1 },
        { from: '1', to: '2', step: 1 },
      ],
      exclusions: ['B-02-*'],
      characteristics,
    };
    const preview = (await query(app, admin, 'previewLayout', request)).json<{
      count: number;
      excludedCount: number;
      first: { address: string; traversalRank: number }[];
    }>();
    expect(preview.count).toBe(6);
    expect(preview.excludedCount).toBe(2);
    expect(preview.first[0]).toEqual({ address: 'A-01-1', traversalRank: 10 });
    const created = await run<{ created: number; collisionCount: number }>('generateLocations', request);
    expect(created.result).toMatchObject({ created: 6, collisionCount: 0 });

    // Rejouée sans l'exclusion : les six adresses existantes sont des collisions, seules deux naissent.
    const again = await run<{ created: number; collisions: string[] }>('generateLocations', {
      ...request,
      exclusions: [],
    });
    expect(again.result.created).toBe(2);
    expect(again.result.collisions).toContain('A-01-1');

    const listed = (await query(app, admin, 'listZoneLocations', { zoneId })).json<{
      locations: { address: string; barcode: string; traversalRank: number; maxWeightGrams: number | null }[];
    }>().locations;
    expect(listed).toHaveLength(8);
    expect(new Set(listed.map((location) => location.traversalRank)).size).toBe(8);
    expect(listed[0]).toMatchObject({ address: 'A-01-1', maxWeightGrams: 800_000 });
    expect(listed[0]?.barcode).toMatch(/^EMP-.+-A-01-1$/u);

    const locked = await run('saveZoneLayout', {
      zoneId,
      addressPattern: rack.slice(0, 2),
      addressSeparator: '-',
      traversal: 'constant',
      pickMode: 'dynamic',
    });
    expect(locked.reason).toBe('addressPatternLocked');
  });

  it('refuse une séquence en doublon en désignant l’emplacement en conflit (0.3 § 5)', async () => {
    const zoneId = await zone('storage');
    await run('generateLocations', {
      zoneId,
      ranges: [
        { from: 'C', to: 'C', step: 1 },
        { from: '1', to: '2', step: 1 },
        { from: '1', to: '1', step: 1 },
      ],
      exclusions: [],
      characteristics,
    });
    const [first, second] = (await query(app, admin, 'listZoneLocations', { zoneId })).json<{
      locations: { id: string; address: string; traversalRank: number }[];
    }>().locations;
    if (first === undefined || second === undefined) throw new Error('two locations expected');
    const clash = await run('setTraversalRanks', {
      zoneId,
      ranks: [{ locationId: second.id, traversalRank: first.traversalRank }],
    });
    expect(clash.reason).toBe('traversalRankTaken');
    expect(clash.details?.['name']).toBe(first.address);
    // Une permutation d'un bloc passe : l'unicité se vérifie sur le résultat.
    const swap = await run('setTraversalRanks', {
      zoneId,
      ranks: [
        { locationId: first.id, traversalRank: second.traversalRank },
        { locationId: second.id, traversalRank: first.traversalRank },
      ],
    });
    expect(swap.outcome).toBe('accepted');
  });
});

describe('quais, virtuels, prélèvement dédié (RG-EMP-033, 038, 039 à 046)', () => {
  it('rattache un quai à une zone de réception, et un emplacement de quai à un quai', async () => {
    const storage = await zone('storage');
    expect((await run('saveDock', { dockId: null, zoneId: storage, code: 'Q9' })).reason).toBe(
      'dockZoneMismatch',
    );
    const receiving = await zone('receiving', [{ name: 'quai', format: 'alphanumeric', length: 2 }]);
    const dock = await run<{ dockId: string }>('saveDock', { dockId: null, zoneId: receiving, code: 'Q9' });
    expect(dock.outcome).toBe('accepted');
    const withoutDock = await run('generateLocations', {
      zoneId: receiving,
      ranges: [{ from: 'Q9', to: 'Q9', step: 1 }],
      exclusions: [],
      characteristics: { ...characteristics, type: 'receivingDock' },
    });
    expect(withoutDock.reason).toBe('dockRequired');
    const withDock = await run('generateLocations', {
      zoneId: receiving,
      ranges: [{ from: 'Q9', to: 'Q9', step: 1 }],
      exclusions: [],
      characteristics: { ...characteristics, type: 'receivingDock', dockId: dock.result.dockId },
    });
    expect(withDock.outcome).toBe('accepted');
  });

  it('crée un emplacement virtuel d’une famille, avec le tiers qu’elle admet', async () => {
    const virtual = await zone('virtual', [{ name: 'code', format: 'alphanumeric', length: 4 }]);
    const carrier = await db
      .insertInto('logistics.party')
      .values({
        family: 'carrier',
        principalId: null,
        code: `T${randomUUID().slice(0, 6)}`,
        name: 'Transporteur',
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    const mismatch = await run('createVirtualLocation', {
      zoneId: virtual,
      segments: ['TRS1'],
      family: 'atSubcontractor',
      partyId: carrier.id,
    });
    expect(mismatch.reason).toBe('partyFamilyMismatch');
    const created = await run('createVirtualLocation', {
      zoneId: virtual,
      segments: ['TRS1'],
      family: 'atCarrier',
      partyId: carrier.id,
    });
    expect(created.outcome).toBe('accepted');
    // Un emplacement virtuel ne naît pas du générateur, ni dans une zone physique.
    const generated = await run('generateLocations', {
      zoneId: virtual,
      ranges: [{ from: 'TRS2', to: 'TRS2', step: 1 }],
      exclusions: [],
      characteristics: { ...characteristics, type: 'virtual', maxWeightGrams: null, supportCapacity: null },
    });
    expect(generated.reason).toBe('virtualZoneMismatch');
  });

  it('attitre un emplacement de prélèvement en zone dédiée, jamais à une référence en série', async () => {
    const dynamic = await zone('picking');
    const dedicated = await zone('picking', rack, 'dedicated');
    const pickRange = {
      ranges: [
        { from: 'P', to: 'P', step: 1 },
        { from: '1', to: '1', step: 1 },
        { from: '1', to: '1', step: 1 },
      ],
      exclusions: [],
      characteristics: { ...characteristics, type: 'picking' },
    };
    await run('generateLocations', { ...pickRange, zoneId: dynamic });
    // L'adresse est unique sur le site : la zone dédiée prend une autre allée.
    await run('generateLocations', {
      ...pickRange,
      zoneId: dedicated,
      ranges: [{ from: 'Q', to: 'Q', step: 1 }, ...pickRange.ranges.slice(1)],
    });
    const locationIn = async (zoneId: string) =>
      (await query(app, admin, 'listZoneLocations', { zoneId })).json<{ locations: { id: string }[] }>()
        .locations[0]?.id ?? '';
    const rule = { itemId, replenishmentThreshold: 5, replenishmentTarget: 40 };
    expect(
      (await run('setFixedPickLocation', { ...rule, locationId: await locationIn(dynamic) })).reason,
    ).toBe('notDedicatedZone');
    const fixed = await locationIn(dedicated);
    expect(
      (await run('setFixedPickLocation', { ...rule, locationId: fixed, replenishmentTarget: 5 })).reason,
    ).toBe('invalidReplenishment');
    expect((await run('setFixedPickLocation', { ...rule, locationId: fixed })).outcome).toBe('accepted');
    const serial = await db
      .updateTable('logistics.item')
      .set({ trackingMode: 'serial' })
      .where('id', '=', itemId)
      .returning('id')
      .executeTakeFirstOrThrow();
    expect(
      (await run('setFixedPickLocation', { ...rule, itemId: serial.id, locationId: fixed })).reason,
    ).toBe('serialItem');
  });
});

describe('identifiant scannable (RG-EMP-007, RG-SUR-060)', () => {
  it('retrouve un emplacement par son identifiant, avec la zone qui le porte', async () => {
    const zoneId = await zone('storage');
    await run('generateLocations', {
      zoneId,
      ranges: [
        { from: 'S', to: 'S', step: 1 },
        { from: '7', to: '7', step: 1 },
        { from: '1', to: '1', step: 1 },
      ],
      exclusions: [],
      characteristics,
    });
    const [location] = (await query(app, admin, 'listZoneLocations', { zoneId })).json<{
      locations: { id: string; barcode: string }[];
    }>().locations;
    if (location === undefined) throw new Error('one location expected');
    const found = (await query(app, admin, 'search', { text: location.barcode })).json<{
      results: { type: string; id: string; ownerId: string | null; exact: boolean; code: string | null }[];
    }>().results;
    expect(found).toContainEqual(
      expect.objectContaining({
        type: 'location',
        id: location.id,
        ownerId: zoneId,
        exact: true,
        code: 'S-07-1',
      }),
    );
  });
});
