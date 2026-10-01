import { z } from 'zod';
import { defineGesture } from './gesture.js';
import { defineQuery } from './query.js';
import { pickingRuleSchema } from './stock.js';

/*
 * Module 0.2 — Référentiel produit (RG-REF-001 à 051). Une référence appartient à un donneur d'ordre et
 * un seul (RG-REF-001) ; sa manipulation est un geste du bureau (RG-SUR-127).
 */

export const trackingModeSchema = z.enum(['quantity', 'batch', 'serial']);
export type TrackingMode = z.infer<typeof trackingModeSchema>;

export const itemStateSchema = z.enum(['draft', 'active', 'dormant', 'obsolete']);
export type ItemState = z.infer<typeof itemStateSchema>;

/** Natures d'identifiant scannable : liste fournie par le produit, non extensible (0.2 § 4). */
export const barcodeNatureSchema = z.enum(['internal', 'gtin', 'supplier', 'principal', 'free']);
export type BarcodeNature = z.infer<typeof barcodeNatureSchema>;

export const customFieldTypeSchema = z.enum(['text', 'number', 'date', 'list', 'boolean']);
export type CustomFieldType = z.infer<typeof customFieldTypeSchema>;

export const adrPackingGroupSchema = z.enum(['I', 'II', 'III']);

/** Ce qui manque à un brouillon pour devenir actif (RG-REF-040). */
export const activationRequirementSchema = z.enum(['requiredCustomFields', 'completePackaging', 'barcode']);
export type ActivationRequirement = z.infer<typeof activationRequirementSchema>;

/** Code ISO 4217 d'une devise (RG-REF-049). */
export const currencySchema = z.string().regex(/^[A-Z]{3}$/u);

export const itemSummarySchema = z.object({ id: z.uuid(), code: z.string(), shortLabel: z.string() });
export type ItemSummary = z.infer<typeof itemSummarySchema>;

/** Références d'un donneur d'ordre qui peuvent être attendues : actives (RG-REF-005, 006). */
export const listItems = defineQuery({
  name: 'listItems',
  input: z.object({ principalId: z.uuid() }),
  output: z.object({ items: z.array(itemSummarySchema) }),
});

export const itemRowSchema = z.object({
  id: z.uuid(),
  code: z.string(),
  shortLabel: z.string(),
  familyName: z.string().nullable(),
  trackingMode: trackingModeSchema,
  serialBatchTracking: z.boolean(),
  state: itemStateSchema,
  createdAt: z.iso.datetime({ offset: true }),
  /** Quantité en stock, en unité de base, et les sites où elle se trouve (RG-REF-041). */
  stockQuantity: z.int().nonnegative(),
  stockSites: z.array(z.string()),
  /** Un brouillon qui remplit RG-REF-040 s'active depuis la liste (0.2 § 6, « Compléter les brouillons »). */
  activable: z.boolean(),
});
export type ItemRow = z.infer<typeof itemRowSchema>;

/**
 * Liste des références d'un donneur d'ordre, filtrée par famille, état, axe de gestion (0.2 § 6,
 * « Créer une référence »). Les brouillons seuls se trient par ancienneté (RG-REF-041).
 */
export const searchItems = defineQuery({
  name: 'searchItems',
  input: z.object({
    principalId: z.uuid(),
    familyId: z.uuid().nullable(),
    state: itemStateSchema.nullable(),
    trackingMode: trackingModeSchema.nullable(),
    search: z.string().max(120).nullable(),
    draftsOnly: z.boolean(),
  }),
  output: z.object({ items: z.array(itemRowSchema) }),
});

export const packagingLevelSchema = z.object({
  name: z.string().trim().min(1).max(60),
  /** Unités du niveau immédiatement inférieur ; `null` pour le niveau de base (RG-REF-019). */
  unitsOfLowerLevel: z.int().positive().nullable(),
  grossWeightGrams: z.int().positive().nullable(),
  lengthMm: z.int().positive().nullable(),
  widthMm: z.int().positive().nullable(),
  heightMm: z.int().positive().nullable(),
});
export type PackagingLevel = z.infer<typeof packagingLevelSchema>;

