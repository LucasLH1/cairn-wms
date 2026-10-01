import { z } from 'zod';
import { defineGesture } from './gesture.js';
import { locationTypeSchema } from './layout.js';
import { defineQuery } from './query.js';

/*
 * Module 0.4 — Modèle de stock (RG-STK-001 à 066). Deux axes indépendants : l'état qualité, configuré
 * par donneur d'ordre, et le statut de disponibilité, piloté par le moteur et jamais saisi.
 */

/** Statut de disponibilité : ces quatre valeurs et aucune autre (RG-STK-015). */
export const availabilityStatusSchema = z.enum(['free', 'reserved', 'blocked', 'moving']);
export type AvailabilityStatus = z.infer<typeof availabilityStatusSchema>;

/** Natures de mouvement fournies par le produit, non extensibles (RG-STK-025). */
export const movementNatureSchema = z.enum([
  'entry',
  'exit',
  'move',
  'qualityChange',
  'quantityAdjustment',
  'handlingUnitChange',
  'merge',
  'kitAssembly',
  'kitDisassembly',
  'correction',
]);
export type MovementNature = z.infer<typeof movementNatureSchema>;

/** Un motif se rattache à une nature de mouvement, ou aux blocages (RG-STK-026, 034). */
export const reasonNatureSchema = z.enum([...movementNatureSchema.options, 'hold']);
export type ReasonNature = z.infer<typeof reasonNatureSchema>;

/** Règles de prélèvement fournies par le produit (RG-STK-053). */
export const pickingRuleSchema = z.enum(['fifo', 'lifo', 'fefo', 'traversal', 'fullest', 'singleBatch']);
export type PickingRule = z.infer<typeof pickingRuleSchema>;

/** Portée d'un blocage (RG-STK-035). */
export const holdScopeSchema = z.enum(['stockUnit', 'batch', 'serializedUnit', 'location', 'item']);
export type HoldScope = z.infer<typeof holdScopeSchema>;

const label = z.string().trim().min(1).max(120);
const code = z.string().trim().min(1).max(30);
const comment = z.string().trim().max(500).nullable();

// — Paramétrage —

export const qualityStateSchema = z.object({
  id: z.uuid(),
  code: z.string(),
  label: z.string(),
  pickable: z.boolean(),
  suggestedLocationType: locationTypeSchema.nullable(),
  isDefault: z.boolean(),
  active: z.boolean(),
});
export type QualityState = z.infer<typeof qualityStateSchema>;

export const listQualityStates = defineQuery({
  name: 'listQualityStates',
  input: z.object({ principalId: z.uuid() }),
  output: z.object({ qualityStates: z.array(qualityStateSchema), pickingRule: pickingRuleSchema }),
});

/**
 * État qualité d'un donneur d'ordre : libellé, prélevable, déplacement suggéré, état par défaut
 * (RG-STK-009 à 011, 014). Il se désactive, jamais ne se supprime (RG-STK-013) ; l'état par défaut
 * reste actif.
 */
export const saveQualityState = defineGesture({
  name: 'saveQualityState',
  input: z.object({
    qualityStateId: z.uuid().nullable(),
    principalId: z.uuid(),
    code: code.transform((value) => value.toUpperCase()),
    label,
    pickable: z.boolean(),
    suggestedLocationType: locationTypeSchema.exclude(['virtual']).nullable(),
    isDefault: z.boolean(),
    active: z.boolean(),
  }),
  output: z.object({ qualityStateId: z.uuid() }),
  permission: 'administerPrincipals',
  refusalReasons: ['unknownPrincipal', 'unknownQualityState', 'codeTaken', 'defaultInactive'],
});

/** Règle de prélèvement du donneur d'ordre (RG-STK-054). */
export const setPickingRule = defineGesture({
  name: 'setPickingRule',
  input: z.object({ principalId: z.uuid(), pickingRule: pickingRuleSchema }),
  output: z.object({}),
  permission: 'administerPrincipals',
  refusalReasons: ['unknownPrincipal'],
});

/** Surcharge de la règle de prélèvement pour une référence ; `null` revient à celle du donneur d'ordre. */
export const setItemPickingRule = defineGesture({
  name: 'setItemPickingRule',
  input: z.object({ itemId: z.uuid(), pickingRule: pickingRuleSchema.nullable() }),
  output: z.object({}),
  permission: 'manageItems',
  refusalReasons: ['unknownItem'],
});

