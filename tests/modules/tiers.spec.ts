import { fr } from '@cairn/libelles';
import { expect, test } from '@playwright/test';
import { OFFICE_WORKSTATION_ID, signIn, useWorkstation } from '../support.js';

// Module 0.5 — tiers : un client final créé sans clé, complété d'une adresse au format de son pays,
// puis anonymisé à sa demande ; un service déclaré sur un transporteur.
test.describe.configure({ mode: 'serial' });

test.beforeEach(async ({ page }) => {
  await useWorkstation(page, OFFICE_WORKSTATION_ID);
  await signIn(page, 'anna');
});

test('Gestionnaire — client final : clé générée, adresse au format du pays, anonymisation irréversible', async ({
  page,
}) => {
  await page.getByRole('link', { name: fr.party.menu }).click();
  const list = page.getByRole('region', { name: fr.party.endCustomers });
  await list.getByLabel(fr.party.name, { exact: true }).fill('Client fictif');
  await list.getByRole('button', { name: fr.party.create, exact: true }).click();

  // Créé sans clé : une clé générée, une fiche à compléter.
  await expect(page.getByRole('heading', { name: 'Client fictif' })).toBeVisible();
  await expect(page.getByText(fr.party.toComplete)).toBeVisible();

  const addresses = page.getByRole('region', { name: fr.address.title });
  await addresses.getByRole('button', { name: fr.address.add }).click();
  await addresses.getByLabel(fr.address.line1, { exact: true }).fill('5 rue Fictive');
  await addresses.getByLabel(fr.address.city, { exact: true }).fill('Ville fictive');
  await addresses.getByLabel(fr.address.postalCode, { exact: true }).fill('7500');
  await expect(addresses.getByText('Format attendu pour ce pays : 75001.')).toBeVisible();
  await addresses.getByLabel(fr.address.postalCode, { exact: true }).fill('75001');
  await addresses.getByRole('button', { name: fr.common.save }).click();
  await expect(addresses.getByRole('table')).toContainText('5 rue Fictive');
  await expect(page.getByText(fr.party.toComplete)).toHaveCount(0);

  const history = page.getByRole('region', { name: fr.endCustomer.history });
  await history.getByRole('button', { name: fr.endCustomer.anonymize, exact: true }).click();
  await expect(history.getByText(fr.endCustomer.anonymizeWarning)).toBeVisible();
  await history.getByLabel(fr.endCustomer.reason).fill('Demande du client');
  await history.getByRole('button', { name: fr.endCustomer.confirm }).click();
  await expect(page.getByText(fr.party.readOnly)).toBeVisible();
  await expect(page.getByRole('heading', { name: fr.party.anonymized })).toBeVisible();
  await expect(addresses.getByRole('table')).not.toContainText('5 rue Fictive');
});

test('Administrateur — déclarer un service transporteur', async ({ page }) => {
  await page.getByRole('link', { name: fr.administration.settings }).click();
  await page.getByRole('tab', { name: fr.party.carriers }).click();
  await page.getByRole('link', { name: 'MSG' }).click();
  const services = page.getByRole('region', { name: fr.carrier.services });
  await services.getByRole('button', { name: fr.carrier.addService }).click();
  await services.getByLabel(fr.carrier.serviceCode, { exact: true }).fill('J1');
  await services.getByLabel(fr.carrier.serviceName, { exact: true }).fill('Messagerie Démo J+1');
  await services.getByLabel(fr.carrier.maxWeightGrams).fill('30000');
  await services.getByRole('button', { name: fr.common.save }).click();
  await expect(services.getByRole('table')).toContainText('Messagerie Démo J+1');
});
