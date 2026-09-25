import {
  commonRefusalReasonSchema,
  createExpectedReceipt,
  declareWorkstation,
  sessionRefusalReasonSchema,
} from '@cairn/contrat';
import { catalogs, languages } from '@cairn/libelles';
import { describe, expect, it } from 'vitest';

// Tout motif de refus du contrat s'affiche par un libellé, en chaque langue (fiche 0019, règle 4).
const reasons = [
  ...commonRefusalReasonSchema.options,
  ...sessionRefusalReasonSchema.options,
  ...declareWorkstation.refusalReasons,
  ...createExpectedReceipt.refusalReasons,
];

describe('libellés des motifs de refus', () => {
  it.each(languages)('existent tous en %s', (language) => {
    const labels: Readonly<Record<string, string>> = catalogs[language].refusal;
    const missing = reasons.filter((reason) => !Object.hasOwn(labels, reason));
    expect(missing).toEqual([]);
  });
});
