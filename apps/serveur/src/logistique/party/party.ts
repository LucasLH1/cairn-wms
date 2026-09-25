import { listCarriers, listSuppliers } from '@cairn/contrat';
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

/** Un transporteur actif du prestataire, ou rien (RG-TRS-003, 005). */
export async function findActiveCarrier(transaction: DatabaseTransaction, carrierId: string) {
  return transaction
    .selectFrom('logistics.party')
    .select(['id', 'code', 'name'])
    .where('id', '=', carrierId)
    .where('family', '=', 'carrier')
    .where('active', '=', true)
    .executeTakeFirst();
}

export const listCarriersHandler = defineQueryHandler({
  definition: listCarriers,
  async execute({ db }) {
    const carriers = await db
      .selectFrom('logistics.party')
      .select(['id', 'code', 'name'])
      .where('family', '=', 'carrier')
      .where('active', '=', true)
      .orderBy('name')
      .execute();
    return { carriers };
  },
});
