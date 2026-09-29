import { z } from 'zod';

const accessSchema = z.object({
  /** Secret qui signe le cookie de poste ; hors du dépôt, comme tout secret. */
  CAIRN_COOKIE_SECRET: z.string().min(32),
  /** Échéance d'une session sans requête, en minutes (fiche 0027, règle 3). */
  CAIRN_SESSION_IDLE_MINUTES: z.coerce
    .number()
    .int()
    .min(5)
    .max(7 * 24 * 60)
    .default(480),
  /**
   * Confort de développement, jamais d'exploitation : déclaré dans le seul `.env` du poste, il fait du
   * navigateur local du compte d'administration local un poste déclaré, dès l'ouverture de sa session.
   */
  CAIRN_DEV_AUTO_WORKSTATION_ID: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.uuid().optional(),
  ),
  CAIRN_LOCAL_ADMIN_LOGIN: z.preprocess((value) => (value === '' ? undefined : value), z.string().optional()),
});

export interface AccessConfig {
  readonly cookieSecret: string;
  readonly sessionIdleMinutes: number;
  /** Poste attribué d'office au compte d'administration local, sur `localhost` seulement. */
  readonly devAutoWorkstation?: { readonly loginName: string; readonly workstationId: string };
}

export function readAccessConfig(environment: NodeJS.ProcessEnv): AccessConfig {
  const parsed = accessSchema.parse(environment);
  return {
    cookieSecret: parsed.CAIRN_COOKIE_SECRET,
    sessionIdleMinutes: parsed.CAIRN_SESSION_IDLE_MINUTES,
    ...(parsed.CAIRN_DEV_AUTO_WORKSTATION_ID !== undefined && parsed.CAIRN_LOCAL_ADMIN_LOGIN !== undefined
      ? {
          devAutoWorkstation: {
            loginName: parsed.CAIRN_LOCAL_ADMIN_LOGIN,
            workstationId: parsed.CAIRN_DEV_AUTO_WORKSTATION_ID,
          },
        }
      : {}),
  };
}
