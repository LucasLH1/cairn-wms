import { z } from 'zod';
import { defineGesture } from './gesture.js';

/**
 * Export d'une liste (RG-SUR-101, RG-SUR-102, fiche 0033) : l'écran écrit lui-même le fichier à partir
 * du tableau affiché ; ce geste n'en garde que la trace — quelle liste, combien de lignes, sous quel
 * périmètre. Aucune permission : exporter, c'est emporter ce qu'on voit déjà.
 */
export const recordListExport = defineGesture({
  name: 'recordListExport',
  input: z.object({
    /** Le nom accessible du tableau exporté, tel que l'écran l'affiche. */
    list: z.string().trim().min(1).max(120),
    rows: z.int().nonnegative(),
    /** Le périmètre appliqué à la liste : site et donneur d'ordre de travail, s'ils la restreignent. */
    siteId: z.uuid().nullable(),
    principalId: z.uuid().nullable(),
  }),
  output: z.object({}),
  permission: null,
  refusalReasons: [],
});
