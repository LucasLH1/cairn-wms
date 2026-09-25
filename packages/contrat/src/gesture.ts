import { z } from 'zod';

/**
 * Identifiant attribué par le poste à chaque geste (glossaire : identifiant de geste).
 * Un geste reçu une seconde fois sous le même identifiant rend le résultat du premier
 * sans rien réenregistrer (RG-EXI-007, fiche 0019).
 */
export const gestureIdSchema = z.uuid();
export type GestureId = z.infer<typeof gestureIdSchema>;

/** En-tête HTTP qui porte l'identifiant de geste. */
export const GESTURE_ID_HEADER = 'x-cairn-gesture-id';

/**
 * En-tête propre à l'application, exigé sur tout geste en plus du cookie de session,
 * contre les requêtes forgées (fiche 0027, règle 2).
 */
export const APPLICATION_HEADER = 'x-cairn-application';
export const APPLICATION_HEADER_VALUE = 'cairn-wms';
