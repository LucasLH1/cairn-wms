import { listPrincipals } from '@cairn/contrat';
import type { DatabaseTransaction } from '../../socle/database/index.js';
import { defineQueryHandler } from '../../socle/query/index.js';

/** Un donneur d'ordre actif, ou rien : un donneur d'ordre désactivé n'entre dans aucun nouveau flux (RG-ORG-008). */
export async function findActivePrincipal(transaction: DatabaseTransaction, principalId: string) {
  return transaction
    .selectFrom('logistics.principal')
    .select(['id', 'code', 'name'])
    .where('id', '=', principalId)
    .where('active', '=', true)
    .executeTakeFirst();
}

export const listPrincipalsHandler = defineQueryHandler({
  definition: listPrincipals,
  async execute({ db }) {
    const principals = await db
      .selectFrom('logistics.principal')
      .select(['id', 'code', 'name'])
      .where('active', '=', true)
      .orderBy('name')
      .execute();
    return { principals };
  },
});
