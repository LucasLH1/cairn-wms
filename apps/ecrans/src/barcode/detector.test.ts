import { describe, expect, it } from 'vitest';
import { BarcodeDetector } from './detector.js';

function feed(
  detector: BarcodeDetector,
  keys: string[],
  interval: number,
  start = 0,
): (string | undefined)[] {
  return keys.map((key, index) => detector.key(key, start + index * interval));
}

describe('lecture de code-barres (fiche 0025, règle 3)', () => {
  it('reconnaît une rafale terminée par Entrée', () => {
    const results = feed(new BarcodeDetector(), [...Array.from('SUP-000123'), 'Enter'], 8);
    expect(results.at(-1)).toBe('SUP-000123');
  });

  it('ne prend pas une frappe pour une lecture', () => {
    const results = feed(new BarcodeDetector(), [...Array.from('SUP-000123'), 'Enter'], 120);
    expect(results.at(-1)).toBeUndefined();
  });

  it('ignore une rafale trop courte, et repart de zéro après une pause', () => {
    const detector = new BarcodeDetector();
    expect(feed(detector, [...Array.from('AB'), 'Enter'], 5).at(-1)).toBeUndefined();
    feed(detector, [...Array.from('xyz')], 200, 1000);
    expect(feed(detector, [...Array.from('LOC-A-01-1'), 'Enter'], 5, 5000).at(-1)).toBe('LOC-A-01-1');
  });
});
