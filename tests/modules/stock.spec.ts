import { fr } from '@cairn/libelles';
import { expect, test } from '@playwright/test';
import { choose, OFFICE_WORKSTATION_ID, signIn, useWorkstation } from '../support.js';

// Module 0.4 — modèle de stock. Le jeu de données ne porte encore aucun stock : il entre par la
// réception (module 1.1). Ces tests éprouvent la consultation à vide, les photos quotidiennes, et le
// paramétrage que le jeu de données pose — motifs, types de support, états qualité de Maison Démo.
test.describe.configure({ mode: 'serial' });

test.beforeEach(async ({ page }) => {
  await useWorkstation(page, OFFICE_WORKSTATION_ID);
  await signIn(page, 'anna');
});

test('Tous rôles — consulter le stock d’une référence', async ({ page }) => {
  await page.getByRole('link', { name: fr.navigation.stock }).click();
  await expect(page.getByText(fr.stock.pickItem)).toBeVisible();
  await choose(page, fr.stock.item, /^MD-001 · /u);
  // Le tableau croisé état qualité × emplacement, vide : la référence n'a pas de stock sur le site A.
  const cross = page.getByRole('region', { name: fr.stock.crossTable });
  await expect(cross.getByRole('table', { name: fr.stock.crossTable })).toContainText(fr.stock.noStock);
  for (const header of [fr.stock.total, fr.stock.free, fr.stock.reserved, fr.stock.blocked, fr.stock.moving])
    await expect(cross.getByRole('columnheader', { name: header, exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: fr.stock.movements })).toContainText(fr.stock.noMovement);
  // La référence consultée est dans l'adresse : la fiche référence y conduit.
  await expect(page).toHaveURL(/\/stock\?itemId=/u);
});

test('Superviseur — les photos quotidiennes du site, chaque jour avec son état', async ({ page }) => {
  await page.goto('/stock');
  await page.getByRole('tab', { name: fr.stock.snapshotsTab }).click();
  const list = page.getByRole('region', { name: fr.snapshot.list });
  // Aucune photo prise sur une base neuve : la journée se voit absente, jamais un silence (RG-STK-061).
  await expect(list.getByText(fr.snapshot.states.absent).first()).toBeVisible();
});

test('Blocages — aucun blocage en cours sur le site', async ({ page }) => {
  await page.goto('/stock');
  await page.getByRole('tab', { name: fr.stock.holdsTab }).click();
  await expect(page.getByRole('region', { name: fr.hold.list })).toContainText(fr.hold.none);
});

test('Paramétrage — motifs de mouvement et types de support', async ({ page }) => {
  await page.getByRole('link', { name: fr.administration.settings }).click();
  await page.getByRole('tab', { name: fr.stockSettings.reasons }).click();
  const reasons = page.getByRole('table', { name: fr.stockSettings.reasons });
  await expect(reasons).toContainText('Constat de défaut');
  await expect(reasons).toContainText(fr.reasonNature.qualityChange);
  await page.getByRole('tab', { name: fr.stockSettings.handlingUnitTypes }).click();
  await expect(page.getByRole('table', { name: fr.stockSettings.handlingUnitTypes })).toContainText(
    'Palette',
  );
});

test('Donneur d’ordre — la liste modèle des états qualité, « Neuf » par défaut', async ({ page }) => {
  await page.goto('/administration/principals');
  await page.getByRole('link', { name: 'MD', exact: true }).click();
  const states = page.getByRole('table', { name: fr.stockSettings.qualityStates });
  for (const label of ['Neuf', 'Reconditionné', 'Occasion', 'Défectueux', 'À détruire'])
    await expect(states).toContainText(label);
  const neuf = states.getByRole('row').filter({ hasText: 'NEUF' });
  await expect(neuf.getByText(fr.stockSettings.isDefault, { exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: fr.stockSettings.pickingRule })).toBeVisible();
});
