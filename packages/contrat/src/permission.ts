import { z } from 'zod';

/**
 * Catalogue fermé des permissions élémentaires (RG-ORG-018), groupées par domaine métier comme la fiche
 * rôle les présente (0.1, parcours « Composer un rôle »). Chacune décrit un geste précis, jamais un écran
 * ni un module. Il s'étend avec les gestes que chaque module livre.
 */
export const permissionCatalog = {
  reception: ['createExpectedReceipt', 'openInboundArrival'],
  settings: [
    'administerProvider',
    'administerSites',
    'administerPrincipals',
    'administerRoles',
    'administerUsers',
    'administerExecutionSites',
    'administerTeams',
    'administerNumbering',
    'declareWorkstation',
  ],
} as const;

export type PermissionDomain = keyof typeof permissionCatalog;
export type Permission = (typeof permissionCatalog)[PermissionDomain][number];

export const permissionDomains = ['reception', 'settings'] as const satisfies readonly PermissionDomain[];
const allPermissions = [...permissionCatalog.reception, ...permissionCatalog.settings] as const;
// Un domaine ajouté au catalogue sans être repris ici rend cette ligne fausse à la compilation.
export const permissionCatalogIsComplete: Exclude<Permission, (typeof allPermissions)[number]> extends never
  ? true
  : never = true;
export const permissionSchema = z.enum(allPermissions);

/**
 * Permission dont le retrait au dernier utilisateur actif qui la détient est refusé (RG-ORG-024) : sans
 * elle, plus personne ne peut composer les rôles.
 */
export const ROLE_ADMINISTRATION: Permission = 'administerRoles';

/** Nature d'un rôle, déclarée à sa composition (RG-SUR-022). */
export const roleNatureSchema = z.enum(['operational', 'administrative']);
export type RoleNature = z.infer<typeof roleNatureSchema>;
