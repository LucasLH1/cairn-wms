import { describe, expect, it } from 'vitest';
import { exportFileName, toCsv } from './csv.js';

describe("fichier d'export (fiche 0033)", () => {
  it('écrit la marque d’ordre, le point-virgule, des guillemets partout et des fins de ligne CRLF', () => {
    expect(
      toCsv([
        ['Code', 'Libellé'],
        ['MD-001', 'Câble "HDMI"; 2 m'],
      ]),
    ).toBe('﻿"Code";"Libellé"\r\n"MD-001";"Câble ""HDMI""; 2 m"\r\n');
  });

  it('nomme le fichier d’après la liste et la date locale, sans caractère interdit', () => {
    expect(exportFileName('Références', new Date(2026, 8, 30, 23, 59))).toBe('Références-2026-09-30.csv');
    expect(exportFileName('Tiers / fournisseurs : "A"', new Date(2026, 0, 5))).toBe(
      'Tiers - fournisseurs - -A--2026-01-05.csv',
    );
  });
});
