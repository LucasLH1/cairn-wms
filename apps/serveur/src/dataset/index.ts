/** Ce qu'un chargement a posé, par objet : le chargeur rend compte de ce qu'il fait. */
export type DatasetReport = Readonly<Record<string, number>>;

/**
 * Jeu de données des scénarios du lot 1 (docs/lots/lot-1/, § « Jeu de données »), toutes valeurs
 * fictives. Il se complète avec les modules qui en portent les objets : utilisateurs (#56),
 * organisation, emplacements et références (scénario 1, #60). Tant qu'aucun n'existe, il ne pose rien
 * et le dit ; il recevra la base avec son premier objet.
 */
export function loadScenarioDataset(): Promise<DatasetReport> {
  return Promise.resolve({});
}
