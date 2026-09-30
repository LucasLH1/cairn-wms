import {
  addressSegmentSchema,
  createVirtualLocation,
  dockLocationTypes,
  fitsSegment,
  generateLocations,
  getZoneLayout,
  listZoneLocations,
  locationBarcode,
  locationTypeSchema,
  pickModeSchema,
  previewLayout,
  saveDock,
  saveLocation,
  saveZoneLayout,
  setDockActive,
  setFixedPickLocation,
  setLocationActive,
  setTraversalRanks,
  setZoneVisitOrder,
  traversalSchema,
  virtualFamilySchema,
  zoneCohabitationSchema,
  zonePurposeSchema,
  type LayoutGeneration,
  type LocationCharacteristics,
  type VirtualFamily,
} from '@cairn/contrat';
import { sql, type Kysely } from 'kysely';
import { z } from 'zod';
import type { DatabaseTransaction, DB } from '../../socle/database/index.js';
import { defineGestureHandler, GestureRefusal } from '../../socle/gesture/index.js';
import { defineQueryHandler, QueryRefusal } from '../../socle/query/index.js';
import { signalChange } from '../../socle/signal/index.js';
import { defineTraceEventType } from '../../socle/trace-event/index.js';
import { ZONE, type RemainingActivity } from '../organization/index.js';
import { excludes, generateAddresses, type GeneratedAddress } from './generator.js';

export const LOCATION = 'Location';
export const DOCK = 'Dock';

/** Ce que le stock (0.4) dit d'un emplacement : ce qu'il porte. */
export interface LocationActivity {
  readonly stockInLocation: (db: Kysely<DB>, locationId: string) => Promise<RemainingActivity>;
}

/** Pas entre deux séquences de parcours : de la place pour glisser un emplacement plus tard. */
const TRAVERSAL_STEP = 10;
/** Échantillon de l'aperçu : les dix premières et les dix dernières adresses (0.3 § 6, étape 6). */
const SAMPLE = 10;
/** Collisions rendues en toutes lettres ; au-delà, le décompte seul. */
const LISTED_COLLISIONS = 200;
/** Insertion par paquets : une génération peut compter des milliers d'emplacements. */
const INSERT_BATCH = 1000;

export const zoneLayoutSavedEvent = defineTraceEventType(
  'zoneLayoutSaved',
  z.object({ segments: z.int(), separator: z.string(), traversal: z.string(), pickMode: z.string() }),
);
export const zoneVisitOrderEvent = defineTraceEventType(
  'zoneVisitOrderSet',
  z.object({ zoneIds: z.array(z.string()) }),
);
export const dockSavedEvent = defineTraceEventType('dockSaved', z.object({ code: z.string() }));
export const dockActivationEvent = defineTraceEventType(
  'dockActivationChanged',
  z.object({ active: z.boolean() }),
);
export const locationsGeneratedEvent = defineTraceEventType(
  'locationsGenerated',
  z.object({ type: z.string(), created: z.int(), collisions: z.int(), excluded: z.int() }),
);
export const traversalRanksEvent = defineTraceEventType(
  'traversalRanksSet',
  z.object({ locations: z.int() }),
);
export const locationSavedEvent = defineTraceEventType(
  'locationSaved',
  z.object({
    type: z.string(),
    maxWeightGrams: z.int().nullable(),
    maxVolumeCm3: z.int().nullable(),
    supportCapacity: z.int().nullable(),
  }),
);
export const locationActivationEvent = defineTraceEventType(
  'locationActivationChanged',
  z.object({ active: z.boolean() }),
);
export const virtualLocationCreatedEvent = defineTraceEventType(
  'virtualLocationCreated',
  z.object({ family: z.string(), partyId: z.string().nullable() }),
);
export const fixedPickLocationEvent = defineTraceEventType(
  'fixedPickLocationSet',
  z.object({
    itemId: z.string().nullable(),
    replenishmentThreshold: z.int(),
    replenishmentTarget: z.int(),
  }),
);

const patternSchema = z.array(addressSegmentSchema);

