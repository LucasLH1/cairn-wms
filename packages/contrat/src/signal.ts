import { z } from 'zod';

/** Route du canal temps réel (fiche 0026). */
export const SIGNALS_PATH = '/api/signals';

/**
 * Signal de changement : le type d'objet, son identifiant, son numéro de version — rien d'autre
 * (fiche 0026, règle 2). L'écran relit l'objet par le contrat, avec ses droits.
 */
export const changeSignalSchema = z.object({
  objectType: z.string().min(1),
  objectId: z.string().min(1),
  version: z.int().nonnegative(),
});
export type ChangeSignal = z.infer<typeof changeSignalSchema>;

/**
 * Abonnement d'un écran : à un objet précis, ou à tout un type d'objet pour une liste affichée.
 * Chaque message remplace l'abonnement précédent de la connexion.
 */
export const subscriptionSchema = z.object({
  subscribe: z
    .array(z.object({ objectType: z.string().min(1), objectId: z.string().min(1).optional() }))
    .max(500),
});
export type Subscription = z.infer<typeof subscriptionSchema>;