export const movementReasonSchema = z.object({
  id: z.uuid(),
  nature: reasonNatureSchema,
  label: z.string(),
  commentRequired: z.boolean(),
  active: z.boolean(),
});
export type MovementReason = z.infer<typeof movementReasonSchema>;

export const listMovementReasons = defineQuery({
  name: 'listMovementReasons',
  input: z.object({}),
  output: z.object({ reasons: z.array(movementReasonSchema) }),
});

/** Motif de mouvement, rattaché à une nature, commentaire obligatoire ou non (RG-STK-026). */
export const saveMovementReason = defineGesture({
  name: 'saveMovementReason',
  input: z.object({
    reasonId: z.uuid().nullable(),
    nature: reasonNatureSchema,
    label,
    commentRequired: z.boolean(),
    active: z.boolean(),
  }),
  output: z.object({ reasonId: z.uuid() }),
  permission: 'administerStockSettings',
  refusalReasons: ['unknownReason', 'nameTaken'],
});

export const handlingUnitTypeSchema = z.object({
  id: z.uuid(),
  code: z.string(),
  label: z.string(),
  lengthMm: z.int().positive().nullable(),
  widthMm: z.int().positive().nullable(),
  heightMm: z.int().positive().nullable(),
  tareWeightGrams: z.int().positive().nullable(),
  returnable: z.boolean(),
  active: z.boolean(),
});
export type HandlingUnitType = z.infer<typeof handlingUnitTypeSchema>;

export const listHandlingUnitTypes = defineQuery({
  name: 'listHandlingUnitTypes',
  input: z.object({}),
  output: z.object({ types: z.array(handlingUnitTypeSchema) }),
});

/** Type de support : caractéristiques physiques par défaut, caractère consigné (RG-STK-046). */
export const saveHandlingUnitType = defineGesture({
  name: 'saveHandlingUnitType',
  input: z.object({
    typeId: z.uuid().nullable(),
    code: code.transform((value) => value.toUpperCase()),
    label,
    lengthMm: z.int().positive().nullable(),
    widthMm: z.int().positive().nullable(),
    heightMm: z.int().positive().nullable(),
    tareWeightGrams: z.int().positive().nullable(),
    returnable: z.boolean(),
    active: z.boolean(),
  }),
  output: z.object({ typeId: z.uuid() }),
  permission: 'administerStockSettings',
  refusalReasons: ['unknownHandlingUnitType', 'codeTaken'],
});

/**
 * Heure de la photo quotidienne d'un site (RG-STK-060) : hors des plages d'ouverture de son
 * calendrier.
 */
export const setSnapshotTime = defineGesture({
  name: 'setSnapshotTime',
  input: z.object({ siteId: z.uuid(), snapshotTime: z.string().regex(/^\d{2}:\d{2}$/u) }),
  output: z.object({}),
  permission: 'administerSites',
  refusalReasons: ['unknownSite', 'snapshotDuringOpening'],
});

// — Supports —

/** Crée un support à un emplacement, ou dans un autre support, sur un niveau (RG-STK-045, 050). */
export const createHandlingUnit = defineGesture({
  name: 'createHandlingUnit',
  input: z.object({
    typeId: z.uuid(),
    locationId: z.uuid().nullable(),
    parentId: z.uuid().nullable(),
  }),
  output: z.object({ handlingUnitId: z.uuid(), code: z.string() }),
  permission: 'moveStock',
  refusalReasons: ['unknownHandlingUnitType', 'unknownLocation', 'unknownHandlingUnit', 'nestingTooDeep'],
});

// — Mouvements —

const stockLine = z.object({ stockUnitId: z.uuid(), quantity: z.int().positive() });

/**
 * Prise d'un déplacement : un support entier, ou des lignes avec leurs quantités. Le stock passe « en
 * cours de mouvement » jusqu'au dépôt (RG-STK-018 ; 0.4 § 6, « Transférer du stock »).
 */
