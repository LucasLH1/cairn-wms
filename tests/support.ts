import { createHmac } from 'node:crypto';
import { existsSync } from 'node:fs';
import { fr } from '@cairn/libelles';
import type { Page } from '@playwright/test';

// Aides des tests de bout en bout. Toutes les valeurs sont celles, fictives, du jeu de données.
if (existsSync('.env')) process.loadEnvFile('.env');

export const DATASET_PASSWORD = 'demo-fictif';
/** Poste « Poste bureau 1 » du jeu de données (apps/serveur/src/dataset). */
export const OFFICE_WORKSTATION_ID = '0199f000-0000-7000-8000-000000000001';

/**
 * Le navigateur du test devient celui d'un poste déclaré : il reçoit le cookie que la déclaration du
 * poste aurait posé, signé du secret de l'instance des tests.
 */
export async function useWorkstation(page: Page, workstationId: string): Promise<void> {
  const secret = process.env['CAIRN_COOKIE_SECRET'];
  if (secret === undefined) throw new Error('CAIRN_COOKIE_SECRET manque : voir .env.example.');
  const signature = createHmac('sha256', secret).update(`workstation:${workstationId}`).digest('base64url');
  await page.context().addCookies([
    {
      name: 'cairn_workstation',
      value: `${workstationId}.${signature}`,
      url: page.url() === 'about:blank' ? 'http://127.0.0.1:4173' : page.url(),
    },
  ]);
}

export async function signIn(page: Page, loginName: string): Promise<void> {
  await page.goto('/session');
  await page.getByLabel(fr.session.loginName).fill(loginName);
  await page.getByLabel(fr.session.password).fill(DATASET_PASSWORD);
  await page.getByRole('button', { name: fr.session.open }).click();
  await page.waitForURL(/\/$/u);
}

/** Choisit une option d'une liste déroulante par son libellé. */
export async function choose(page: Page, label: string, option: string | RegExp): Promise<void> {
  // Le nom accessible du bouton est la valeur choisie, puis le libellé du champ.
  await page.getByRole('button', { name: new RegExp(`${label}$`, 'u') }).click();
  await page.getByRole('option', { name: option }).click();
}
