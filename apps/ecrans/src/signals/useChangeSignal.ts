import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { createContext, useContext, useEffect } from 'react';
import type { SignalChannel } from './signals.js';

export const SignalChannelContext = createContext<SignalChannel | undefined>(undefined);

/**
 * Tient à jour la requête d'un élément affiché : un signal sur cet objet la fait relire, elle seule
 * (fiche 0025, règle 2) — jamais toute une liste pour un changement d'un de ses éléments.
 */
export function useChangeSignal(objectType: string, objectId: string | undefined, queryKey: QueryKey): void {
  const channel = useContext(SignalChannelContext);
  const queryClient = useQueryClient();
  const key = JSON.stringify(queryKey);
  useEffect(() => {
    if (channel === undefined) return undefined;
    const parsedKey: unknown = JSON.parse(key);
    return channel.subscribe(objectId === undefined ? { objectType } : { objectType, objectId }, () => {
      void queryClient.invalidateQueries({
        queryKey: Array.isArray(parsedKey) ? parsedKey : [parsedKey],
        exact: true,
      });
    });
  }, [channel, queryClient, objectType, objectId, key]);
}
