import {
  APPLICATION_HEADER,
  APPLICATION_HEADER_VALUE,
  QUERY_INPUT_PARAMETER,
  queryPath,
  type QueryDefinition,
} from '@cairn/contrat';
import { queryOptions } from '@tanstack/react-query';
import type { z } from 'zod';

/**
 * Une consultation du contrat en requête TanStack Query : sa clé est son nom et son entrée, sa réponse
 * est vérifiée par le schéma du contrat. Le cache de TanStack Query est le seul lieu des données du
 * serveur (fiche 0025, règle 1).
 */
export function contractQuery<Name extends string, Input extends z.ZodType, Output extends z.ZodType>(
  definition: QueryDefinition<Name, Input, Output>,
  input: z.input<Input>,
) {
  return queryOptions({
    queryKey: [definition.name, input] as const,
    queryFn: async ({ signal }): Promise<z.output<Output>> => {
      const parameter = encodeURIComponent(JSON.stringify(definition.input.parse(input)));
      const response = await fetch(`${queryPath(definition.name)}?${QUERY_INPUT_PARAMETER}=${parameter}`, {
        credentials: 'same-origin',
        headers: { [APPLICATION_HEADER]: APPLICATION_HEADER_VALUE },
        signal,
      });
      if (!response.ok) throw new Error(`${definition.name}: ${String(response.status)}`);
      return definition.output.parse(await response.json());
    },
  });
}
