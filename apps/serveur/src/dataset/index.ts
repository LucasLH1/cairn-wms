import type { Database, DatabaseTransaction } from '../socle/database/index.js';
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

/** Références du scénario 1 (§ 4) : code, libellé, unités par carton. */
export const DATASET_ITEMS = [
  { code: 'MD-001', shortLabel: 'Câble HDMI 2 m', unitsPerCarton: 50 },
  { code: 'MD-002', shortLabel: 'Manette sans fil', unitsPerCarton: 20 },
  { code: 'MD-003', shortLabel: 'Chargeur USB-C 30 W', unitsPerCarton: 30 },
  { code: 'MD-004', shortLabel: 'Station de charge double', unitsPerCarton: 10 },
] as const;

/**
 * Postes du jeu de données, à identifiant fixe : les tests de bout en bout en signent le cookie comme
 * le ferait la déclaration du poste. Le nom vient de la maquette.
 */
export const DATASET_WORKSTATIONS = [
  { id: '0199f000-0000-7000-8000-000000000001', name: 'Poste bureau 1' },
  { id: '0199f000-0000-7000-8000-000000000002', name: 'Poste chariot 1' },
] as const;

/**
 * Rôles opérationnels du jeu de données (§ 4). Chacun ne porte que les permissions des gestes que le
 * scénario fait faire à son titulaire ; le reste attend la réponse de #73.
 */
const DATASET_ROLES = [
  { name: 'Gestionnaire', holders: ['anna'], permissions: ['createExpectedReceipt'] },
  { name: 'Cheffe de quai', holders: ['chloe'], permissions: ['openInboundArrival'] },
] as const;

/**
 * Jeu de données des scénarios du lot 1 (docs/lots/lot-1/, § « Jeu de données »), toutes valeurs
 * fictives, chargé dans une base vide. Il se complète étape par étape du scénario 1 (#60 à #71).
 * Deux valeurs n'y sont pas données et sont posées ici, manifestement fictives : le code du
 * fournisseur et le nom du niveau de base des références (#73).
 */
export async function loadScenarioDataset(db: Database): Promise<DatasetReport> {
  const passwordHash = await hashPassword(DATASET_PASSWORD);
  return db.transaction().execute(async (transaction) => {
    // Prestataire et site A (§ 4) : ouvert du lundi au vendredi de 7 h à 19 h, fuseau Europe/Paris.
    await transaction.updateTable('foundation.provider').set({ name: 'Logistique Démo' }).execute();
    const site = await transaction
      .insertInto('foundation.site')
      .values({ code: 'A', name: 'Site A', timeZone: 'Europe/Paris', active: true })
      .returning('id')
      .executeTakeFirstOrThrow();
    await transaction
      .insertInto('foundation.siteOpeningRange')
      .values(
        [1, 2, 3, 4, 5].map((weekday) => ({ siteId: site.id, weekday, opensAt: '07:00', closesAt: '19:00' })),
      )
      .execute();
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
    await transaction
      .insertInto('foundation.workstation')
      .values(DATASET_WORKSTATIONS.map((workstation) => ({ ...workstation, siteId: site.id })))
      .execute();
    const userIds = new Map(DATASET_USERS.map((user, index) => [user.loginName, users[index]?.id]));
    // Dans la maquette, Anna ouvre aussi les écrans d'administration : elle porte le rôle modèle
    // Administrateur, qui déclare aussi les postes.
    const administrator = await transaction
      .selectFrom('foundation.role')
      .select('id')
      .where('template', '=', 'administrator')
      .executeTakeFirstOrThrow();
    const anna = userIds.get('anna');
    if (anna === undefined) throw new Error('dataset: anna missing');
    await transaction
      .insertInto('foundation.userRole')
      .values({ userId: anna, roleId: administrator.id })
      .execute();
    for (const definition of DATASET_ROLES) {
      const role = await transaction
        .insertInto('foundation.role')
        .values({ name: definition.name, nature: 'operational' })
        .returning('id')
        .executeTakeFirstOrThrow();
      await transaction
        .insertInto('foundation.rolePermission')
        .values(definition.permissions.map((permission) => ({ roleId: role.id, permission })))
        .execute();
      for (const holder of definition.holders) {
        const userId = userIds.get(holder);
        if (userId === undefined) throw new Error(`dataset: unknown role holder ${holder}`);
        await transaction.insertInto('foundation.userRole').values({ userId, roleId: role.id }).execute();
      }
    }

    // Donneur d'ordre et tiers (§ 4) : Maison Démo, son fournisseur.
    const principal = await transaction
      .insertInto('logistics.principal')
      .values({ code: 'MD', name: 'Maison Démo' })
      .returning('id')
      .executeTakeFirstOrThrow();
    await transaction
      .insertInto('logistics.party')
      .values({ family: 'supplier', principalId: principal.id, code: 'FD', name: 'Fournisseur Démo' })
      .execute();

    // Transporteur du prestataire (scénario 3, § 4), utilisable par tous les donneurs d'ordre.
    await transaction
      .insertInto('logistics.party')
      .values({ family: 'carrier', principalId: null, code: 'MSG', name: 'Messagerie Démo' })
      .execute();

    const locations = await loadWarehouse(transaction, site.id);

    // Références, gestion quantitative, conditionnées en cartons (§ 4).
    for (const definition of DATASET_ITEMS) {
      const item = await transaction
        .insertInto('logistics.item')
        .values({
          principalId: principal.id,
          code: definition.code,
          shortLabel: definition.shortLabel,
          trackingMode: 'quantity',
        })
        .returning('id')
        .executeTakeFirstOrThrow();
      await transaction
        .insertInto('logistics.packagingLevel')
        .values([
          { itemId: item.id, rank: 0, name: 'Unité', unitsOfLowerLevel: null },
          { itemId: item.id, rank: 1, name: 'Carton', unitsOfLowerLevel: definition.unitsPerCarton },
        ])
        .execute();
      await transaction
        .insertInto('logistics.itemBarcode')
        .values({ principalId: principal.id, code: definition.code, itemId: item.id, nature: 'internal' })
        .execute();
    }

    return {
      Site: 1,
      User: users.length,
      Workstation: DATASET_WORKSTATIONS.length,
      Role: DATASET_ROLES.length,
      Principal: 1,
      Supplier: 1,
      Carrier: 1,
      Location: locations,
      Item: DATASET_ITEMS.length,
    };
  });
}

