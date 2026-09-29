import { z } from 'zod';
import { defineGesture } from './gesture.js';
import { numberingSegmentsSchema } from './numbering.js';
import { permissionSchema, roleNatureSchema } from './permission.js';
import { defineQuery } from './query.js';

/*
 * Administration du module 0.1 (§ 4 « Paramétrage », § 6 « Parcours opérateur ») : prestataire, sites
 * et calendriers, zones, donneurs d'ordre, rôles, utilisateurs, sites d'exécution, équipes,
 * numérotation. Chaque geste enregistre un objet entier : sans identifiant, il le crée.
 */

const code = z
  .string()
  .trim()
  .min(1)
  .max(20)
  .regex(/^[A-Z0-9][A-Z0-9_-]*$/u);
const label = z.string().trim().min(1).max(120);
const optionalText = z.string().trim().max(200).nullable();

export const postalAddressSchema = z.object({
  line1: z.string().trim().min(1).max(200),
  line2: optionalText,
  postalCode: z.string().trim().min(1).max(20),
  city: z.string().trim().min(1).max(120),
  countryCode: z.string().regex(/^[A-Z]{2}$/u),
});
export type PostalAddress = z.infer<typeof postalAddressSchema>;

/** Ce qui reste à solder avant une désactivation : un décompte par nature (RG-ORG-009). */
export const remainingActivitySchema = z.record(z.string(), z.int().positive());

// — Prestataire (RG-ORG-001) —

export const providerSchema = z.object({ name: z.string().nullable() });

export const getProvider = defineQuery({ name: 'getProvider', input: z.object({}), output: providerSchema });

export const saveProvider = defineGesture({
  name: 'saveProvider',
  input: z.object({ name: label }),
  output: z.object({}),
  permission: 'administerProvider',
  refusalReasons: [],
});

// — Sites, calendriers (RG-ORG-002, 031 à 034) —

export const openingRangeSchema = z.object({
  weekday: z.int().min(1).max(7),
  opensAt: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/u),
  closesAt: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/u),
});
export type OpeningRange = z.infer<typeof openingRangeSchema>;

export const siteClosureSchema = z.object({
  day: z.iso.date(),
  kind: z.enum(['publicHoliday', 'exceptional']),
  label: label,
});
export type SiteClosure = z.infer<typeof siteClosureSchema>;

export const siteRowSchema = z.object({
  id: z.uuid(),
  code: z.string(),
  name: z.string(),
  city: z.string().nullable(),
  zoneCount: z.int().nonnegative(),
  active: z.boolean(),
});

export const listSites = defineQuery({
  name: 'listSites',
  input: z.object({}),
  output: z.object({ sites: z.array(siteRowSchema) }),
});

export const zonePurposeSchema = z.enum([
  'storage',
  'picking',
  'receiving',
  'shipping',
  'preparation',
  'consolidation',
  'quarantine',
  'dispute',
  'workshop',
  'destruction',
  'virtual',
]);
export type ZonePurpose = z.infer<typeof zonePurposeSchema>;
export const zoneCohabitationSchema = z.enum(['single', 'shared']);

export const zoneSchema = z.object({
  id: z.uuid(),
  code: z.string(),
  name: z.string(),
  purpose: zonePurposeSchema,
  cohabitation: zoneCohabitationSchema,
  principalId: z.uuid().nullable(),
  active: z.boolean(),
});
export type Zone = z.infer<typeof zoneSchema>;

export const siteDetailSchema = z.object({
  id: z.uuid(),
  code: z.string(),
  name: z.string(),
  timeZone: z.string(),
  address: postalAddressSchema.nullable(),
  active: z.boolean(),
  /** Le code reste modifiable tant que le site n'a pas d'activité (parcours « Créer un site »). */
  codeEditable: z.boolean(),
  openingRanges: z.array(openingRangeSchema),
  closures: z.array(siteClosureSchema),
  zones: z.array(zoneSchema),
  /** Ce qui manque pour activer le site : l'écran le dit au lieu de refuser. */
  missingForActivation: z.array(z.enum(['address', 'zone'])),
});
export type SiteDetail = z.infer<typeof siteDetailSchema>;