export const startStockMove = defineGesture({
  name: 'startStockMove',
  input: z.object({
    source: z.discriminatedUnion('kind', [
      z.object({ kind: z.literal('handlingUnit'), handlingUnitId: z.uuid() }),
      z.object({ kind: z.literal('stock'), lines: z.array(stockLine).min(1).max(200) }),
    ]),
  }),
  output: z.object({ moveId: z.uuid() }),
  permission: 'moveStock',
  refusalReasons: [
    'unknownStockUnit',
    'unknownHandlingUnit',
    'stockMoving',
    'insufficientQuantity',
    'holdForbidsMove',
    'mixedLocations',
  ],
});

/**
 * Dépôt d'un déplacement, à un emplacement ou dans un support. Contrôles dans l'ordre du parcours de
 * rangement : capacité (RG-EMP-024), état qualité accepté (RG-EMP-026), cohabitation (RG-ORG-011).
 */
export const completeStockMove = defineGesture({
  name: 'completeStockMove',
  input: z.object({
    moveId: z.uuid(),
    destination: z.discriminatedUnion('kind', [
      z.object({ kind: z.literal('location'), locationId: z.uuid() }),
      z.object({ kind: z.literal('handlingUnit'), handlingUnitId: z.uuid() }),
    ]),
  }),
  output: z.object({ movements: z.int().nonnegative() }),
  permission: 'moveStock',
  refusalReasons: [
    'unknownStockMove',
    'stockMoveCompleted',
    'unknownLocation',
    'unknownHandlingUnit',
    'otherSite',
    'capacityWeightExceeded',
    'capacityVolumeExceeded',
    'capacitySupportsExceeded',
    'qualityNotAccepted',
    'zoneReserved',
    'nestingTooDeep',
  ],
});

/**
 * Change l'état qualité d'unités de stock, avec un motif (RG-STK-012). Rend l'emplacement suggéré par
 * le nouvel état (RG-STK-014) et le nombre d'unités réservées que l'opération rend non prélevables.
 */
export const changeQualityState = defineGesture({
  name: 'changeQualityState',
  input: z.object({
    stockUnitIds: z.array(z.uuid()).min(1).max(200),
    qualityStateId: z.uuid(),
    reasonId: z.uuid(),
    comment,
  }),
  output: z.object({
    suggestedLocationType: locationTypeSchema.nullable(),
    reservedMadeUnpickable: z.int().nonnegative(),
  }),
  permission: 'changeQualityState',
  refusalReasons: [
    'unknownStockUnit',
    'unknownQualityState',
    'stockMoving',
    'unknownReason',
    'commentRequired',
    'samePrincipalRequired',
  ],
});

/** Ajustement de quantité hors inventaire, sous permission et toujours motivé (RG-STK-027). */
export const adjustStockQuantity = defineGesture({
  name: 'adjustStockQuantity',
  input: z.object({ stockUnitId: z.uuid(), quantity: z.int().nonnegative(), reasonId: z.uuid(), comment }),
  output: z.object({}),
  permission: 'adjustStockQuantity',
  refusalReasons: [
    'unknownStockUnit',
    'stockMoving',
    'unknownReason',
    'commentRequired',
    'serializedQuantity',
  ],
});

/** Corrige un mouvement par son inverse, motivé et rattaché à lui (RG-STK-022 à 024). */
export const correctMovement = defineGesture({
  name: 'correctMovement',
  input: z.object({ movementId: z.uuid(), reasonId: z.uuid(), comment }),
  output: z.object({ movementId: z.uuid() }),
  permission: 'correctStockMovement',
  refusalReasons: [
    'unknownMovement',
    'movementNotCorrectable',
    'alreadyCorrected',
    'stockMoved',
    'unknownReason',
    'commentRequired',
  ],
});

// — Réservations et blocages —

/** Lève une réservation, avec motif ; la demande en est avertie (RG-STK-031). */
export const releaseReservation = defineGesture({
  name: 'releaseReservation',
  input: z.object({ stockUnitId: z.uuid(), reason: z.string().trim().min(1).max(300) }),
  output: z.object({}),
  permission: 'releaseStockReservation',
  refusalReasons: ['notReserved'],
});

export const holdTargetSchema = z.object({ scope: holdScopeSchema, targetId: z.uuid() });

export const demandSchema = z.object({ demandType: z.string(), demandId: z.uuid() });

/**
 * Ce qu'un blocage toucherait, avant validation : quantité, unités, réservations levées, demandes
 * concernées nommément (0.4 § 6, « Poser un blocage », étape 2).
 */
