import Fastify, { type FastifyInstance } from 'fastify';
import type { Database } from './socle/database/index.js';
import { registerGestures } from './socle/gesture/index.js';
import { runHealthChecks, type HealthCheck } from './socle/health/index.js';
import { authorize } from './socle/permission/index.js';
import { registerSignalRoute, type SignalRelay } from './socle/signal/index.js';
import {
  declareWorkstationHandler,
  hasSession,
  registerSessionRoutes,
  sessionAuthor,
  type AccessConfig,
} from './socle/user/index.js';

export interface AppOptions {
  /** Commit servi, rendu par `/version`. */
  readonly version: string;
  /** Vérifications qui décident si l'instance est utilisable. */
  readonly healthChecks: Readonly<Record<string, HealthCheck>>;
  /** Base et réglages d'accès : sans eux, seules les routes techniques existent. */
  readonly services?: { readonly db: Database; readonly access: AccessConfig; readonly relay: SignalRelay };
}

/**
 * Construit l'application du rôle « gestes ». Contrat de routes techniques (fiche 0029, règle 2) :
 * `/live` dit si le processus répond ; `/health` si l'instance est utilisable ; `/version` le commit servi.
 * Puis les routes du contrat : session et gestes (fiches 0019, 0027).
 */
export function buildApp(options: AppOptions): FastifyInstance {
  const app = Fastify({ logger: false });

  app.get('/live', () => ({ status: 'ok' as const }));
  app.get('/health', async (_request, reply) => {
    const report = await runHealthChecks(options.healthChecks);
    return reply.code(report.status === 'ok' ? 200 : 503).send(report);
  });
  app.get('/version', () => ({ version: options.version }));

  if (options.services !== undefined) {
    const { db, access, relay } = options.services;
    registerSessionRoutes(app, { db, config: access });
    registerSignalRoute(app, { relay, authenticate: hasSession({ db, config: access }) });
    registerGestures(app, {
      db,
      rights: {
        resolveAuthor: sessionAuthor({ db, config: access }),
        authorize: (transaction, author, permission, scope) =>
          authorize(transaction, author.userId, permission, scope),
      },
      handlers: [declareWorkstationHandler(access.cookieSecret)],
    });
  }

  return app;
}
