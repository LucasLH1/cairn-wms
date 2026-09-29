import { z } from 'zod';
import { defineGesture } from './gesture.js';
import { defineQuery } from './query.js';

/*
 * Module 0.5 — Tiers (RG-TRS-001 à 034). Fournisseurs et clients finaux appartiennent à un donneur
 * d'ordre ; transporteurs et sous-traitants au prestataire (RG-TRS-002, 003).
 */

export const partyFamilySchema = z.enum(['supplier', 'endCustomer', 'carrier', 'subcontractor']);
export type PartyFamily = z.infer<typeof partyFamilySchema>;
export const principalFamilies: readonly PartyFamily[] = ['supplier', 'endCustomer'];

export const addressUsageSchema = z.enum(['delivery', 'return', 'billing', 'headOffice']);
export type AddressUsage = z.infer<typeof addressUsageSchema>;

export const subcontractingNatureSchema = z.enum([
  'repair',
  'destruction',
  'recycling',
  'refurbishment',
  'other',
]);

/**
 * Format du code postal selon le pays (RG-TRS-009) : la saisie s'adapte au pays choisi. Un pays absent
 * de la liste accepte tout code non vide.
 */
export const postalCodePatterns: Readonly<Record<string, RegExp>> = {
  FR: /^\d{5}$/u,
  DE: /^\d{5}$/u,
  ES: /^\d{5}$/u,
  IT: /^\d{5}$/u,
  BE: /^\d{4}$/u,
  CH: /^\d{4}$/u,
  LU: /^\d{4}$/u,
  AT: /^\d{4}$/u,
  NL: /^\d{4} ?[A-Z]{2}$/u,
  PT: /^\d{4}-\d{3}$/u,
  GB: /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/u,
};

/** Vrai si l'adresse est complète et son code postal au format de son pays. */
export function isDeliverableAddress(address: {
  line1: string | null;
  postalCode: string | null;
  city: string | null;
  countryCode: string;
}): boolean {
  if (address.line1 === null || address.city === null || address.postalCode === null) return false;
  if (address.line1.trim() === '' || address.city.trim() === '') return false;
  const pattern = postalCodePatterns[address.countryCode];
  return pattern === undefined ? address.postalCode.trim() !== '' : pattern.test(address.postalCode.trim());
}

export const partyAddressSchema = z.object({
  id: z.uuid(),
  usage: addressUsageSchema,
  isDefault: z.boolean(),
  recipient: z.string().nullable(),
  line1: z.string().nullable(),
  line2: z.string().nullable(),
  postalCode: z.string().nullable(),
  city: z.string().nullable(),
  countryCode: z.string(),
  active: z.boolean(),
});
export type PartyAddress = z.infer<typeof partyAddressSchema>;

export const partyRowSchema = z.object({
  id: z.uuid(),
  family: partyFamilySchema,
  principalId: z.uuid().nullable(),
  code: z.string(),
  name: z.string(),
  city: z.string().nullable(),
  active: z.boolean(),
  toComplete: z.boolean(),
  anonymized: z.boolean(),
  mergedIntoPartyId: z.uuid().nullable(),
});
export type PartyRow = z.infer<typeof partyRowSchema>;

/** Tiers d'une famille : ceux d'un donneur d'ordre, ou ceux du prestataire. */
export const listParties = defineQuery({
  name: 'listParties',
  input: z.object({
    family: partyFamilySchema,
    principalId: z.uuid().nullable(),
    search: z.string().max(120).nullable(),
  }),
  output: z.object({ parties: z.array(partyRowSchema) }),
});

export const carrierServiceSchema = z.object({
  id: z.uuid(),
  code: z.string(),
  name: z.string(),
  direction: z.enum(['outbound', 'return', 'both']),
  maxWeightGrams: z.int().positive().nullable(),
  maxLengthMm: z.int().positive().nullable(),
  maxWidthMm: z.int().positive().nullable(),
  maxHeightMm: z.int().positive().nullable(),
  maxDimensionSumMm: z.int().positive().nullable(),
  maxInsuredValueCents: z.int().positive().nullable(),
  acceptsDangerousGoods: z.boolean(),
  label: z.enum(['none', 'carrier', 'provider']),
  leadTimeDays: z.int().nonnegative(),
  active: z.boolean(),
});
export type CarrierService = z.infer<typeof carrierServiceSchema>;

export const carrierAccountSchema = z.object({
  id: z.uuid(),
  principalId: z.uuid().nullable(),
  accountNumber: z.string(),
  contractReference: z.string().nullable(),
  active: z.boolean(),
});
export type CarrierAccount = z.infer<typeof carrierAccountSchema>;

