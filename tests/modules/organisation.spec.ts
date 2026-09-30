import { fr } from '@cairn/libelles';
import { expect, test, type Page } from '@playwright/test';
import { OFFICE_WORKSTATION_ID, signIn, useWorkstation } from '../support.js';

// Module 0.1 — parcours d'administration (§ 6), déroulés par Anna, administratrice du jeu de données.
test.describe.configure({ mode: 'serial' });

async function asAnna(page: Page): Promise<void> {
  await useWorkstation(page, OFFICE_WORKSTATION_ID);
  await signIn(page, 'anna');
}

test('Administrateur — créer un site et son plan', async ({ page }) => {
  await asAnna(page);
  await page.getByRole('link', { name: fr.administration.settings }).click();
  await page.getByRole('button', { name: fr.site.create }).click();
  await page.getByLabel(fr.site.code, { exact: true }).fill('B');
  await page.getByLabel(fr.site.name, { exact: true }).fill('Site B');
  await page.getByLabel(fr.site.addressLine1, { exact: true }).fill('2 rue Fictive');
  await page.getByLabel(fr.site.postalCode, { exact: true }).fill('00000');
  await page.getByLabel(fr.site.city, { exact: true }).fill('Ville fictive');
  await page.getByRole('button', { name: fr.site.create }).click();

  // L'activation dit ce qui manque au lieu de refuser.
  await expect(page.getByText('Pour activer le site, il manque : une zone active.')).toBeVisible();
  const activation = page.getByRole('region', { name: fr.site.activation });
  await expect(activation.getByRole('button', { name: fr.common.activate, exact: true })).toBeDisabled();

  await page.getByRole('button', { name: fr.site.addZone }).click();
  const zone = page.getByRole('region', { name: fr.site.zones });
  await zone.getByLabel(fr.site.code, { exact: true }).fill('RES');
  await zone.getByLabel(fr.site.name, { exact: true }).fill('Réserve B');
  await zone.getByRole('button', { name: fr.common.save }).click();
  await expect(page.getByRole('table', { name: fr.site.zones })).toContainText('Réserve B');

  await activation.getByRole('button', { name: fr.common.activate, exact: true }).click();
  await expect(page.getByRole('region').filter({ hasText: fr.site.activation })).toContainText(
    fr.common.active,
  );
});

test('Administrateur — composer un rôle, créer un utilisateur qui ne voit que ce que ses permissions ouvrent', async ({
  page,
  browser,
}) => {
  await asAnna(page);
  await page.getByRole('link', { name: fr.administration.usersAndTeams }).click();
  await page.getByRole('tab', { name: fr.administration.roles }).click();
  await page.getByRole('button', { name: fr.role.create }).click();
  await page.getByLabel(fr.role.name, { exact: true }).fill('Chef d’équipe réception');
  await page.getByRole('checkbox', { name: fr.permission.openInboundArrival }).check({ force: true });
  await page.getByRole('button', { name: fr.role.create }).click();
  await expect(page.getByRole('heading', { name: 'Chef d’équipe réception' })).toBeVisible();

  await page.getByRole('link', { name: fr.administration.usersAndTeams }).click();
  await page.getByRole('button', { name: fr.user.create }).click();
  await page.getByLabel(fr.user.displayName, { exact: true }).fill('Utilisateur fictif');
  await page.getByLabel(fr.user.loginName, { exact: true }).fill('fictif');
  await page.getByLabel(fr.user.password, { exact: true }).fill('mot-de-passe-fictif-12');
  await page.getByRole('checkbox', { name: 'A · Site A' }).first().check({ force: true });
  await page.getByRole('checkbox', { name: /^Chef d’équipe réception/u }).check({ force: true });
  await page.getByRole('button', { name: fr.user.create }).click();
  await expect(page.getByRole('heading', { name: 'Utilisateur fictif' })).toBeVisible();
  await expect(page.getByText(fr.permission.openInboundArrival)).toBeVisible();

  // L'utilisateur créé ouvre sa session : pas d'administration dans son menu.
  const baseURL = test.info().project.use.baseURL;
  const context = await browser.newContext(baseURL === undefined ? {} : { baseURL });
  const other = await context.newPage();
  await other.goto('/session');
  await other.getByLabel(fr.session.loginName, { exact: true }).fill('fictif');
  await other.getByLabel(fr.session.password, { exact: true }).fill('mot-de-passe-fictif-12');
  await other.getByRole('button', { name: fr.session.open }).click();
  await other.waitForURL(/\/receptions$/u);
  await expect(other.getByRole('link', { name: fr.navigation.receptions })).toBeVisible();
  await expect(other.getByRole('link', { name: fr.administration.settings })).toHaveCount(0);
  await context.close();
});
