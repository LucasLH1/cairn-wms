import {
  APPLICATION_HEADER,
  APPLICATION_HEADER_VALUE,
  GESTURE_ID_HEADER,
  gesturePath,
  type GestureDefinition,
} from '@cairn/contrat';
import { z } from 'zod';

/** Réponse typée d'un geste : son résultat, ou son refus et son motif (fiche 0019). */
export type GestureOutcome<Output, Reason extends string> =
  | { readonly outcome: 'accepted'; readonly result: Output }
  | {
      readonly outcome: 'refused';
      readonly reason: Reason | string;
      readonly details?: Readonly<Record<string, string | number | boolean>> | undefined;
    };

const refusalBodySchema = z.object({
  outcome: z.literal('refused'),
  reason: z.string(),
  details: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});

/** Le serveur n'a pas répondu : le geste peut être enregistré ou non, il faut le renvoyer. */
export class NoResponseError extends Error {
  constructor(cause: unknown) {
    super('no response from server', { cause });
    this.name = 'NoResponseError';
  }
}

const RESEND_DELAYS_MS = [500, 1000, 2000, 4000];

async function post(path: string, headers: Record<string, string>, body: unknown): Promise<Response> {
  return fetch(path, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'content-type': 'application/json',
      [APPLICATION_HEADER]: APPLICATION_HEADER_VALUE,
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

/**
 * Envoie un geste. Son identifiant est tiré une fois, par le poste ; sans réponse, le même geste est
 * renvoyé sous le même identifiant, et le serveur rend le premier résultat s'il l'avait reçu : une
 * coupure ne produit ni perte ni double (RG-EXI-006, RG-EXI-007).
 */
export async function sendGesture<
  Name extends string,
  Input extends z.ZodType,
  Output extends z.ZodType,
  Reason extends string,
>(
  definition: GestureDefinition<Name, Input, Output, Reason>,
  input: z.input<Input>,
): Promise<GestureOutcome<z.output<Output>, Reason>> {
  const gestureId = crypto.randomUUID();
  const body = definition.input.parse(input);
  for (let attempt = 0; ; attempt += 1) {
    let response: Response;
    try {
      response = await post(gesturePath(definition.name), { [GESTURE_ID_HEADER]: gestureId }, body);
    } catch (error) {
      const delay = RESEND_DELAYS_MS[attempt];
      if (delay === undefined) throw new NoResponseError(error);
      await new Promise((resolve) => setTimeout(resolve, delay));
      continue;
    }
    const json: unknown = await response.json();
    if (response.ok) {
      const { result } = z.object({ result: z.unknown() }).parse(json);
      return { outcome: 'accepted', result: definition.output.parse(result) };
    }
    return refusalBodySchema.parse(json);
  }
}

/** Lecture typée d'une route du contrat ; `undefined` si la session manque. */
export async function readContract<Output extends z.ZodType>(
  path: string,
  output: Output,
): Promise<z.output<Output> | undefined> {
  const response = await fetch(path, {
    credentials: 'same-origin',
    headers: { [APPLICATION_HEADER]: APPLICATION_HEADER_VALUE },
  });
  if (response.status === 401) return undefined;
  if (!response.ok) throw new Error(`${path}: ${String(response.status)}`);
  return output.parse(await response.json());
}

export async function postContract(
  path: string,
  body: unknown,
): Promise<{ readonly status: number; readonly json: unknown }> {
  const response = await post(path, {}, body);
  return { status: response.status, json: await response.json() };
}