export const partyDetailSchema = partyRowSchema.extend({
  email: z.string().nullable(),
  phone: z.string().nullable(),
  subcontractingNature: subcontractingNatureSchema.nullable(),
  issuesDestructionCertificate: z.boolean(),
  lastFlowAt: z.iso.datetime({ offset: true }).nullable(),
  /** Échéance d'anonymisation d'un client final, s'il a une durée de conservation (RG-TRS-017). */
  anonymizationDueOn: z.iso.date().nullable(),
  addresses: z.array(partyAddressSchema),
  services: z.array(carrierServiceSchema),
  accounts: z.array(carrierAccountSchema),
});
export type PartyDetail = z.infer<typeof partyDetailSchema>;

export const getParty = defineQuery({
  name: 'getParty',
  input: z.object({ partyId: z.uuid() }),
  output: z.object({ party: partyDetailSchema }),
});

/** Fournisseurs actifs d'un donneur d'ordre (RG-TRS-002, 005) : ce qu'un attendu propose. */
export const supplierSummarySchema = z.object({ id: z.uuid(), code: z.string(), name: z.string() });
export type SupplierSummary = z.infer<typeof supplierSummarySchema>;

export const listSuppliers = defineQuery({
  name: 'listSuppliers',
  input: z.object({ principalId: z.uuid() }),
  output: z.object({ suppliers: z.array(supplierSummarySchema) }),
});

export const carrierSummarySchema = z.object({ id: z.uuid(), code: z.string(), name: z.string() });
export type CarrierSummary = z.infer<typeof carrierSummarySchema>;

/** Transporteurs actifs du prestataire, utilisables par tous les donneurs d'ordre (RG-TRS-003). */
export const listCarriers = defineQuery({
  name: 'listCarriers',
  input: z.object({}),
  output: z.object({ carriers: z.array(carrierSummarySchema) }),
});

const text = z.string().trim().max(200);

/**
 * Crée ou modifie un tiers : code, raison sociale ou nom, coordonnées (RG-TRS-001, 006). Un client final
 * sans clé fournie reçoit une clé générée (RG-TRS-012).
 */
export const saveParty = defineGesture({
  name: 'saveParty',
  input: z.object({
    partyId: z.uuid().nullable(),
    family: partyFamilySchema,
    principalId: z.uuid().nullable(),
    code: z.string().trim().max(60).nullable(),
    name: z.string().trim().min(1).max(200),
    email: z.email().nullable(),
    phone: text.nullable(),
    subcontractingNature: subcontractingNatureSchema.nullable(),
    issuesDestructionCertificate: z.boolean(),
  }),
  output: z.object({ partyId: z.uuid(), code: z.string() }),
  permission: null,
  refusalReasons: [
    'unknownParty',
    'unknownPrincipal',
    'codeTaken',
    'codeRequired',
    'principalMismatch',
    'anonymizedParty',
  ],
});

export const setPartyActive = defineGesture({
  name: 'setPartyActive',
  input: z.object({ partyId: z.uuid(), active: z.boolean() }),
  output: z.object({}),
  permission: null,
  refusalReasons: ['unknownParty', 'activityRemaining'],
});

/** Une adresse d'un tiers, par usage, l'une par défaut de son usage (RG-TRS-007 à 009). */
export const saveAddress = defineGesture({
  name: 'saveAddress',
  input: z.object({
    addressId: z.uuid().nullable(),
    partyId: z.uuid(),
    usage: addressUsageSchema,
    isDefault: z.boolean(),
    recipient: text.nullable(),
    line1: text.min(1),
    line2: text.nullable(),
    postalCode: z.string().trim().min(1).max(20),
    city: text.min(1),
    countryCode: z.string().regex(/^[A-Z]{2}$/u),
  }),
  output: z.object({ addressId: z.uuid() }),
  permission: null,
  refusalReasons: ['unknownParty', 'unknownAddress', 'postalCodeFormat', 'anonymizedParty'],
});

/** Une adresse ne se supprime pas si elle a servi : elle se désactive (RG-TRS-011). */
export const setAddressActive = defineGesture({
  name: 'setAddressActive',
  input: z.object({ addressId: z.uuid(), active: z.boolean() }),
  output: z.object({}),
  permission: null,
  refusalReasons: ['unknownAddress'],
});

// — Transporteurs (RG-TRS-025 à 031) —

