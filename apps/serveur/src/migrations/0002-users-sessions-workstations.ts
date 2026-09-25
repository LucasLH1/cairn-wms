import { sql, type Kysely } from 'kysely';

/**
 * Utilisateurs, rôles, sites de rattachement, sessions et postes (fiche 0027, RG-ORG-015 à 024).
 *
 * Aucune colonne ne date une activité d'utilisateur : ni heure de connexion, ni dernière activité
 * (RG-TRA-015, RG-SUR-138). Une session ne porte que son échéance, repoussée à chaque requête.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    -- Site : un lieu physique exploité par le prestataire (0.1). Adresse et calendrier viendront
    -- avec leur module ; le site porte ici ce que les droits et les postes en exigent.
    create table foundation.site (
      id uuid primary key default uuidv7(),
      code text not null unique,
      name text not null,
      time_zone text not null
    );

    create table foundation."user" (
      id uuid primary key default uuidv7(),
      login_name text not null,
      display_name text not null,
      password_hash text not null,
      active boolean not null default true
    );
    create unique index user_login_name on foundation."user" (lower(login_name));

    -- Rôle : composition de permissions, nommée par le prestataire (RG-ORG-019).
    create table foundation.role (
      id uuid primary key default uuidv7(),
      name text not null unique,
      nature text not null check (nature in ('operational', 'administrative'))
    );
    create table foundation.role_permission (
      role_id uuid not null references foundation.role (id),
      permission text not null,
      primary key (role_id, permission)
    );
    create table foundation.user_role (
      user_id uuid not null references foundation."user" (id),
      role_id uuid not null references foundation.role (id),
      primary key (user_id, role_id)
    );

    -- Sites de rattachement (RG-ORG-015) ; le périmètre d'exécution en est un sous-ensemble,
    -- inclus par construction (RG-SUR-026).
    create table foundation.user_site (
      user_id uuid not null references foundation."user" (id),
      site_id uuid not null references foundation.site (id),
      execution boolean not null default false,
      primary key (user_id, site_id)
    );

    -- Session : jeton opaque dans un cookie ; la base n'en garde que l'empreinte (fiche 0027).
    create table foundation.session (
      id uuid primary key default uuidv7(),
      user_id uuid not null references foundation."user" (id),
      token_hash bytea not null unique,
      expires_at timestamptz not null,
      revoked boolean not null default false
    );
    create index session_by_user on foundation.session (user_id);

    -- Poste : déclaré par un administrateur, associé à un navigateur par un cookie durable.
    create table foundation.workstation (
      id uuid primary key default uuidv7(),
      name text not null,
      site_id uuid not null references foundation.site (id),
      revoked boolean not null default false
    );
    create unique index workstation_name on foundation.workstation (lower(name));
  `.execute(db);
}
