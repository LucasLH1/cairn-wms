import Fastify, { type FastifyInstance } from 'fastify';
import {
  itemCatalog,
  itemSearchSource,
  listCustomFieldsHandler,
  listItemFamiliesHandler,
  listItemsHandler,
  removeCustomFieldHandler,
  saveCustomFieldHandler,
  saveItemFamilyHandler,
  setPrincipalCurrencyHandler,
} from './logistique/item/index.js';
import { listDocksHandler } from './logistique/location/index.js';
import { listPrincipalsHandler, organizationAdministration } from './logistique/organization/index.js';
import {
  listCarriersHandler,
  listSuppliersHandler,
  partyAdministration,
  partySearchSource,
} from './logistique/party/index.js';
import {
  createExpectedReceiptHandler,
  expectedReceiptSearchSource,
  getExpectedReceiptHandler,
  listOpenExpectedReceiptsHandler,
  openInboundArrivalHandler,
  openReceptionFlowsForPrincipal,
  openReceptionFlowsOnSite,
  receptionHistoryOnSite,
} from './logistique/reception/index.js';
import type { Database } from './socle/database/index.js';
import { registerGestures } from './socle/gesture/index.js';
import { runHealthChecks, type HealthCheck } from './socle/health/index.js';
import { authorize } from './socle/permission/index.js';
import { listNumberingSchemesHandler, saveNumberingSchemeHandler } from './socle/numbering/index.js';
import { getProviderHandler, saveProviderHandler } from './socle/provider/index.js';
import { registerQueries } from './socle/query/index.js';
import { searchHandler } from './socle/search/index.js';
import { deleteRoleHandler, listRolesHandler, saveRoleHandler } from './socle/role/index.js';
import { registerSignalRoute, type SignalRelay } from './socle/signal/index.js';
import {
  addSiteClosuresHandler,
  listPublicHolidaysHandler,
  removeSiteClosureHandler,
  saveSiteCalendarHandler,
} from './socle/site/index.js';
import { listTeamsHandler, saveTeamHandler, setTeamActiveHandler } from './socle/team/index.js';
import {
  declareWorkstationHandler,
  getUserHandler,
  hasSession,
  listUsersHandler,
  listWorkstationsHandler,
  revokeWorkstationHandler,
  registerSessionRoutes,
  sessionAuthor,
  saveUserHandler,
  sessionUserId,
  setExecutionSitesHandler,
  setUserActiveHandler,
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
    // L'organisation apprend des autres modules ce qui reste à solder sur un site, un donneur d'ordre,
    // une zone (RG-ORG-009, 013). Le stock s'y ajoutera avec son module (0.4).
    const organization = organizationAdministration({
      openOnSite: async (transaction, siteId) => ({
        ...(await openReceptionFlowsOnSite(transaction, siteId)),
      }),
      siteHasHistory: receptionHistoryOnSite,
      openForPrincipal: async (transaction, principalId) => ({
        ...(await openReceptionFlowsForPrincipal(transaction, principalId)),
      }),
      stockInZone: () => Promise.resolve({}),
      foreignStockInZone: () => Promise.resolve({}),
    });
    // Flux en cours des clients finaux (commandes, 3.1) et stock chez les sous-traitants (0.4) : à venir.
    const parties = partyAdministration({
      openFlowsOfEndCustomer: () => Promise.resolve(0),
      stockAtSubcontractor: () => Promise.resolve({}),
    });
    // Le stock des références et leurs mouvements viendront avec leur module (0.4) : d'ici là, aucune
    // référence n'immobilise de stock ni n'a bougé.
    const items = itemCatalog({
      stockOfItems: () => Promise.resolve(new Map()),
      hasStockMovement: () => Promise.resolve(false),
    });
    registerSessionRoutes(app, { db, config: access });
    registerSignalRoute(app, { relay, authenticate: hasSession({ db, config: access }) });
    registerGestures(app, {
      db,
      rights: {
        resolveAuthor: sessionAuthor({ db, config: access }),
        authorize: (transaction, author, permission, scope) =>
          authorize(transaction, author.userId, permission, scope),
      },
      handlers: [
        declareWorkstationHandler(access.cookieSecret),
        revokeWorkstationHandler,
        saveProviderHandler,
        saveSiteCalendarHandler,
        addSiteClosuresHandler,
        removeSiteClosureHandler,
        saveRoleHandler,
        deleteRoleHandler,
        saveUserHandler,
        setUserActiveHandler,
        setExecutionSitesHandler,
        saveTeamHandler,
        setTeamActiveHandler,
        saveNumberingSchemeHandler,
        ...organization.gestures,
        ...parties.gestures,
        ...items.gestures,
        saveItemFamilyHandler,
        saveCustomFieldHandler,
        removeCustomFieldHandler,
        setPrincipalCurrencyHandler,
        createExpectedReceiptHandler,
        openInboundArrivalHandler,
      ],
    });
    registerQueries(app, {
      db,
      resolveUser: sessionUserId({ db, config: access }),
      handlers: [
        listPrincipalsHandler,
        listSuppliersHandler,
        listItemsHandler,
        listOpenExpectedReceiptsHandler,
        getExpectedReceiptHandler,
        listCarriersHandler,
        listDocksHandler,
        getProviderHandler,
        listWorkstationsHandler,
        listPublicHolidaysHandler,
        listRolesHandler,
        listUsersHandler,
        getUserHandler,
        listTeamsHandler,
        listNumberingSchemesHandler,
        ...organization.queries,
        ...parties.queries,
        ...items.queries,
        listItemFamiliesHandler,
        listCustomFieldsHandler,
        // Chaque module réalisé apporte ses objets à l'entrée de recherche unique (RG-SUR-059).
        searchHandler([itemSearchSource, partySearchSource, expectedReceiptSearchSource]),
      ],
    });
  }

  return app;
}
