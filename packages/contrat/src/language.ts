import { z } from 'zod';
import { defineGesture } from './gesture.js';

/** Langues de l'interface : français par défaut, anglais au choix (RG-EXI-054). */
export const languageSchema = z.enum(['fr', 'en']);
export type InterfaceLanguage = z.infer<typeof languageSchema>;

/**
 * Chaque utilisateur choisit sa langue, conservée sur son compte (RG-EXI-079 ; décision du 2026-09-30,
 * README du lot 1, point 7). Aucune permission : c'est son propre compte.
 */
export const setOwnLanguage = defineGesture({
  name: 'setOwnLanguage',
  input: z.object({ language: languageSchema }),
  output: z.object({}),
  permission: null,
  refusalReasons: [],
});
