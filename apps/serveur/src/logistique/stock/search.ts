import { sql } from 'kysely';
import { visibleSiteIds } from '../../socle/permission/index.js';
import { containing, type SearchSource } from '../../socle/search/index.js';
import { visiblePrincipalIds } from '../organization/index.js';

/**
 * Les supports dans la recherche, par leur identifiant (RG-STK-045) ; hors des sites visibles, un
 * identifiant lu exactement se signale avec son site, rien de plus (RG-SUR-064).
 */
export const handlingUnitSearchSource: SearchSource = async (db, userId, text) => {
  const sites = await visibleSiteIds(db, userId);
  const rows = await db
    .selectFrom('logistics.handlingUnit as support')
    .innerJoin('foundation.site as site', 'site.id', 'support.siteId')
    .leftJoin('logistics.location as location', 'location.id', 'support.locationId')
    .select([
      'support.id',
      'support.code',
      'support.siteId',
      'site.code as siteCode',
      'location.address',
      sql<boolean>`upper(support.code) = ${text.toUpperCase()}`.as('exact'),
    ])
    .where((eb) =>
      eb.or([
        eb(sql`upper(support.code)`, '=', text.toUpperCase()),
        eb.and([
          sites.length === 0 ? eb.val(false) : eb('support.siteId', 'in', sites),
          eb(sql`lower(support.code)`, 'like', containing(text)),
        ]),
      ]),
    )
    .orderBy('support.code')
    .limit(20)
    .execute();
  return rows.map((row) => {
    const inScope = sites.includes(row.siteId);
    return {
      type: 'handlingUnit' as const,
      id: row.id,
      code: inScope ? row.code : null,
      label: inScope ? row.address : null,
      principalCode: null,
      ownerId: null,
      siteCode: row.siteCode,
      outOfScope: !inScope,
      exact: row.exact,
      inactiveCode: false,
    };
  });
};

/**
 * Les objets sérialisés, par leur numéro de série, sans avoir à connaître la référence (0.2 § 6). Hors
 * du périmètre, un numéro lu exactement se signale avec son donneur d'ordre (RG-SUR-064).
 */
export const serializedUnitSearchSource: SearchSource = async (db, userId, text) => {
  const principals = await visiblePrincipalIds(db, userId);
  const rows = await db
    .selectFrom('logistics.serializedUnit as serial')
    .innerJoin('logistics.item as item', 'item.id', 'serial.itemId')
    .innerJoin('logistics.principal as principal', 'principal.id', 'serial.principalId')
    .select([
      'serial.id',
      'serial.serialNumber',
      'serial.principalId',
      'principal.code as principalCode',
      'item.shortLabel',
    ])
    .where(sql`upper(serial.serial_number)`, '=', text.toUpperCase())
    .limit(20)
    .execute();
  return rows.map((row) => {
    const inScope = principals === null || principals.includes(row.principalId);
    return {
      type: 'serializedUnit' as const,
      id: row.id,
      code: inScope ? row.serialNumber : null,
      label: inScope ? row.shortLabel : null,
      principalCode: row.principalCode,
      ownerId: null,
      siteCode: null,
      outOfScope: !inScope,
      exact: true,
      inactiveCode: false,
    };
  });
};
