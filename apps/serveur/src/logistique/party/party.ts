import { listSuppliers } from '@cairn/contrat';
import type { DatabaseTransaction } from '../../socle/database/index.js';
import { defineQueryHandler } from '../../socle/query/index.js';

/** Un fournisseur actif du donneur d'ordre, ou rien (RG-TRS-002, 005). */
export async function findActiveSupplier(
  transaction: DatabaseTransaction,
  principalId: string,
  supplierId: string,
) {
  return transaction
    .selectFrom('logistics.party')
    .select(['id', 'code', 'name'])
    .where('id', '=', supplierId)
    .where('family', '=', 'supplier')
    .where('principalId', '=', principalId)
    .where('active', '=', true)
    .executeTakeFirst();
}

export const listSuppliersHandler = defineQueryHandler({
  definition: listSuppliers,
  async execute({ db, input }) {
    const suppliers = await db
      .selectFrom('logistics.party')
      .select(['id', 'code', 'name'])
      .where('family', '=', 'supplier')
      .where('principalId', '=', input.principalId)
      .where('active', '=', true)
      .orderBy('name')
      .execute();
    return { suppliers };
  },
});
