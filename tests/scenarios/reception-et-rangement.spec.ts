import { fr } from '@cairn/libelles';
import { expect, test } from '@playwright/test';
import { choose, OFFICE_WORKSTATION_ID, signIn, useWorkstation } from '../support.js';

// Scénario 1 du lot 1 — réception et rangement (docs/lots/lot-1/reception-et-rangement.md).
// Les étapes se suivent : chacune part de l'état où la précédente a laissé l'instance.
test.describe.configure({ mode: 'serial' });

const labels = fr.expectedReceipt;

test("Étape 1 — Anna saisit l'attendu", async ({ page }) => {
  await useWorkstation(page, OFFICE_WORKSTATION_ID);
  await signIn(page, 'anna');
  await page.getByRole('link', { name: fr.navigation.receptions }).click();
  await expect(page.getByRole('heading', { name: labels.openList })).toBeVisible();

  await page.getByRole('button', { name: labels.create }).click();
  await choose(page, labels.principal, 'Maison Démo');
  await choose(page, labels.supplier, 'Fournisseur Démo');
  // Date prévue : le jour du scénario (§ 4).
  const today = new Date();
  await page
    .getByRole('spinbutton', { name: new RegExp(`${labels.expectedArrivalDate}$`, 'u') })
    .first()
    .click();
  await page.keyboard.type(
    `${String(today.getDate()).padStart(2, '0')}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getFullYear())}`,
  );

  const lines = [
    ['MD-001', 100],
    ['MD-002', 40],
    ['MD-003', 60],
  ] as const;
  for (const [index, [code, quantity]] of lines.entries()) {
    if (index > 0) await page.getByRole('button', { name: labels.addLine }).click();
    await choose(page, `${labels.item} ${String(index + 1)}`, new RegExp(`^${code}`, 'u'));
    await page.getByLabel(`${labels.quantity} ${String(index + 1)}`).fill(String(quantity));
  }
  await page.getByRole('button', { name: labels.save }).click();

  // On constate : l'attendu est ouvert, daté, son solde par ligne égale la quantité attendue.
  await expect(page.getByRole('heading', { name: /^Attendu AT-\d{4}$/u })).toBeVisible();
  const table = page.getByRole('table', { name: labels.lines });
  for (const [code, quantity] of lines) {
    const row = table.getByRole('row').filter({ hasText: code });
    await expect(row.getByRole('cell').nth(2)).toHaveText(String(quantity));
    await expect(row.getByRole('cell').nth(3)).toHaveText('0');
    await expect(row.getByRole('cell').nth(4)).toHaveText(String(quantity));
  }

  // Il apparaît parmi les attendus ouverts du site.
  await page.getByRole('link', { name: fr.navigation.receptions }).click();
  const open = page.getByRole('table', { name: labels.openList });
  const row = open.getByRole('row').filter({ hasText: 'Maison Démo' });
  await expect(row).toContainText('Fournisseur Démo');
  await expect(row.getByRole('cell').nth(4)).toHaveText('3');
  await expect(row).toContainText(labels.states.open);
});

test("Étape 2 — Chloé ouvre l'arrivage", async ({ page, browser }) => {
  // Anna garde l'écran des réceptions ouvert : le changement doit lui parvenir sans rechargement.
  const baseURL = test.info().project.use.baseURL;
  const annaContext = await browser.newContext(baseURL === undefined ? {} : { baseURL });
  const anna = await annaContext.newPage();
  await useWorkstation(anna, OFFICE_WORKSTATION_ID);
  await signIn(anna, 'anna');
  await anna.getByRole('link', { name: fr.navigation.receptions }).click();
  const annaDock = anna.getByRole('article', { name: 'Quai Q1' });
  await expect(annaDock).toContainText(fr.dock.free);

  // Chloé, au poste du bureau comme dans la maquette, ouvre l'arrivage au quai Q1.
  await useWorkstation(page, OFFICE_WORKSTATION_ID);
  await signIn(page, 'chloe');
  await page.getByRole('link', { name: fr.navigation.receptions }).click();
  const dock = page.getByRole('article', { name: 'Quai Q1' });
  await dock.getByRole('button', { name: fr.arrival.open }).click();
  await page.getByLabel(fr.arrival.vehicle).fill('AB-123-CD');
  await choose(page, fr.arrival.carrier, 'Messagerie Démo');
  await page.getByRole('button', { name: fr.arrival.submit }).click();

  // On constate : le quai Q1 passe occupé, sa durée d'occupation défile en direct.
  await expect(dock).toContainText(fr.dock.occupied);
  await expect(dock).toContainText('AB-123-CD · Messagerie Démo');
  await expect(dock).toContainText('Ouvert par Chloé');
  const elapsed = dock.getByText(/^\d{2}:\d{2}:\d{2}$/u);
  const first = await elapsed.textContent();
  await expect(elapsed).not.toHaveText(first ?? '', { timeout: 3000 });

  // Et chez Anna, sans rechargement (RG-EXI-001).
  await expect(annaDock).toContainText(fr.dock.occupied);
  await expect(annaDock).toContainText('Ouvert par Chloé');
  await annaContext.close();
});
