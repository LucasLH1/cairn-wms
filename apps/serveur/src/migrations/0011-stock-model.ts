import { sql, type Kysely } from 'kysely';

/**
 * Module 0.4 (fiche 0032) : états qualité par donneur d'ordre (RG-STK-009 à 014), motifs de mouvement
 * (RG-STK-026), types de support et supports (RG-STK-045 à 052), lots et objets sérialisés (RG-REF-014
 * à 017, 043), unités de stock (RG-STK-001 à 008), mouvements immuables (RG-STK-020 à 027), déplacements
 * en cours (0.4 § 6), réservations (RG-STK-028 à 033), blocages (RG-STK-034 à 039), règles de
 * prélèvement (RG-STK-053, 054), photo quotidienne (RG-STK-057 à 061). Grandeurs en entiers.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    -- États qualité d'un donneur d'ordre, la liste modèle posée à sa création (RG-STK-009 à 011, 013).
    create table logistics.quality_state (
      id uuid primary key default uuidv7(),
      principal_id uuid not null references logistics.principal (id),
      code text not null,
      label text not null,
      pickable boolean not null default true,
      suggested_location_type text check (suggested_location_type in (
        'picking', 'reserve', 'receivingDock', 'shippingDock', 'preparation', 'consolidation',
        'quarantine', 'dispute', 'workshop', 'destruction')),
      is_default boolean not null default false,
      active boolean not null default true,
      rank integer not null default 0,
      unique (principal_id, code)
    );
    create unique index quality_state_default on logistics.quality_state (principal_id) where is_default;
    revoke delete, truncate on logistics.quality_state from cairn_app;
    insert into logistics.quality_state (principal_id, code, label, pickable, suggested_location_type, is_default, rank)
    select principal.id, template.code, template.label, template.pickable, template.suggested, template.code = 'NEUF', template.rank
    from logistics.principal principal
    cross join (values
      ('NEUF', 'Neuf', true, null, 10),
      ('RECONDITIONNE', 'Reconditionné', true, null, 20),
      ('OCCASION', 'Occasion', true, null, 30),
      ('DEFECTUEUX', 'Défectueux', false, 'quarantine', 40),
      ('A-DETRUIRE', 'À détruire', false, 'destruction', 50)
    ) as template (code, label, pickable, suggested, rank);

    -- États qualité qu'un emplacement accepte, par leur code ; vide : tous (RG-EMP-025).
    alter table logistics.location add column accepted_quality_codes text[] not null default '{}';

    -- Motifs de mouvement, configurés par le prestataire et rattachés à une nature (RG-STK-026).
    create table logistics.movement_reason (
      id uuid primary key default uuidv7(),
      nature text not null check (nature in (
        'entry', 'exit', 'move', 'qualityChange', 'quantityAdjustment', 'handlingUnitChange',
        'merge', 'kitAssembly', 'kitDisassembly', 'correction', 'hold')),
      label text not null,
      comment_required boolean not null default false,
      active boolean not null default true,
      unique (nature, label)
    );
    revoke delete, truncate on logistics.movement_reason from cairn_app;

    -- Types de support : caractéristiques par défaut, caractère consigné (RG-STK-046).
    create table logistics.handling_unit_type (
      id uuid primary key default uuidv7(),
      code text not null unique,
      label text not null,
      length_mm integer check (length_mm > 0),
      width_mm integer check (width_mm > 0),
      height_mm integer check (height_mm > 0),
      tare_weight_grams integer check (tare_weight_grams > 0),
      returnable boolean not null default false,
      active boolean not null default true
    );
    revoke delete, truncate on logistics.handling_unit_type from cairn_app;

    -- Support : identifiant unique de l'instance (RG-STK-045), imbriqué sur un niveau (RG-STK-050),
    -- actif même vide (RG-STK-051), propriétaire s'il est consigné (RG-STK-052).
    create table logistics.handling_unit (
      id uuid primary key default uuidv7(),
      code text not null unique,
      type_id uuid not null references logistics.handling_unit_type (id),
      site_id uuid not null references foundation.site (id),
      location_id uuid references logistics.location (id),
      parent_id uuid references logistics.handling_unit (id),
      owner_party_id uuid references logistics.party (id),
      active boolean not null default true,
      created_at timestamptz not null default now(),
      version integer not null default 1,
      check (parent_id is null or parent_id <> id)
    );
    revoke delete, truncate on logistics.handling_unit from cairn_app;
    insert into foundation.numbering_scheme (object_type, segments) values ('HandlingUnit',
      '[{"kind":"literal","value":"S"},{"kind":"counter","width":8}]'::jsonb);

    -- Lot de production d'une référence et ses dates (glossaire, RG-STK-005).
    create table logistics.batch (
      id uuid primary key default uuidv7(),
      item_id uuid not null references logistics.item (id),
      number text not null,
      expiry_date date,
      manufacturing_date date,
      unique (item_id, number)
    );
    revoke delete, truncate on logistics.batch from cairn_app;

    -- Objet sérialisé : durable, unique par donneur d'ordre (RG-REF-015, 016), sa garantie (RG-REF-043).
    create table logistics.serialized_unit (
      id uuid primary key default uuidv7(),
      principal_id uuid not null references logistics.principal (id),
      item_id uuid not null references logistics.item (id),
      serial_number text not null,
      warranty_end_date date,
      created_at timestamptz not null default now(),
      unique (principal_id, serial_number)
    );
    revoke delete, truncate on logistics.serialized_unit from cairn_app;

    -- Unité de stock (RG-STK-001 à 006). Une unité vide cesse d'exister ; ses mouvements demeurent.
    create table logistics.stock_unit (
      id uuid primary key default uuidv7(),
      principal_id uuid not null references logistics.principal (id),
      item_id uuid not null references logistics.item (id),
      site_id uuid not null references foundation.site (id),
      location_id uuid not null references logistics.location (id),
      quantity integer not null check (quantity > 0),
      quality_state_id uuid not null references logistics.quality_state (id),
      batch_id uuid references logistics.batch (id),
      serialized_unit_id uuid unique references logistics.serialized_unit (id),
      handling_unit_id uuid references logistics.handling_unit (id),
      entered_at timestamptz not null default now(),
      expiry_date date,
      manufacturing_date date,
      origin_flow_type text,
      origin_flow_id uuid,
      -- Valeur déclarée par le flux d'entrée, s'il en fournit une (RG-STK-062).
      entry_value_cents bigint check (entry_value_cents >= 0),
      -- Prélevée et pas encore déposée : « en cours de mouvement » (RG-STK-018).
      move_id uuid,
      version integer not null default 1,
      check (serialized_unit_id is null or quantity = 1)
    );
    create index stock_unit_by_item on logistics.stock_unit (item_id);
    create index stock_unit_by_location on logistics.stock_unit (location_id);
    create index stock_unit_by_handling_unit on logistics.stock_unit (handling_unit_id);

    -- Déplacement engagé : la prise pose « en cours de mouvement », le dépôt le lève (0.4 § 6).
    create table logistics.stock_move (
      id uuid primary key default uuidv7(),
      site_id uuid not null references foundation.site (id),
      from_location_id uuid not null references logistics.location (id),
      handling_unit_id uuid references logistics.handling_unit (id),
      started_by uuid not null references foundation."user" (id),
      started_at timestamptz not null default now(),
      completed_at timestamptz
    );
    revoke delete, truncate on logistics.stock_move from cairn_app;

    -- Mouvement : immuable (RG-STK-020 à 025). L'unité qu'il désigne peut avoir cessé d'exister.
    create table logistics.stock_movement (
      id uuid primary key default uuidv7(),
      nature text not null check (nature in (
        'entry', 'exit', 'move', 'qualityChange', 'quantityAdjustment', 'handlingUnitChange',
        'merge', 'kitAssembly', 'kitDisassembly', 'correction')),
      stock_unit_id uuid not null,
      -- L'objet sérialisé de l'unité : ses passages se comptent même quand l'unité a disparu (RG-REF-017).
      serialized_unit_id uuid references logistics.serialized_unit (id),
      principal_id uuid not null references logistics.principal (id),
      item_id uuid not null references logistics.item (id),
      site_id uuid not null references foundation.site (id),
      quantity integer not null check (quantity > 0),
      -- Pour un ajustement : le sens.
      direction smallint not null default 0 check (direction in (-1, 0, 1)),
      from_location_id uuid references logistics.location (id),
      to_location_id uuid references logistics.location (id),
      from_handling_unit_id uuid references logistics.handling_unit (id),
      to_handling_unit_id uuid references logistics.handling_unit (id),
      from_quality_state_id uuid references logistics.quality_state (id),
      to_quality_state_id uuid references logistics.quality_state (id),
      reason_id uuid references logistics.movement_reason (id),
      comment text,
      corrects_movement_id uuid unique references logistics.stock_movement (id),
      -- Un support déplacé d'un geste : un mouvement par unité, réunis (RG-STK-048).
      group_id uuid,
      flow_type text,
      flow_id uuid,
      author_user_id uuid references foundation."user" (id),
      workstation_id uuid references foundation.workstation (id),
      occurred_at timestamptz not null default now()
    );
    create index stock_movement_by_unit on logistics.stock_movement (stock_unit_id, occurred_at);
    create index stock_movement_by_item on logistics.stock_movement (item_id, occurred_at);
    create index stock_movement_by_serialized_unit on logistics.stock_movement (serialized_unit_id, occurred_at);
    revoke update, delete, truncate on logistics.stock_movement from cairn_app;

    -- Réservation : une à la fois par unité, liée à une demande identifiée (RG-STK-028, 029).
    create table logistics.stock_reservation (
      stock_unit_id uuid primary key references logistics.stock_unit (id) on delete cascade,
      demand_type text not null,
      demand_id uuid not null,
      reserved_at timestamptz not null default now()
    );

    -- Blocage : portée, motif, auteur, dates (RG-STK-034 à 039).
    create table logistics.stock_hold (
      id uuid primary key default uuidv7(),
      scope text not null check (scope in ('stockUnit', 'batch', 'serializedUnit', 'location', 'item')),
      stock_unit_id uuid references logistics.stock_unit (id) on delete set null,
      batch_id uuid references logistics.batch (id),
      serialized_unit_id uuid references logistics.serialized_unit (id),
      location_id uuid references logistics.location (id),
      item_id uuid references logistics.item (id),
      reason text not null,
      origin text not null default 'manual' check (origin in ('manual', 'expiry', 'rule')),
      allows_move boolean not null default true,
      planned_lift_on date,
      placed_by uuid references foundation."user" (id),
      placed_at timestamptz not null default now(),
      lifted_by uuid references foundation."user" (id),
      lifted_at timestamptz,
      lift_reason text,
      check ((lifted_at is null) = (lift_reason is null))
    );
    revoke delete, truncate on logistics.stock_hold from cairn_app;

    -- Statut de disponibilité, conséquence d'un fait et jamais saisi (RG-STK-015, 016) : en cours de
    -- mouvement, sinon bloquée par un blocage actif qui la couvre, sinon réservée, sinon libre.
    create function logistics.stock_unit_status(unit logistics.stock_unit) returns text
      language sql stable as $$
        select case
          when unit.move_id is not null then 'moving'
          when exists (
            select 1 from logistics.stock_hold hold
            where hold.lifted_at is null and (
              hold.stock_unit_id = unit.id or hold.batch_id = unit.batch_id
              or hold.serialized_unit_id = unit.serialized_unit_id
              or hold.location_id = unit.location_id or hold.item_id = unit.item_id)
          ) then 'blocked'
          when exists (select 1 from logistics.stock_reservation reservation where reservation.stock_unit_id = unit.id)
            then 'reserved'
          else 'free'
        end
      $$;

    -- Règle de prélèvement par donneur d'ordre, surchargeable par référence (RG-STK-053, 054).
    alter table logistics.principal add column picking_rule text not null default 'fifo' check (picking_rule in (
      'fifo', 'lifo', 'fefo', 'traversal', 'fullest', 'singleBatch'));
    alter table logistics.item add column picking_rule text check (picking_rule in (
      'fifo', 'lifo', 'fefo', 'traversal', 'fullest', 'singleBatch'));

    -- Photo quotidienne : heure par site (RG-STK-060), une photo figée par site et par jour.
    alter table foundation.site add column snapshot_time time not null default '03:00';
    create table logistics.daily_stock_snapshot (
      id uuid primary key default uuidv7(),
      site_id uuid not null references foundation.site (id),
      snapshot_date date not null,
      state text not null check (state in ('complete', 'failed')),
      taken_at timestamptz not null default now(),
      failure text,
      unique (site_id, snapshot_date)
    );
    create table logistics.daily_stock_snapshot_line (
      snapshot_id uuid not null references logistics.daily_stock_snapshot (id),
      principal_id uuid not null references logistics.principal (id),
      item_id uuid not null references logistics.item (id),
      quality_state_id uuid not null references logistics.quality_state (id),
      location_id uuid not null references logistics.location (id),
      quantity integer not null check (quantity > 0),
      handling_units integer not null check (handling_units >= 0),
      volume_cm3 bigint check (volume_cm3 >= 0)
    );
    create index daily_stock_snapshot_line_by_snapshot on logistics.daily_stock_snapshot_line (snapshot_id);
    -- Rôles modèles : le magasinier et le réceptionnaire déplacent et créent des supports ; le
    -- superviseur tient le stock ; l'administrateur paramètre motifs et types de support.
    insert into foundation.role_permission (role_id, permission)
    select role.id, permission
    from foundation.role
    cross join lateral unnest(case role.template
      when 'administrator' then array['administerStockSettings']
      when 'supervisor' then array['moveStock', 'changeQualityState', 'adjustStockQuantity',
        'correctStockMovement', 'placeStockHold', 'liftStockHold', 'releaseStockReservation']
      when 'warehouseKeeper' then array['moveStock']
      when 'receiver' then array['moveStock']
      else array[]::text[]
    end) as permission
    where role.template is not null
    on conflict do nothing;

    -- Une photo est immuable (RG-STK-059).
    revoke update, delete, truncate on logistics.daily_stock_snapshot, logistics.daily_stock_snapshot_line from cairn_app;

  `.execute(db);
}