/** Un niveau est complet quand il porte toutes ses caractéristiques physiques (RG-REF-020, 040). */
export function isCompletePackagingLevel(level: PackagingLevel): boolean {
  return (
    level.grossWeightGrams !== null &&
    level.lengthMm !== null &&
    level.widthMm !== null &&
    level.heightMm !== null
  );
}

/** Unités de base contenues dans chaque niveau : produit des coefficients jusqu'à lui (0.2 § 6, étape 4). */
export function baseUnitsPerLevel(levels: readonly Pick<PackagingLevel, 'unitsOfLowerLevel'>[]): number[] {
  const units: number[] = [];
  for (const level of levels) units.push((units.at(-1) ?? 1) * (level.unitsOfLowerLevel ?? 1));
  return units;
}

export const itemBarcodeSchema = z.object({
  code: z.string(),
  nature: barcodeNatureSchema,
  packagingRank: z.int().nonnegative().nullable(),
  active: z.boolean(),
});
export type ItemBarcode = z.infer<typeof itemBarcodeSchema>;

export const customValueSchema = z.union([z.string(), z.number(), z.boolean()]);
export type CustomValue = z.infer<typeof customValueSchema>;

export const componentSchema = z.object({
  itemId: z.uuid(),
  code: z.string(),
  shortLabel: z.string(),
  state: itemStateSchema,
  quantity: z.int().positive(),
});
export type Component = z.infer<typeof componentSchema>;

export const substitutionSchema = z.object({
  itemId: z.uuid(),
  code: z.string(),
  shortLabel: z.string(),
  state: itemStateSchema,
});

export const declaredValueEntrySchema = z.object({
  valueCents: z.int().nonnegative().nullable(),
  currency: z.string().nullable(),
  setAt: z.iso.datetime({ offset: true }),
});

export const adrClassificationSchema = z.object({
  adrClass: z.string().trim().min(1).max(10),
  unNumber: z.string().regex(/^\d{4}$/u),
  packingGroup: adrPackingGroupSchema.nullable(),
});
export type AdrClassification = z.infer<typeof adrClassificationSchema>;

export const itemDetailSchema = z.object({
  id: z.uuid(),
  principalId: z.uuid(),
  principalCode: z.string(),
  currency: z.string().nullable(),
  code: z.string(),
  shortLabel: z.string(),
  longLabel: z.string().nullable(),
  familyId: z.uuid().nullable(),
  trackingMode: trackingModeSchema,
  serialBatchTracking: z.boolean(),
  /** Vrai dès qu'un mouvement de stock a été enregistré : l'axe de gestion est figé (RG-REF-013). */
  trackingModeLocked: z.boolean(),
  tracksExpiryDate: z.boolean(),
  tracksManufacturingDate: z.boolean(),
  adr: adrClassificationSchema.nullable(),
  isKit: z.boolean(),
  state: itemStateSchema,
  createdAt: z.iso.datetime({ offset: true }),
  version: z.int().positive(),
  declaredValueCents: z.int().nonnegative().nullable(),
  declaredValueHistory: z.array(declaredValueEntrySchema),
  packagingLevels: z.array(packagingLevelSchema),
  barcodes: z.array(itemBarcodeSchema),
  customValues: z.record(z.string(), customValueSchema),
  kitComponents: z.array(componentSchema),
  repairBomComponents: z.array(componentSchema),
  /** Références déclarées capables de remplacer celle-ci (RG-REF-031, 032). */
  replacements: z.array(substitutionSchema),
  activationMissing: z.array(activationRequirementSchema),
  /** Surcharge de la règle de prélèvement du donneur d'ordre ; `null` : celle du donneur d'ordre (RG-STK-054). */
  pickingRule: pickingRuleSchema.nullable(),
  stockQuantity: z.int().nonnegative(),
});
export type ItemDetail = z.infer<typeof itemDetailSchema>;

