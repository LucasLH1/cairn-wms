import { z } from 'zod';
import { defineQuery } from './query.js';

/** Donneur d'ordre tel que les écrans le choisissent (0.1). */
export const principalSummarySchema = z.object({ id: z.uuid(), code: z.string(), name: z.string() });
export type PrincipalSummary = z.infer<typeof principalSummarySchema>;

/** Donneurs d'ordre actifs de l'instance (RG-ORG-005, 016). */
export const listPrincipals = defineQuery({
  name: 'listPrincipals',
  input: z.object({}),
  // Le donneur d'ordre interne porte le matériel du prestataire (RG-ORG-007) : les écrans ne le
  // proposent pas d'office.
  output: z.object({ principals: z.array(principalSummarySchema.extend({ internal: z.boolean() })) }),
});
