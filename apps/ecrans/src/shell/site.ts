import type { CurrentSession, Permission } from '@cairn/contrat';
import { useQuery } from '@tanstack/react-query';
import { createContext, useContext, useState } from 'react';
import { currentSessionQuery } from '../contract/session.js';

type SessionSite = CurrentSession['sites'][number];

/**
 * Le site du contexte de travail, choisi dans le sélecteur permanent de l'ossature (0.1, parcours
 * « Contexte de travail »). Porté par l'ossature, pas par un magasin global (fiche 0025, règle 1).
 */
export const WorkingSiteContext = createContext<SessionSite | undefined>(undefined);

export function useWorkingSite(): SessionSite | undefined {
  return useContext(WorkingSiteContext);
}

/** Le site par défaut : le dernier choisi sur ce navigateur, sinon le premier où l'utilisateur agit. */
export function defaultSite(
  sites: readonly SessionSite[],
  remembered: string | null,
): SessionSite | undefined {
  return sites.find((site) => site.id === remembered) ?? sites.find((site) => site.execution) ?? sites[0];
}

/** Vrai si l'utilisateur détient la permission : l'écran ne propose pas un geste qu'il refuserait. */
export function useHasPermission(permission: Permission): boolean {
  const { data: session } = useQuery(currentSessionQuery);
  return session?.permissions.includes(permission) ?? false;
}

/**
 * Un choix du contexte de travail mémorisé par ce navigateur (site, donneur d'ordre) : son absence ou
 * un stockage refusé ne gêne rien, le choix vaut alors pour la page ouverte.
 */
export function useRememberedChoice(storageKey: string): [string | null, (id: string) => void] {
  const [chosen, setChosen] = useState<string | null>(() => {
    try {
      return localStorage.getItem(storageKey);
    } catch {
      return null;
    }
  });
  const choose = (id: string) => {
    setChosen(id);
    try {
      localStorage.setItem(storageKey, id);
    } catch {
      // Stockage refusé : le choix vaut pour la page ouverte.
    }
  };
  return [chosen, choose];
}
