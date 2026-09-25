import { sql, type Kysely } from 'kysely';

/**
 * Socle initial : schémas, droits du rôle de l'application, journal d'événements en ajout seul
 * (fiche 0022) et enregistrement des gestes (fiche 0019, règle 2). Migration en avant seulement.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    create schema foundation;
    create schema logistics;
    grant usage on schema foundation, logistics to cairn_app;
    alter default privileges in schema foundation grant select, insert, update, delete on tables to cairn_app;
    alter default privileges in schema logistics grant select, insert, update, delete on tables to cairn_app;
    -- L'application lit l'état des migrations pour son contrôle de santé (fiche 0029).
    grant usage on schema migration to cairn_app;
    grant select on migration.kysely_migration to cairn_app;

    alter default privileges in schema foundation grant usage, select on sequences to cairn_app;
    alter default privileges in schema logistics grant usage, select on sequences to cairn_app;

    -- Refuse toute modification ou suppression, quel que soit le rôle (fiche 0022, règle 1).
    create function foundation.forbid_change() returns trigger language plpgsql as $$
    begin
      raise exception 'append-only table %: % refused', tg_table_name, tg_op
        using errcode = 'insufficient_privilege';
    end
    $$;

    -- Journal : un événement par geste et par fait significatif (RG-EXI-013).
    create table foundation.trace_event (
      id uuid not null default uuidv7(),
      type text not null,
      occurred_at timestamptz not null default now(),
      origin_at timestamptz,
      author_user_id uuid,
      origin text,
      workstation_id uuid,
      gesture_id uuid,
      data jsonb not null default '{}'::jsonb,
      decision_trace jsonb,
      primary key (id, occurred_at),
      constraint trace_event_author_or_origin check (author_user_id is not null or origin is not null)
    ) partition by range (occurred_at);

    -- Objets concernés : donne l'historique d'un objet en un geste (RG-EXI-016).
    create table foundation.trace_event_object (
      event_id uuid not null,
      occurred_at timestamptz not null,
      object_type text not null,
      object_id text not null,
      primary key (event_id, occurred_at, object_type, object_id),
      foreign key (event_id, occurred_at) references foundation.trace_event (id, occurred_at)
    ) partition by range (occurred_at);
    create index trace_event_object_history on foundation.trace_event_object (object_type, object_id, occurred_at desc);

    create trigger trace_event_append_only before update or delete on foundation.trace_event
      for each row execute function foundation.forbid_change();
    create trigger trace_event_object_append_only before update or delete on foundation.trace_event_object
      for each row execute function foundation.forbid_change();
    create trigger trace_event_no_truncate before truncate on foundation.trace_event
      for each statement execute function foundation.forbid_change();
    create trigger trace_event_object_no_truncate before truncate on foundation.trace_event_object
      for each statement execute function foundation.forbid_change();
    revoke update, delete, truncate on foundation.trace_event, foundation.trace_event_object from cairn_app;

    -- Partitions mensuelles ; aucune n'est jamais supprimée (fiche 0022, règle 5).
    create function foundation.ensure_trace_partitions(months_ahead integer) returns void
      language plpgsql security definer set search_path = pg_catalog as $$
    declare
      first_month date := date_trunc('month', now() at time zone 'UTC')::date;
      month_start date;
      lower_bound timestamptz;
      upper_bound timestamptz;
      suffix text;
    begin
      for offset_month in 0..months_ahead loop
        month_start := (first_month + make_interval(months => offset_month))::date;
        suffix := to_char(month_start, 'YYYYMM');
        lower_bound := month_start::timestamp at time zone 'UTC';
        upper_bound := (month_start + interval '1 month')::timestamp at time zone 'UTC';
        execute format(
          'create table if not exists foundation.trace_event_%s partition of foundation.trace_event for values from (%L) to (%L)',
          suffix, lower_bound, upper_bound);
        execute format(
          'create table if not exists foundation.trace_event_object_%s partition of foundation.trace_event_object for values from (%L) to (%L)',
          suffix, lower_bound, upper_bound);
        execute format(
          'revoke update, delete, truncate on foundation.trace_event_%s, foundation.trace_event_object_%s from cairn_app',
          suffix, suffix);
      end loop;
    end
    $$;
    grant execute on function foundation.ensure_trace_partitions(integer) to cairn_app;
    select foundation.ensure_trace_partitions(3);

    -- Gestes reçus : un identifiant de geste n'est enregistré qu'une fois (RG-EXI-007).
    create table foundation.gesture (
      id uuid primary key,
      name text not null,
      author_user_id uuid,
      workstation_id uuid,
      received_at timestamptz not null default now(),
      outcome text not null check (outcome in ('accepted', 'refused')),
      response jsonb not null
    );
    create trigger gesture_append_only before update or delete on foundation.gesture
      for each row execute function foundation.forbid_change();
    revoke update, delete, truncate on foundation.gesture from cairn_app;
  `.execute(db);
}