interface ZoneHead {
  readonly id: string;
  readonly siteId: string;
  readonly siteCode: string;
  readonly purpose: z.infer<typeof zonePurposeSchema>;
  readonly pattern: z.infer<typeof patternSchema> | null;
  readonly separator: string;
  readonly traversal: z.infer<typeof traversalSchema>;
  readonly pickMode: z.infer<typeof pickModeSchema>;
}

async function zoneOf(db: Kysely<DB>, zoneId: string): Promise<ZoneHead | undefined> {
  const zone = await db
    .selectFrom('logistics.zone as zone')
    .innerJoin('foundation.site as site', 'site.id', 'zone.siteId')
    .select([
      'zone.id',
      'zone.siteId',
      'site.code as siteCode',
      'zone.purpose',
      'zone.addressPattern',
      'zone.addressSeparator',
      'zone.traversal',
      'zone.pickMode',
    ])
    .where('zone.id', '=', zoneId)
    .executeTakeFirst();
  if (zone === undefined) return undefined;
  return {
    id: zone.id,
    siteId: zone.siteId,
    siteCode: zone.siteCode,
    purpose: zonePurposeSchema.parse(zone.purpose),
    pattern: zone.addressPattern === null ? null : patternSchema.parse(zone.addressPattern),
    separator: zone.addressSeparator,
    traversal: traversalSchema.parse(zone.traversal),
    pickMode: pickModeSchema.parse(zone.pickMode),
  };
}

async function locationCount(db: Kysely<DB>, zoneId: string): Promise<number> {
  const { count } = await db
    .selectFrom('logistics.location')
    .select(sql<number>`count(*)::int`.as('count'))
    .where('zoneId', '=', zoneId)
    .executeTakeFirstOrThrow();
  return count;
}

/** Séquence qui suit la dernière de la zone : une génération ne renumérote jamais l'existant. */
async function nextTraversalRank(db: Kysely<DB>, zoneId: string): Promise<number> {
  const { last } = await db
    .selectFrom('logistics.location')
    .select(sql<number>`coalesce(max(traversal_rank), 0)::int`.as('last'))
    .where('zoneId', '=', zoneId)
    .executeTakeFirstOrThrow();
  return last + TRAVERSAL_STEP;
}

/** Une zone modifiée se signale aux écrans ouverts (fiche 0026). */
const touchZone = (transaction: DatabaseTransaction, zoneId: string) =>
  signalChange(transaction, { objectType: ZONE, objectId: zoneId, version: 1 });

/**
 * Les caractéristiques d'un emplacement sont cohérentes avec sa zone : un emplacement de quai est
 * rattaché à un quai de la zone (RG-EMP-046) ; un emplacement virtuel vit dans une zone virtuelle, et
 * elle seule en porte (RG-EMP-039) ; un emplacement virtuel n'a pas de capacité (RG-EMP-045).
 */
async function checkCharacteristics(
  db: Kysely<DB>,
  zone: ZoneHead,
  characteristics: LocationCharacteristics,
): Promise<LocationCharacteristics> {
  if ((characteristics.type === 'virtual') !== (zone.purpose === 'virtual'))
    throw new GestureRefusal('virtualZoneMismatch');
  const docked = dockLocationTypes.includes(characteristics.type);
  if (docked) {
    if (characteristics.dockId === null) throw new GestureRefusal('dockRequired');
    const dock = await db
      .selectFrom('logistics.dock')
      .select('id')
      .where('id', '=', characteristics.dockId)
      .where('zoneId', '=', zone.id)
      .executeTakeFirst();
    if (dock === undefined) throw new GestureRefusal('unknownDock');
  }
  return {
    ...characteristics,
    dockId: docked ? characteristics.dockId : null,
  };
}

/** Le tiers qu'une famille virtuelle admet (RG-EMP-042) ; `null` : aucun. */
const partyFamilyOf: Readonly<Record<VirtualFamily, string | null>> = {
  interSiteTransit: null,
  atCarrier: 'carrier',
  atEndCustomer: 'endCustomer',
  atSubcontractor: 'subcontractor',
  awaitingReturn: 'endCustomer',
};

