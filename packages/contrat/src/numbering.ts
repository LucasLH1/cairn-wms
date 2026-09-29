import { z } from 'zod';

/**
 * Segments d'un schéma de numérotation (RG-ORG-026) : littéral fixe, code site, code donneur d'ordre,
 * année, mois, compteur. Le prestataire compose leur ordre et leur format.
 */
export const numberingSegmentSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('literal'), value: z.string().min(1).max(20) }),
  z.object({ kind: z.literal('site') }),
  z.object({ kind: z.literal('principal') }),
  z.object({ kind: z.literal('year') }),
  z.object({ kind: z.literal('month') }),
  z.object({ kind: z.literal('counter'), width: z.int().min(1).max(12) }),
]);
export type NumberingSegment = z.infer<typeof numberingSegmentSchema>;

export const numberingSegmentsSchema = z.array(numberingSegmentSchema).min(2).max(10);

/** Ce qui manque à un schéma pour garantir l'unicité et désigner son type d'objet (RG-ORG-027, RG-SUR-061). */
export const numberingProblemSchema = z.enum([
  'leadingLiteralRequired',
  'leadingLiteralTaken',
  'singleCounterRequired',
  'yearRequiredForMonth',
  'separatorRequired',
]);
export type NumberingProblem = z.infer<typeof numberingProblemSchema>;

/**
 * Vérifie qu'une composition garantit l'unicité dans l'instance : un littéral en tête, propre au type
 * d'objet et qui n'en préfixe aucun autre ; un seul compteur, de largeur fixe ; le mois avec l'année ;
 * un littéral entre deux segments de longueur variable (codes de site et de donneur d'ordre).
 */
export function numberingProblems(
  segments: readonly NumberingSegment[],
  otherLeadingLiterals: readonly string[],
): NumberingProblem[] {
  const problems: NumberingProblem[] = [];
  const [first] = segments;
  if (first?.kind !== 'literal') {
    problems.push('leadingLiteralRequired');
  } else if (
    otherLeadingLiterals.some((other) => other.startsWith(first.value) || first.value.startsWith(other))
  ) {
    problems.push('leadingLiteralTaken');
  }
  if (segments.filter((segment) => segment.kind === 'counter').length !== 1)
    problems.push('singleCounterRequired');
  const kinds = segments.map((segment) => segment.kind);
  if (kinds.includes('month') && !kinds.includes('year')) problems.push('yearRequiredForMonth');
  const variable = (kind: NumberingSegment['kind'] | undefined) => kind === 'site' || kind === 'principal';
  if (kinds.some((kind, index) => variable(kind) && variable(kinds[index + 1])))
    problems.push('separatorRequired');
  return problems;
}
