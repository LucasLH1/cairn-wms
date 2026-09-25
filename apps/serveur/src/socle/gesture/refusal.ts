import type { TraceObject } from '../trace-event/index.js';

export type RefusalDetails = Readonly<Record<string, string | number | boolean>>;

/**
 * Refus d'un geste, levé par son traitement ou par le contrôle des droits. Il annule tous les effets
 * du geste ; le greffon enregistre ensuite le refus et son événement (fiche 0019, règles 4 et 5).
 */
export class GestureRefusal extends Error {
  constructor(
    /** Motif commun ou motif propre au geste, tous deux de catalogues fermés. */
    readonly reason: string,
    readonly details?: RefusalDetails,
    /** Objets visés par le geste refusé (RG-ORG-022). */
    readonly objects: readonly TraceObject[] = [],
  ) {
    super(`gesture refused: ${reason}`);
    this.name = 'GestureRefusal';
  }
}

/** Statut HTTP d'un refus : le corps typé fait foi, le statut n'en est qu'un reflet. */
export function refusalStatus(reason: string): number {
  switch (reason) {
    case 'invalidInput':
      return 400;
    case 'notAuthenticated':
      return 401;
    case 'permissionDenied':
    case 'outOfScope':
    case 'undeclaredWorkstation':
      return 403;
    default:
      return 409;
  }
}
