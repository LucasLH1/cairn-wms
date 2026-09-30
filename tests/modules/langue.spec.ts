import { en, fr } from '@cairn/libelles';
import { expect, test } from '@playwright/test';
import { OFFICE_WORKSTATION_ID, signIn, useWorkstation } from '../support.js';

// Langue de l'interface, choisie par chaque utilisateur et conservée sur son compte (RG-EXI-054, 079).
test('Tous rôles — passer l’interface en anglais, puis revenir au français', async ({ page }) => {
  await useWorkstation(page, OFFICE_WORKSTATION_ID);
  await signIn(page, 'chloe');
  await page.getByRole('button', { name: fr.session.otherLanguage }).click();
  await expect(page.getByRole('link', { name: en.navigation.receptions })).toBeVisible();
  // Conservée sur le compte : une nouvelle session la retrouve.
  await page.reload();
  await expect(page.getByRole('link', { name: en.navigation.receptions })).toBeVisible();
  await page.getByRole('button', { name: en.session.otherLanguage }).click();
  await expect(page.getByRole('link', { name: fr.navigation.receptions })).toBeVisible();
});
