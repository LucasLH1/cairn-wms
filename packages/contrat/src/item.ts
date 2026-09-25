import { z } from 'zod';
import { defineQuery } from './query.js';

export const itemSummarySchema = z.object({ id: z.uuid(), code: z.string(), shortLabel: z.string() });
export type ItemSummary = z.infer<typeof itemSummarySchema>;

/** Références d'un donneur d'ordre qui peuvent être attendues : actives (RG-REF-005, 006). */
export const listItems = defineQuery({
  name: 'listItems',
  input: z.object({ principalId: z.uuid() }),
  output: z.object({ items: z.array(itemSummarySchema) }),
});
