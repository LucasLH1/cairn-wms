import type { CurrentSession, Permission } from '@cairn/contrat';
import { useQuery } from '@tanstack/react-query';
import { currentSessionQuery } from '../contract/session.js';

/**
 * Le site du contexte de travail. Un utilisateur rattaché à un seul site le voit comme une indication,
 * pas comme un choix (0.1, parcours « Contexte de travail ») ; le sélecteur viendra avec le premier
 * utilisateur à plusieurs sites.
 */
export function useWorkingSite(): CurrentSession['sites'][number] | undefined {
  const { data: session } = useQuery(currentSessionQuery);
  return session?.sites.find((site) => site.execution) ?? session?.sites[0];
}

/** Vrai si l'utilisateur détient la permission : l'écran ne propose pas un geste qu'il refuserait. */
export function useHasPermission(permission: Permission): boolean {
  const { data: session } = useQuery(currentSessionQuery);
  return session?.permissions.includes(permission) ?? false;
}
