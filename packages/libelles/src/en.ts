import type { LabelCatalog } from './fr.js';

/** Libellés anglais, par utilisateur (RG-EXI-079). Mêmes clés que le français, imposées par le typage. */
export const en: LabelCatalog = {
  application: {
    name: 'Cairn WMS',
  },
  shell: {
    home: 'Home',
    dismiss: 'Dismiss',
  },
  session: {
    title: 'Open a session',
    loginName: 'Login name',
    password: 'Password',
    open: 'Open the session',
    close: 'Close the session',
  },
  workstation: {
    label: 'Workstation',
    undeclared: 'Undeclared workstation',
  },
  failure: {
    noResponse:
      'The server is not responding. Check the connection, then try again: nothing will be recorded twice.',
  },
  refusal: {
    invalidInput: 'The input is incomplete or invalid.',
    notAuthenticated: 'You must sign in.',
    permissionDenied: 'You do not have permission for this gesture.',
    outOfScope: 'This object is outside your scope.',
    undeclaredWorkstation: 'This workstation is not declared: no gesture is possible.',
    editLockHeldByOther: '{{holder}} holds the edit lock.',
    invalidCredentials: 'Incorrect login name or password.',
    tooManyAttempts: 'Too many attempts: try again in a few minutes.',
    workstationNameTaken: 'A workstation is already named {{name}}.',
    unknownSite: 'This site does not exist.',
  },
};
