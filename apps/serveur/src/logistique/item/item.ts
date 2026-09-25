import { listItems } from '@cairn/contrat';
import type { DatabaseTransaction } from '../../socle/database/index.js';
import { defineQueryHandler } from '../../socle/query/index.js';

/** Une référence obsolète ne peut plus être reçue (RG-REF-006). */
const RECEIVABLE_STATES = ['draft', 'active', 'dormant'] as const;

/** Parmi ces références, celles du donneur d'ordre qui peuvent être attendues. */
export async function findReceivableItemIds(
  transaction: DatabaseTransaction,
  principalId: string,
  itemIds: readonly string[],
): Promise<ReadonlySet<string>> {
  if (itemIds.length === 0) return new Set();
  const rows = await transaction
    .selectFrom('logistics.item')
    .select('id')
    .where('principalId', '=', principalId)
    .where('id', 'in', itemIds)
    .where('state', 'in', RECEIVABLE_STATES)
    .execute();
  return new Set(rows.map((row) => row.id));
}

export const listItemsHandler = defineQueryHandler({
  definition: listItems,
  async execute({ db, input }) {
    const items = await db
      .selectFrom('logistics.item')
      .select(['id', 'code', 'shortLabel'])
      .where('principalId', '=', input.principalId)
      .where('state', 'in', RECEIVABLE_STATES)
      .orderBy('code')
      .execute();
    return { items };
  },
});
