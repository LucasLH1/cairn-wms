import * as contract from '@cairn/contrat';
import { catalogs, languages } from '@cairn/libelles';
import { describe, expect, it } from 'vitest';

// Tout motif de refus du contrat s'affiche par un libellé, en chaque langue (fiche 0019, règle 4) :
// les motifs communs, ceux de la session, et ceux que chaque geste déclare.
const gestureReasons = Object.values(contract).flatMap((value) =>
  typeof value === 'object' && 'refusalReasons' in value && Array.isArray(value.refusalReasons)
    ? value.refusalReasons.filter((reason): reason is string => typeof reason === 'string')
    : [],
);
const reasons = [
  ...new Set([
    ...contract.commonRefusalReasonSchema.options,
    ...contract.sessionRefusalReasonSchema.options,
    ...gestureReasons,
  ]),
];

describe('libellés des motifs de refus', () => {
  it('couvrent au moins les gestes connus', () => {
    expect(reasons).toEqual(expect.arrayContaining(['dockOccupied', 'lastRoleAdministrator']));
  });

  it.each(languages)('existent tous en %s', (language) => {
    const labels: Readonly<Record<string, string>> = catalogs[language].refusal;
    expect(reasons.filter((reason) => !Object.hasOwn(labels, reason))).toEqual([]);
  });
});
