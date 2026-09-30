import { readFile } from 'node:fs/promises';
import { fr } from '@cairn/libelles';
import { expect, test } from '@playwright/test';
import { OFFICE_WORKSTATION_ID, signIn, useWorkstation } from '../support.js';

// Export des listes (RG-SUR-101, fiche 0033) : la liste des références, exportée telle qu'affichée, en
// CSV qu'un tableur ouvre en français.
test.beforeEach(async ({ page }) => {
  await useWorkstation(page, OFFICE_WORKSTATION_ID);
  await signIn(page, 'anna');
});

test('Gestionnaire — exporter la liste des références telle qu’affichée', async ({ page }) => {
  await page.goto('/items');
  const table = page.getByRole('table', { name: fr.item.list, exact: true });
  await expect(table.getByRole('link', { name: 'MD-001' })).toBeVisible();

  // Le bouton d'export est placé par le tableau, juste au-dessus de lui.
  const downloading = page.waitForEvent('download');
  await table.locator('xpath=..').getByRole('button', { name: fr.common.export }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toMatch(/^Références-\d{4}-\d{2}-\d{2}\.csv$/u);

  const content = await readFile(await download.path(), 'utf8');
  // Marque d'ordre des octets, point-virgule, guillemets partout, fins de ligne CRLF.
  expect(content.startsWith('﻿')).toBe(true);
  const [header, ...lines] = content.slice(1).split('\r\n');
  expect(header).toBe(
    [fr.item.code, fr.item.shortLabel, fr.item.family, fr.item.trackingMode, fr.item.state]
      .map((title) => `"${title}"`)
      .join(';'),
  );
  expect(lines.some((line) => line.startsWith('"MD-001";'))).toBe(true);
});
