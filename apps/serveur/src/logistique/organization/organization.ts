import { listPrincipals } from '@cairn/contrat';
import type { DatabaseTransaction } from '../../socle/database/index.js';
import { defineQueryHandler } from '../../socle/query/index.js';
import { visiblePrincipalIds } from './visibility.js';

/** Un donneur d'ordre actif, ou rien : un donneur d'ordre désactivé n'entre dans aucun nouveau flux (RG-ORG-008). */
export async function findActivePrincipal(transaction: DatabaseTransaction, principalId: string) {
  return transaction
    .selectFrom('logistics.principal')
    .select(['id', 'code', 'name'])
    .where('id', '=', principalId)
    .where('active', '=', true)
    .executeTakeFirst();
}

/** Donneurs d'ordre actifs que l'utilisateur voit (RG-ORG-016, 017). */
export const listPrincipalsHandler = defineQueryHandler({
  definition: listPrincipals,
  async execute({ db, userId }) {
    const visible = await visiblePrincipalIds(db, userId);
    const principals = await db
      .selectFrom('logistics.principal')
      .select(['id', 'code', 'name'])
      .where('active', '=', true)
      .$if(visible !== null, (query) => query.where('id', 'in', visible ?? []))
      .orderBy('name')
      .execute();
    return { principals };
  },
});
