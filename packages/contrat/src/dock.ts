import { z } from 'zod';
import { defineGesture } from './gesture.js';
import { carrierSummarySchema } from './party.js';
import { defineQuery } from './query.js';

/** Arrivage en cours sur un quai : le véhicule, son transporteur, depuis quand, par qui. */
export const dockArrivalSchema = z.object({
  id: z.uuid(),
  vehicleIdentification: z.string(),
  carrier: carrierSummarySchema.nullable(),
  arrivedAt: z.iso.datetime({ offset: true }),
  openedBy: z.string().nullable(),
});
export type DockArrival = z.infer<typeof dockArrivalSchema>;

export const dockSummarySchema = z.object({
  id: z.uuid(),
  code: z.string(),
  arrival: dockArrivalSchema.nullable(),
});
export type DockSummary = z.infer<typeof dockSummarySchema>;

/** Quais d'un site, libres ou occupés (1.1, parcours « Ouvrir un arrivage », écran des quais). */
export const listDocks = defineQuery({
  name: 'listDocks',
  input: z.object({ siteId: z.uuid() }),
  output: z.object({ docks: z.array(dockSummarySchema) }),
});

/**
 * Ouverture d'un arrivage (RG-REC-001) : un quai, l'identification du véhicule, un transporteur
 * facultatif. L'heure d'arrivée est celle de la validation (parcours « Ouvrir un arrivage »).
 */
export const openInboundArrival = defineGesture({
  name: 'openInboundArrival',
  input: z.object({
    dockId: z.uuid(),
    vehicleIdentification: z.string().trim().min(1).max(40),
    carrierId: z.uuid().nullable(),
  }),
  output: z.object({ inboundArrivalId: z.uuid() }),
  permission: 'openInboundArrival',
  refusalReasons: ['unknownDock', 'dockOccupied', 'unknownCarrier'],
});
