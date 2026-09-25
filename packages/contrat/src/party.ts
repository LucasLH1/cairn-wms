import { z } from 'zod';
import { defineQuery } from './query.js';

export const supplierSummarySchema = z.object({ id: z.uuid(), code: z.string(), name: z.string() });
export type SupplierSummary = z.infer<typeof supplierSummarySchema>;

/** Fournisseurs actifs d'un donneur d'ordre (RG-TRS-002, 005). */
export const listSuppliers = defineQuery({
  name: 'listSuppliers',
  input: z.object({ principalId: z.uuid() }),
  output: z.object({ suppliers: z.array(supplierSummarySchema) }),
});
