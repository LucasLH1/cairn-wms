/// <reference lib="dom" />
import { fr } from '@cairn/libelles';
import { expect, test, type Page } from '@playwright/test';
import { choose, OFFICE_WORKSTATION_ID, signIn, useWorkstation } from '../support.js';

// Mise en page de chaque écran réalisé, rendue par un vrai navigateur (fiche 0011) : aucun champ, libellé
// ou bouton ne chevauche un autre, aucun champ ne tronque la valeur qu'il affiche, rien ne déborde du
// contenu. Les tests de parcours remplissent des champs ; celui-ci regarde ce que l'écran montre.

interface Defect {
  readonly kind: 'overlap' | 'clipped' | 'overflow';
  readonly what: string;
}

/** Les défauts de mise en page du contenu affiché, mesurés dans la page. */
async function layoutDefects(page: Page): Promise<Defect[]> {
  await page.waitForLoadState('networkidle');
  return page.evaluate(() => {
    // Le contenu, sous la barre du haut : celle-ci est collante et passe au-dessus de ce qui défile.
    const main = document.querySelector('main > section');
    if (main === null) return [{ kind: 'overflow' as const, what: 'contenu absent' }];
    const bounds = main.getBoundingClientRect();
    const name = (element: Element) => {
      const text = element.textContent.trim().slice(0, 40);
      const value = element instanceof HTMLInputElement ? element.value : '';
      return `${element.tagName.toLowerCase()} « ${text === '' ? value : text} »`;
    };
    // Ce que l'œil voit : ni les éléments masqués par découpage — le <select> natif que React Aria
    // rend à côté de chaque liste pour l'accessibilité —, ni ceux de taille nulle.
    const visible = (element: Element) => {
      const box = element.getBoundingClientRect();
      if (box.width <= 1 || box.height <= 1 || getComputedStyle(element).visibility === 'hidden')
        return false;
      for (let node: Element | null = element; node !== null; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (style.clipPath !== 'none') return false;
      }
      return true;
    };
    const boxes = [...main.querySelectorAll('label, input, button, [role="columnheader"], h2')].filter(
      visible,
    );
    const defects: { kind: 'overlap' | 'clipped' | 'overflow'; what: string }[] = [];
    for (const [index, first] of boxes.entries()) {
      const a = first.getBoundingClientRect();
      // Un tableau large défile dans son panneau, par construction : ce qui y est reste atteignable.
      const scrolled = first.closest('[role="table"]') !== null;
      if (a.right > bounds.right + 1 && !scrolled) defects.push({ kind: 'overflow', what: name(first) });
      if (first instanceof HTMLInputElement && first.scrollWidth > first.clientWidth + 1)
        defects.push({ kind: 'clipped', what: name(first) });
      for (const second of boxes.slice(index + 1)) {
        if (first.contains(second) || second.contains(first)) continue;
        const b = second.getBoundingClientRect();
        const width = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const height = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (width > 2 && height > 2)
          defects.push({ kind: 'overlap', what: `${name(first)} / ${name(second)}` });
      }
    }
    return defects;
  });
}

test.beforeEach(async ({ page }) => {
  await useWorkstation(page, OFFICE_WORKSTATION_ID);
  await signIn(page, 'anna');
});

