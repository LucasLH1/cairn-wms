import { z } from 'zod';
import { defineGesture } from './gesture.js';

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
