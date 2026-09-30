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

  // Termes proscrits du glossaire (docs/glossaire.md, « Termes proscrits ») qui n'admettent aucune
  // exception à l'écran. Les autres (« article », « statut », « entrepôt »…) ont un sens admis et se
  // relisent à la main.
  it('n’emploient aucun terme proscrit', () => {
    const proscribed = {
      fr: [
        /\bclients?\b(?! fina(?:l|ux)\b)/iu,
        /\bSKU\b/iu,
        /\bworkflow/iu,
        /\bpalettes?\b/iu,
        /\bdouchettes?\b/iu,
        /\bterminal\b/iu,
        /\bnotifications?\b/iu,
        /\bmapping\b/iu,
        /\bASN\b/u,
        /\bbon de réception\b/iu,
        /\baffectation\b/iu,
        /\bverrou/iu,
        /\brequalification\b/iu,
        /\bcode article\b/iu,
      ],
      en: [
        /(?<!end )\bcustomers?\b/iu,
        /\bproducts?\b/iu,
        /\bSKU\b/iu,
        /\bworkflow/iu,
        /\bpallets?\b/iu,
        /\bterminal\b/iu,
        /\bnotifications?\b/iu,
        /\bmapping\b/iu,
        /\bASN\b/u,
      ],
    } as const;
    for (const [language, patterns] of Object.entries(proscribed)) {
      const catalog: unknown = language === 'fr' ? catalogs.fr : catalogs.en;
      const offenders = entriesOf(catalog).filter(
        ([, text]) => typeof text === 'string' && patterns.some((pattern) => pattern.test(text)),
      );
      expect(offenders).toEqual([]);
    }
  });
});