const screens: readonly { readonly name: string; readonly open: (page: Page) => Promise<void> }[] = [
  { name: 'Accueil', open: () => Promise.resolve() },
  {
    name: 'Recherche',
    open: async (page) => {
      await page.getByRole('searchbox', { name: fr.search.label }).fill('MD');
      await page.getByRole('searchbox', { name: fr.search.label }).press('Enter');
      await page.getByRole('region', { name: fr.search.results }).waitFor();
    },
  },
  { name: 'Réceptions', open: (page) => page.goto('/receptions').then(() => undefined) },
  { name: 'Nouvel attendu', open: (page) => page.goto('/expected-receipts/new').then(() => undefined) },
  { name: 'Références', open: (page) => page.goto('/items').then(() => undefined) },
  {
    name: 'Fiche référence',
    open: async (page) => {
      await page.goto('/items');
      await page.getByRole('link', { name: 'MD-001' }).click();
      await page.getByRole('region', { name: fr.item.packaging }).waitFor();
      // Un second niveau vide : la ligne la plus chargée du formulaire.
      await page.getByRole('button', { name: fr.item.addLevel }).click();
    },
  },
  {
    name: 'Stock — consultation',
    open: async (page) => {
      await page.goto('/stock');
      await choose(page, fr.stock.item, /^MD-001 · /u);
      await page.getByRole('region', { name: fr.stock.crossTable }).waitFor();
    },
  },
  {
    name: 'Stock — blocages',
    open: async (page) => {
      await page.goto('/stock');
      await page.getByRole('tab', { name: fr.stock.holdsTab }).click();
      await page.getByRole('region', { name: fr.hold.list }).waitFor();
    },
  },
  {
    name: 'Stock — photos quotidiennes',
    open: async (page) => {
      await page.goto('/stock');
      await page.getByRole('tab', { name: fr.stock.snapshotsTab }).click();
      await page.getByRole('region', { name: fr.snapshot.list }).waitFor();
    },
  },
  {
    name: 'Déplacer du stock',
    open: async (page) => {
      await page.goto('/stock/move');
      await page.getByRole('region', { name: fr.stockMove.originTitle }).waitFor();
    },
  },
  { name: 'Tiers', open: (page) => page.goto('/parties').then(() => undefined) },
  {
    name: 'Fiche tiers',
    open: async (page) => {
      await page.goto('/parties');
      await page.getByRole('tab', { name: fr.party.suppliers }).click();
      await page.getByRole('link', { name: 'FD' }).click();
      await page.getByRole('region', { name: fr.address.title }).waitFor();
    },
  },
  { name: 'Paramétrage', open: (page) => page.goto('/administration/settings').then(() => undefined) },
  ...(
    [
      ['motifs de mouvement', fr.stockSettings.reasons],
      ['types de support', fr.stockSettings.handlingUnitTypes],
    ] as const
  ).map(([tab, label]) => ({
    name: `Paramétrage — ${tab}`,
    open: async (page: Page) => {
      await page.goto('/administration/settings');
      await page.getByRole('tab', { name: label }).click();
      await page.getByRole('region', { name: label }).waitFor();
      // Le formulaire d'ajout ouvert : la ligne la plus chargée du panneau.
      await page
        .getByRole('button', {
          name: label === fr.stockSettings.reasons ? fr.stockSettings.addReason : fr.stockSettings.addType,
        })
        .click();
    },
  })),
  {
    name: 'Fiche site',
    open: async (page) => {
      await page.goto('/administration/settings');
      await page.getByRole('link', { name: 'A', exact: true }).click();
      await page.getByRole('region', { name: fr.site.zones }).waitFor();
      await page.getByRole('region', { name: fr.stockSettings.snapshotTitle }).waitFor();
    },
  },
  ...(
    [
      ['masque et circulation', 'RES', fr.zone.patternTab],
      ['quais', 'QUAI', fr.zone.docksTab],
      ['générateur de plan', 'RES', fr.zone.generatorTab],
      ['emplacements', 'RES', fr.zone.locationsTab],
    ] as const
  ).map(([tab, zone, label]) => ({
    name: `Fiche zone — ${tab}`,
    open: async (page: Page) => {
      await page.goto('/administration/settings');
      await page.getByRole('link', { name: 'A', exact: true }).click();
      await page.getByRole('link', { name: zone, exact: true }).click();
      await page.getByRole('tab', { name: label }).click();
      await page.getByRole('tabpanel').getByRole('region').first().waitFor();
    },
  })),
  {
    name: 'Utilisateurs et équipes',
    open: (page) => page.goto('/administration/users').then(() => undefined),
  },
  {
    name: 'Fiche utilisateur',
    open: async (page) => {
      await page.goto('/administration/users');
      await page.getByRole('link', { name: 'Anna' }).click();
      await page.waitForURL(/\/administration\/users\/.+/u);
    },
  },
  { name: 'Donneurs d’ordre', open: (page) => page.goto('/administration/principals').then(() => undefined) },
  {
    name: 'Fiche donneur d’ordre',
    open: async (page) => {
      await page.goto('/administration/principals');
      await page.getByRole('link', { name: 'MD', exact: true }).click();
      await page.getByRole('region', { name: fr.principalAdmin.currencyTitle }).waitFor();
      await page.getByRole('region', { name: fr.stockSettings.qualityStates }).waitFor();
      // Le formulaire d'un état qualité ouvert, avec ses trois champs et ses caractères.
      await page.getByRole('button', { name: fr.stockSettings.addQualityState }).click();
    },
  },
];

for (const screen of screens) {
  test(`Mise en page — ${screen.name}`, async ({ page }) => {
    await screen.open(page);
    expect(await layoutDefects(page)).toEqual([]);
  });
}
