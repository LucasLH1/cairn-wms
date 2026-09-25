import { z } from 'zod';

/** Rôles de base séparés (fiche 0021, règle 4) : celui qui migre n'est pas celui de l'application. */
export const OWNER_ROLE = 'cairn_owner';
export const APPLICATION_ROLE = 'cairn_app';

const connectionSchema = z.object({
  CAIRN_DATABASE_HOST: z.string().min(1),
  CAIRN_DATABASE_PORT: z.coerce.number().int().min(1).max(65535).default(5432),
  CAIRN_DATABASE_NAME: z.string().regex(/^[a-z][a-z0-9_]*$/u),
});

const applicationSchema = connectionSchema.extend({
  CAIRN_DATABASE_APP_PASSWORD: z.string().min(12),
});

const migrationSchema = applicationSchema.extend({
  CAIRN_DATABASE_OWNER_PASSWORD: z.string().min(12),
  CAIRN_DATABASE_ADMIN_USER: z.string().min(1),
  CAIRN_DATABASE_ADMIN_PASSWORD: z.string().min(1),
});

export interface ConnectionSettings {
  readonly host: string;
  readonly port: number;
  readonly database: string;
  readonly user: string;
  readonly password: string;
}

/** Connexion de l'application, sous le rôle qui ne peut ni modifier ni supprimer un événement. */
export function readApplicationConnection(environment: NodeJS.ProcessEnv): ConnectionSettings {
  const parsed = applicationSchema.parse(environment);
  return {
    host: parsed.CAIRN_DATABASE_HOST,
    port: parsed.CAIRN_DATABASE_PORT,
    database: parsed.CAIRN_DATABASE_NAME,
    user: APPLICATION_ROLE,
    password: parsed.CAIRN_DATABASE_APP_PASSWORD,
  };
}

export interface MigrationSettings {
  readonly admin: ConnectionSettings;
  readonly owner: ConnectionSettings;
  readonly applicationPassword: string;
}

/** Réglages de la migration : l'administrateur amorce les rôles, le propriétaire migre. */
export function readMigrationSettings(environment: NodeJS.ProcessEnv): MigrationSettings {
  const parsed = migrationSchema.parse(environment);
  const base = { host: parsed.CAIRN_DATABASE_HOST, port: parsed.CAIRN_DATABASE_PORT };
  return {
    admin: {
      ...base,
      database: parsed.CAIRN_DATABASE_NAME,
      user: parsed.CAIRN_DATABASE_ADMIN_USER,
      password: parsed.CAIRN_DATABASE_ADMIN_PASSWORD,
    },
    owner: {
      ...base,
      database: parsed.CAIRN_DATABASE_NAME,
      user: OWNER_ROLE,
      password: parsed.CAIRN_DATABASE_OWNER_PASSWORD,
    },
    applicationPassword: parsed.CAIRN_DATABASE_APP_PASSWORD,
  };
}
