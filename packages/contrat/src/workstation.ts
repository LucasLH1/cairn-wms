import { z } from 'zod';
import { defineGesture } from './gesture.js';
import { defineQuery } from './query.js';

/**
 * Déclaration d'un poste (fiche 0027, règle 4) : un administrateur déclare le poste dans l'instance
 * et l'associe au navigateur d'où il fait le geste, qui reçoit un cookie de poste durable.
 */
export const declareWorkstation = defineGesture({
  name: 'declareWorkstation',
  input: z.object({ name: z.string().trim().min(1).max(100), siteId: z.uuid() }),
  output: z.object({ workstationId: z.uuid() }),
  permission: 'declareWorkstation',
  refusalReasons: ['workstationNameTaken', 'unknownSite'],
});

/** Postes déclarés, actifs et révoqués (fiche 0027, règle 4). */
export const listWorkstations = defineQuery({
  name: 'listWorkstations',
  input: z.object({}),
  output: z.object({
    workstations: z.array(
      z.object({
        id: z.uuid(),
        name: z.string(),
        siteId: z.uuid(),
        siteName: z.string(),
        revoked: z.boolean(),
      }),
    ),
  }),
});

/** Révoque un poste : son cookie ne vaut plus rien, aussitôt (fiche 0027). */
export const revokeWorkstation = defineGesture({
  name: 'revokeWorkstation',
  input: z.object({ workstationId: z.uuid() }),
  output: z.object({}),
  permission: 'declareWorkstation',
  refusalReasons: ['unknownWorkstation'],
});
