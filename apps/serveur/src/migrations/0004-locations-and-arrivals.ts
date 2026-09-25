import { sql, type Kysely } from 'kysely';

/**
 * Plan d'entrepôt et arrivage : ce que l'étape 2 du scénario 1 exige, et ce que les suivantes
 * rangeront. Zones d'un site (RG-ORG-003, 004, 010), quais (RG-EMP-046), emplacements (RG-EMP-001 à
 * 012), arrivage d'un véhicule sur un quai (RG-REC-001 à 005).
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    -- Zone logistique : vocation (RG-ORG-004), cohabitation (RG-ORG-010, 011), masque d'adressage
    -- (RG-EMP-009 à 012), régime de rangement.
    create table logistics.zone (
      id uuid primary key default uuidv7(),
      site_id uuid not null references foundation.site (id),
      code text not null,
      name text not null,
      purpose text not null check (purpose in (
        'storage', 'picking', 'receiving', 'shipping', 'preparation', 'consolidation',
        'quarantine', 'dispute', 'workshop', 'destruction', 'virtual')),
      cohabitation text not null check (cohabitation in ('single', 'shared')),
      principal_id uuid references logistics.principal (id),
      putaway_mode text not null default 'free' check (putaway_mode in ('free', 'directed')),
      address_pattern jsonb not null,
      address_separator text not null default '-',
      active boolean not null default true,
      unique (site_id, code),
      constraint zone_single_principal check ((cohabitation = 'single') = (principal_id is not null))
    );

    -- Quai : point d'accostage d'un véhicule, dans une zone ; porte l'occupation, jamais de stock.
    create table logistics.dock (
      id uuid primary key default uuidv7(),
      zone_id uuid not null references logistics.zone (id),
      code text not null,
      active boolean not null default true,
      unique (zone_id, code)
    );

    -- Emplacement : une zone, un type (RG-EMP-002), une adresse unique sur le site (RG-EMP-003),
    -- une séquence de parcours ; rattaché à un quai s'il est de quai (RG-EMP-046).
    create table logistics.location (
      id uuid primary key default uuidv7(),
      site_id uuid not null references foundation.site (id),
      zone_id uuid not null references logistics.zone (id),
      dock_id uuid references logistics.dock (id),
      type text not null check (type in (
        'picking', 'reserve', 'receivingDock', 'shippingDock', 'preparation', 'consolidation',
        'quarantine', 'dispute', 'workshop', 'destruction', 'virtual')),
      address text not null,
      segments jsonb not null,
      route_sequence integer not null,
      support_capacity integer check (support_capacity > 0),
      overflow boolean not null default false,
      active boolean not null default true,
      unique (site_id, address),
      constraint location_dock check ((type in ('receivingDock', 'shippingDock')) = (dock_id is not null))
    );
    revoke delete, truncate on logistics.zone, logistics.dock, logistics.location from cairn_app;

    -- Arrivage (RG-REC-001) : site, quai, véhicule, transporteur facultatif, heures d'arrivée et de
    -- libération. Un quai n'accueille qu'un véhicule à la fois (RG-EMP-046).
    create table logistics.inbound_arrival (
      id uuid primary key default uuidv7(),
      site_id uuid not null references foundation.site (id),
      dock_id uuid not null references logistics.dock (id),
      vehicle_identification text not null,
      carrier_id uuid references logistics.party (id),
      arrived_at timestamptz not null default now(),
      released_at timestamptz,
      version integer not null default 1,
      constraint arrival_release check (released_at is null or released_at >= arrived_at)
    );
    create unique index inbound_arrival_one_per_dock on logistics.inbound_arrival (dock_id) where released_at is null;
    revoke delete, truncate on logistics.inbound_arrival from cairn_app;
  `.execute(db);
}
