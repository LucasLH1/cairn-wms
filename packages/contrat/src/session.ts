import { z } from 'zod';
import { permissionSchema } from './permission.js';
import { refusalSchema } from './refusal.js';

/**
 * Ouverture et fermeture d'une session (fiche 0027). Ce ne sont pas des gestes : aucun utilisateur
 * n'est encore identifié à l'ouverture. Leurs routes font partie du contrat comme les gestes.
 */
export const SESSION_PATH = '/api/session';
export const SESSION_CLOSE_PATH = '/api/session/close';

export const openSessionInputSchema = z.object({
  loginName: z.string().min(1).max(200),
  password: z.string().min(1).max(1000),
});
export type OpenSessionInput = z.infer<typeof openSessionInputSchema>;

/** Motifs de refus de l'ouverture de session : jamais de quoi deviner si l'identifiant existe. */
export const sessionRefusalReasonSchema = z.enum(['invalidCredentials', 'tooManyAttempts']);
export type SessionRefusalReason = z.infer<typeof sessionRefusalReasonSchema>;
export const sessionRefusalSchema = refusalSchema(sessionRefusalReasonSchema);

/** Ce que les écrans savent de la session courante. */
export const currentSessionSchema = z.object({
  user: z.object({ id: z.uuid(), displayName: z.string() }),
  workstation: z.object({ id: z.uuid(), name: z.string() }).nullable(),
  /** Sites de rattachement, et si l'utilisateur y agit (RG-ORG-015, RG-SUR-026). */
  sites: z.array(z.object({ id: z.uuid(), code: z.string(), name: z.string(), execution: z.boolean() })),
  /**
   * Permissions de l'utilisateur, pour que l'écran ne propose pas un geste qu'il refuserait
   * (RG-SUR-028). Le serveur contrôle chaque geste quand même (RG-EXI-012).
   */
  permissions: z.array(permissionSchema),
});
export type CurrentSession = z.infer<typeof currentSessionSchema>;
