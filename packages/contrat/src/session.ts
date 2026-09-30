import { z } from 'zod';
import { languageSchema } from './language.js';
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
  /** Nom du prestataire, affiché sous la marque avec le site (maquette) ; absent tant qu'il n'est pas saisi. */
  providerName: z.string().nullable(),
  workstation: z.object({ id: z.uuid(), name: z.string() }).nullable(),
  /**
   * Sites de rattachement, et si l'utilisateur y agit (RG-ORG-015, RG-SUR-026). Le fuseau horaire
   * donne l'heure locale du site de travail, montrée dans la barre du haut (RG-EXI-076).
   */
  sites: z.array(
    z.object({
      id: z.uuid(),
      code: z.string(),
      name: z.string(),
      timeZone: z.string(),
      execution: z.boolean(),
    }),
  ),
  /** Noms des rôles de l'utilisateur, triés, montrés au pied de la navigation avec son poste. */
  roles: z.array(z.string()),
  /** Langue de l'interface choisie par l'utilisateur, conservée sur son compte (RG-EXI-079). */
  language: languageSchema,
  /**
   * Permissions de l'utilisateur, pour que l'écran ne propose pas un geste qu'il refuserait
   * (RG-SUR-028). Le serveur contrôle chaque geste quand même (RG-EXI-012).
   */
  permissions: z.array(permissionSchema),
});
export type CurrentSession = z.infer<typeof currentSessionSchema>;
