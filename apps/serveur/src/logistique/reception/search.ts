import { sql } from 'kysely';
import { visibleSiteIds } from '../../socle/permission/index.js';
import { containing, type SearchSource } from '../../socle/search/index.js';
import { visiblePrincipalIds } from '../organization/index.js';

/**
 * Les attendus dans la recherche, par leur numéro. Hors du périmètre — site ou donneur d'ordre —, un
 * numéro désigné exactement est signalé avec le site et le donneur d'ordre, rien de plus (RG-SUR-064).
 */
export const expectedReceiptSearchSource: SearchSource = async (db, userId, text) => {
  const [sites, principals] = await Promise.all([
    visibleSiteIds(db, userId),
    visiblePrincipalIds(db, userId),
  ]);
  const rows = await db
    .selectFrom('logistics.expectedReceipt as receipt')
    .innerJoin('foundation.site as site', 'site.id', 'receipt.siteId')
    .innerJoin('logistics.principal as principal', 'principal.id', 'receipt.principalId')
    .innerJoin('logistics.party as supplier', 'supplier.id', 'receipt.supplierId')
    .select([
      'receipt.id',
      'receipt.number',
      'receipt.siteId',
      'receipt.principalId',
      'site.code as siteCode',
      'principal.code as principalCode',
      'supplier.name as supplierName',
      sql<boolean>`lower(receipt.number) = ${text.toLowerCase()}`.as('exact'),
    ])
    .where(sql`lower(receipt.number)`, 'like', containing(text))
    .orderBy('receipt.number', 'desc')
    .limit(20)
    .execute();
  return rows.flatMap((row) => {
    const inScope =
      sites.includes(row.siteId) && (principals === null || principals.includes(row.principalId));
    if (!inScope && !row.exact) return [];
    return [
      {
        type: 'expectedReceipt' as const,
        id: row.id,
        code: inScope ? row.number : null,
        label: inScope ? row.supplierName : null,
        principalCode: row.principalCode,
        siteCode: row.siteCode,
        outOfScope: !inScope,
        exact: row.exact,
        inactiveCode: false,
      },
    ];
  });
};