/**
 * Plan du site A (§ 4) : zone de quai, deux quais et deux emplacements de quai par quai ; réserve en
 * régime libre, allées A et B, dix travées, trois niveaux, un support par emplacement ; un
 * emplacement de débordement. Adresses de la maquette : « Q1-1 », « A-03-1 », « DEB-01 ».
 * La cohabitation des zones n'est pas dite : elles sont mutualisées, la règle la moins restrictive (#73).
 */
async function loadWarehouse(transaction: DatabaseTransaction, siteId: string): Promise<number> {
  const zone = async (code: string, name: string, purpose: string, addressPattern: object[]) =>
    (
      await transaction
        .insertInto('logistics.zone')
        .values({
          siteId,
          code,
          name,
          purpose,
          cohabitation: 'shared',
          addressPattern: JSON.stringify(addressPattern),
        })
        .returning('id')
        .executeTakeFirstOrThrow()
    ).id;
  const rows: {
    zoneId: string;
    dockId: string | null;
    type: string;
    address: string;
    segments: string;
    supportCapacity: number | null;
    overflow: boolean;
  }[] = [];

  const dockZone = await zone('QUAI', 'Zone de quai', 'receiving', [
    { name: 'quai', format: 'alphanumeric', length: 2 },
    { name: 'numéro', format: 'numeric', length: 1 },
  ]);
  for (const dockCode of ['Q1', 'Q2']) {
    const dock = await transaction
      .insertInto('logistics.dock')
      .values({ zoneId: dockZone, code: dockCode })
      .returning('id')
      .executeTakeFirstOrThrow();
    for (const number of ['1', '2']) {
      rows.push({
        zoneId: dockZone,
        dockId: dock.id,
        type: 'receivingDock',
        address: `${dockCode}-${number}`,
        segments: JSON.stringify([dockCode, number]),
        supportCapacity: null,
        overflow: false,
      });
    }
  }

  const reserve = await zone('RES', 'Réserve', 'storage', [
    { name: 'allée', format: 'alphabetic', length: 1 },
    { name: 'travée', format: 'numeric', length: 2 },
    { name: 'niveau', format: 'numeric', length: 1 },
  ]);
  for (const aisle of ['A', 'B']) {
    for (let bay = 1; bay <= 10; bay += 1) {
      for (let level = 1; level <= 3; level += 1) {
        const segments = [aisle, String(bay).padStart(2, '0'), String(level)];
        rows.push({
          zoneId: reserve,
          dockId: null,
          type: 'reserve',
          address: segments.join('-'),
          segments: JSON.stringify(segments),
          supportCapacity: 1,
          overflow: false,
        });
      }
    }
  }

  const overflowZone = await zone('DEB', 'Débordement', 'storage', [
    { name: 'zone', format: 'alphabetic', length: 3 },
    { name: 'numéro', format: 'numeric', length: 2 },
  ]);
  rows.push({
    zoneId: overflowZone,
    dockId: null,
    type: 'reserve',
    address: 'DEB-01',
    segments: JSON.stringify(['DEB', '01']),
    supportCapacity: null,
    overflow: true,
  });

  await transaction
    .insertInto('logistics.location')
    .values(rows.map((row, index) => ({ ...row, siteId, routeSequence: (index + 1) * 10 })))
    .execute();
  return rows.length;
}