export const getItem = defineQuery({
  name: 'getItem',
  input: z.object({ itemId: z.uuid() }),
  output: z.object({ item: itemDetailSchema }),
});

export const barcodeMatchSchema = z.object({
  itemId: z.uuid(),
  principalId: z.uuid(),
  principalCode: z.string(),
  itemCode: z.string(),
  shortLabel: z.string(),
  state: itemStateSchema,
  nature: barcodeNatureSchema,
  packagingRank: z.int().nonnegative().nullable(),
  /** Un code désactivé retrouve encore la référence, avec un avertissement (RG-REF-010). */
  barcodeActive: z.boolean(),
});
export type BarcodeMatch = z.infer<typeof barcodeMatchSchema>;

/**
 * Retrouve la référence d'un code lu, quelle qu'en soit la nature (RG-REF-008). Hors contexte de flux,
 * le même code chez deux donneurs d'ordre rend deux réponses : l'écran fait choisir (0.2 § 5).
 */
export const findItemsByBarcode = defineQuery({
  name: 'findItemsByBarcode',
  input: z.object({ code: z.string().trim().min(1).max(120), principalId: z.uuid().nullable() }),
  output: z.object({ matches: z.array(barcodeMatchSchema) }),
});

export const itemFamilySchema = z.object({
  id: z.uuid(),
  parentId: z.uuid().nullable(),
  code: z.string(),
  name: z.string(),
  active: z.boolean(),
  itemCount: z.int().nonnegative(),
});
export type ItemFamily = z.infer<typeof itemFamilySchema>;

export const listItemFamilies = defineQuery({
  name: 'listItemFamilies',
  input: z.object({ principalId: z.uuid() }),
  output: z.object({ families: z.array(itemFamilySchema) }),
});

export const customFieldSchema = z.object({
  id: z.uuid(),
  label: z.string(),
  fieldType: customFieldTypeSchema,
  listValues: z.array(z.string()),
  required: z.boolean(),
  active: z.boolean(),
  /** Références qui renseignent ce champ (RG-REF-037). */
  itemCount: z.int().nonnegative(),
});
export type CustomField = z.infer<typeof customFieldSchema>;

export const listCustomFields = defineQuery({
  name: 'listCustomFields',
  input: z.object({ principalId: z.uuid() }),
  output: z.object({ currency: z.string().nullable(), fields: z.array(customFieldSchema) }),
});

const label = z.string().trim().min(1).max(200);
const itemCode = z.string().trim().min(1).max(60);
const barcode = z.string().trim().min(1).max(120);

/**
 * Crée ou modifie l'identité d'une référence : code, libellés, famille, axe de gestion, dates, ADR, kit
 * (RG-REF-001 à 004, 011 à 013, 024, 030, 042, 045). Une référence naît en brouillon ; son donneur
 * d'ordre ne change plus.
 */
export const saveItem = defineGesture({
  name: 'saveItem',
  input: z.object({
    itemId: z.uuid().nullable(),
    principalId: z.uuid(),
    code: itemCode,
    shortLabel: label,
    longLabel: z.string().trim().max(2000).nullable(),
    familyId: z.uuid().nullable(),
    trackingMode: trackingModeSchema,
    serialBatchTracking: z.boolean(),
    tracksExpiryDate: z.boolean(),
    tracksManufacturingDate: z.boolean(),
    adr: adrClassificationSchema.nullable(),
    isKit: z.boolean(),
  }),
  output: z.object({ itemId: z.uuid() }),
  permission: 'manageItems',
  refusalReasons: [
    'unknownItem',
    'unknownPrincipal',
    'principalLocked',
    'codeTaken',
    'unknownFamily',
    'trackingModeLocked',
    'batchTrackingSerialOnly',
    'kitWithRepairBom',
  ],
});

