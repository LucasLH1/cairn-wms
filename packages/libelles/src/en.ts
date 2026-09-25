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
  navigation: {
    office: 'Office',
    receptions: 'Receptions',
  },
  expectedReceipt: {
    openList: 'Open expected receipts',
    create: 'Enter an expected receipt',
    newTitle: 'New expected receipt',
    title: 'Expected receipt {{number}}',
    number: 'Expected receipt',
    principal: 'Principal',
    supplier: 'Supplier',
    expectedArrivalDate: 'Expected arrival',
    lineCount: 'Lines',
    state: 'State',
    states: { open: 'Open', settled: 'Settled', cancelled: 'Cancelled' },
    lines: 'Expected receipt lines',
    item: 'Item',
    shortLabel: 'Label',
    quantity: 'Quantity',
    expectedQuantity: 'Expected',
    servedQuantity: 'Served',
    remainingQuantity: 'Remaining',
    addLine: 'Add a line',
    removeLine: 'Remove the line',
    save: 'Save the expected receipt',
    choose: 'Choose…',
    none: 'No open expected receipt on this site.',
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
    unknownPrincipal: 'This principal does not exist or is no longer active.',
    unknownSupplier: 'This supplier does not belong to the principal, or is no longer active.',
    unknownItem: 'An item does not belong to the principal, or can no longer be received.',
    duplicateItem: 'An item appears on two lines.',
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
