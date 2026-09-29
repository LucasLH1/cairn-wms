import { sql, type Kysely } from 'kysely';

/**
 * Module 0.2 (fiche 0032) : familles (RG-REF-004), états et axe de gestion (RG-REF-005, 011 à 013),
 * caractéristiques des niveaux de conditionnement (RG-REF-018 à 023), identifiant d'un niveau
 * (RG-REF-022), kits, nomenclatures et équivalences (RG-REF-024 à 033), champs personnalisés
 * (RG-REF-034 à 037), dates et ADR (RG-REF-042, 045), valeur déclarée et son historique
 * (RG-REF-047 à 050). Grandeurs en entiers : grammes, millimètres, centimes (fiche 0017, règle 5).
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    -- Devise unique du donneur d'ordre, code ISO 4217 (RG-REF-049).
    alter table logistics.principal add column currency text check (currency ~ '^[A-Z]{3}$');

    -- Familles d'un donneur d'ordre, en liste plate ou en arborescence (0.2 § 4).
    create table logistics.item_family (
      id uuid primary key default uuidv7(),
      principal_id uuid not null references logistics.principal (id),
      parent_id uuid references logistics.item_family (id),
      code text not null,
      name text not null,
      active boolean not null default true,
      unique (principal_id, code)
    );
    revoke delete, truncate on logistics.item_family from cairn_app;

    -- Le lot porte son nom du glossaire (Batch) ; la série peut en outre suivre le lot (RG-REF-012).
    alter table logistics.item drop constraint item_tracking_mode_check;
    update logistics.item set tracking_mode = 'batch' where tracking_mode = 'lot';
    alter table logistics.item
      add constraint item_tracking_mode_check check (tracking_mode in ('quantity', 'batch', 'serial')),
      drop column family,
      add column family_id uuid references logistics.item_family (id),
      add column serial_batch_tracking boolean not null default false,
      add constraint item_serial_batch check (not serial_batch_tracking or tracking_mode = 'serial'),
      -- Dates portées par le stock de la référence (RG-REF-042).
      add column tracks_expiry_date boolean not null default false,
      add column tracks_manufacturing_date boolean not null default false,
      -- Classement ADR, déclaratif (RG-REF-045, 046) : classe et numéro ONU vont ensemble.
      add column adr_class text,
      add column adr_un_number text check (adr_un_number ~ '^[0-9]{4}$'),
      add column adr_packing_group text check (adr_packing_group in ('I', 'II', 'III')),
      add constraint item_adr check (
        (adr_class is null) = (adr_un_number is null) and (adr_class is not null or adr_packing_group is null)
      ),
      -- Kit : référence assemblée (RG-REF-024).
      add column is_kit boolean not null default false,
      -- Valeur unitaire déclarée, en centimes de la devise du donneur d'ordre (RG-REF-047, 049).
      add column declared_value_cents bigint check (declared_value_cents >= 0),
      -- Ancienneté d'un brouillon (RG-REF-041) et version de la fiche.
      add column created_at timestamptz not null default now(),
      add column version integer not null default 1;
    -- Une référence ne se supprime jamais (RG-REF-005).
    revoke delete, truncate on logistics.item from cairn_app;

    -- Caractéristiques physiques propres à chaque niveau (RG-REF-020, 021).
    alter table logistics.packaging_level
      add column gross_weight_grams integer check (gross_weight_grams > 0),
      add column length_mm integer check (length_mm > 0),
      add column width_mm integer check (width_mm > 0),
      add column height_mm integer check (height_mm > 0);

    -- Un identifiant peut désigner un niveau de conditionnement (RG-REF-022) ; il ne se supprime
    -- jamais, il se désactive (RG-REF-010).
    alter table logistics.item_barcode add column packaging_rank integer check (packaging_rank >= 0);
    revoke delete, truncate on logistics.item_barcode from cairn_app;

    -- Composition d'un kit (RG-REF-024, 026, 027).
    create table logistics.kit_component (
      kit_item_id uuid not null references logistics.item (id),
      component_item_id uuid not null references logistics.item (id),
      quantity integer not null check (quantity > 0),
      primary key (kit_item_id, component_item_id),
      check (kit_item_id <> component_item_id)
    );

    -- Nomenclature de réparation : composants remplaçables, sans effet sur le stock (RG-REF-028).
    create table logistics.repair_bom_component (
      item_id uuid not null references logistics.item (id),
      component_item_id uuid not null references logistics.item (id),
      quantity integer not null check (quantity > 0),
      primary key (item_id, component_item_id),
      check (item_id <> component_item_id)
    );

    -- Équivalence orientée : la remplaçante peut servir à la place de la remplacée (RG-REF-031, 032).
    create table logistics.item_substitution (
      replaced_item_id uuid not null references logistics.item (id),
      replacing_item_id uuid not null references logistics.item (id),
      primary key (replaced_item_id, replacing_item_id),
      check (replaced_item_id <> replacing_item_id)
    );

    -- Champs personnalisés d'un donneur d'ordre (RG-REF-034) ; un champ renseigné se désactive
    -- seulement (RG-REF-037).
    create table logistics.custom_field (
      id uuid primary key default uuidv7(),
      principal_id uuid not null references logistics.principal (id),
      label text not null,
      field_type text not null check (field_type in ('text', 'number', 'date', 'list', 'boolean')),
      list_values jsonb not null default '[]'::jsonb,
      required boolean not null default false,
      active boolean not null default true,
      rank integer not null default 0,
      unique (principal_id, label)
    );

    create table logistics.item_custom_value (
      item_id uuid not null references logistics.item (id),
      custom_field_id uuid not null references logistics.custom_field (id),
      value jsonb not null,
      primary key (item_id, custom_field_id)
    );

    -- Historique de la valeur déclarée : chaque valeur et sa date (RG-REF-050).
    create table logistics.item_declared_value (
      id uuid primary key default uuidv7(),
      item_id uuid not null references logistics.item (id),
      value_cents bigint check (value_cents >= 0),
      currency text,
      set_at timestamptz not null default now()
    );
    create index item_declared_value_by_item on logistics.item_declared_value (item_id, set_at);
    revoke update, delete, truncate on logistics.item_declared_value from cairn_app;

    -- Rôles modèles : le superviseur tient le référentiel et ses champs ; le réceptionnaire crée une
    -- référence à la volée (0.2 § 6).
    insert into foundation.role_permission (role_id, permission)
    select role.id, permission
    from foundation.role
    cross join lateral unnest(case role.template
      when 'supervisor' then array['manageItems', 'manageCustomFields', 'createDraftItem']
      when 'receiver' then array['createDraftItem']
      else array[]::text[]
    end) as permission
    where role.template is not null
    on conflict do nothing;
  `.execute(db);
}
