/**
 * Libellés français, langue par défaut (RG-EXI-054). Les textes suivent le glossaire ;
 * aucun libellé n'est écrit en dur dans un écran (fiche 0025, règle 4).
 */
export const fr = {
  application: {
    name: 'Cairn WMS',
  },
  refusal: {
    invalidInput: 'La saisie est incomplète ou invalide.',
    notAuthenticated: 'Vous devez vous connecter.',
    permissionDenied: 'Vous n’avez pas la permission de faire ce geste.',
    outOfScope: 'Cet objet est hors de votre périmètre.',
    undeclaredWorkstation: 'Ce poste n’est pas déclaré : aucun geste n’est possible.',
    editLockHeldByOther: '{{holder}} a la main.',
  },
} as const;

type Widen<T> = { readonly [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };

/** Forme que tout catalogue de langue doit avoir : les mêmes clés que le français. */
export type LabelCatalog = Widen<typeof fr>;
