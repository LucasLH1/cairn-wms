import { sql, type Kysely } from 'kysely';

/**
 * Module 0.3 (fiche 0032) : sens de circulation, mode de prélèvement et ordre de visite des zones
 * (RG-EMP-016, 017, 032) ; séquence de parcours unique dans sa zone (RG-EMP-013) ; capacités d'un
 * emplacement (RG-EMP-023) ; emplacements virtuels, leur famille et leur tiers (RG-EMP-039 à 045) ;
 * emplacements de prélèvement dédiés et leur règle de réapprovisionnement (RG-EMP-033, 034).
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table logistics.zone
      add column traversal text not null default 'constant' check (traversal in ('constant', 'alternating')),
      add column pick_mode text not null default 'dynamic' check (pick_mode in ('dynamic', 'dedicated')),
      -- Ordre de visite des zones d'un site (RG-EMP-017).
      add column visit_rank integer not null default 0;

    -- La séquence de parcours porte le nom du glossaire (TraversalRank). Unique dans sa zone ; la
    -- vérification attend la fin de la transaction, pour qu'une renumérotation puisse permuter.
    alter table logistics.location rename column route_sequence to traversal_rank;
    alter table logistics.location
      add constraint location_traversal_rank unique (zone_id, traversal_rank) deferrable initially deferred,
      add column max_weight_grams integer check (max_weight_grams > 0),
      add column max_volume_cm3 integer check (max_volume_cm3 > 0),
      add column virtual_family text check (virtual_family in (
        'interSiteTransit', 'atCarrier', 'atEndCustomer', 'atSubcontractor', 'awaitingReturn')),
      add column party_id uuid references logistics.party (id),
      add constraint location_virtual check ((type = 'virtual') = (virtual_family is not null)),
      add constraint location_party check (party_id is null or type = 'virtual'),
      -- Un emplacement virtuel ne porte aucune contrainte de capacité (RG-EMP-045).
      add constraint location_virtual_capacity check (type <> 'virtual' or (
        max_weight_grams is null and max_volume_cm3 is null and support_capacity is null));

    -- Identifiant scannable, unique sur l'instance : EMP-, le code du site, l'adresse (RG-EMP-007,
    -- RG-SUR-061 ; 0.3 § 7).
    alter table logistics.location add column barcode text;
    update logistics.location location set barcode = 'EMP-' || site.code || '-' || location.address
      from foundation.site site where site.id = location.site_id;
    alter table logistics.location alter column barcode set not null, add constraint location_barcode unique (barcode);

    -- Emplacement de prélèvement dédié : attitré à une référence, avec son seuil et sa cible de
    -- recomplètement (RG-EMP-033, 034). Une référence peut en avoir plusieurs.
    create table logistics.fixed_pick_location (
      location_id uuid primary key references logistics.location (id),
      item_id uuid not null references logistics.item (id),
      replenishment_threshold integer not null check (replenishment_threshold >= 0),
      replenishment_target integer not null,
      check (replenishment_target > replenishment_threshold)
    );
  `.execute(db);
}
