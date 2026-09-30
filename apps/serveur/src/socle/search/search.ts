import { search, type SearchObjectType, type SearchResult } from '@cairn/contrat';
import type { Kysely } from 'kysely';
import type { DB } from '../database/index.js';
import { defineQueryHandler, recordOutOfScopeQuery } from '../query/index.js';

/** Ce qu'un module apporte à la recherche : ses objets qui répondent au texte cherché. */
export type SearchSource = (db: Kysely<DB>, userId: string, text: string) => Promise<readonly SearchResult[]>;

/** Motif `like` qui cherche le texte tel quel, jokers compris (`%`, `_` et `\` échappés). */
export function containing(text: string): string {
  return `%${text.toLowerCase().replace(/[\\%_]/gu, (sign) => `\\${sign}`)}%`;
}

/** Au-delà, la recherche se précise : une entrée unique n'est pas un écran de liste. */
const MAX_RESULTS = 50;

/** Le terme du glossaire sous lequel le journal désigne chaque type d'objet trouvé. */
const traceObjectTypes: Readonly<Record<SearchObjectType, string>> = {
  item: 'Item',
  party: 'Party',
  expectedReceipt: 'ExpectedReceipt',
};

/**
 * L'entrée de recherche unique (RG-SUR-059) : chaque module réalisé y apporte ses objets. Les objets
 * désignés exactement par le texte viennent en tête — c'est l'un d'eux qu'une lecture ouvre
 * (RG-SUR-060) —, ceux hors du périmètre ne sont signalés que comme existants (RG-SUR-064).
 */
export function searchHandler(sources: readonly SearchSource[]) {
  return defineQueryHandler({
    definition: search,
    async execute({ db, userId, input }) {
      const found = (await Promise.all(sources.map((source) => source(db, userId, input.text)))).flat();
      const results = [...found].sort((a, b) => Number(b.exact) - Number(a.exact)).slice(0, MAX_RESULTS);
      // L'utilisateur apprend qu'un objet existe sans le voir : c'est un refus pour cause de
      // périmètre, tracé ici pour toutes les sources, un événement par objet (RG-SUR-064, 065).
      for (const result of results) {
        if (result.outOfScope) {
          await recordOutOfScopeQuery(db, userId, search.name, [
            { type: traceObjectTypes[result.type], id: result.id },
          ]);
        }
      }
      return { results };
    },
  });
}
