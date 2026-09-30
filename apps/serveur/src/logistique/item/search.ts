import type { SearchResult } from '@cairn/contrat';
import { sql } from 'kysely';
import { containing, type SearchSource } from '../../socle/search/index.js';
import { visiblePrincipalIds } from '../organization/index.js';

/**
 * Les références dans la recherche : par l'un de ses identifiants scannables, quelle qu'en soit la
 * nature (RG-REF-008), par son code, ou par son libellé. Désignée exactement hors du périmètre, une
 * référence est signalée sans son contenu (RG-SUR-064) ; par fragment, elle ne l'est pas du tout.
 */
export const itemSearchSource: SearchSource = async (db, userId, text) => {
  const visible = await visiblePrincipalIds(db, userId);
  const seen = (principalId: string) => visible === null || visible.includes(principalId);
  const exact = await db
    .selectFrom('logistics.item as item')
    .innerJoin('logistics.principal as principal', 'principal.id', 'item.principalId')
    .leftJoin('logistics.itemBarcode as barcode', (join) =>
      join.onRef('barcode.itemId', '=', 'item.id').on('barcode.code', '=', text),
    )
    .select([
      'item.id',
      'item.code',
      'item.shortLabel',
      'item.principalId',
      'principal.code as principalCode',
      sql<boolean>`coalesce(not ${sql.ref('barcode.active')}, false)`.as('inactiveCode'),
    ])
    .where((eb) => eb.or([eb('barcode.code', '=', text), eb(sql`lower(item.code)`, '=', text.toLowerCase())]))
    .execute();
  const partial = await db
    .selectFrom('logistics.item as item')
    .innerJoin('logistics.principal as principal', 'principal.id', 'item.principalId')
    .select([
      'item.id',
      'item.code',
      'item.shortLabel',
      'item.principalId',
      'principal.code as principalCode',
    ])
    .where((eb) =>
      eb.or([
        eb(sql`lower(item.code)`, 'like', containing(text)),
        eb(sql`lower(item.short_label)`, 'like', containing(text)),
      ]),
    )
    .$if(visible !== null, (query) =>
      visible !== null && visible.length > 0
        ? query.where('item.principalId', 'in', visible)
        : query.where(sql<boolean>`false`),
    )
    .orderBy('item.code')
    .limit(20)
    .execute();
  const results = new Map<string, SearchResult>();
  for (const row of exact) {
    const inScope = seen(row.principalId);
    results.set(row.id, {
      type: 'item',
      id: row.id,
      code: inScope ? row.code : null,
      label: inScope ? row.shortLabel : null,
      principalCode: row.principalCode,
      siteCode: null,
      outOfScope: !inScope,
      exact: true,
      inactiveCode: inScope && row.inactiveCode,
    });
  }
  for (const row of partial) {
    if (results.has(row.id)) continue;
    results.set(row.id, {
      type: 'item',
      id: row.id,
      code: row.code,
      label: row.shortLabel,
      principalCode: row.principalCode,
      siteCode: null,
      outOfScope: false,
      exact: false,
      inactiveCode: false,
    });
  }
  return [...results.values()];
};
