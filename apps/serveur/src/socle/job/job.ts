import { run, runMigrations, runOnce, type Runner, type Task, type TaskList } from 'graphile-worker';
import { sql, type Kysely } from 'kysely';
import pg from 'pg';
import type { z } from 'zod';
import type { ConnectionSettings, Database, DatabaseTransaction } from '../database/index.js';

/** Schéma de la file, propre à graphile-worker (fiche 0028). */
export const JOB_SCHEMA = 'graphile_worker';

/** Un traitement différé : son nom, le schéma de ce qu'il reçoit, ce qu'il fait. */
export interface JobDefinition<Payload> {
  readonly name: string;
  readonly payload: z.ZodType<Payload>;
  /**
   * Doit être rejouable sans effet double : il vérifie ce qui est déjà fait avant d'agir (règle 4).
   * Déclaré en méthode : un registre de traitements hétérogènes les accepte tous.
   */
  run(payload: Payload, context: { readonly db: Database }): Promise<void>;
}

export function defineJob<Payload>(definition: JobDefinition<Payload>): JobDefinition<Payload> {
  return definition;
}

export interface AddJobOptions {
  /** Clé qui dédoublonne un travail en attente : un second ajout sous la même clé le remplace. */
  readonly key?: string;
  readonly runAt?: Date;
  readonly maxAttempts?: number;
}

/**
 * Ajoute un traitement différé dans la transaction du geste qui le demande (règle 3) : annulé avec
 * lui, il n'existe pas.
 */
export async function addJob<Payload>(
  transaction: DatabaseTransaction,
  job: JobDefinition<Payload>,
  payload: Payload,
  options: AddJobOptions = {},
): Promise<void> {
  const checked = JSON.stringify(job.payload.parse(payload));
  await sql`select graphile_worker.add_job(
    identifier => ${job.name},
    payload => ${checked}::json,
    run_at => ${options.runAt ?? null}::timestamptz,
    max_attempts => ${options.maxAttempts ?? 25},
    job_key => ${options.key ?? null}
  )`.execute(transaction);
}

/** Traitements en échec définitif : leur nombre alimente l'état de santé (règle 5, RG-EXI-066). */
export async function countPermanentlyFailedJobs<TDatabase>(db: Kysely<TDatabase>): Promise<number> {
  const result = await sql<{ count: string }>`
    select count(*)::text as count from graphile_worker._private_jobs where attempts >= max_attempts`.execute(
    db,
  );
  return Number(result.rows[0]?.count ?? '0');
}

function taskList(jobs: readonly JobDefinition<unknown>[], db: Database): TaskList {
  const list: Record<string, Task> = {};
  for (const job of jobs) {
    list[job.name] = async (payload) => {
      // Une charge hors schéma lève une erreur : le traitement échoue, reste relançable, et se compte.
      await job.run(job.payload.parse(payload), { db });
    };
  }
  return list;
}

export interface JobRunnerOptions {
  readonly connection: ConnectionSettings;
  readonly db: Database;
  readonly jobs: readonly JobDefinition<unknown>[];
  readonly concurrency?: number;
}

function pool(connection: ConnectionSettings): pg.Pool {
  const created = new pg.Pool({ ...connection, max: 5, application_name: 'cairn-jobs' });
  // Une connexion inactive perdue ne doit pas abattre le processus : la file se reconnecte d'elle-même.
  const report = (error: Error) => {
    process.stderr.write(`${JSON.stringify({ event: 'job-pool-error', message: error.message })}\n`);
  };
  created.on('error', report);
  created.on('connect', (client) => client.on('error', report));
  return created;
}

/**
 * Lance la file dans le rôle « traitements ». Les migrations de la file sont déjà faites par `migrate`.
 * Aucun fichier crontab n'est lu : les travaux récurrents se déclarent en code (liste vide pour l'heure).
 */
export async function startJobRunner(options: JobRunnerOptions): Promise<Runner> {
  return run(
    {
      pgPool: pool(options.connection),
      schema: JOB_SCHEMA,
      concurrency: options.concurrency ?? 4,
      noHandleSignals: false,
      // Les travaux récurrents se déclarent en code, jamais dans un fichier : pas de crontab à lire.
      taskList: taskList(options.jobs, options.db),
    },
    undefined,
    [],
  );
}

/** Traite tout ce qui est dû, puis rend la main : pour les tests et les reprises manuelles. */
export async function runDueJobs(options: JobRunnerOptions): Promise<void> {
  const pgPool = pool(options.connection);
  try {
    await runOnce({ pgPool, schema: JOB_SCHEMA, taskList: taskList(options.jobs, options.db) });
  } finally {
    await pgPool.end();
  }
}

/**
 * Migre le schéma de la file sous le rôle propriétaire, puis ouvre au rôle de l'application ce que la
 * file exige de lui : ajouter, prendre et solder des travaux. Appelé par `migrate`, avant les rôles.
 */
export async function migrateJobQueue(owner: ConnectionSettings): Promise<void> {
  const pgPool = pool(owner);
  try {
    await runMigrations({ pgPool, schema: JOB_SCHEMA });
    await pgPool.query(`
      grant usage on schema ${JOB_SCHEMA} to cairn_app;
      grant select, insert, update, delete on all tables in schema ${JOB_SCHEMA} to cairn_app;
      grant usage, select on all sequences in schema ${JOB_SCHEMA} to cairn_app;
      grant execute on all functions in schema ${JOB_SCHEMA} to cairn_app;
    `);
    // La file protège ses tables par des politiques de ligne que seul leur propriétaire contourne :
    // le rôle de l'application, qui ajoute des travaux dans la transaction du geste et les exécute,
    // reçoit la sienne. Rejoué à chaque migration, pour les tables qu'une version de la file ajouterait.
    await pgPool.query(`
      do $$
      declare
        protected record;
      begin
        for protected in
          select tablename from pg_tables where schemaname = '${JOB_SCHEMA}' and rowsecurity
        loop
          if not exists (
            select 1 from pg_policies
            where schemaname = '${JOB_SCHEMA}' and tablename = protected.tablename and policyname = 'cairn_app_queue'
          ) then
            execute format(
              'create policy cairn_app_queue on ${JOB_SCHEMA}.%I for all to cairn_app using (true) with check (true)',
              protected.tablename);
          end if;
        end loop;
      end
      $$;
    `);
  } finally {
    await pgPool.end();
  }
}
