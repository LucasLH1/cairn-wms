import { fr } from '@cairn/libelles';
import { expect, test, type Page } from '@playwright/test';
import { OFFICE_WORKSTATION_ID, signIn, useWorkstation } from '../support.js';

// Recherche (0.8, RG-SUR-059 à 063), avec les objets des modules réalisés : une entrée unique dans la
// barre du haut ; une lecture de code-barres hors mission ouvre l'objet lu ; un code inconnu le dit.

test.beforeEach(async ({ page }) => {
  await useWorkstation(page, OFFICE_WORKSTATION_ID);
  await signIn(page, 'anna');
});

/** Une lecture du lecteur de code-barres : une rafale de caractères terminée par Entrée. */
async function scan(page: Page, code: string): Promise<void> {
  await page.getByRole('heading', { level: 1 }).click();
  await page.keyboard.type(code, { delay: 5 });
  await page.keyboard.press('Enter');
}

test('Tous rôles — rechercher par fragment, depuis n’importe quel écran', async ({ page }) => {
  await page.goto('/receptions');
  const field = page.getByRole('searchbox', { name: fr.search.label });
  await field.fill('MD-00');
  await field.press('Enter');
  const results = page.getByRole('region', { name: fr.search.results });
  await expect(results.getByRole('table')).toContainText('Manette sans fil');
  await results.getByRole('link', { name: 'MD-002' }).click();
  await expect(page.getByRole('heading', { name: 'MD-002 · Manette sans fil' })).toBeVisible();
});

test('Tous rôles — une lecture hors mission ouvre l’objet lu (RG-SUR-060)', async ({ page }) => {
  await page.goto('/receptions');
  await scan(page, 'MD-003');
  await expect(page.getByRole('heading', { name: 'MD-003 · Chargeur USB-C 30 W' })).toBeVisible();
});

test('Tous rôles — un code inconnu le dit, jamais d’écran vide (RG-SUR-063)', async ({ page }) => {
  await page.goto('/receptions');
  await scan(page, 'XYZ-999');
  await expect(
    page.getByText('Aucun objet ne correspond à « XYZ-999 » : ce code n’est pas connu.').first(),
  ).toBeVisible();
});

test('Administrateur — la lecture d’un emplacement ouvre la fiche de sa zone (RG-EMP-007)', async ({
  page,
}) => {
  await page.goto('/receptions');
  await scan(page, 'EMP-A-A-03-1');
  await expect(page.getByRole('heading', { name: 'RES · Réserve' })).toBeVisible();
});
