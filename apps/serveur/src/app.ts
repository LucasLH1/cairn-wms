import Fastify, { type FastifyInstance } from 'fastify';

export interface AppOptions {
  /** Commit servi, rendu par `/version`. */
  readonly version: string;
}

/**
 * Construit l'application du rôle « gestes ». Contrat de routes techniques (fiche 0029, règle 2) :
 * `/live` dit si le processus répond ; `/health` si l'instance est utilisable ; `/version` le commit servi.
 */
export function buildApp(options: AppOptions): FastifyInstance {
  const app = Fastify({ logger: false });

  app.get('/live', () => ({ status: 'ok' as const }));
  app.get('/health', () => ({ status: 'ok' as const }));
  app.get('/version', () => ({ version: options.version }));

  return app;
}
