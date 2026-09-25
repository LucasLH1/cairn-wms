import { z } from 'zod';
import { defineGesture } from './gesture.js';
import { itemSummarySchema } from './item.js';
import { principalSummarySchema } from './organization.js';
import { supplierSummarySchema } from './party.js';
import { defineQuery } from './query.js';

/** Quantités en unités du niveau de base, entières (fiche 0017, règle 5). */
const quantitySchema = z.int().positive().max(1_000_000_000);

export const expectedReceiptStateSchema = z.enum(['open', 'settled', 'cancelled']);
export type ExpectedReceiptState = z.infer<typeof expectedReceiptStateSchema>;

/**
 * Saisie manuelle d'un attendu (RG-REC-007 à 010) : un donneur d'ordre, un site, un fournisseur, une
 * date d'arrivée prévue, des lignes. Une référence n'y figure qu'une fois (#73).
 */
export const createExpectedReceipt = defineGesture({
  name: 'createExpectedReceipt',
  input: z.object({
    principalId: z.uuid(),
    siteId: z.uuid(),
    supplierId: z.uuid(),
    expectedArrivalDate: z.iso.date(),
    lines: z
      .array(z.object({ itemId: z.uuid(), quantity: quantitySchema }))
      .min(1)
      .max(1000),
  }),
  output: z.object({ expectedReceiptId: z.uuid(), number: z.string() }),
  permission: 'createExpectedReceipt',
  refusalReasons: ['unknownPrincipal', 'unknownSupplier', 'unknownItem', 'duplicateItem'],
});

export const expectedReceiptSummarySchema = z.object({
  id: z.uuid(),
  number: z.string(),
  principal: principalSummarySchema,
  supplier: supplierSummarySchema,
  expectedArrivalDate: z.iso.date(),
  state: expectedReceiptStateSchema,
  lineCount: z.int().nonnegative(),
  version: z.int().positive(),
});
export type ExpectedReceiptSummary = z.infer<typeof expectedReceiptSummarySchema>;

/** Solde d'une ligne : attendu, servi, restant dû (RG-REC-014). */
export const expectedReceiptLineSchema = z.object({
  id: z.uuid(),
  lineNumber: z.int().positive(),
  item: itemSummarySchema,
  expectedQuantity: z.int().nonnegative(),
  servedQuantity: z.int().nonnegative(),
  remainingQuantity: z.int().nonnegative(),
});
export type ExpectedReceiptLine = z.infer<typeof expectedReceiptLineSchema>;

/** Attendus ouverts d'un site (1.1, parcours « Surveiller les attendus »). */
export const listOpenExpectedReceipts = defineQuery({
  name: 'listOpenExpectedReceipts',
  input: z.object({ siteId: z.uuid() }),
  output: z.object({ expectedReceipts: z.array(expectedReceiptSummarySchema) }),
});

/** Un attendu, ses lignes et leur solde. */
export const getExpectedReceipt = defineQuery({
  name: 'getExpectedReceipt',
  input: z.object({ expectedReceiptId: z.uuid() }),
  output: z.object({
    expectedReceipt: expectedReceiptSummarySchema.extend({
      site: z.object({ id: z.uuid(), name: z.string() }),
      lines: z.array(expectedReceiptLineSchema),
    }),
  }),
});
