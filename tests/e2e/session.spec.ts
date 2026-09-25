import { fr } from '@cairn/libelles';
import { expect, test } from '@playwright/test';

// Ossature (fiche 0027) : ouvrir une session avec un utilisateur du jeu de données, la voir tenue par
// l'ossature, la fermer. Valeurs du jeu de données, toutes fictives.

test('un mauvais mot de passe est refusé avec son motif', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/session$/u);
  await page.getByLabel(fr.session.loginName).fill('anna');
  await page.getByLabel(fr.session.password).fill('faux');
  await page.getByRole('button', { name: fr.session.open }).click();
  await expect(page.getByRole('alert')).toHaveText(fr.refusal.invalidCredentials);
});

test("Anna ouvre une session, voit son nom et l'état de son poste, puis la ferme", async ({ page }) => {
  await page.goto('/session');
  await page.getByLabel(fr.session.loginName).fill('anna');
  await page.getByLabel(fr.session.password).fill('demo-fictif');
  await page.getByRole('button', { name: fr.session.open }).click();
  await expect(page).toHaveURL(/\/$/u);
  await expect(page.getByText('Anna')).toBeVisible();
  await expect(page.getByText(fr.workstation.undeclared)).toBeVisible();

  await page.getByRole('button', { name: fr.session.close }).click();
  await expect(page).toHaveURL(/\/session$/u);
  await page.goto('/');
  await expect(page).toHaveURL(/\/session$/u);
});
