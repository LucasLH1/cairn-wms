import {
  currentSessionSchema,
  SESSION_CLOSE_PATH,
  SESSION_PATH,
  type CurrentSession,
  type OpenSessionInput,
} from '@cairn/contrat';
import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';
import { postContract, readContract } from './client.js';

/** La session courante, ou `null` : une seule source, le cache de TanStack Query (fiche 0025, règle 1). */
export const currentSessionQuery = queryOptions({
  queryKey: ['session'],
  queryFn: async (): Promise<CurrentSession | null> =>
    (await readContract(SESSION_PATH, currentSessionSchema)) ?? null,
  staleTime: Infinity,
});

const openedSchema = z.object({ outcome: z.literal('accepted'), result: currentSessionSchema });
const refusedSchema = z.object({ outcome: z.literal('refused'), reason: z.string() });

export async function openSession(
  input: OpenSessionInput,
): Promise<
  | { readonly outcome: 'accepted'; readonly session: CurrentSession }
  | { readonly outcome: 'refused'; readonly reason: string }
> {
  const { json } = await postContract(SESSION_PATH, input);
  const opened = openedSchema.safeParse(json);
  if (opened.success) return { outcome: 'accepted', session: opened.data.result };
  return refusedSchema.parse(json);
}

export async function closeSession(): Promise<void> {
  await postContract(SESSION_CLOSE_PATH, {});
}
