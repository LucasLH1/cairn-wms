import { sql, type Kysely } from 'kysely';

/**
 * Module 0.5 en entier (fiche 0032) : tiers et leurs adresses par usage (RG-TRS-001 à 011), client final
 * durable, fusion et anonymisation (RG-TRS-012 à 024), services et comptes des transporteurs
 * (RG-TRS-025 à 031), sous-traitants (RG-TRS-032, 034). Grandeurs physiques en entiers : grammes,
 * millimètres, centimes (fiche 0017, règle 5).
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table logistics.party
      add column email text,
      add column phone text,
      -- Client final : fiche à compléter quand créée à la volée sans adresse valable (0.5, cas limites).
      add column to_complete boolean not null default false,
      -- Dernier flux le concernant : point de départ de la durée de conservation (RG-TRS-017).
      add column last_flow_at timestamptz,
      add column anonymized_at timestamptz,
      -- Fiche absorbée par une fusion : consultable en lecture seule (RG-TRS-016).
      add column merged_into_party_id uuid references logistics.party (id),
      -- Sous-traitant : nature de la prestation, certificat de destruction (RG-TRS-032, 034).
      add column subcontracting_nature text check (subcontracting_nature in
        ('repair', 'destruction', 'recycling', 'refurbishment', 'other')),
      add column issues_destruction_certificate boolean not null default false,
      add constraint party_subcontractor_nature check ((family = 'subcontractor') = (subcontracting_nature is not null));

    -- Durée de conservation des données identifiantes des clients finaux, en mois (RG-TRS-017).
    alter table logistics.principal add column end_customer_retention_months integer
      check (end_customer_retention_months > 0);

    -- Adresses d'un tiers, qualifiées par usage ; une par défaut de chaque usage (RG-TRS-007, 008).
    create table logistics.party_address (
      id uuid primary key default uuidv7(),
      party_id uuid not null references logistics.party (id),
      usage text not null check (usage in ('delivery', 'return', 'billing', 'headOffice')),
      is_default boolean not null default false,
      recipient text,
      line1 text,
      line2 text,
      postal_code text,
      city text,
      country_code text not null check (country_code ~ '^[A-Z]{2}$'),
      active boolean not null default true
    );
    create unique index party_address_default on logistics.party_address (party_id, usage) where is_default and active;
    -- Une adresse utilisée ne se supprime pas, elle se désactive (RG-TRS-011).
    revoke delete, truncate on logistics.party_address from cairn_app;

    -- Services d'un transporteur (RG-TRS-025 à 029, 031).
    create table logistics.carrier_service (
      id uuid primary key default uuidv7(),
      carrier_id uuid not null references logistics.party (id),
      code text not null,
      name text not null,
      direction text not null check (direction in ('outbound', 'return', 'both')),
      max_weight_grams integer check (max_weight_grams > 0),
      max_length_mm integer check (max_length_mm > 0),
      max_width_mm integer check (max_width_mm > 0),
      max_height_mm integer check (max_height_mm > 0),
      max_dimension_sum_mm integer check (max_dimension_sum_mm > 0),
      max_insured_value_cents bigint check (max_insured_value_cents > 0),
      accepts_dangerous_goods boolean not null default false,
      label text not null check (label in ('none', 'carrier', 'provider')),
      lead_time_days integer not null check (lead_time_days >= 0),
      active boolean not null default true,
      unique (carrier_id, code)
    );

    -- Comptes transporteur : du prestataire, ou du couple prestataire et donneur d'ordre (RG-TRS-030).
    create table logistics.carrier_account (
      id uuid primary key default uuidv7(),
      carrier_id uuid not null references logistics.party (id),
      principal_id uuid references logistics.principal (id),
      account_number text not null,
      contract_reference text,
      active boolean not null default true
    );
    create unique index carrier_account_scope on logistics.carrier_account
      (carrier_id, coalesce(principal_id, '00000000-0000-0000-0000-000000000000'::uuid), account_number);

    revoke delete, truncate on logistics.party, logistics.carrier_service, logistics.carrier_account from cairn_app;

    -- Rôles modèles : l'administrateur administre transporteurs et sous-traitants ; les gestionnaires
    -- tiennent fournisseurs et clients finaux, le gestionnaire SAV les fusionne et les anonymise.
    insert into foundation.role_permission (role_id, permission)
    select role.id, permission
    from foundation.role
    cross join lateral unnest(case role.template
      when 'administrator' then array['administerProviderParties']
      when 'supervisor' then array['managePrincipalParties']
      when 'afterSalesManager' then array['managePrincipalParties', 'mergeEndCustomers', 'anonymizeEndCustomers']
      when 'disputeManager' then array['managePrincipalParties']
      else array[]::text[]
    end) as permission
    where role.template is not null
    on conflict do nothing;

    -- Date de création d'un tiers : faute de flux, la conservation court depuis elle (RG-TRS-017).
    alter table logistics.party add column created_at timestamptz not null default now();

    -- Clé générée d'un client final, faute de clé fournie par le donneur d'ordre (RG-TRS-012).
    insert into foundation.numbering_scheme (object_type, segments) values ('EndCustomer',
      '[{"kind":"literal","value":"CF-"},{"kind":"principal"},{"kind":"literal","value":"-"},{"kind":"counter","width":6}]'::jsonb);
  `.execute(db);
}
