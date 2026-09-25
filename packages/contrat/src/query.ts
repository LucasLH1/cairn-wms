import type { z } from 'zod';

/** Préfixe des routes de consultation : lectures sans effet, par `GET` (fiche 0019, règle 1). */
export const QUERY_PATH_PREFIX = '/api/queries/';

/** Paramètre d'URL qui porte l'entrée d'une consultation, en JSON. */
export const QUERY_INPUT_PARAMETER = 'input';

/** Déclaration d'une consultation : son nom, ce qu'elle reçoit, ce qu'elle rend. */
export interface QueryDefinition<Name extends string, Input extends z.ZodType, Output extends z.ZodType> {
  readonly name: Name;
  readonly input: Input;
  readonly output: Output;
}

export function defineQuery<const Name extends string, Input extends z.ZodType, Output extends z.ZodType>(
  definition: QueryDefinition<Name, Input, Output>,
): QueryDefinition<Name, Input, Output> {
  return definition;
}

export const queryPath = (name: string): string => `${QUERY_PATH_PREFIX}${name}`;
