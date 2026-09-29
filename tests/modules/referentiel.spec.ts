import { fr } from '@cairn/libelles';
import { expect, test } from '@playwright/test';
import { OFFICE_WORKSTATION_ID, signIn, useWorkstation } from '../support.js';

// Module 0.2 — référentiel produit : une référence créée en brouillon, qui ne s'active qu'une fois son
// conditionnement complet et un identifiant attribué ; un identifiant déjà employé est refusé en
// nommant la référence qui le détient.
test.describe.configure({ mode: 'serial' });

test.beforeEach(async ({ page }) => {
  await useWorkstation(page, OFFICE_WORKSTATION_ID);
  await signIn(page, 'anna');
});

test('Gestionnaire — créer une référence, la compléter, l’activer', async ({ page }) => {
  await page.getByRole('link', { name: fr.navigation.items }).click();
  await page.getByRole('button', { name: fr.item.create }).click();
  await page.getByLabel(fr.item.code, { exact: true }).fill('MD-100');
  await page.getByLabel(fr.item.shortLabel, { exact: true }).fill('Casque fictif');
  await expect(page.getByText(fr.item.trackingWarning)).toBeVisible();
  await page.getByRole('button', { name: fr.common.create, exact: true }).click();

  // Née en brouillon : l'activation dit ce qui manque (RG-REF-040).
  await expect(page.getByRole('heading', { name: 'MD-100 · Casque fictif' })).toBeVisible();
  const state = page.getByRole('region', { name: fr.item.activation });
  await expect(state.getByText(fr.item.states.draft)).toBeVisible();
  await expect(state.getByText(fr.item.missing.completePackaging, { exact: false })).toBeVisible();
  await expect(state.getByRole('button', { name: fr.item.activate })).toBeDisabled();

  // Conditionnements : le nombre d'unités de base du niveau le plus haut reste affiché.
  const packaging = page.getByRole('region', { name: fr.item.packaging });
  await packaging.getByLabel(fr.item.baseLevel, { exact: true }).fill('Unité');
  await packaging.getByLabel(fr.item.grossWeight).fill('250');
  await packaging.getByLabel(fr.item.length).fill('200');
  await packaging.getByLabel(fr.item.width).fill('180');
  await packaging.getByLabel(fr.item.height).fill('90');
  await packaging.getByRole('button', { name: fr.item.addLevel }).click();
  await packaging.getByLabel(fr.item.levelName, { exact: true }).fill('Carton');
  await packaging.getByLabel(fr.item.unitsOfLowerLevel).fill('12');
  await expect(packaging.getByText('Le niveau le plus haut contient 12 unité(s) de base.')).toBeVisible();
  await packaging.getByRole('button', { name: fr.common.save }).click();
  await expect(state.getByText(fr.item.missing.completePackaging, { exact: false })).toHaveCount(0);

  // Un identifiant déjà attribué est refusé en nommant sa référence (RG-REF-009).
  const barcodes = page.getByRole('region', { name: fr.item.barcodes });
  await barcodes.getByLabel(fr.item.barcode, { exact: true }).fill('MD-001');
  await barcodes.getByRole('button', { name: fr.item.addBarcode }).click();
  await expect(page.getByText('Cet identifiant est déjà attribué à la référence MD-001.')).toBeVisible();
  await barcodes.getByLabel(fr.item.barcode, { exact: true }).fill('3760000000019');
  await barcodes.getByRole('button', { name: fr.item.addBarcode }).click();
  await expect(barcodes.getByRole('table')).toContainText('3760000000019');

  await state.getByRole('button', { name: fr.item.activate }).click();
  await expect(state.getByText(fr.item.states.active, { exact: true })).toBeVisible();
});

test('Gestionnaire — les références à compléter, triées par ancienneté', async ({ page }) => {
  // Un brouillon laissé tel quel : c'est lui que la bascule doit mettre en avant.
  await page.getByRole('link', { name: fr.navigation.items }).click();
  await page.getByRole('button', { name: fr.item.create }).click();
  await page.getByLabel(fr.item.code, { exact: true }).fill('MD-101');
  await page.getByLabel(fr.item.shortLabel, { exact: true }).fill('Brouillon fictif');
  await page.getByRole('button', { name: fr.common.create, exact: true }).click();
  await expect(page.getByRole('heading', { name: 'MD-101 · Brouillon fictif' })).toBeVisible();

  await page.getByRole('link', { name: fr.navigation.items }).click();
  const list = page.getByRole('region', { name: fr.item.list });
  await expect(list.getByRole('table')).toContainText('MD-100');
  await expect(list.getByRole('table')).toContainText('MD-101');
  await page.getByRole('checkbox', { name: fr.item.toComplete }).check({ force: true });
  const drafts = page.getByRole('region', { name: fr.item.toComplete });
  await expect(drafts.getByText(fr.item.toCompleteHint)).toBeVisible();
  await expect(drafts.getByRole('table')).toContainText('MD-101');
  // La référence activée n'est plus un brouillon.
  await expect(drafts.getByRole('table')).not.toContainText('MD-100');
});
