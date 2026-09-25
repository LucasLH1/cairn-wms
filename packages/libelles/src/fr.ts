/**
 * Libellés français, langue par défaut (RG-EXI-054). Les textes suivent le glossaire ;
 * aucun libellé n'est écrit en dur dans un écran (fiche 0025, règle 4).
 */
export const fr = {
  application: {
    name: 'Cairn WMS',
  },
  shell: {
    home: 'Accueil',
    dismiss: 'Masquer',
  },
  session: {
    title: 'Ouvrir une session',
    loginName: 'Identifiant de connexion',
    password: 'Mot de passe',
    open: 'Ouvrir la session',
    close: 'Fermer la session',
  },
  workstation: {
    label: 'Poste',
    undeclared: 'Poste non déclaré',
  },
  failure: {
    noResponse:
      'Le serveur ne répond pas. Vérifiez la connexion, puis recommencez : rien ne sera enregistré deux fois.',
  },
  refusal: {
    invalidInput: 'La saisie est incomplète ou invalide.',
    notAuthenticated: 'Vous devez vous connecter.',
    permissionDenied: 'Vous n’avez pas la permission de faire ce geste.',
    outOfScope: 'Cet objet est hors de votre périmètre.',
    undeclaredWorkstation: 'Ce poste n’est pas déclaré : aucun geste n’est possible.',
    editLockHeldByOther: '{{holder}} a la main.',
    invalidCredentials: 'Identifiant de connexion ou mot de passe incorrect.',
    tooManyAttempts: 'Trop de tentatives : réessayez dans quelques minutes.',
    workstationNameTaken: 'Un poste porte déjà le nom {{name}}.',
    unknownSite: 'Ce site n’existe pas.',
  },
} as const;

type Widen<T> = { readonly [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };

/** Forme que tout catalogue de langue doit avoir : les mêmes clés que le français. */
export type LabelCatalog = Widen<typeof fr>;
