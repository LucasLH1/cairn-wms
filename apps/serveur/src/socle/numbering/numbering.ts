import { sql } from 'kysely';
import type { DatabaseTransaction } from '../database/index.js';

/**
 * Attribue le prochain identifiant d'un type d'objet (RG-ORG-025 à 030). Le compteur avance dans la
 * transaction du geste : un geste annulé laisse un trou, c'est admis (RG-ORG-030) ; un identifiant
 * attribué ne change plus (RG-ORG-028). Le préfixe dit le type d'objet (RG-SUR-061).
 */
export async function nextNumber(transaction: DatabaseTransaction, objectType: string): Promise<string> {
  const scheme = await transaction
    .updateTable('foundation.numberingScheme')
    .set({ nextValue: sql`next_value + 1` })
    .where('objectType', '=', objectType)
    .returning(['prefix', 'width', sql<string>`(next_value - 1)::text`.as('value')])
    .executeTakeFirstOrThrow(() => new Error(`no numbering scheme for ${objectType}`));
  return `${scheme.prefix}${scheme.value.padStart(scheme.width, '0')}`;
}
