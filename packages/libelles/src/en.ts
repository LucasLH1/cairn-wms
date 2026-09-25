import type { LabelCatalog } from './fr.js';

/** Libellés anglais, par utilisateur (RG-EXI-079). Mêmes clés que le français, imposées par le typage. */
export const en: LabelCatalog = {
  application: {
    name: 'Cairn WMS',
  },
  refusal: {
    invalidInput: 'The input is incomplete or invalid.',
    notAuthenticated: 'You must sign in.',
    permissionDenied: 'You do not have permission for this gesture.',
    outOfScope: 'This object is outside your scope.',
    undeclaredWorkstation: 'This workstation is not declared: no gesture is possible.',
    editLockHeldByOther: '{{holder}} holds the edit lock.',
  },
};
