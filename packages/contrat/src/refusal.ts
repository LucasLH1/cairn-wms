import { z } from 'zod';

/**
 * Catalogue fermé des motifs de refus communs à tous les gestes (fiche 0019, règle 4).
 * Chaque module logistique ajoute les siens dans son propre catalogue.
 */
export const commonRefusalReasonSchema = z.enum([
  'invalidInput',
  'notAuthenticated',
  'permissionDenied',
  'outOfScope',
  'undeclaredWorkstation',
  'editLockHeldByOther',
]);
export type CommonRefusalReason = z.infer<typeof commonRefusalReasonSchema>;

/**
 * Réponse typée d'un geste refusé. `reason` vient d'un catalogue fermé ; `details`
 * porte les données qui permettent de composer le motif à l'écran, jamais un texte libre.
 */
export const refusalSchema = <Reason extends z.ZodType<string>>(reason: Reason) =>
  z.object({
    outcome: z.literal('refused'),
    reason,
    details: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  });

export const commonRefusalSchema = refusalSchema(commonRefusalReasonSchema);
export type CommonRefusal = z.infer<typeof commonRefusalSchema>;
