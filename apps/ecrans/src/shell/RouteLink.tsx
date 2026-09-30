import { TextLink } from '@cairn/ui';
import { createLink } from '@tanstack/react-router';

/** Lien typé du routeur, rendu par le lien de packages/ui (fiche 0011) : le seul lien des écrans. */
export const RouteLink = createLink(TextLink);
