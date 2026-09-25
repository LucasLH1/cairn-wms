import { z } from 'zod';
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
});
export type CurrentSession = z.infer<typeof currentSessionSchema>;
