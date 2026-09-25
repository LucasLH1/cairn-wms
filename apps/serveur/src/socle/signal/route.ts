import { SIGNALS_PATH, type Subscription } from '@cairn/contrat';
import websocket from '@fastify/websocket';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { matches, parseSubscription, type SignalRelay } from './signal.js';

export interface SignalRouteOptions {
  readonly relay: SignalRelay;
  /** Vrai si la requête d'ouverture porte une session en cours. */
  readonly authenticate: (request: FastifyRequest) => Promise<boolean>;
}

/** Code de fermeture d'une connexion sans session. */
export const UNAUTHENTICATED_CLOSE = 4401;

/**
 * Canal temps réel (fiche 0026) : une connexion WebSocket par écran, ouverte avec la session ; elle ne
 * reçoit que les signaux des objets auxquels l'écran s'est abonné.
 */
export function registerSignalRoute(app: FastifyInstance, options: SignalRouteOptions): void {
  void app.register(async (scope) => {
    await scope.register(websocket);
    scope.get(SIGNALS_PATH, { websocket: true }, async (socket, request) => {
      let subscription: Subscription['subscribe'] = [];
      const pending: string[] = [];
      socket.on('message', (data: Buffer) => pending.push(data.toString()));
      if (!(await options.authenticate(request))) {
        socket.close(UNAUTHENTICATED_CLOSE, 'notAuthenticated');
        return;
      }
      const apply = (message: string) => {
        subscription = parseSubscription(message) ?? subscription;
      };
      pending.splice(0).forEach(apply);
      socket.removeAllListeners('message');
      socket.on('message', (data: Buffer) => {
        apply(data.toString());
      });
      const unlisten = options.relay.listen((signal) => {
        if (matches(subscription, signal)) socket.send(JSON.stringify(signal));
      });
      socket.on('close', unlisten);
    });
  });
}