export const getSite = defineQuery({
  name: 'getSite',
  input: z.object({ siteId: z.uuid() }),
  output: z.object({ site: siteDetailSchema }),
});

export const saveSite = defineGesture({
  name: 'saveSite',
  input: z.object({
    siteId: z.uuid().nullable(),
    code,
    name: label,
    timeZone: z.string().min(1).max(64),
    address: postalAddressSchema,
  }),
  output: z.object({ siteId: z.uuid() }),
  permission: 'administerSites',
  refusalReasons: ['codeTaken', 'codeLocked', 'unknownTimeZone', 'unknownSite'],
});

export const setSiteActive = defineGesture({
  name: 'setSiteActive',
  input: z.object({ siteId: z.uuid(), active: z.boolean() }),
  output: z.object({}),
  permission: 'administerSites',
  refusalReasons: ['unknownSite', 'activationIncomplete', 'activityRemaining'],
});

export const saveSiteCalendar = defineGesture({
  name: 'saveSiteCalendar',
  input: z.object({ siteId: z.uuid(), openingRanges: z.array(openingRangeSchema).max(50) }),
  output: z.object({}),
  permission: 'administerSites',
  refusalReasons: ['unknownSite', 'overlappingRanges'],
});

export const addSiteClosures = defineGesture({
  name: 'addSiteClosures',
  input: z.object({ siteId: z.uuid(), closures: z.array(siteClosureSchema).min(1).max(100) }),
  output: z.object({ added: z.int().nonnegative() }),
  permission: 'administerSites',
  refusalReasons: ['unknownSite'],
});

export const removeSiteClosure = defineGesture({
  name: 'removeSiteClosure',
  input: z.object({ siteId: z.uuid(), day: z.iso.date() }),
  output: z.object({}),
  permission: 'administerSites',
  refusalReasons: ['unknownSite'],
});

/** Jours fériés du modèle national, pour une année, proposés avant d'être ajoutés. */
export const listPublicHolidays = defineQuery({
  name: 'listPublicHolidays',
  input: z.object({ year: z.int().min(2000).max(2100) }),
  output: z.object({ holidays: z.array(z.object({ day: z.iso.date(), label: z.string() })) }),
});

// — Zones (RG-ORG-003, 004, 010 à 014) —

export const saveZone = defineGesture({
  name: 'saveZone',
  input: z.object({
    zoneId: z.uuid().nullable(),
    siteId: z.uuid(),
    code,
    name: label,
    purpose: zonePurposeSchema,
    cohabitation: zoneCohabitationSchema,
    principalId: z.uuid().nullable(),
  }),
  output: z.object({ zoneId: z.uuid() }),
  permission: 'administerSites',
  refusalReasons: [
    'unknownSite',
    'unknownZone',
    'codeTaken',
    'principalRequired',
    'unknownPrincipal',
    'foreignStock',
  ],
});

export const setZoneActive = defineGesture({
  name: 'setZoneActive',
  input: z.object({ zoneId: z.uuid(), active: z.boolean() }),
  output: z.object({}),
  permission: 'administerSites',
  refusalReasons: ['unknownZone', 'activityRemaining'],
});

// — Donneurs d'ordre (RG-ORG-005 à 009) —

export const principalRowSchema = z.object({
  id: z.uuid(),
  code: z.string(),
  name: z.string(),
  group: z.string().nullable(),
  internal: z.boolean(),
  active: z.boolean(),
});

export const listPrincipalsForAdministration = defineQuery({
  name: 'listPrincipalsForAdministration',
  input: z.object({}),
  output: z.object({ principals: z.array(principalRowSchema) }),
});

export const principalDetailSchema = principalRowSchema.extend({
  address: postalAddressSchema.nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
});

