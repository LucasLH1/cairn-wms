import { sql } from 'kysely';
import { visibleSiteIds } from '../../socle/permission/index.js';
import { containing, type SearchSource } from '../../socle/search/index.js';

/**
 * Les emplacements dans la recherche : par leur identifiant scannable (RG-EMP-007), qui dit le site,
 * ou par leur adresse, unique sur son site (RG-EMP-003). Hors des sites visibles, un identifiant lu
 * exactement se signale avec son site, rien de plus (RG-SUR-064) ; par fragment, rien.
 */
export const locationSearchSource: SearchSource = async (db, userId, text) => {
  const sites = await visibleSiteIds(db, userId);
  const rows = await db
    .selectFrom('logistics.location as location')
    .innerJoin('foundation.site as site', 'site.id', 'location.siteId')
    .innerJoin('logistics.zone as zone', 'zone.id', 'location.zoneId')
    .select([
      'location.id',
      'location.address',
      'location.zoneId',
      'location.siteId',
      'site.code as siteCode',
      'zone.name as zoneName',
      sql<boolean>`upper(location.barcode) = ${text.toUpperCase()}
        or upper(location.address) = ${text.toUpperCase()}`.as('exact'),
    ])
    .where((eb) =>
      eb.or([
        eb(sql`upper(location.barcode)`, '=', text.toUpperCase()),
        eb.and([
          sites.length === 0 ? eb.val(false) : eb('location.siteId', 'in', sites),
          eb.or([
            eb(sql`lower(location.address)`, 'like', containing(text)),
            eb(sql`lower(location.barcode)`, 'like', containing(text)),
          ]),
        ]),
      ]),
    )
    .orderBy('site.code')
    .orderBy('location.traversalRank')
    .limit(20)
    .execute();
  return rows.map((row) => {
    const inScope = sites.includes(row.siteId);
    return {
      type: 'location' as const,
      id: row.id,
      code: inScope ? row.address : null,
      label: inScope ? row.zoneName : null,
      principalCode: null,
      ownerId: inScope ? row.zoneId : null,
      siteCode: row.siteCode,
      outOfScope: !inScope,
      exact: row.exact,
      inactiveCode: false,
    };
  });
};
