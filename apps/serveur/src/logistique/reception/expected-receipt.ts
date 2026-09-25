import {
  createExpectedReceipt,
  expectedReceiptStateSchema,
  getExpectedReceipt,
  listOpenExpectedReceipts,
} from '@cairn/contrat';
import { sql } from 'kysely';
import { z } from 'zod';
import type { Database } from '../../socle/database/index.js';
import { defineGestureHandler, GestureRefusal } from '../../socle/gesture/index.js';
import { nextNumber } from '../../socle/numbering/index.js';
import { canSeeSite } from '../../socle/permission/index.js';
import { defineQueryHandler, QueryRefusal } from '../../socle/query/index.js';
import { signalChange } from '../../socle/signal/index.js';
import { defineTraceEventType } from '../../socle/trace-event/index.js';
import { findReceivableItemIds } from '../item/index.js';
import { findActivePrincipal } from '../organization/index.js';
import { findActiveSupplier } from '../party/index.js';

export const EXPECTED_RECEIPT = 'ExpectedReceipt';

export const expectedReceiptCreatedEvent = defineTraceEventType(
  'expectedReceiptCreated',
  z.object({
    number: z.string(),
    principalId: z.string(),
    siteId: z.string(),
    supplierId: z.string(),
    expectedArrivalDate: z.string(),
    lines: z.array(z.object({ lineNumber: z.int(), itemId: z.string(), quantity: z.int() })),
  }),
);

/** Saisie manuelle d'un attendu (RG-REC-007 à 010, 014). */
export const createExpectedReceiptHandler = defineGestureHandler({
  definition: createExpectedReceipt,
  scope: (input) => Promise.resolve({ siteId: input.siteId }),
  async execute({ transaction, input, appendEvent }) {
    const principal = await findActivePrincipal(transaction, input.principalId);
    if (principal === undefined) throw new GestureRefusal('unknownPrincipal');
    const supplier = await findActiveSupplier(transaction, input.principalId, input.supplierId);
    if (supplier === undefined) throw new GestureRefusal('unknownSupplier');

    const itemIds = input.lines.map((line) => line.itemId);
    const duplicate = itemIds.find((itemId, index) => itemIds.indexOf(itemId) !== index);
    if (duplicate !== undefined) throw new GestureRefusal('duplicateItem', { itemId: duplicate });
    const receivable = await findReceivableItemIds(transaction, input.principalId, itemIds);
    const unknown = itemIds.find((itemId) => !receivable.has(itemId));
    if (unknown !== undefined) throw new GestureRefusal('unknownItem', { itemId: unknown });

    const number = await nextNumber(transaction, EXPECTED_RECEIPT);
    const created = await transaction
      .insertInto('logistics.expectedReceipt')
      .values({
        number,
        principalId: input.principalId,
        siteId: input.siteId,
        supplierId: input.supplierId,
        expectedArrivalDate: input.expectedArrivalDate,
      })
      .returning(['id', 'version'])
      .executeTakeFirstOrThrow();
    const lines = input.lines.map((line, index) => ({
      lineNumber: index + 1,
      itemId: line.itemId,
      quantity: line.quantity,
    }));
    await transaction
      .insertInto('logistics.expectedReceiptLine')
      .values(
        lines.map((line) => ({
          expectedReceiptId: created.id,
          lineNumber: line.lineNumber,
          itemId: line.itemId,
          expectedQuantity: line.quantity,
        })),
      )
      .execute();
    await appendEvent({
      eventType: expectedReceiptCreatedEvent,
      data: { number, ...input, lines },
      objects: [
        { type: EXPECTED_RECEIPT, id: created.id },
        { type: 'Principal', id: input.principalId },
        { type: 'Supplier', id: input.supplierId },
        { type: 'Site', id: input.siteId },
        ...lines.map((line) => ({ type: 'Item', id: line.itemId })),
      ],
    });
    await signalChange(transaction, {
      objectType: EXPECTED_RECEIPT,
      objectId: created.id,
      version: created.version,
    });
    return { expectedReceiptId: created.id, number };
  },
});