export const getPrincipal = defineQuery({
  name: 'getPrincipal',
  input: z.object({ principalId: z.uuid() }),
  output: z.object({ principal: principalDetailSchema }),
});

export const savePrincipal = defineGesture({
  name: 'savePrincipal',
  input: z.object({
    principalId: z.uuid().nullable(),
    code,
    name: label,
    group: z.string().trim().max(120).nullable(),
    address: postalAddressSchema.nullable(),
    email: z.email().nullable(),
    phone: z.string().trim().max(40).nullable(),
  }),
  output: z.object({ principalId: z.uuid() }),
  permission: 'administerPrincipals',
  refusalReasons: ['unknownPrincipal', 'codeTaken'],
});

export const setPrincipalActive = defineGesture({
  name: 'setPrincipalActive',
  input: z.object({ principalId: z.uuid(), active: z.boolean() }),
  output: z.object({}),
  permission: 'administerPrincipals',
  refusalReasons: ['unknownPrincipal', 'internalPrincipal', 'activityRemaining'],
});

// — Rôles (RG-ORG-018 à 024, RG-SUR-022) —

export const roleRowSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  nature: roleNatureSchema,
  template: z.boolean(),
  holderCount: z.int().nonnegative(),
  permissions: z.array(permissionSchema),
});
export type RoleRow = z.infer<typeof roleRowSchema>;

export const listRoles = defineQuery({
  name: 'listRoles',
  input: z.object({}),
  output: z.object({ roles: z.array(roleRowSchema) }),
});

export const saveRole = defineGesture({
  name: 'saveRole',
  input: z.object({
    roleId: z.uuid().nullable(),
    name: label,
    nature: roleNatureSchema,
    permissions: z.array(permissionSchema).max(500),
  }),
  output: z.object({ roleId: z.uuid() }),
  permission: 'administerRoles',
  refusalReasons: ['unknownRole', 'nameTaken', 'lastRoleAdministrator'],
});

export const deleteRole = defineGesture({
  name: 'deleteRole',
  input: z.object({ roleId: z.uuid() }),
  output: z.object({}),
  permission: 'administerRoles',
  refusalReasons: ['unknownRole', 'roleHeld'],
});

// — Utilisateurs, sites d'exécution (RG-ORG-015 à 017, 021, 023, 024 ; RG-SUR-016 à 018, 026, 128) —

export const userRowSchema = z.object({
  id: z.uuid(),
  displayName: z.string(),
  loginName: z.string(),
  active: z.boolean(),
  roles: z.array(z.string()),
  sites: z.array(z.string()),
  team: z.string().nullable(),
});

export const listUsers = defineQuery({
  name: 'listUsers',
  input: z.object({}),
  output: z.object({ users: z.array(userRowSchema) }),
});

export const userDetailSchema = z.object({
  id: z.uuid(),
  displayName: z.string(),
  loginName: z.string(),
  email: z.string().nullable(),
  active: z.boolean(),
  roleIds: z.array(z.uuid()),
  siteIds: z.array(z.uuid()),
  executionSiteIds: z.array(z.uuid()),
  teamId: z.uuid().nullable(),
  reportsToUserId: z.uuid().nullable(),
  /** Aperçu des permissions effectives, héritage compris (parcours « Créer un utilisateur »). */
  effectivePermissions: z.array(permissionSchema),
});
export type UserDetail = z.infer<typeof userDetailSchema>;

export const getUser = defineQuery({
  name: 'getUser',
  input: z.object({ userId: z.uuid() }),
  output: z.object({ user: userDetailSchema }),
});

