import Fastify, { type FastifyInstance } from 'fastify';
import { runHealthChecks, type HealthCheck } from './socle/health/index.js';

export interface AppOptions {
  /** Commit servi, rendu par `/version`. */
  readonly version: string;
  /** Vérifications qui décident si l'instance est utilisable. */
  readonly healthChecks: Readonly<Record<string, HealthCheck>>;
}

/**
 * Construit l'application du rôle « gestes ». Contrat de routes techniques (fiche 0029, règle 2) :
 * `/live` dit si le processus répond ; `/health` si l'instance est utilisable ; `/version` le commit servi.
 */
export function buildApp(options: AppOptions): FastifyInstance {
  const app = Fastify({ logger: false });

  app.get('/live', () => ({ status: 'ok' as const }));
  app.get('/health', async (_request, reply) => {
    const report = await runHealthChecks(options.healthChecks);
    return reply.code(report.status === 'ok' ? 200 : 503).send(report);
  });
  app.get('/version', () => ({ version: options.version }));

  return app;
}
