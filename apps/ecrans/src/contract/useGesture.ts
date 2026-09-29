import type { GestureDefinition } from '@cairn/contrat';
import { fr } from '@cairn/libelles';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { z } from 'zod';
import { NoResponseError, sendGesture } from './client.js';
import { refusalLabelKey, type RefusalDetails, type RefusalLabelKey } from './refusal.js';

export interface GestureRefusalState {
  readonly key: RefusalLabelKey | 'failure.noResponse';
  readonly details: RefusalDetails;
}

/**
 * Envoi d'un geste depuis un écran : son refus typé à afficher dans le bandeau, l'état d'envoi, et la
 * relecture des données affichées une fois le geste enregistré.
 */
export function useGesture() {
  const queryClient = useQueryClient();
  const [refusal, setRefusal] = useState<GestureRefusalState | undefined>();
  const [sending, setSending] = useState(false);

  async function run<
    Name extends string,
    Input extends z.ZodType,
    Output extends z.ZodType,
    Reason extends string,
  >(
    definition: GestureDefinition<Name, Input, Output, Reason>,
    input: z.input<Input>,
  ): Promise<z.output<Output> | undefined> {
    setSending(true);
    setRefusal(undefined);
    try {
      const outcome = await sendGesture(definition, input);
      if (outcome.outcome === 'refused') {
        setRefusal({ key: refusalLabelKey(outcome.reason, fr.refusal), details: outcome.details });
        return undefined;
      }
      await queryClient.invalidateQueries();
      return outcome.result;
    } catch (error) {
      if (error instanceof NoResponseError) {
        setRefusal({ key: 'failure.noResponse', details: undefined });
        return undefined;
      }
      throw error;
    } finally {
      setSending(false);
    }
  }

  return {
    run,
    refusal,
    sending,
    dismiss: () => {
      setRefusal(undefined);
    },
  };
}
