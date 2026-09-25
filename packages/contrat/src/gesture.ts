import { z } from 'zod';
import type { Permission } from './permission.js';

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

/** Préfixe des routes de gestes : un geste est une commande nommée envoyée par `POST` (fiche 0019, règle 1). */
export const GESTURE_PATH_PREFIX = '/api/gestures/';

/**
 * Déclaration d'un geste : son nom, le schéma de ce qu'il reçoit et rend, la permission qu'il exige
 * (`null` : tout utilisateur connecté sur un poste déclaré), et les motifs de refus qui lui sont propres,
 * en plus des motifs communs.
 */
export interface GestureDefinition<
  Name extends string,
  Input extends z.ZodType,
  Output extends z.ZodType,
  Reason extends string,
> {
  readonly name: Name;
  readonly input: Input;
  readonly output: Output;
  readonly permission: Permission | null;
  readonly refusalReasons: readonly Reason[];
}

export function defineGesture<
  const Name extends string,
  Input extends z.ZodType,
  Output extends z.ZodType,
  const Reason extends string = never,
>(
  definition: GestureDefinition<Name, Input, Output, Reason>,
): GestureDefinition<Name, Input, Output, Reason> {
  return definition;
}

export const gesturePath = (name: string): string => `${GESTURE_PATH_PREFIX}${name}`;

/** Réponse d'un geste enregistré : ce qu'il rend, selon son schéma. */
export const acceptedSchema = <Output extends z.ZodType>(output: Output) =>
  z.object({ outcome: z.literal('accepted'), result: output });