/** Ce qu'une génération produirait : adresses, exclusions, collisions, séquences (RG-EMP-018 à 021). */
async function plan(db: Kysely<DB>, zone: ZoneHead, input: LayoutGeneration) {
  if (zone.pattern === null) return { problem: 'addressPatternMissing' as const };
  const generated = generateAddresses(
    zone.pattern,
    zone.separator,
    input.ranges,
    zone.traversal === 'alternating',
  );
  if (typeof generated === 'string') return { problem: generated };
  const excluded = excludes(input.exclusions);
  const kept = generated.filter((entry) => !excluded(entry.address));
  // L'adresse est unique sur le site (RG-EMP-003) : une adresse déjà prise est une collision, exclue.
  const taken = new Set<string>();
  const candidates = kept.map((entry) => entry.address);
  for (let start = 0; start < candidates.length; start += INSERT_BATCH) {
    const slice = candidates.slice(start, start + INSERT_BATCH);
    const rows = await db
      .selectFrom('logistics.location')
      .select('address')
      .where('siteId', '=', zone.siteId)
      .where('address', 'in', slice)
      .execute();
    for (const row of rows) taken.add(row.address);
  }
  const created = kept.filter((entry) => !taken.has(entry.address));
  const firstRank = await nextTraversalRank(db, zone.id);
  const ranked = created.map((entry: GeneratedAddress, index) => ({
    ...entry,
    traversalRank: firstRank + index * TRAVERSAL_STEP,
  }));
  return {
    problem: null,
    ranked,
    excludedCount: generated.length - kept.length,
    collisions: kept.filter((entry) => taken.has(entry.address)).map((entry) => entry.address),
  };
}

