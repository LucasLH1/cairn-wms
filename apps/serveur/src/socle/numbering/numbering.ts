import { numberingSegmentsSchema, type NumberingSegment } from '@cairn/contrat';
import { sql } from 'kysely';
import type { DatabaseTransaction } from '../database/index.js';

/** Ce que la composition d'un identifiant peut demander au contexte du geste. */
export interface NumberingContext {
  readonly siteCode?: string;
  readonly principalCode?: string;
  /** Instant de référence pour l'année et le mois ; l'instant du geste par défaut. */
  readonly at?: Date;
}

/** Le compteur d'un type d'objet a atteint sa borne : la création est bloquée, jamais remise à zéro. */
export class NumberingExhaustedError extends Error {
  constructor(readonly objectType: string) {
    super(`numbering exhausted for ${objectType}`);
    this.name = 'NumberingExhaustedError';
  }
}

function segmentValue(
  segment: NumberingSegment,
  context: NumberingContext,
  at: Date,
  objectType: string,
): string {
  switch (segment.kind) {
    case 'literal':
      return segment.value;
    case 'site':
      if (context.siteCode === undefined)
        throw new Error(`${objectType}: site code required by its numbering scheme`);
      return context.siteCode;
    case 'principal':
      if (context.principalCode === undefined)
        throw new Error(`${objectType}: principal code required by its numbering scheme`);
      return context.principalCode;
    case 'year':
      return String(at.getUTCFullYear());
    case 'month':
      return String(at.getUTCMonth() + 1).padStart(2, '0');
    case 'counter':
      return '';
  }
}

/**
 * Attribue le prochain identifiant d'un type d'objet (RG-ORG-025 à 030). Le compteur est cloisonné par
 * les segments variables présents dans la composition — site, donneur d'ordre, année, mois — ce qui
 * garantit l'unicité ; il avance dans la transaction du geste : un geste annulé laisse un trou, c'est
 * admis (RG-ORG-030). Un identifiant attribué ne change plus (RG-ORG-028).
 */
export async function nextNumber(
  transaction: DatabaseTransaction,
  objectType: string,
  context: NumberingContext = {},
): Promise<string> {
  const scheme = await transaction
    .selectFrom('foundation.numberingScheme')
    .select('segments')
    .where('objectType', '=', objectType)
    .executeTakeFirstOrThrow(() => new Error(`no numbering scheme for ${objectType}`));
  const segments = numberingSegmentsSchema.parse(scheme.segments);
  const at = context.at ?? new Date();
  const parts = segments.map((segment) => segmentValue(segment, context, at, objectType));
  const partition = segments
    .map((segment, index) => (segment.kind === 'literal' || segment.kind === 'counter' ? null : parts[index]))
    .filter((part) => part !== null)
    .join('|');
  const counter = await sql<{ value: string }>`
    insert into foundation.numbering_counter (object_type, partition_key, next_value)
    values (${objectType}, ${partition}, 2)
    on conflict (object_type, partition_key) do update set next_value = numbering_counter.next_value + 1
    returning (next_value - 1)::text as value`.execute(transaction);
  const value = counter.rows[0]?.value ?? '1';
  return segments
    .map((segment, index) => {
      if (segment.kind !== 'counter') return parts[index];
      if (value.length > segment.width) throw new NumberingExhaustedError(objectType);
      return value.padStart(segment.width, '0');
    })
    .join('');
}
