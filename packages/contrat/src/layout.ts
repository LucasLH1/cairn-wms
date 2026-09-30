import { z } from 'zod';
import { zoneCohabitationSchema, zonePurposeSchema } from './administration.js';
import { defineGesture } from './gesture.js';
import { defineQuery } from './query.js';

/*
 * Module 0.3 — Emplacements et plan d'entrepôt (RG-EMP-001 à 046). Paramétrage du prestataire : il
 * relève de l'administration des sites.
 */

/** Types d'emplacement fournis par le produit, non extensibles (RG-EMP-002). */
export const locationTypeSchema = z.enum([
  'picking',
  'reserve',
  'receivingDock',
  'shippingDock',
  'preparation',
  'consolidation',
  'quarantine',
  'dispute',
  'workshop',
  'destruction',
  'virtual',
]);
export type LocationType = z.infer<typeof locationTypeSchema>;
export const dockLocationTypes: readonly LocationType[] = ['receivingDock', 'shippingDock'];

/** Familles d'emplacement virtuel fournies par le produit (0.3 § 2). */
export const virtualFamilySchema = z.enum([
  'interSiteTransit',
  'atCarrier',
  'atEndCustomer',
  'atSubcontractor',
  'awaitingReturn',
]);
export type VirtualFamily = z.infer<typeof virtualFamilySchema>;

export const traversalSchema = z.enum(['constant', 'alternating']);
export const pickModeSchema = z.enum(['dynamic', 'dedicated']);

/** Segment du masque d'adressage : nom, format, longueur (RG-EMP-009). */
export const addressSegmentSchema = z.object({
  name: z.string().trim().min(1).max(30),
  format: z.enum(['numeric', 'alphabetic', 'alphanumeric']),
  length: z.int().min(1).max(10),
});
export type AddressSegment = z.infer<typeof addressSegmentSchema>;

/** Séparateur des segments : un signe, jamais une lettre ni un chiffre (RG-EMP-011). */
export const addressSeparatorSchema = z.string().regex(/^[^\p{L}\p{N}\s]$/u);

/** Vrai si la valeur convient au segment : son format, sa longueur exacte. */
export function fitsSegment(segment: AddressSegment, value: string): boolean {
  if (value.length !== segment.length) return false;
  switch (segment.format) {
    case 'numeric':
      return /^\d+$/u.test(value);
    case 'alphabetic':
      return /^[A-Z]+$/u.test(value);
    case 'alphanumeric':
      return /^[A-Z0-9]+$/u.test(value);
  }
}

/** Exemple d'adresse construit à la saisie du masque (0.3 § 6, « Générer une zone », étape 2). */
export function sampleAddress(segments: readonly AddressSegment[], separator: string): string {
  return segments
    .map((segment) =>
      segment.format === 'alphabetic' ? 'A'.repeat(segment.length) : '1'.padStart(segment.length, '0'),
    )
    .join(separator);
}

/**
 * Identifiant scannable d'un emplacement (RG-EMP-007) : `EMP-`, le code du site, l'adresse. Unique sur
 * l'instance, il dit qu'il désigne un emplacement (RG-SUR-061 ; 0.3 § 7).
 */
export function locationBarcode(siteCode: string, address: string): string {
  return `EMP-${siteCode}-${address}`;
}

export const zoneDockSchema = z.object({
  id: z.uuid(),
  code: z.string(),
  active: z.boolean(),
  locationCount: z.int().nonnegative(),
});

export const zoneLayoutSchema = z.object({
  id: z.uuid(),
  siteId: z.uuid(),
  siteCode: z.string(),
  code: z.string(),
  name: z.string(),
  purpose: zonePurposeSchema,
  cohabitation: zoneCohabitationSchema,
  active: z.boolean(),
  addressPattern: z.array(addressSegmentSchema).nullable(),
  addressSeparator: z.string(),
  traversal: traversalSchema,
  pickMode: pickModeSchema,
  locationCount: z.int().nonnegative(),
  docks: z.array(zoneDockSchema),
});
export type ZoneLayout = z.infer<typeof zoneLayoutSchema>;

