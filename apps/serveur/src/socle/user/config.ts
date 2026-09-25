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
});

export interface AccessConfig {
  readonly cookieSecret: string;
  readonly sessionIdleMinutes: number;
}

export function readAccessConfig(environment: NodeJS.ProcessEnv): AccessConfig {
  const parsed = accessSchema.parse(environment);
  return { cookieSecret: parsed.CAIRN_COOKIE_SECRET, sessionIdleMinutes: parsed.CAIRN_SESSION_IDLE_MINUTES };
}
