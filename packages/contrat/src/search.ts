import { z } from 'zod';
import { defineQuery } from './query.js';

/*
 * Recherche (0.8, RG-SUR-059 à 064) : une entrée unique, sur tout écran, qui accepte une lecture de
 * code-barres ou du texte. Chaque module réalisé y apporte ses objets.
 */

export const searchObjectTypeSchema = z.enum([
  'item',
  'party',
  'expectedReceipt',
  'location',
  'handlingUnit',
  'serializedUnit',
]);
export type SearchObjectType = z.infer<typeof searchObjectTypeSchema>;

export const searchResultSchema = z.object({
  type: searchObjectTypeSchema,
  id: z.uuid(),
  /** Absents d'un objet hors du périmètre : il est signalé comme existant, sans son contenu (RG-SUR-064). */
  code: z.string().nullable(),
  label: z.string().nullable(),
  principalCode: z.string().nullable(),
  /** L'objet qui porte celui-ci, et dont la fiche l'affiche : la zone d'un emplacement. */
  ownerId: z.uuid().nullable(),
  siteCode: z.string().nullable(),
  outOfScope: z.boolean(),
  /** Le texte cherché est exactement l'un de ses codes : c'est l'objet qu'une lecture ouvre (RG-SUR-060). */
  exact: z.boolean(),
  /** Retrouvé par un identifiant désactivé, qui le retrouve encore et le dit (RG-REF-010). */
  inactiveCode: z.boolean(),
});
export type SearchResult = z.infer<typeof searchResultSchema>;

export const search = defineQuery({
  name: 'search',
  input: z.object({ text: z.string().trim().min(1).max(120) }),
  output: z.object({ results: z.array(searchResultSchema) }),
});
