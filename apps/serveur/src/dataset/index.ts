import type { Database } from '../socle/database/index.js';
import { hashPassword } from '../socle/user/index.js';

/** Ce qu'un chargement a posé, par objet : le chargeur rend compte de ce qu'il fait. */
export type DatasetReport = Readonly<Record<string, number>>;

/** Mot de passe de tous les utilisateurs du jeu de données : fictif, public, jamais celui d'une instance réelle. */
export const DATASET_PASSWORD = 'demo-fictif';

/** Utilisateurs du scénario 1 (§ 4), avec leur identifiant de connexion. */
export const DATASET_USERS = [
  { loginName: 'anna', displayName: 'Anna' },
  { loginName: 'chloe', displayName: 'Chloé' },
  { loginName: 'remi', displayName: 'Rémi' },
  { loginName: 'bruno', displayName: 'Bruno' },
] as const;

/**
 * Jeu de données des scénarios du lot 1 (docs/lots/lot-1/, § « Jeu de données »), toutes valeurs
 * fictives, chargé dans une base vide. Il se complète avec les modules qui en portent les objets :
 * rôles, organisation, emplacements et références viennent avec le scénario 1 (#60).
 */
export async function loadScenarioDataset(db: Database): Promise<DatasetReport> {
  const passwordHash = await hashPassword(DATASET_PASSWORD);
  return db.transaction().execute(async (transaction) => {
    const site = await transaction
      .insertInto('foundation.site')
      .values({ code: 'A', name: 'Site A', timeZone: 'Europe/Paris' })
      .returning('id')
      .executeTakeFirstOrThrow();
    const users = await transaction
      .insertInto('foundation.user')
      .values(DATASET_USERS.map((user) => ({ ...user, passwordHash })))
      .returning('id')
      .execute();
    // Rôles opérationnels, site A : les quatre y agissent (§ 4).
    await transaction
      .insertInto('foundation.userSite')
      .values(users.map((user) => ({ userId: user.id, siteId: site.id, execution: true })))
      .execute();
    return { Site: 1, User: users.length };
  });
}
