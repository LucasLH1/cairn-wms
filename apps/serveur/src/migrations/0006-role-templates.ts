import { sql, type Kysely } from 'kysely';

/**
 * Rôles modèles préconfigurés (RG-ORG-020), créés à l'initialisation, modifiables et supprimables. La
 * spécification en donne les noms, pas la composition : chacun reçoit ici les permissions existantes
 * que son nom désigne ; chaque module qui livre des gestes complète les modèles par sa propre migration.
 * Nature (RG-SUR-022) : administrative pour l'administrateur seul — les autres exécutent des gestes.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    insert into foundation.role (name, nature, template) values
      ('Administrateur', 'administrative', 'administrator'),
      ('Superviseur', 'operational', 'supervisor'),
      ('Réceptionnaire', 'operational', 'receiver'),
      ('Magasinier', 'operational', 'warehouseKeeper'),
      ('Préparateur', 'operational', 'picker'),
      ('Expéditeur', 'operational', 'shipper'),
      ('Technicien d''atelier', 'operational', 'workshopTechnician'),
      ('Gestionnaire de litiges', 'operational', 'disputeManager'),
      ('Gestionnaire SAV', 'operational', 'afterSalesManager')
    on conflict (name) do nothing;

    insert into foundation.role_permission (role_id, permission)
    select role.id, permission
    from foundation.role
    cross join lateral unnest(case role.template
      when 'administrator' then array[
        'administerProvider', 'administerSites', 'administerPrincipals', 'administerRoles',
        'administerUsers', 'administerExecutionSites', 'administerTeams', 'administerNumbering',
        'declareWorkstation']
      when 'supervisor' then array['createExpectedReceipt', 'openInboundArrival']
      when 'receiver' then array['openInboundArrival']
      else array[]::text[]
    end) as permission
    where role.template is not null
    on conflict do nothing;
  `.execute(db);
}