export const saveUser = defineGesture({
  name: 'saveUser',
  input: z.object({
    userId: z.uuid().nullable(),
    displayName: label,
    loginName: z.string().trim().min(1).max(120),
    email: z.email().nullable(),
    /** Obligatoire à la création ; à la modification, `null` garde le mot de passe. */
    password: z.string().min(12).max(1000).nullable(),
    roleIds: z.array(z.uuid()).max(50),
    siteIds: z.array(z.uuid()).max(200),
    teamId: z.uuid().nullable(),
    reportsToUserId: z.uuid().nullable(),
  }),
  output: z.object({ userId: z.uuid() }),
  permission: 'administerUsers',
  refusalReasons: [
    'unknownUser',
    'loginNameTaken',
    'passwordRequired',
    'unknownRole',
    'unknownSite',
    'unknownTeam',
    'teamOutsideSites',
    'hierarchyCycle',
    'lastRoleAdministrator',
  ],
});

export const setUserActive = defineGesture({
  name: 'setUserActive',
  input: z.object({ userId: z.uuid(), active: z.boolean() }),
  output: z.object({}),
  permission: 'administerUsers',
  refusalReasons: ['unknownUser', 'siteRequired', 'lastRoleAdministrator'],
});

export const setExecutionSites = defineGesture({
  name: 'setExecutionSites',
  input: z.object({ userId: z.uuid(), siteIds: z.array(z.uuid()).max(200) }),
  output: z.object({}),
  permission: 'administerExecutionSites',
  refusalReasons: ['unknownUser', 'ownExecutionSites', 'executionOutsideSites'],
});

/**
 * Restriction explicite par donneur d'ordre (RG-ORG-017) : une exception, présentée repliée ; une liste
 * vide veut dire « tous les donneurs d'ordre présents sur ses sites » (RG-ORG-016).
 */
export const getPrincipalRestrictions = defineQuery({
  name: 'getPrincipalRestrictions',
  input: z.object({ userId: z.uuid() }),
  output: z.object({ principalIds: z.array(z.uuid()) }),
});

export const setPrincipalRestrictions = defineGesture({
  name: 'setPrincipalRestrictions',
  input: z.object({ userId: z.uuid(), principalIds: z.array(z.uuid()).max(200) }),
  output: z.object({}),
  permission: 'administerUsers',
  refusalReasons: ['unknownUser', 'unknownPrincipal'],
});

// — Équipes (RG-SUR-008 à 014) —

export const teamRowSchema = z.object({
  id: z.uuid(),
  siteId: z.uuid(),
  siteName: z.string(),
  name: z.string(),
  leadUserId: z.uuid().nullable(),
  leadName: z.string().nullable(),
  memberCount: z.int().nonnegative(),
  active: z.boolean(),
});

export const listTeams = defineQuery({
  name: 'listTeams',
  input: z.object({}),
  output: z.object({ teams: z.array(teamRowSchema) }),
});

export const saveTeam = defineGesture({
  name: 'saveTeam',
  input: z.object({
    teamId: z.uuid().nullable(),
    siteId: z.uuid(),
    name: label,
    leadUserId: z.uuid().nullable(),
  }),
  output: z.object({ teamId: z.uuid() }),
  permission: 'administerTeams',
  refusalReasons: ['unknownTeam', 'unknownSite', 'nameTaken', 'unknownUser', 'leadOutsideSite'],
});

export const setTeamActive = defineGesture({
  name: 'setTeamActive',
  input: z.object({ teamId: z.uuid(), active: z.boolean() }),
  output: z.object({}),
  permission: 'administerTeams',
  refusalReasons: ['unknownTeam', 'teamHasMembers'],
});

// — Numérotation (RG-ORG-025 à 030) —

export const numberingSchemeRowSchema = z.object({
  objectType: z.string(),
  segments: numberingSegmentsSchema,
});

export const listNumberingSchemes = defineQuery({
  name: 'listNumberingSchemes',
  input: z.object({}),
  output: z.object({ schemes: z.array(numberingSchemeRowSchema) }),
});

export const saveNumberingScheme = defineGesture({
  name: 'saveNumberingScheme',
  input: z.object({ objectType: z.string().min(1).max(60), segments: numberingSegmentsSchema }),
  output: z.object({}),
  permission: 'administerNumbering',
  refusalReasons: ['unknownObjectType', 'numberingNotUnique'],
});