/**
 * Crée une référence inconnue à la volée, en brouillon, avec le strict minimum (RG-REF-038). Le code lu
 * devient son identifiant scannable, pour que le scan suivant la retrouve (RG-REF-008).
 */
export const createDraftItem = defineGesture({
  name: 'createDraftItem',
  input: z.object({
    principalId: z.uuid(),
    code: itemCode,
    shortLabel: label,
    trackingMode: trackingModeSchema,
  }),
  output: z.object({ itemId: z.uuid() }),
  permission: 'createDraftItem',
  refusalReasons: ['unknownPrincipal', 'codeTaken', 'barcodeTaken'],
});

/**
 * Niveaux de conditionnement, du niveau de base au plus haut (RG-REF-018 à 021). Un coefficient modifié
 * n'affecte pas le stock, exprimé en unité de base (RG-REF-023).
 */
export const saveItemPackaging = defineGesture({
  name: 'saveItemPackaging',
  input: z.object({ itemId: z.uuid(), levels: z.array(packagingLevelSchema).min(1).max(10) }),
  output: z.object({}),
  permission: 'manageItems',
  refusalReasons: ['unknownItem', 'invalidCoefficient', 'barcodeOnRemovedLevel'],
});

/** Ajoute un identifiant scannable, unique au sein du donneur d'ordre (RG-REF-007, 009, 022). */
export const addItemBarcode = defineGesture({
  name: 'addItemBarcode',
  input: z.object({
    itemId: z.uuid(),
    code: barcode,
    nature: barcodeNatureSchema,
    packagingRank: z.int().nonnegative().nullable(),
  }),
  output: z.object({}),
  permission: 'manageItems',
  refusalReasons: ['unknownItem', 'barcodeTaken', 'unknownPackagingLevel'],
});

/** Un identifiant se désactive, jamais ne se supprime (RG-REF-010). */
export const setItemBarcodeActive = defineGesture({
  name: 'setItemBarcodeActive',
  input: z.object({ itemId: z.uuid(), code: barcode, active: z.boolean() }),
  output: z.object({}),
  permission: 'manageItems',
  refusalReasons: ['unknownItem', 'unknownBarcode'],
});

/** Valeurs des champs personnalisés d'une référence, selon leur type (RG-REF-034). */
export const saveItemCustomValues = defineGesture({
  name: 'saveItemCustomValues',
  input: z.object({
    itemId: z.uuid(),
    values: z.array(z.object({ customFieldId: z.uuid(), value: customValueSchema.nullable() })).max(100),
  }),
  output: z.object({}),
  permission: 'manageItems',
  refusalReasons: ['unknownItem', 'unknownCustomField', 'invalidCustomValue'],
});

export const compositionKindSchema = z.enum(['kit', 'repairBom']);
export type CompositionKind = z.infer<typeof compositionKindSchema>;

/**
 * Composition d'un kit ou nomenclature de réparation : des références du même donneur d'ordre
 * (RG-REF-024, 026, 028). Un kit ne se contient pas lui-même (RG-REF-027) ; un kit ne porte pas de
 * nomenclature (RG-REF-030).
 */
export const setItemComposition = defineGesture({
  name: 'setItemComposition',
  input: z.object({
    itemId: z.uuid(),
    kind: compositionKindSchema,
    components: z.array(z.object({ itemId: z.uuid(), quantity: z.int().positive() })).max(200),
  }),
  output: z.object({}),
  permission: 'manageItems',
  refusalReasons: ['unknownItem', 'componentOtherPrincipal', 'notAKit', 'kitWithRepairBom', 'kitCycle'],
});