export const getZoneLayout = defineQuery({
  name: 'getZoneLayout',
  input: z.object({ zoneId: z.uuid() }),
  output: z.object({ zone: zoneLayoutSchema }),
});

/**
 * Masque d'adressage, sens de circulation et mode de prélèvement d'une zone (RG-EMP-009 à 012, 016,
 * 032). Le masque et le séparateur ne changent plus dès que la zone porte des emplacements.
 */
export const saveZoneLayout = defineGesture({
  name: 'saveZoneLayout',
  input: z.object({
    zoneId: z.uuid(),
    addressPattern: z.array(addressSegmentSchema).min(1).max(6),
    addressSeparator: addressSeparatorSchema,
    traversal: traversalSchema,
    pickMode: pickModeSchema,
  }),
  output: z.object({}),
  permission: 'administerSites',
  refusalReasons: ['unknownZone', 'addressPatternLocked'],
});

/** Ordre de visite des zones d'un site (RG-EMP-017). */
export const setZoneVisitOrder = defineGesture({
  name: 'setZoneVisitOrder',
  input: z.object({ siteId: z.uuid(), zoneIds: z.array(z.uuid()).min(1).max(500) }),
  output: z.object({}),
  permission: 'administerSites',
  refusalReasons: ['unknownSite', 'unknownZone'],
});

/** Quai d'une zone de réception ou d'expédition (RG-EMP-046). */
export const saveDock = defineGesture({
  name: 'saveDock',
  input: z.object({
    dockId: z.uuid().nullable(),
    zoneId: z.uuid(),
    code: z.string().trim().min(1).max(20),
  }),
  output: z.object({ dockId: z.uuid() }),
  permission: 'administerSites',
  refusalReasons: ['unknownZone', 'unknownDock', 'codeTaken', 'dockZoneMismatch'],
});

/** Un quai se désactive, pas avec un véhicule à quai (RG-REC-001). */
export const setDockActive = defineGesture({
  name: 'setDockActive',
  input: z.object({ dockId: z.uuid(), active: z.boolean() }),
  output: z.object({}),
  permission: 'administerSites',
  refusalReasons: ['unknownDock', 'dockOccupied'],
});

/** Borne inférieure, borne supérieure et pas d'un segment (RG-EMP-018). */
export const segmentRangeSchema = z.object({
  from: z.string().trim().min(1).max(10),
  to: z.string().trim().min(1).max(10),
  step: z.int().min(1).max(1000),
});
export type SegmentRange = z.infer<typeof segmentRangeSchema>;

/** Caractéristiques communes à toute une génération (RG-EMP-022). */
export const locationCharacteristicsSchema = z.object({
  type: locationTypeSchema,
  dockId: z.uuid().nullable(),
  maxWeightGrams: z.int().positive().nullable(),
  maxVolumeCm3: z.int().positive().nullable(),
  supportCapacity: z.int().positive().nullable(),
});
export type LocationCharacteristics = z.infer<typeof locationCharacteristicsSchema>;

/** Au-delà, une génération se découpe : le décompte de l'aperçu le montre (0.3 § 5). */
export const MAX_GENERATED_LOCATIONS = 20_000;

const ALPHABET_SIZE = 26;
const A = 'A'.charCodeAt(0);

/** Une valeur alphabétique comme un nombre en base 26 à longueur fixe : AA, AB… AZ, BA. */
function alphabeticToNumber(value: string): number {
  let total = 0;
  for (let position = 0; position < value.length; position += 1)
    total = total * ALPHABET_SIZE + (value.charCodeAt(position) - A);
  return total;
}

function numberToAlphabetic(value: number, length: number): string {
  let rest = value;
  let text = '';
  for (let position = 0; position < length; position += 1) {
    text = String.fromCharCode(A + (rest % ALPHABET_SIZE)) + text;
    rest = Math.floor(rest / ALPHABET_SIZE);
  }
  return text;
}

/**
 * Valeurs d'un segment, de la borne inférieure à la borne supérieure, au pas donné (RG-EMP-018).
 * Numérique : complété de zéros à sa longueur ; alphabétique : à longueur fixe ; alphanumérique : une
 * seule valeur, sans progression définie. Une borne hors du format du segment rend `undefined`.
 */
