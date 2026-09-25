import { z } from 'zod';

/**
 * Rôles de l'application (fiche 0017) : « gestes » sert les écrans et les gestes ;
 * « traitements » exécute les traitements différés et le travail lourd.
 */
export const roleSchema = z.enum(['gestures', 'jobs']);
export type Role = z.infer<typeof roleSchema>;

const configSchema = z.object({
  CAIRN_ROLE: roleSchema,
  CAIRN_HOST: z.string().default('0.0.0.0'),
  CAIRN_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  /** Commit servi, inscrit dans l'image à sa construction (fiche 0029, règle 2). */
  CAIRN_VERSION: z.string().min(1).default('development'),
});

export type Config = Readonly<{ role: Role; host: string; port: number; version: string }>;

/** Lit la configuration depuis l'environnement, validée par schéma (fiche 0017, règle 2). */
export function readConfig(environment: NodeJS.ProcessEnv): Config {
  const parsed = configSchema.parse(environment);
  return {
    role: parsed.CAIRN_ROLE,
    host: parsed.CAIRN_HOST,
    port: parsed.CAIRN_PORT,
    version: parsed.CAIRN_VERSION,
  };
}
