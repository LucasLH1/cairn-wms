import { sql, type Kysely } from 'kysely';
import type { DB } from '../../socle/database/index.js';
import type { RemainingActivity } from '../organization/index.js';

/*
 * Ce que le stock dit aux autres modules, remis au branchement (app.ts) : le socle et les modules qui
 * précèdent 0.4 n'en dépendent pas. Clé de décompte : « stockUnits », libellée côté écrans.
 */

const count = (units: number): RemainingActivity => (units > 0 ? { stockUnits: units } : {});

async function countUnits(db: Kysely<DB>, where: ReturnType<typeof sql<boolean>>): Promise<number> {
  const { units } = await sql<{ units: number }>`
    select count(*)::int as units from logistics.stock_unit unit where ${where}
  `
    .execute(db)
    .then((result) => result.rows[0] ?? { units: 0 });
  return units;
}

/** Le stock d'un emplacement : il ne se désactive pas, son type ne change pas (RG-EMP-005, 008). */
export const stockInLocation = async (db: Kysely<DB>, locationId: string) =>
  count(await countUnits(db, sql<boolean>`unit.location_id = ${locationId}`));

/** Le stock d'une zone : elle ne se désactive pas (RG-ORG-013). */
export const stockInZone = async (db: Kysely<DB>, zoneId: string) =>
  count(
    await countUnits(
      db,
      sql<boolean>`unit.location_id in (select id from logistics.location where zone_id = ${zoneId})`,
    ),
  );

/** Le stock d'un autre donneur d'ordre dans une zone : elle ne lui est pas réservée (RG-ORG-011). */
export const foreignStockInZone = async (db: Kysely<DB>, zoneId: string, principalId: string) =>
  count(
    await countUnits(
      db,
      sql<boolean>`unit.principal_id <> ${principalId}
        and unit.location_id in (select id from logistics.location where zone_id = ${zoneId})`,
    ),
  );

/** Le stock d'un site, ou d'un donneur d'ordre : ce qui reste à solder avant la désactivation (RG-ORG-009). */
export const stockOnSite = async (db: Kysely<DB>, siteId: string) =>
  count(await countUnits(db, sql<boolean>`unit.site_id = ${siteId}`));
export const stockOfPrincipal = async (db: Kysely<DB>, principalId: string) =>
  count(await countUnits(db, sql<boolean>`unit.principal_id = ${principalId}`));

/** Le stock confié à un sous-traitant : dans ses emplacements virtuels (RG-TRS-033, RG-EMP-042). */
export const stockAtSubcontractor = async (db: Kysely<DB>, partyId: string) =>
  count(
    await countUnits(
      db,
      sql<boolean>`unit.location_id in (select id from logistics.location where party_id = ${partyId})`,
    ),
  );

/** Le stock de références, en unité de base, et les sites où il se trouve (RG-REF-041). */
export async function stockOfItems(
  db: Kysely<DB>,
  itemIds: readonly string[],
): Promise<ReadonlyMap<string, { quantity: number; sites: string[] }>> {
  if (itemIds.length === 0) return new Map();
  const rows = await db
    .selectFrom('logistics.stockUnit as unit')
    .innerJoin('foundation.site as site', 'site.id', 'unit.siteId')
    .select([
      'unit.itemId',
      sql<number>`sum(unit.quantity)::int`.as('quantity'),
      sql<string[]>`array_agg(distinct site.code order by site.code)`.as('sites'),
    ])
    .where('unit.itemId', 'in', itemIds)
    .groupBy('unit.itemId')
    .execute();
  return new Map(rows.map((row) => [row.itemId, { quantity: row.quantity, sites: row.sites }]));
}

/** Un mouvement a-t-il touché la référence ? Alors son axe de gestion est figé (RG-REF-013). */
export async function hasStockMovement(db: Kysely<DB>, itemId: string): Promise<boolean> {
  const movement = await db
    .selectFrom('logistics.stockMovement')
    .select('id')
    .where('itemId', '=', itemId)
    .executeTakeFirst();
  return movement !== undefined;
}