export const holdImpact = defineQuery({
  name: 'holdImpact',
  input: holdTargetSchema,
  output: z.object({
    quantity: z.int().nonnegative(),
    stockUnits: z.int().nonnegative(),
    reservations: z.int().nonnegative(),
    demands: z.array(demandSchema),
  }),
});

/**
 * Pose un blocage motivé, daté, sur une portée (RG-STK-034, 035). Les réservations du stock touché sont
 * levées et leurs demandes rendues (RG-STK-037).
 */
export const placeStockHold = defineGesture({
  name: 'placeStockHold',
  input: holdTargetSchema.extend({
    reason: z.string().trim().min(1).max(300),
    plannedLiftOn: z.iso.date().nullable(),
    allowsMove: z.boolean(),
  }),
  output: z.object({ holdId: z.uuid(), releasedDemands: z.array(demandSchema) }),
  permission: 'placeStockHold',
  refusalReasons: ['unknownHoldTarget'],
});

/** Lève un blocage, sous permission, avec motif (RG-STK-038). */
export const liftStockHold = defineGesture({
  name: 'liftStockHold',
  input: z.object({ holdId: z.uuid(), reason: z.string().trim().min(1).max(300) }),
  output: z.object({}),
  permission: 'liftStockHold',
  refusalReasons: ['unknownHold', 'holdLifted'],
});

// — Consultations —

export const stockUnitSchema = z.object({
  id: z.uuid(),
  itemId: z.uuid(),
  itemCode: z.string(),
  itemLabel: z.string(),
  principalCode: z.string(),
  locationId: z.uuid(),
  address: z.string(),
  quantity: z.int().positive(),
  qualityStateId: z.uuid(),
  qualityLabel: z.string(),
  status: availabilityStatusSchema,
  batchId: z.uuid().nullable(),
  batchNumber: z.string().nullable(),
  serializedUnitId: z.uuid().nullable(),
  serialNumber: z.string().nullable(),
  handlingUnitId: z.uuid().nullable(),
  handlingUnitCode: z.string().nullable(),
  enteredAt: z.iso.datetime({ offset: true }),
  expiryDate: z.iso.date().nullable(),
});
export type StockUnit = z.infer<typeof stockUnitSchema>;

/** Une case du tableau croisé : les quatre quantités toujours affichées (RG-STK-019 ; 0.4 § 6). */
export const stockCellSchema = z.object({
  qualityStateId: z.uuid(),
  qualityLabel: z.string(),
  pickable: z.boolean(),
  locationId: z.uuid(),
  address: z.string(),
  total: z.int().nonnegative(),
  free: z.int().nonnegative(),
  reserved: z.int().nonnegative(),
  blocked: z.int().nonnegative(),
  moving: z.int().nonnegative(),
});
export type StockCell = z.infer<typeof stockCellSchema>;

export const stockMovementSchema = z.object({
  id: z.uuid(),
  nature: movementNatureSchema,
  stockUnitId: z.uuid(),
  quantity: z.int().positive(),
  direction: z.int(),
  fromAddress: z.string().nullable(),
  toAddress: z.string().nullable(),
  fromQuality: z.string().nullable(),
  toQuality: z.string().nullable(),
  reason: z.string().nullable(),
  comment: z.string().nullable(),
  correctsMovementId: z.uuid().nullable(),
  correctedBy: z.uuid().nullable(),
  author: z.string().nullable(),
  occurredAt: z.iso.datetime({ offset: true }),
});
export type StockMovement = z.infer<typeof stockMovementSchema>;

/** Stock d'une référence sur le site de travail : tableau croisé, unités, mouvements (0.4 § 6). */
export const itemStock = defineQuery({
  name: 'itemStock',
  input: z.object({ itemId: z.uuid(), siteId: z.uuid() }),
  output: z.object({
    itemCode: z.string(),
    itemLabel: z.string(),
    principalId: z.uuid(),
    cells: z.array(stockCellSchema),
    stockUnits: z.array(stockUnitSchema),
    movements: z.array(stockMovementSchema),
  }),
});