export const saveCarrierService = defineGesture({
  name: 'saveCarrierService',
  input: carrierServiceSchema.omit({ id: true, active: true }).extend({
    serviceId: z.uuid().nullable(),
    carrierId: z.uuid(),
    code: z.string().trim().min(1).max(40),
    name: z.string().trim().min(1).max(120),
  }),
  output: z.object({ serviceId: z.uuid() }),
  permission: 'administerProviderParties',
  refusalReasons: ['unknownParty', 'codeTaken', 'unknownService'],
});

export const setCarrierServiceActive = defineGesture({
  name: 'setCarrierServiceActive',
  input: z.object({ serviceId: z.uuid(), active: z.boolean() }),
  output: z.object({}),
  permission: 'administerProviderParties',
  refusalReasons: ['unknownService'],
});

export const saveCarrierAccount = defineGesture({
  name: 'saveCarrierAccount',
  input: z.object({
    accountId: z.uuid().nullable(),
    carrierId: z.uuid(),
    principalId: z.uuid().nullable(),
    accountNumber: z.string().trim().min(1).max(60),
    contractReference: z.string().trim().max(120).nullable(),
  }),
  output: z.object({ accountId: z.uuid() }),
  permission: 'administerProviderParties',
  refusalReasons: ['unknownParty', 'unknownPrincipal', 'codeTaken', 'unknownAccount'],
});

export const setCarrierAccountActive = defineGesture({
  name: 'setCarrierAccountActive',
  input: z.object({ accountId: z.uuid(), active: z.boolean() }),
  output: z.object({}),
  permission: 'administerProviderParties',
  refusalReasons: ['unknownAccount'],
});

// — Clients finaux : doublons, fusion, anonymisation (RG-TRS-015 à 024) —

/** Paires de clients finaux manifestement identiques : même nom, même adresse électronique ou même téléphone. */
export const listEndCustomerDuplicates = defineQuery({
  name: 'listEndCustomerDuplicates',
  input: z.object({ principalId: z.uuid() }),
  output: z.object({
    pairs: z.array(
      z.object({ first: partyRowSchema, second: partyRowSchema, reason: z.enum(['name', 'email', 'phone']) }),
    ),
  }),
});

export const mergeableFieldSchema = z.enum(['name', 'email', 'phone']);

/**
 * Fusion de deux fiches, décidée par un humain habilité (RG-TRS-015) : la fiche conservée prend, champ par
 * champ, la valeur retenue ; l'absorbée reste consultable en lecture seule, ses adresses s'ajoutent à la
 * conservée (RG-TRS-016).
 */
export const mergeEndCustomers = defineGesture({
  name: 'mergeEndCustomers',
  input: z.object({
    keptPartyId: z.uuid(),
    absorbedPartyId: z.uuid(),
    takeFromAbsorbed: z.array(mergeableFieldSchema).max(3),
  }),
  output: z.object({}),
  permission: 'mergeEndCustomers',
  refusalReasons: [
    'unknownParty',
    'notEndCustomers',
    'principalMismatch',
    'alreadyMerged',
    'anonymizedParty',
    'samePartyTwice',
  ],
});

/** Anonymisation à la demande, avant échéance, avec motif ; irréversible (RG-TRS-022, 023). */
export const anonymizeEndCustomer = defineGesture({
  name: 'anonymizeEndCustomer',
  input: z.object({ partyId: z.uuid(), reason: z.string().trim().min(1).max(500) }),
  output: z.object({}),
  permission: 'anonymizeEndCustomers',
  refusalReasons: ['unknownParty', 'notEndCustomers', 'anonymizedParty', 'openFlows'],
});

/** Durée de conservation des données identifiantes des clients finaux, par donneur d'ordre (RG-TRS-017). */
export const setEndCustomerRetention = defineGesture({
  name: 'setEndCustomerRetention',
  input: z.object({ principalId: z.uuid(), months: z.int().min(1).max(600).nullable() }),
  output: z.object({}),
  permission: 'administerPrincipals',
  refusalReasons: ['unknownPrincipal'],
});

/** Échéances d'anonymisation par donneur d'ordre (0.5, parcours « Suivre les échéances »). */
export const listAnonymizationSchedule = defineQuery({
  name: 'listAnonymizationSchedule',
  input: z.object({}),
  output: z.object({
    principals: z.array(
      z.object({
        principalId: z.uuid(),
        principalName: z.string(),
        retentionMonths: z.int().positive().nullable(),
        dueSoon: z.int().nonnegative(),
        postponed: z.int().nonnegative(),
        anonymizedInPeriod: z.int().nonnegative(),
      }),
    ),
  }),
});