function summaries(db: Database) {
  return db
    .selectFrom('logistics.expectedReceipt as receipt')
    .innerJoin('logistics.principal as principal', 'principal.id', 'receipt.principalId')
    .innerJoin('logistics.party as supplier', 'supplier.id', 'receipt.supplierId')
    .select([
      'receipt.id',
      'receipt.number',
      'receipt.siteId',
      'receipt.expectedArrivalDate',
      'receipt.state',
      'receipt.version',
      'principal.id as principalId',
      'principal.code as principalCode',
      'principal.name as principalName',
      'supplier.id as supplierId',
      'supplier.code as supplierCode',
      'supplier.name as supplierName',
      sql<number>`(select count(*)::int from logistics.expected_receipt_line line where line.expected_receipt_id = receipt.id)`.as(
        'lineCount',
      ),
    ]);
}

type SummaryRow = Awaited<ReturnType<ReturnType<typeof summaries>['execute']>>[number];

function toSummary(row: SummaryRow) {
  return {
    id: row.id,
    number: row.number,
    principal: { id: row.principalId, code: row.principalCode, name: row.principalName },
    supplier: { id: row.supplierId, code: row.supplierCode, name: row.supplierName },
    expectedArrivalDate: row.expectedArrivalDate,
    state: expectedReceiptStateSchema.parse(row.state),
    lineCount: row.lineCount,
    version: row.version,
  };
}

/** Attendus ouverts d'un site, dans la visibilité de l'utilisateur (RG-EXI-050). */
export const listOpenExpectedReceiptsHandler = defineQueryHandler({
  definition: listOpenExpectedReceipts,
  async execute({ db, userId, input }) {
    if (!(await canSeeSite(db, userId, input.siteId))) throw new QueryRefusal('outOfScope');
    const rows = await summaries(db)
      .where('receipt.siteId', '=', input.siteId)
      .where('receipt.state', '=', 'open')
      .orderBy('receipt.expectedArrivalDate')
      .orderBy('receipt.number')
      .execute();
    return { expectedReceipts: rows.map(toSummary) };
  },
});

/** Un attendu et le solde de ses lignes (RG-REC-014). */
export const getExpectedReceiptHandler = defineQueryHandler({
  definition: getExpectedReceipt,
  async execute({ db, userId, input }) {
    const row = await summaries(db)
      .innerJoin('foundation.site as site', 'site.id', 'receipt.siteId')
      .select(['site.name as siteName'])
      .where('receipt.id', '=', input.expectedReceiptId)
      .executeTakeFirst();
    if (row === undefined || !(await canSeeSite(db, userId, row.siteId)))
      throw new QueryRefusal('outOfScope');
    const lines = await db
      .selectFrom('logistics.expectedReceiptLine as line')
      .innerJoin('logistics.item as item', 'item.id', 'line.itemId')
      .select([
        'line.id',
        'line.lineNumber',
        'line.expectedQuantity',
        'line.servedQuantity',
        'item.id as itemId',
        'item.code as itemCode',
        'item.shortLabel as itemShortLabel',
      ])
      .where('line.expectedReceiptId', '=', row.id)
      .orderBy('line.lineNumber')
      .execute();
    return {
      expectedReceipt: {
        ...toSummary(row),
        site: { id: row.siteId, name: row.siteName },
        lines: lines.map((line) => ({
          id: line.id,
          lineNumber: line.lineNumber,
          item: { id: line.itemId, code: line.itemCode, shortLabel: line.itemShortLabel },
          expectedQuantity: line.expectedQuantity,
          servedQuantity: line.servedQuantity,
          // Restant dû (RG-REC-014), jamais négatif : un excédent reçu se lira comme un écart, pas
          // comme un solde. Choix de réalisation, à confirmer (#73).
          remainingQuantity: Math.max(line.expectedQuantity - line.servedQuantity, 0),
        })),
      },
    };
  },
});