/** Références qui peuvent remplacer celle-ci : un lien orienté, une proposition (RG-REF-031 à 033). */
export const setItemReplacements = defineGesture({
  name: 'setItemReplacements',
  input: z.object({ itemId: z.uuid(), replacingItemIds: z.array(z.uuid()).max(50) }),
  output: z.object({}),
  permission: 'manageItems',
  refusalReasons: ['unknownItem', 'componentOtherPrincipal'],
});

/**
 * Valeur unitaire déclarée, en centimes de la devise du donneur d'ordre (RG-REF-047, 049). La valeur
 * précédente et sa date restent (RG-REF-050) ; l'absence de valeur est licite (RG-REF-051).
 */
export const setItemDeclaredValue = defineGesture({
  name: 'setItemDeclaredValue',
  input: z.object({ itemId: z.uuid(), valueCents: z.int().nonnegative().nullable() }),
  output: z.object({}),
  permission: 'manageItems',
  refusalReasons: ['unknownItem', 'currencyMissing'],
});

/**
 * Change l'état d'une référence (RG-REF-005). L'activation exige RG-REF-040 ; un brouillon ne s'obtient
 * qu'à la création. Le passage en obsolète d'une référence en stock est permis, avec avertissement.
 */
export const changeItemState = defineGesture({
  name: 'changeItemState',
  input: z.object({ itemId: z.uuid(), state: z.enum(['active', 'dormant', 'obsolete']) }),
  output: z.object({ stockQuantity: z.int().nonnegative() }),
  permission: 'manageItems',
  refusalReasons: ['unknownItem', 'itemActivationIncomplete', 'invalidTransition'],
});

/** Famille d'un donneur d'ordre, en liste plate ou en arborescence (RG-REF-004, 0.2 § 4). */
export const saveItemFamily = defineGesture({
  name: 'saveItemFamily',
  input: z.object({
    familyId: z.uuid().nullable(),
    principalId: z.uuid(),
    parentId: z.uuid().nullable(),
    code: itemCode,
    name: label,
    active: z.boolean(),
  }),
  output: z.object({ familyId: z.uuid() }),
  permission: 'manageItems',
  refusalReasons: ['unknownPrincipal', 'unknownFamily', 'codeTaken', 'familyCycle'],
});

/**
 * Déclare ou modifie un champ personnalisé (RG-REF-034). Une liste de valeurs en porte au moins une ;
 * le type d'un champ déjà renseigné ne change plus.
 */
export const saveCustomField = defineGesture({
  name: 'saveCustomField',
  input: z.object({
    customFieldId: z.uuid().nullable(),
    principalId: z.uuid(),
    label: z.string().trim().min(1).max(80),
    fieldType: customFieldTypeSchema,
    listValues: z.array(z.string().trim().min(1).max(80)).max(100),
    required: z.boolean(),
    active: z.boolean(),
  }),
  output: z.object({ customFieldId: z.uuid() }),
  permission: 'manageCustomFields',
  refusalReasons: [
    'unknownPrincipal',
    'unknownCustomField',
    'nameTaken',
    'listValuesRequired',
    'fieldTypeLocked',
  ],
});

/**
 * Retire un champ personnalisé : supprimé s'il n'est renseigné nulle part, sinon désactivé seulement,
 * sa valeur restant lisible (RG-REF-037).
 */
export const removeCustomField = defineGesture({
  name: 'removeCustomField',
  input: z.object({ customFieldId: z.uuid() }),
  output: z.object({ removal: z.enum(['deleted', 'deactivated']), itemCount: z.int().nonnegative() }),
  permission: 'manageCustomFields',
  refusalReasons: ['unknownCustomField'],
});

/** Devise unique d'un donneur d'ordre (RG-REF-049). */
export const setPrincipalCurrency = defineGesture({
  name: 'setPrincipalCurrency',
  input: z.object({ principalId: z.uuid(), currency: currencySchema.nullable() }),
  output: z.object({}),
  permission: 'administerPrincipals',
  refusalReasons: ['unknownPrincipal'],
});
