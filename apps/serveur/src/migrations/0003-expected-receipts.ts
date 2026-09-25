import { sql, type Kysely } from 'kysely';

/**
 * Ce que l'étape 1 du scénario 1 exige : numérotation (RG-ORG-025 à 030), donneur d'ordre (0.1),
 * fournisseur (0.5), référence avec ses conditionnements et ses identifiants scannables (0.2), attendu
 * et ses lignes (1.1, RG-REC-007 à 019). Chaque table ne porte que ce que le lot 1 éprouve ; le reste
 * s'ajoutera par de nouvelles migrations.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    -- Schéma de numérotation (RG-ORG-025 à 030) : un préfixe qui dit le type d'objet (RG-SUR-061),
    -- un compteur sans garantie de continuité. La composition paramétrable viendra avec son écran.
    create table foundation.numbering_scheme (
      object_type text primary key,
      prefix text not null unique,
      width integer not null check (width between 1 and 12),
      next_value bigint not null default 1 check (next_value > 0)
    );
    revoke delete, truncate on foundation.numbering_scheme from cairn_app;
    insert into foundation.numbering_scheme (object_type, prefix, width) values ('ExpectedReceipt', 'AT-', 4);

    -- Donneur d'ordre (RG-ORG-005 à 009) : rattaché au prestataire, jamais à un site ; se désactive.
    create table logistics.principal (
      id uuid primary key default uuidv7(),
      code text not null unique,
      name text not null,
      principal_group text,
      active boolean not null default true
    );

    -- Tiers (RG-TRS-001 à 006). Fournisseur et client final appartiennent à un donneur d'ordre,
    -- transporteur et sous-traitant au prestataire. Les adresses viendront avec leur écran (#73).
    create table logistics.party (
      id uuid primary key default uuidv7(),
      family text not null check (family in ('supplier', 'endCustomer', 'carrier', 'subcontractor')),
      principal_id uuid references logistics.principal (id),
      code text not null,
      name text not null,
      active boolean not null default true,
      constraint party_owner check (
        (family in ('supplier', 'endCustomer')) = (principal_id is not null)
      )
    );
    create unique index party_code on logistics.party (coalesce(principal_id, '00000000-0000-0000-0000-000000000000'::uuid), family, code);

    -- Référence (RG-REF-001 à 023) : appartient à un donneur d'ordre, code unique en son sein.
    create table logistics.item (
      id uuid primary key default uuidv7(),
      principal_id uuid not null references logistics.principal (id),
      code text not null,
      short_label text not null,
      long_label text,
      family text,
      tracking_mode text not null check (tracking_mode in ('quantity', 'lot', 'serial')),
      state text not null default 'active' check (state in ('draft', 'active', 'dormant', 'obsolete')),
      unique (principal_id, code)
    );

    -- Niveaux de conditionnement : le rang 0 est le niveau de base ; chaque niveau au-dessus dit
    -- combien d'unités du niveau inférieur il contient (RG-REF-018, 019).
    create table logistics.packaging_level (
      item_id uuid not null references logistics.item (id),
      rank integer not null check (rank >= 0),
      name text not null,
      units_of_lower_level integer check (units_of_lower_level > 0),
      primary key (item_id, rank),
      constraint packaging_base check ((rank = 0) = (units_of_lower_level is null))
    );

    -- Identifiants scannables (RG-REF-007 à 010) : uniques au sein d'un donneur d'ordre.
    create table logistics.item_barcode (
      principal_id uuid not null references logistics.principal (id),
      code text not null,
      item_id uuid not null references logistics.item (id),
      nature text not null check (nature in ('internal', 'gtin', 'supplier', 'principal', 'free')),
      active boolean not null default true,
      primary key (principal_id, code)
    );

    -- Attendu (RG-REC-007 à 019) : un donneur d'ordre, un site, des lignes et leur solde.
    create table logistics.expected_receipt (
      id uuid primary key default uuidv7(),
      number text not null unique,
      principal_id uuid not null references logistics.principal (id),
      site_id uuid not null references foundation.site (id),
      supplier_id uuid not null references logistics.party (id),
      expected_arrival_date date not null,
      state text not null default 'open' check (state in ('open', 'settled', 'cancelled')),
      version integer not null default 1
    );
    create index expected_receipt_open on logistics.expected_receipt (site_id) where state = 'open';

    create table logistics.expected_receipt_line (
      id uuid primary key default uuidv7(),
      expected_receipt_id uuid not null references logistics.expected_receipt (id),
      line_number integer not null check (line_number > 0),
      item_id uuid not null references logistics.item (id),
      expected_quantity integer not null check (expected_quantity > 0),
      served_quantity integer not null default 0 check (served_quantity >= 0),
      unique (expected_receipt_id, line_number)
    );
    -- Un attendu ne se supprime pas ; il s'annule (RG-REC-019).
    revoke delete, truncate on logistics.expected_receipt, logistics.expected_receipt_line from cairn_app;
  `.execute(db);
}