export function segmentValues(segment: AddressSegment, range: SegmentRange): string[] | undefined {
  const from = range.from.toUpperCase();
  const to = range.to.toUpperCase();
  switch (segment.format) {
    case 'numeric': {
      if (!/^\d+$/u.test(from) || !/^\d+$/u.test(to)) return undefined;
      const values: string[] = [];
      for (let value = Number(from); value <= Number(to); value += range.step)
        values.push(String(value).padStart(segment.length, '0'));
      return values.every((value) => fitsSegment(segment, value)) ? values : undefined;
    }
    case 'alphabetic': {
      if (!fitsSegment(segment, from) || !fitsSegment(segment, to)) return undefined;
      const values: string[] = [];
      for (let value = alphabeticToNumber(from); value <= alphabeticToNumber(to); value += range.step)
        values.push(numberToAlphabetic(value, segment.length));
      return values;
    }
    case 'alphanumeric':
      return from === to && fitsSegment(segment, from) ? [from] : undefined;
  }
}

/**
 * Nombre d'emplacements que décrivent ces bornes, avant exclusions et collisions : l'écran l'affiche en
 * permanence (0.3 § 6, étape 3). `undefined` si une borne ne suit pas son segment.
 */
export function describedCount(
  pattern: readonly AddressSegment[],
  ranges: readonly SegmentRange[],
): number | undefined {
  if (ranges.length !== pattern.length) return undefined;
  let count = 1;
  for (const [index, segment] of pattern.entries()) {
    const range = ranges[index];
    const values = range === undefined ? undefined : segmentValues(segment, range);
    if (values === undefined) return undefined;
    count *= values.length;
  }
  return count;
}

export const layoutGenerationSchema = z.object({
  zoneId: z.uuid(),
  ranges: z.array(segmentRangeSchema).min(1).max(6),
  /** Adresses ou motifs à ne pas créer ; `*` remplace toute suite de signes (RG-EMP-021). */
  exclusions: z.array(z.string().trim().min(1).max(60)).max(200),
  characteristics: locationCharacteristicsSchema,
});
export type LayoutGeneration = z.infer<typeof layoutGenerationSchema>;

export const generatedLocationSchema = z.object({ address: z.string(), traversalRank: z.int() });

/**
 * Aperçu d'une génération, avant toute création (RG-EMP-019) : décompte, dix premières et dix
 * dernières adresses avec leur séquence, collisions exclues (RG-EMP-020).
 */
export const previewLayout = defineQuery({
  name: 'previewLayout',
  input: layoutGenerationSchema,
  output: z.object({
    count: z.int().nonnegative(),
    excludedCount: z.int().nonnegative(),
    collisions: z.array(z.string()),
    collisionCount: z.int().nonnegative(),
    first: z.array(generatedLocationSchema),
    last: z.array(generatedLocationSchema),
    problem: z.enum(['addressPatternMissing', 'rangeOutsidePattern', 'tooManyLocations']).nullable(),
  }),
});

/** Crée les emplacements décrits ; jamais d'écrasement, les collisions sont rendues (RG-EMP-018 à 022). */
export const generateLocations = defineGesture({
  name: 'generateLocations',
  input: layoutGenerationSchema,
  output: z.object({
    created: z.int().nonnegative(),
    collisions: z.array(z.string()),
    collisionCount: z.int().nonnegative(),
  }),
  permission: 'administerSites',
  refusalReasons: [
    'unknownZone',
    'addressPatternMissing',
    'rangeOutsidePattern',
    'tooManyLocations',
    'dockRequired',
    'unknownDock',
    'virtualZoneMismatch',
  ],
});

