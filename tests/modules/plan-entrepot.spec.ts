import { fr } from '@cairn/libelles';
import { expect, test, type Page } from '@playwright/test';
import { choose, OFFICE_WORKSTATION_ID, signIn, useWorkstation } from '../support.js';

// Module 0.3 — parcours de l'administrateur (§ 6), déroulés par Anna, administratrice du jeu de données.
test.describe.configure({ mode: 'serial' });

async function asAnna(page: Page): Promise<void> {
  await useWorkstation(page, OFFICE_WORKSTATION_ID);
  await signIn(page, 'anna');
}

/** Un libellé du catalogue, ses valeurs remplies. */
const fill = (label: string, values: Readonly<Record<string, string | number>>) =>
  Object.entries(values).reduce((text, [key, value]) => text.replace(`{{${key}}}`, String(value)), label);

/** Ouvre la fiche d'une zone du site A, depuis le paramétrage. */
async function openZone(page: Page, code: string): Promise<void> {
  await page.getByRole('link', { name: fr.administration.settings }).click();
  await page.getByRole('link', { name: 'A', exact: true }).click();
  await page
    .getByRole('table', { name: fr.site.zones })
    .getByRole('link', { name: code, exact: true })
    .click();
  await page.getByRole('tab', { name: fr.zone.patternTab }).waitFor();
}

test('Administrateur — générer une zone de racking', async ({ page }) => {
  await asAnna(page);
  await page.getByRole('link', { name: fr.administration.settings }).click();
  await page.getByRole('link', { name: 'A', exact: true }).click();
  await page.getByRole('button', { name: fr.site.addZone }).click();
  const zones = page.getByRole('region', { name: fr.site.zones });
  await zones.getByLabel(fr.site.code, { exact: true }).fill('RES2');
  await zones.getByLabel(fr.site.name, { exact: true }).fill('Réserve 2');
  await zones.getByRole('button', { name: fr.common.save }).click();
  await expect(page.getByRole('table', { name: fr.site.zones })).toContainText('RES2');
  await openZone(page, 'RES2');

  // Masque d'adressage : allée alphabétique 1, travée numérique 2, niveau numérique 1 ; serpentin.
  const pattern = page.getByRole('region', { name: fr.zone.pattern });
  const segments = [
    ['allée', fr.segmentFormat.alphabetic, '1'],
    ['travée', fr.segmentFormat.numeric, '2'],
    ['niveau', fr.segmentFormat.numeric, '1'],
  ] as const;
  for (const [index, [name, format, length]] of segments.entries()) {
    const rank = { rank: index + 1 };
    if (index > 0) await pattern.getByRole('button', { name: fr.zone.addSegment }).click();
    await pattern.getByLabel(fill(fr.zone.segmentName, rank), { exact: true }).fill(name);
    await choose(page, fill(fr.zone.segmentFormat, rank), new RegExp(`^${format}$`, 'u'));
    await pattern.getByLabel(fill(fr.zone.segmentLength, rank), { exact: true }).fill(length);
  }
  await pattern.getByLabel(fr.zone.separator, { exact: true }).fill('-');
  await choose(page, fr.zone.traversal, fr.traversal.alternating);
  // L'exemple d'adresse se construit à la saisie (0.3 § 6, étape 2).
  await expect(pattern.getByLabel(fr.zone.sampleAddress, { exact: true })).toHaveValue('A-01-1');
  await pattern.getByRole('button', { name: fr.common.save }).click();

  // Générateur : C..D × 01..03 × 1, sans D-02-* ; les allées A et B existent déjà sur le site (réserve RES).
  await page.getByRole('tab', { name: fr.zone.generatorTab }).click();
  const generator = page.getByRole('region', { name: fr.zone.generator });
  const ranges = [
    ['allée', 'C', 'D'],
    ['travée', '1', '3'],
    ['niveau', '1', '1'],
  ] as const;
  for (const [segment, from, to] of ranges) {
    await generator.getByLabel(fill(fr.zone.rangeFrom, { segment }), { exact: true }).fill(from);
    await generator.getByLabel(fill(fr.zone.rangeTo, { segment }), { exact: true }).fill(to);
  }
  await generator.getByLabel(fr.zone.exclusions, { exact: true }).fill('D-02-*');
  // Pas de génération sans aperçu (RG-EMP-019).
  await expect(generator.getByRole('button', { name: fr.zone.generate })).toBeDisabled();
  await generator.getByRole('button', { name: fr.zone.preview }).click();

  const preview = page.getByRole('region', { name: fr.zone.previewTitle });
  await expect(preview).toContainText(fill(fr.zone.previewCount, { count: 5 }));
  await expect(
    page.getByRole('table', { name: fr.zone.firstAddresses }).getByRole('row').nth(1),
  ).toContainText('C-01-1');
  await generator.getByRole('button', { name: fr.zone.generate }).click();
  await expect(page.getByText(fill(fr.zone.generated, { count: 5 }))).toBeVisible();

  await page.getByRole('tab', { name: fr.zone.locationsTab }).click();
  const locations = page.getByRole('table', { name: fr.zone.locations });
  await expect(locations).toContainText('D-03-1');
  await expect(locations).not.toContainText('D-02-1');
});

test('Administrateur — ajuster un parcours', async ({ page }) => {
  await asAnna(page);
  await openZone(page, 'RES2');
  await page.getByRole('tab', { name: fr.zone.locationsTab }).click();
  const rows = page.getByRole('table', { name: fr.zone.locations }).getByRole('row');
  // La ligne 0 est l'en-tête ; la liste est triée par séquence de parcours.
  const first = rows.nth(1);
  const second = rows.nth(2);
  await expect(first).toContainText('C-01-1');
  const firstRank = (await first.getByRole('cell').first().innerText()).trim();
  const secondAddress = (await second.getByRole('cell').nth(1).innerText()).trim();

  // La séquence du premier, saisie sur le second : refusée, en nommant l'emplacement en conflit.
  await second.getByRole('button', { name: fr.common.edit }).click();
  const rank = page.getByRole('region', { name: fill(fr.zone.rankTitle, { address: secondAddress }) });
  await rank.getByLabel(fr.zone.rank, { exact: true }).fill(firstRank);
  await rank.getByRole('button', { name: fr.common.save }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: fill(fr.refusal.traversalRankTaken, { name: 'C-01-1' }) }),
  ).toBeVisible();
});
