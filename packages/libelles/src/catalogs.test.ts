import { describe, expect, it } from 'vitest';
import { catalogs } from './index.js';

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null;

/** Aplatit un catalogue en paires chemin → libellé. */
const entriesOf = (value: unknown, prefix = ''): (readonly [string, unknown])[] =>
  isRecord(value)
    ? Object.entries(value).flatMap(([key, child]) => entriesOf(child, `${prefix}${key}.`))
    : [[prefix.slice(0, -1), value]];

describe('libellés', () => {
  it('ont les mêmes clés en français et en anglais', () => {
    const keys = (catalog: unknown) =>
      entriesOf(catalog)
        .map(([path]) => path)
        .sort();
    expect(keys(catalogs.en)).toEqual(keys(catalogs.fr));
  });

  it('n’ont aucun libellé vide', () => {
    for (const catalog of Object.values(catalogs)) {
      for (const [, text] of entriesOf(catalog)) {
        expect(typeof text === 'string' && text.trim() !== '').toBe(true);
      }
    }
  });
});