export const zoneLocationSchema = z.object({
  id: z.uuid(),
  address: z.string(),
  barcode: z.string(),
  type: locationTypeSchema,
  traversalRank: z.int(),
  dockId: z.uuid().nullable(),
  dockCode: z.string().nullable(),
  maxWeightGrams: z.int().positive().nullable(),
  maxVolumeCm3: z.int().positive().nullable(),
  supportCapacity: z.int().positive().nullable(),
  virtualFamily: virtualFamilySchema.nullable(),
  partyId: z.uuid().nullable(),
  partyName: z.string().nullable(),
  active: z.boolean(),
  fixedPick: z
    .object({
      itemId: z.uuid(),
      itemCode: z.string(),
      principalCode: z.string(),
      replenishmentThreshold: z.int().nonnegative(),
      replenishmentTarget: z.int().positive(),
    })
    .nullable(),
});
export type ZoneLocation = z.infer<typeof zoneLocationSchema>;

/** Emplacements d'une zone, triés par séquence de parcours (0.3 § 6, « Ajuster un parcours »). */
export const listZoneLocations = defineQuery({
  name: 'listZoneLocations',
  input: z.object({ zoneId: z.uuid() }),
  output: z.object({ locations: z.array(zoneLocationSchema) }),
});

/**
 * Séquences de parcours saisies à la main, une ligne ou un lot (RG-EMP-015). Un doublon dans la zone
 * est refusé en désignant l'emplacement en conflit (RG-EMP-013, 0.3 § 5).
 */
export const setTraversalRanks = defineGesture({
  name: 'setTraversalRanks',
  input: z.object({
    zoneId: z.uuid(),
    ranks: z
      .array(z.object({ locationId: z.uuid(), traversalRank: z.int().min(0) }))
      .min(1)
      .max(5000),
  }),
  output: z.object({}),
  permission: 'administerSites',
  refusalReasons: ['unknownLocation', 'traversalRankTaken'],
});

/**
 * Type et capacités d'un emplacement (RG-EMP-008, 023, 031). Le type ne change plus sous du stock ;
 * une capacité durcie ne déplace rien.
 */
export const saveLocation = defineGesture({
  name: 'saveLocation',
  input: z.object({ locationId: z.uuid() }).extend(locationCharacteristicsSchema.shape),
  output: z.object({}),
  permission: 'administerSites',
  refusalReasons: [
    'unknownLocation',
    'locationHasStock',
    'dockRequired',
    'unknownDock',
    'virtualZoneMismatch',
  ],
});

/** Un emplacement se désactive, jamais ne se supprime ; pas sous du stock (RG-EMP-004, 005). */
export const setLocationActive = defineGesture({
  name: 'setLocationActive',
  input: z.object({ locationId: z.uuid(), active: z.boolean() }),
  output: z.object({}),
  permission: 'administerSites',
  refusalReasons: ['unknownLocation', 'activityRemaining'],
});

/** Emplacement virtuel d'une famille, rattaché à un tiers s'il y a lieu (RG-EMP-039 à 042). */
export const createVirtualLocation = defineGesture({
  name: 'createVirtualLocation',
  input: z.object({
    zoneId: z.uuid(),
    segments: z.array(z.string().trim().min(1).max(10)).min(1).max(6),
    family: virtualFamilySchema,
    partyId: z.uuid().nullable(),
  }),
  output: z.object({ locationId: z.uuid() }),
  permission: 'administerSites',
  refusalReasons: [
    'unknownZone',
    'virtualZoneMismatch',
    'rangeOutsidePattern',
    'addressPatternMissing',
    'addressTaken',
    'partyFamilyMismatch',
  ],
});

/**
 * Attitre un emplacement de prélèvement d'une zone dédiée à une référence, avec sa règle de
 * réapprovisionnement ; `itemId` nul retire le dédiement (RG-EMP-033, 034, 038).
 */
export const setFixedPickLocation = defineGesture({
  name: 'setFixedPickLocation',
  input: z.object({
    locationId: z.uuid(),
    itemId: z.uuid().nullable(),
    replenishmentThreshold: z.int().nonnegative(),
    replenishmentTarget: z.int().positive(),
  }),
  output: z.object({}),
  permission: 'administerSites',
  refusalReasons: [
    'unknownLocation',
    'notDedicatedZone',
    'notPickingLocation',
    'serialItem',
    'unknownItem',
    'invalidReplenishment',
  ],
});