/** Gestes et consultations du module 0.3 : le plan d'entrepôt. */
export function warehouseLayout(activity: LocationActivity) {
  const getZoneLayoutHandler = defineQueryHandler({
    definition: getZoneLayout,
    permissions: ['administerSites'],
    async execute({ db, input }) {
      const row = await db
        .selectFrom('logistics.zone as zone')
        .innerJoin('foundation.site as site', 'site.id', 'zone.siteId')
        .selectAll('zone')
        .select('site.code as siteCode')
        .where('zone.id', '=', input.zoneId)
        .executeTakeFirst();
      if (row === undefined) throw new QueryRefusal('outOfScope');
      const docks = await db
        .selectFrom('logistics.dock as dock')
        .select([
          'dock.id',
          'dock.code',
          'dock.active',
          sql<number>`(select count(*)::int from logistics.location location
            where location.dock_id = dock.id)`.as('locationCount'),
        ])
        .where('dock.zoneId', '=', row.id)
        .orderBy('dock.code')
        .execute();
      return {
        zone: {
          id: row.id,
          siteId: row.siteId,
          siteCode: row.siteCode,
          code: row.code,
          name: row.name,
          purpose: zonePurposeSchema.parse(row.purpose),
          cohabitation: zoneCohabitationSchema.parse(row.cohabitation),
          active: row.active,
          addressPattern: row.addressPattern === null ? null : patternSchema.parse(row.addressPattern),
          addressSeparator: row.addressSeparator,
          traversal: traversalSchema.parse(row.traversal),
          pickMode: pickModeSchema.parse(row.pickMode),
          locationCount: await locationCount(db, row.id),
          docks,
        },
      };
    },
  });

  /** Le masque ne change plus dès que la zone porte des emplacements (RG-EMP-012). */
  const saveZoneLayoutHandler = defineGestureHandler({
    definition: saveZoneLayout,
    async execute({ transaction, input, appendEvent }) {
      const zone = await zoneOf(transaction, input.zoneId);
      if (zone === undefined) throw new GestureRefusal('unknownZone');
      const patternChanged =
        JSON.stringify(zone.pattern) !== JSON.stringify(input.addressPattern) ||
        zone.separator !== input.addressSeparator;
      if (patternChanged && (await locationCount(transaction, zone.id)) > 0)
        throw new GestureRefusal('addressPatternLocked');
      await transaction
        .updateTable('logistics.zone')
        .set({
          addressPattern: JSON.stringify(input.addressPattern),
          addressSeparator: input.addressSeparator,
          traversal: input.traversal,
          pickMode: input.pickMode,
        })
        .where('id', '=', zone.id)
        .execute();
      await appendEvent({
        eventType: zoneLayoutSavedEvent,
        data: {
          segments: input.addressPattern.length,
          separator: input.addressSeparator,
          traversal: input.traversal,
          pickMode: input.pickMode,
        },
        objects: [{ type: ZONE, id: zone.id }],
      });
      await touchZone(transaction, zone.id);
      return {};
    },
  });

  /** Ordre de visite des zones d'un site : celui dans lequel une liste de prélèvement les parcourt (RG-EMP-017). */
  const setZoneVisitOrderHandler = defineGestureHandler({
    definition: setZoneVisitOrder,
    async execute({ transaction, input, appendEvent }) {
      const site = await transaction
        .selectFrom('foundation.site')
        .select('id')
        .where('id', '=', input.siteId)
        .executeTakeFirst();
      if (site === undefined) throw new GestureRefusal('unknownSite');
      const zones = await transaction
        .selectFrom('logistics.zone')
        .select('id')
        .where('siteId', '=', site.id)
        .where('id', 'in', input.zoneIds)
        .execute();
      if (zones.length !== new Set(input.zoneIds).size) throw new GestureRefusal('unknownZone');
      for (const [index, zoneId] of input.zoneIds.entries())
        await transaction
          .updateTable('logistics.zone')
          .set({ visitRank: (index + 1) * TRAVERSAL_STEP })
          .where('id', '=', zoneId)
          .execute();
      const [first, ...others] = input.zoneIds.map((id) => ({ type: ZONE, id }));
      if (first !== undefined)
        await appendEvent({
          eventType: zoneVisitOrderEvent,
          data: { zoneIds: input.zoneIds },
          objects: [first, ...others],
        });
      for (const zoneId of input.zoneIds) await touchZone(transaction, zoneId);
      return {};
    },
  });

  /** Un quai appartient à une zone de réception ou d'expédition (RG-EMP-046). */
  const saveDockHandler = defineGestureHandler({
    definition: saveDock,
    async execute({ transaction, input, appendEvent }) {
      const zone = await zoneOf(transaction, input.zoneId);
      if (zone === undefined) throw new GestureRefusal('unknownZone');
      if (zone.purpose !== 'receiving' && zone.purpose !== 'shipping')
        throw new GestureRefusal('dockZoneMismatch');
      const taken = await transaction
        .selectFrom('logistics.dock')
        .select('id')
        .where('zoneId', '=', zone.id)
        .where('code', '=', input.code)
        .$if(input.dockId !== null, (query) => query.where('id', '<>', input.dockId ?? ''))
        .executeTakeFirst();
      if (taken !== undefined) throw new GestureRefusal('codeTaken');
      let dockId = input.dockId;
      if (dockId === null) {
        dockId = (
          await transaction
            .insertInto('logistics.dock')
            .values({ zoneId: zone.id, code: input.code })
            .returning('id')
            .executeTakeFirstOrThrow()
        ).id;
      } else {
        const updated = await transaction
          .updateTable('logistics.dock')
          .set({ code: input.code })
          .where('id', '=', dockId)
          .where('zoneId', '=', zone.id)
          .executeTakeFirst();
        if (updated.numUpdatedRows === 0n) throw new GestureRefusal('unknownDock');
      }
      await appendEvent({
        eventType: dockSavedEvent,
        data: { code: input.code },
        objects: [
          { type: DOCK, id: dockId },
          { type: ZONE, id: zone.id },
        ],
      });
      await touchZone(transaction, zone.id);
      return { dockId };
    },
  });

  /** Un quai ne se désactive pas avec un véhicule à quai (RG-REC-001). */
  const setDockActiveHandler = defineGestureHandler({
    definition: setDockActive,
    async execute({ transaction, input, appendEvent }) {
      const dock = await transaction
        .selectFrom('logistics.dock')
        .select(['id', 'zoneId', 'code'])
        .where('id', '=', input.dockId)
        .executeTakeFirst();
      if (dock === undefined) throw new GestureRefusal('unknownDock');
      if (!input.active) {
        const arrival = await transaction
          .selectFrom('logistics.inboundArrival')
          .select('id')
          .where('dockId', '=', dock.id)
          .where('releasedAt', 'is', null)
          .executeTakeFirst();
        if (arrival !== undefined) throw new GestureRefusal('dockOccupied', { dock: dock.code });
      }
      await transaction
        .updateTable('logistics.dock')
        .set({ active: input.active })
        .where('id', '=', dock.id)
        .execute();
      await appendEvent({
        eventType: dockActivationEvent,
        data: { active: input.active },
        objects: [{ type: DOCK, id: dock.id }],
      });
      await signalChange(transaction, { objectType: DOCK, objectId: dock.id, version: 1 });
      await touchZone(transaction, dock.zoneId);
      return {};
    },
  });

  /** L'aperçu d'une génération, sans rien créer (RG-EMP-019). */
  const previewLayoutHandler = defineQueryHandler({
    definition: previewLayout,
    permissions: ['administerSites'],
    async execute({ db, input }) {
      const zone = await zoneOf(db, input.zoneId);
      if (zone === undefined) throw new QueryRefusal('outOfScope');
      const result = await plan(db, zone, input);
      if (result.problem !== null)
        return {
          count: 0,
          excludedCount: 0,
          collisions: [],
          collisionCount: 0,
          first: [],
          last: [],
          problem: result.problem,
        };
      const sample = (entries: typeof result.ranked) =>
        entries.map((entry) => ({ address: entry.address, traversalRank: entry.traversalRank }));
      return {
        count: result.ranked.length,
        excludedCount: result.excludedCount,
        collisions: result.collisions.slice(0, LISTED_COLLISIONS),
        collisionCount: result.collisions.length,
        first: sample(result.ranked.slice(0, SAMPLE)),
        last: sample(result.ranked.length > SAMPLE ? result.ranked.slice(-SAMPLE) : []),
        problem: null,
      };
    },
  });

  /**
   * Crée les emplacements décrits, avec leurs caractéristiques communes (RG-EMP-018, 022). N'écrase
   * jamais : les collisions sont exclues et rendues (RG-EMP-020).
   */
  const generateLocationsHandler = defineGestureHandler({
    definition: generateLocations,
    async execute({ transaction, input, appendEvent }) {
      const zone = await zoneOf(transaction, input.zoneId);
      if (zone === undefined) throw new GestureRefusal('unknownZone');
      const characteristics = await checkCharacteristics(transaction, zone, input.characteristics);
      if (characteristics.type === 'virtual') throw new GestureRefusal('virtualZoneMismatch');
      const result = await plan(transaction, zone, input);
      if (result.problem !== null) throw new GestureRefusal(result.problem);
      for (let start = 0; start < result.ranked.length; start += INSERT_BATCH) {
        await transaction
          .insertInto('logistics.location')
          .values(
            result.ranked.slice(start, start + INSERT_BATCH).map((entry) => ({
              siteId: zone.siteId,
              zoneId: zone.id,
              dockId: characteristics.dockId,
              type: characteristics.type,
              address: entry.address,
              barcode: locationBarcode(zone.siteCode, entry.address),
              segments: JSON.stringify(entry.segments),
              traversalRank: entry.traversalRank,
              maxWeightGrams: characteristics.maxWeightGrams,
              maxVolumeCm3: characteristics.maxVolumeCm3,
              supportCapacity: characteristics.supportCapacity,
            })),
          )
          .execute();
      }
      await appendEvent({
        eventType: locationsGeneratedEvent,
        data: {
          type: characteristics.type,
          created: result.ranked.length,
          collisions: result.collisions.length,
          excluded: result.excludedCount,
        },
        objects: [{ type: ZONE, id: zone.id }],
      });
      await touchZone(transaction, zone.id);
      return {
        created: result.ranked.length,
        collisions: result.collisions.slice(0, LISTED_COLLISIONS),
        collisionCount: result.collisions.length,
      };
    },
  });

  const listZoneLocationsHandler = defineQueryHandler({
    definition: listZoneLocations,
    permissions: ['administerSites'],
    async execute({ db, input }) {
      const rows = await db
        .selectFrom('logistics.location as location')
        .leftJoin('logistics.dock as dock', 'dock.id', 'location.dockId')
        .leftJoin('logistics.party as party', 'party.id', 'location.partyId')
        .leftJoin('logistics.fixedPickLocation as fixed', 'fixed.locationId', 'location.id')
        .leftJoin('logistics.item as item', 'item.id', 'fixed.itemId')
        .leftJoin('logistics.principal as principal', 'principal.id', 'item.principalId')
        .select([
          'location.id',
          'location.address',
          'location.barcode',
          'location.type',
          'location.traversalRank',
          'location.dockId',
          'dock.code as dockCode',
          'location.maxWeightGrams',
          'location.maxVolumeCm3',
          'location.supportCapacity',
          'location.virtualFamily',
          'location.partyId',
          'party.name as partyName',
          'location.active',
          'fixed.itemId',
          'item.code as itemCode',
          'principal.code as principalCode',
          'fixed.replenishmentThreshold',
          'fixed.replenishmentTarget',
        ])
        .where('location.zoneId', '=', input.zoneId)
        .orderBy('location.traversalRank')
        .execute();
      return {
        locations: rows.map((row) => ({
          id: row.id,
          address: row.address,
          barcode: row.barcode,
          type: locationTypeSchema.parse(row.type),
          traversalRank: row.traversalRank,
          dockId: row.dockId,
          dockCode: row.dockCode,
          maxWeightGrams: row.maxWeightGrams,
          maxVolumeCm3: row.maxVolumeCm3,
          supportCapacity: row.supportCapacity,
          virtualFamily: row.virtualFamily === null ? null : virtualFamilySchema.parse(row.virtualFamily),
          partyId: row.partyId,
          partyName: row.partyName,
          active: row.active,
          fixedPick:
            row.itemId === null ||
            row.itemCode === null ||
            row.principalCode === null ||
            row.replenishmentThreshold === null ||
            row.replenishmentTarget === null
              ? null
              : {
                  itemId: row.itemId,
                  itemCode: row.itemCode,
                  principalCode: row.principalCode,
                  replenishmentThreshold: row.replenishmentThreshold,
                  replenishmentTarget: row.replenishmentTarget,
                },
        })),
      };
    },
  });

  /**
   * Séquences saisies à la main, une ligne ou un lot (RG-EMP-015). La séquence reste unique dans la
   * zone (RG-EMP-013) : un doublon est refusé en désignant l'emplacement en conflit (0.3 § 5).
   */
  const setTraversalRanksHandler = defineGestureHandler({
    definition: setTraversalRanks,
    async execute({ transaction, input, appendEvent }) {
      const locations = await transaction
        .selectFrom('logistics.location')
        .select(['id', 'address', 'traversalRank'])
        .where('zoneId', '=', input.zoneId)
        .execute();
      const byId = new Map(locations.map((location) => [location.id, location]));
      if (input.ranks.some((entry) => !byId.has(entry.locationId)))
        throw new GestureRefusal('unknownLocation');
      const final = new Map(locations.map((location) => [location.id, location.traversalRank]));
      for (const entry of input.ranks) final.set(entry.locationId, entry.traversalRank);
      const owners = new Map<number, string>();
      for (const [locationId, rank] of final) {
        const owner = owners.get(rank);
        if (owner !== undefined) {
          const changed = input.ranks.some((entry) => entry.locationId === locationId);
          const conflicting = byId.get(changed ? owner : locationId);
          throw new GestureRefusal('traversalRankTaken', { name: conflicting?.address ?? '' });
        }
        owners.set(rank, locationId);
      }
      for (const entry of input.ranks)
        await transaction
          .updateTable('logistics.location')
          .set({ traversalRank: entry.traversalRank })
          .where('id', '=', entry.locationId)
          .execute();
      await appendEvent({
        eventType: traversalRanksEvent,
        data: { locations: input.ranks.length },
        objects: [{ type: ZONE, id: input.zoneId }],
      });
      await touchZone(transaction, input.zoneId);
      return {};
    },
  });

  async function locationOf(transaction: DatabaseTransaction, locationId: string) {
    const location = await transaction
      .selectFrom('logistics.location')
      .select(['id', 'zoneId', 'type'])
      .where('id', '=', locationId)
      .executeTakeFirst();
    if (location === undefined) throw new GestureRefusal('unknownLocation');
    const zone = await zoneOf(transaction, location.zoneId);
    if (zone === undefined) throw new GestureRefusal('unknownLocation');
    return { ...location, zone };
  }

  const refuseWithStock = async (transaction: DatabaseTransaction, locationId: string, reason: string) => {
    const stock = await activity.stockInLocation(transaction, locationId);
    const remaining = Object.fromEntries(Object.entries(stock).filter(([, count]) => count > 0));
    if (Object.keys(remaining).length > 0) throw new GestureRefusal(reason, remaining);
  };

  /**
   * Type et capacités d'un emplacement (RG-EMP-008, 023). Le type ne change plus sous du stock ; une
   * capacité durcie ne déplace rien, l'emplacement est seulement en dépassement (RG-EMP-031).
   */
  const saveLocationHandler = defineGestureHandler({
    definition: saveLocation,
    async execute({ transaction, input, appendEvent }) {
      const location = await locationOf(transaction, input.locationId);
      const characteristics = await checkCharacteristics(transaction, location.zone, input);
      if (characteristics.type !== location.type)
        await refuseWithStock(transaction, location.id, 'locationHasStock');
      const virtual = characteristics.type === 'virtual';
      await transaction
        .updateTable('logistics.location')
        .set({
          type: characteristics.type,
          dockId: characteristics.dockId,
          maxWeightGrams: virtual ? null : characteristics.maxWeightGrams,
          maxVolumeCm3: virtual ? null : characteristics.maxVolumeCm3,
          supportCapacity: virtual ? null : characteristics.supportCapacity,
        })
        .where('id', '=', location.id)
        .execute();
      await appendEvent({
        eventType: locationSavedEvent,
        data: {
          type: characteristics.type,
          maxWeightGrams: characteristics.maxWeightGrams,
          maxVolumeCm3: characteristics.maxVolumeCm3,
          supportCapacity: characteristics.supportCapacity,
        },
        objects: [{ type: LOCATION, id: location.id }],
      });
      await touchZone(transaction, location.zoneId);
      return {};
    },
  });

  /** Un emplacement se désactive, jamais ne se supprime, et pas sous du stock (RG-EMP-004, 005). */
  const setLocationActiveHandler = defineGestureHandler({
    definition: setLocationActive,
    async execute({ transaction, input, appendEvent }) {
      const location = await locationOf(transaction, input.locationId);
      if (!input.active) await refuseWithStock(transaction, location.id, 'activityRemaining');
      await transaction
        .updateTable('logistics.location')
        .set({ active: input.active })
        .where('id', '=', location.id)
        .execute();
      await appendEvent({
        eventType: locationActivationEvent,
        data: { active: input.active },
        objects: [{ type: LOCATION, id: location.id }],
      });
      await touchZone(transaction, location.zoneId);
      return {};
    },
  });

  /** Emplacement virtuel d'une famille, rattaché au tiers que la famille admet (RG-EMP-039 à 042). */
  const createVirtualLocationHandler = defineGestureHandler({
    definition: createVirtualLocation,
    async execute({ transaction, input, appendEvent }) {
      const zone = await zoneOf(transaction, input.zoneId);
      if (zone === undefined) throw new GestureRefusal('unknownZone');
      if (zone.purpose !== 'virtual') throw new GestureRefusal('virtualZoneMismatch');
      if (zone.pattern === null) throw new GestureRefusal('addressPatternMissing');
      const segments = input.segments.map((segment) => segment.toUpperCase());
      if (
        segments.length !== zone.pattern.length ||
        zone.pattern.some((segment, index) => !fitsSegment(segment, segments[index] ?? ''))
      )
        throw new GestureRefusal('rangeOutsidePattern');
      const address = segments.join(zone.separator);
      const taken = await transaction
        .selectFrom('logistics.location')
        .select('id')
        .where('siteId', '=', zone.siteId)
        .where('address', '=', address)
        .executeTakeFirst();
      if (taken !== undefined) throw new GestureRefusal('addressTaken', { name: address });
      const family = partyFamilyOf[input.family];
      if (input.partyId !== null) {
        const party = await transaction
          .selectFrom('logistics.party')
          .select('family')
          .where('id', '=', input.partyId)
          .executeTakeFirst();
        if (party === undefined || family === null || party.family !== family)
          throw new GestureRefusal('partyFamilyMismatch');
      }
      const { id: locationId } = await transaction
        .insertInto('logistics.location')
        .values({
          siteId: zone.siteId,
          zoneId: zone.id,
          type: 'virtual',
          address,
          barcode: locationBarcode(zone.siteCode, address),
          segments: JSON.stringify(segments),
          traversalRank: await nextTraversalRank(transaction, zone.id),
          virtualFamily: input.family,
          partyId: input.partyId,
        })
        .returning('id')
        .executeTakeFirstOrThrow();
      await appendEvent({
        eventType: virtualLocationCreatedEvent,
        data: { family: input.family, partyId: input.partyId },
        objects: [
          { type: LOCATION, id: locationId },
          { type: ZONE, id: zone.id },
        ],
      });
      await touchZone(transaction, zone.id);
      return { locationId };
    },
  });

  /**
   * Attitre un emplacement de prélèvement d'une zone dédiée à une référence, avec son seuil et sa
   * cible (RG-EMP-033, 034) ; jamais une référence en gestion série (RG-EMP-038).
   */
  const setFixedPickLocationHandler = defineGestureHandler({
    definition: setFixedPickLocation,
    async execute({ transaction, input, appendEvent }) {
      const location = await locationOf(transaction, input.locationId);
      if (location.zone.pickMode !== 'dedicated') throw new GestureRefusal('notDedicatedZone');
      if (location.type !== 'picking') throw new GestureRefusal('notPickingLocation');
      if (input.itemId === null) {
        await transaction
          .deleteFrom('logistics.fixedPickLocation')
          .where('locationId', '=', location.id)
          .execute();
      } else {
        const item = await transaction
          .selectFrom('logistics.item')
          .select(['id', 'trackingMode'])
          .where('id', '=', input.itemId)
          .executeTakeFirst();
        if (item === undefined) throw new GestureRefusal('unknownItem');
        if (item.trackingMode === 'serial') throw new GestureRefusal('serialItem');
        if (input.replenishmentTarget <= input.replenishmentThreshold)
          throw new GestureRefusal('invalidReplenishment');
        const values = {
          itemId: item.id,
          replenishmentThreshold: input.replenishmentThreshold,
          replenishmentTarget: input.replenishmentTarget,
        };
        await transaction
          .insertInto('logistics.fixedPickLocation')
          .values({ ...values, locationId: location.id })
          .onConflict((conflict) => conflict.column('locationId').doUpdateSet(values))
          .execute();
      }
      await appendEvent({
        eventType: fixedPickLocationEvent,
        data: {
          itemId: input.itemId,
          replenishmentThreshold: input.replenishmentThreshold,
          replenishmentTarget: input.replenishmentTarget,
        },
        objects: [{ type: LOCATION, id: location.id }],
      });
      await touchZone(transaction, location.zoneId);
      return {};
    },
  });

  return {
    gestures: [
      saveZoneLayoutHandler,
      setZoneVisitOrderHandler,
      saveDockHandler,
      setDockActiveHandler,
      generateLocationsHandler,
      setTraversalRanksHandler,
      saveLocationHandler,
      setLocationActiveHandler,
      createVirtualLocationHandler,
      setFixedPickLocationHandler,
    ],
    queries: [getZoneLayoutHandler, previewLayoutHandler, listZoneLocationsHandler],
  };
}
