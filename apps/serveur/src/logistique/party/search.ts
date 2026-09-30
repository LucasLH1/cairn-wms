import { sql } from 'kysely';
import { containing, type SearchSource } from '../../socle/search/index.js';
import { visiblePrincipalIds } from '../organization/index.js';

/**
 * Les tiers dans la recherche, par leur code ou leur nom. Un client final anonymisé ne se retrouve
 * plus par son nom (RG-TRS-020) ; une fiche absorbée par une fusion renvoie à celle qui l'a absorbée.
 * Transporteurs et sous-traitants appartiennent au prestataire : tous les voient (RG-TRS-003).
 */
export const partySearchSource: SearchSource = async (db, userId, text) => {
  const visible = await visiblePrincipalIds(db, userId);
  const rows = await db
    .selectFrom('logistics.party as party')
    .leftJoin('logistics.principal as principal', 'principal.id', 'party.principalId')
    .select([
      'party.id',
      'party.code',
      'party.name',
      'party.principalId',
      'party.anonymizedAt',
      'principal.code as principalCode',
      sql<boolean>`lower(party.code) = ${text.toLowerCase()}`.as('exact'),
    ])
    .where('party.mergedIntoPartyId', 'is', null)
    .where((eb) =>
      eb.or([
        eb(sql`lower(party.code)`, '=', text.toLowerCase()),
        eb(sql`lower(party.code)`, 'like', containing(text)),
        eb.and([eb('party.anonymizedAt', 'is', null), eb(sql`lower(party.name)`, 'like', containing(text))]),
      ]),
    )
    .orderBy('party.name')
    .limit(40)
    .execute();
  return rows.flatMap((row) => {
    const inScope = row.principalId === null || visible === null || visible.includes(row.principalId);
    // Hors du périmètre, seul un code désigné exactement se signale (RG-SUR-064).
    if (!inScope && !row.exact) return [];
    return [
      {
        type: 'party' as const,
        id: row.id,
        code: inScope ? row.code : null,
        label: !inScope ? null : row.anonymizedAt === null ? row.name : null,
        principalCode: row.principalCode,
        siteCode: null,
        outOfScope: !inScope,
        exact: row.exact,
        inactiveCode: false,
      },
    ];
  });
};