/** Le stock d'un emplacement ou d'un support : ce que le déplacement propose de prendre. */
export const stockAt = defineQuery({
  name: 'stockAt',
  input: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('location'), locationId: z.uuid() }),
    z.object({ kind: z.literal('handlingUnit'), handlingUnitId: z.uuid() }),
  ]),
  output: z.object({ stockUnits: z.array(stockUnitSchema) }),
});

export const handlingUnitDetailSchema = z.object({
  id: z.uuid(),
  code: z.string(),
  typeLabel: z.string(),
  returnable: z.boolean(),
  ownerName: z.string().nullable(),
  siteCode: z.string(),
  locationId: z.uuid().nullable(),
  address: z.string().nullable(),
  parentCode: z.string().nullable(),
  children: z.array(z.object({ id: z.uuid(), code: z.string() })),
  active: z.boolean(),
  stockUnits: z.array(stockUnitSchema),
});
export type HandlingUnitDetail = z.infer<typeof handlingUnitDetailSchema>;

/** Fiche d'un support : contenu, localisation, type, consigne (0.4 § 6, « Résultat par support »). */
export const getHandlingUnit = defineQuery({
  name: 'getHandlingUnit',
  input: z.object({ handlingUnitId: z.uuid() }),
  output: z.object({ handlingUnit: handlingUnitDetailSchema }),
});

/**
 * Fiche d'un objet sérialisé (0.2 § 6) : localisation courante ou absence de stock, état qualité,
 * garantie, historique de tous ses passages et leur nombre (RG-REF-016, 017, 043).
 */
export const getSerializedUnit = defineQuery({
  name: 'getSerializedUnit',
  input: z.object({ serializedUnitId: z.uuid() }),
  output: z.object({
    serializedUnit: z.object({
      id: z.uuid(),
      serialNumber: z.string(),
      itemId: z.uuid(),
      itemCode: z.string(),
      itemLabel: z.string(),
      principalCode: z.string(),
      warrantyEndDate: z.iso.date().nullable(),
      passages: z.int().nonnegative(),
      stockUnit: stockUnitSchema.nullable(),
      movements: z.array(stockMovementSchema),
    }),
  }),
});

export const stockHoldSchema = z.object({
  id: z.uuid(),
  scope: holdScopeSchema,
  target: z.string(),
  reason: z.string(),
  origin: z.enum(['manual', 'expiry', 'rule']),
  allowsMove: z.boolean(),
  plannedLiftOn: z.iso.date().nullable(),
  placedBy: z.string().nullable(),
  placedAt: z.iso.datetime({ offset: true }),
  quantity: z.int().nonnegative(),
});
export type StockHold = z.infer<typeof stockHoldSchema>;

/** Blocages en cours sur un site. */
export const listStockHolds = defineQuery({
  name: 'listStockHolds',
  input: z.object({ siteId: z.uuid() }),
  output: z.object({ holds: z.array(stockHoldSchema) }),
});

export const snapshotStateSchema = z.enum(['complete', 'failed', 'absent']);

/** Les photos des derniers jours d'un site, chacune complète, en échec ou absente (RG-STK-061). */
export const listSnapshots = defineQuery({
  name: 'listSnapshots',
  input: z.object({ siteId: z.uuid() }),
  output: z.object({
    snapshotTime: z.string(),
    days: z.array(
      z.object({
        date: z.iso.date(),
        state: snapshotStateSchema,
        snapshotId: z.uuid().nullable(),
        takenAt: z.iso.datetime({ offset: true }).nullable(),
        lines: z.int().nonnegative(),
      }),
    ),
  }),
});

export const snapshotLineSchema = z.object({
  principalCode: z.string(),
  itemCode: z.string(),
  qualityLabel: z.string(),
  address: z.string(),
  quantity: z.int().nonnegative(),
  handlingUnits: z.int().nonnegative(),
  volumeCm3: z.int().nonnegative().nullable(),
});

/** Le détail d'une photo, ou l'écart entre deux photos (0.4 § 6, « Consulter une photo quotidienne »). */
export const getSnapshot = defineQuery({
  name: 'getSnapshot',
  input: z.object({ snapshotId: z.uuid(), comparedTo: z.uuid().nullable() }),
  output: z.object({
    date: z.iso.date(),
    comparedDate: z.iso.date().nullable(),
    lines: z.array(snapshotLineSchema.extend({ difference: z.int().nullable() })),
  }),
});
