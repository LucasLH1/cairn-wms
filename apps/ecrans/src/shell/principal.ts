import type { listPrincipals } from '@cairn/contrat';
import { createContext, useContext } from 'react';
import type { z } from 'zod';

export type VisiblePrincipal = z.infer<typeof listPrincipals.output>['principals'][number];

/**
 * Le donneur d'ordre du contexte de travail, choisi dans la barre du haut à côté du site (README du
 * lot 1, décisions du 2026-09-30, point 1). Il fixe le donneur d'ordre des écrans qui n'en montrent
 * qu'un (Références, Tiers) et la valeur proposée des formulaires qui en demandent un. Porté par
 * l'ossature, comme le site (fiche 0025, règle 1).
 */
export const WorkingPrincipalContext = createContext<VisiblePrincipal | undefined>(undefined);

export function useWorkingPrincipal(): VisiblePrincipal | undefined {
  return useContext(WorkingPrincipalContext);
}

/**
 * Le donneur d'ordre par défaut : le dernier choisi sur ce navigateur, sinon le premier qui n'est pas
 * le donneur d'ordre interne. L'interne reste choisissable, jamais proposé d'office (RG-ORG-007).
 */
export function defaultPrincipal(
  principals: readonly VisiblePrincipal[],
  remembered: string | null,
): VisiblePrincipal | undefined {
  return (
    principals.find((principal) => principal.id === remembered) ??
    principals.find((principal) => !principal.internal)
  );
}
