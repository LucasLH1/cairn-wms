import { sql, type Kysely } from 'kysely';

/**
 * Module 0.1 en entier (fiche 0032) : prestataire, site et son adresse, calendrier de site, donneur
 * d'ordre complet et donneur d'ordre interne, utilisateur complet, restrictions par donneur d'ordre,
 * équipes et hiérarchie (RG-SUR-008 à 018), équipe gravée dans chaque événement (RG-SUR-015),
 * numérotation composée de segments (RG-ORG-025 à 030).
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    -- Prestataire : le contexte de l'instance, une seule ligne (RG-ORG-001).
    create table foundation.provider (
      singleton boolean primary key default true check (singleton),
      name text
    );
    insert into foundation.provider (singleton) values (true);

    -- Site : adresse postale complète (RG-ORG-002), activation (parcours « Créer un site »).
    alter table foundation.site
      add column address_line1 text,
      add column address_line2 text,
      add column postal_code text,
      add column city text,
      add column country_code text not null default 'FR' check (country_code ~ '^[A-Z]{2}$'),
      add column active boolean not null default false;
    -- Les sites déjà en service le restent.
    update foundation.site set active = true;

    -- Calendrier de site (RG-ORG-031, 032) : plages hebdomadaires, jours fériés et fermetures.
    create table foundation.site_opening_range (
      site_id uuid not null references foundation.site (id),
      weekday smallint not null check (weekday between 1 and 7),
      opens_at time not null,
      closes_at time not null,
      primary key (site_id, weekday, opens_at),
      constraint opening_range_order check (opens_at < closes_at)
    );
    create table foundation.site_closure (
      site_id uuid not null references foundation.site (id),
      day date not null,
      kind text not null check (kind in ('publicHoliday', 'exceptional')),
      label text not null,
      primary key (site_id, day)
    );

    -- Utilisateur : adresse électronique, lien hiérarchique (RG-SUR-016 à 018).
    alter table foundation."user"
      add column email text,
      add column reports_to_user_id uuid references foundation."user" (id),
      add constraint user_not_own_manager check (reports_to_user_id is null or reports_to_user_id <> id);

    -- Équipes (RG-SUR-008 à 014) : un site, un encadrant facultatif, des membres ; une équipe par
    -- utilisateur au plus.
    create table foundation.team (
      id uuid primary key default uuidv7(),
      site_id uuid not null references foundation.site (id),
      name text not null,
      lead_user_id uuid references foundation."user" (id),
      active boolean not null default true,
      unique (site_id, name)
    );
    create table foundation.team_member (
      user_id uuid primary key references foundation."user" (id),
      team_id uuid not null references foundation.team (id)
    );
    revoke delete, truncate on foundation.team from cairn_app;

    -- L'équipe de l'auteur au moment du geste reste attachée à l'événement (RG-SUR-015).
    alter table foundation.trace_event add column team_id uuid;

    -- Rôles : un rôle modèle se reconnaît pour être proposé, modifiable et supprimable (RG-ORG-020).
    alter table foundation.role add column template text unique;

    -- Numérotation : segments composés par le prestataire (RG-ORG-026), compteur cloisonné par les
    -- segments présents, sans garantie de continuité (RG-ORG-030).
    alter table foundation.numbering_scheme add column segments jsonb;
    update foundation.numbering_scheme
      set segments = jsonb_build_array(
        jsonb_build_object('kind', 'literal', 'value', prefix),
        jsonb_build_object('kind', 'counter', 'width', width));
    create table foundation.numbering_counter (
      object_type text not null references foundation.numbering_scheme (object_type),
      partition_key text not null,
      next_value bigint not null check (next_value > 0),
      primary key (object_type, partition_key)
    );
    revoke delete, truncate on foundation.numbering_counter from cairn_app;
    -- Le compteur en cours passe dans la table des compteurs : rien ne se perd (fiche 0021, règle 2).
    insert into foundation.numbering_counter (object_type, partition_key, next_value)
      select object_type, '', next_value from foundation.numbering_scheme;
    alter table foundation.numbering_scheme
      alter column segments set not null,
      drop column prefix,
      drop column width,
      drop column next_value;

    -- Donneur d'ordre : coordonnées (paramétrage de 0.1) et donneur d'ordre interne (RG-ORG-007).
    alter table logistics.principal
      add column internal boolean not null default false,
      add column address_line1 text,
      add column address_line2 text,
      add column postal_code text,
      add column city text,
      add column country_code text check (country_code ~ '^[A-Z]{2}$'),
      add column email text,
      add column phone text;
    create unique index principal_single_internal on logistics.principal (internal) where internal;
    insert into logistics.principal (code, name, internal) values ('INTERNE', 'Donneur d''ordre interne', true);

    -- Restriction explicite par donneur d'ordre (RG-ORG-017) : une exception, en plus du site.
    create table logistics.user_principal_restriction (
      user_id uuid not null references foundation."user" (id),
      principal_id uuid not null references logistics.principal (id),
      primary key (user_id, principal_id)
    );

    -- Le masque d'adressage d'une zone se déclare avec le plan d'entrepôt (0.3), après sa création (0.1).
    alter table logistics.zone alter column address_pattern drop not null;
  `.execute(db);
}
