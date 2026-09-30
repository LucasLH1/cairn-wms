import type { QueryClient } from '@tanstack/react-query';
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router';
import { currentSessionQuery } from './contract/session.js';
import { PrincipalScreen, PrincipalsScreen } from './screens/administration/PrincipalsScreen.js';
import { RoleScreen } from './screens/administration/RoleScreen.js';
import { SettingsScreen } from './screens/administration/SettingsScreen.js';
import { SiteScreen } from './screens/administration/SiteScreen.js';
import { TeamScreen } from './screens/administration/TeamScreen.js';
import { UserScreen } from './screens/administration/UserScreen.js';
import { UsersAndTeamsScreen } from './screens/administration/UsersAndTeamsScreen.js';
import { ExpectedReceiptScreen } from './screens/ExpectedReceiptScreen.js';
import { MergeScreen } from './screens/parties/MergeScreen.js';
import { PartiesScreen } from './screens/parties/PartiesScreen.js';
import { PartyScreen } from './screens/parties/PartyScreen.js';
import { HomeScreen } from './screens/HomeScreen.js';
import { ItemScreen, NewItemScreen } from './screens/items/ItemScreen.js';
import { ItemsScreen } from './screens/items/ItemsScreen.js';
import { NewExpectedReceiptScreen } from './screens/NewExpectedReceiptScreen.js';
import { OpenArrivalScreen } from './screens/OpenArrivalScreen.js';
import { ReceptionsScreen } from './screens/ReceptionsScreen.js';
import { SearchScreen } from './screens/SearchScreen.js';
import { SessionScreen } from './screens/SessionScreen.js';
import type { ScreenPlace } from './shell/place.js';
import { Shell } from './shell/Shell.js';

interface RouterContext {
  readonly queryClient: QueryClient;
}

declare module '@tanstack/react-router' {
  interface StaticDataRouteOption {
    place?: ScreenPlace;
  }
}

const rootRoute = createRootRouteWithContext<RouterContext>()({ component: Outlet });

/** Ouverture de session : la seule page accessible sans session. */
export const sessionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/session',
  component: SessionScreen,
});

/** Tout le reste passe par l'ossature, qui exige une session en cours. */
const shellRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'shell',
  component: Shell,
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.query({ ...currentSessionQuery, staleTime: 'static' });
    if (session === null) {
      redirect({ to: '/session', throw: true });
    }
  },
});

const homeRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/',
  component: HomeScreen,
  staticData: { place: 'home' },
});

const searchRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/search',
  component: SearchScreen,
  staticData: { place: 'search' },
  // `scan` : le texte vient d'une lecture de code-barres, qui ouvre l'objet désigné (RG-SUR-060).
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search['q'] === 'string' ? search['q'] : '',
    scan: search['scan'] === true || search['scan'] === 'true',
  }),
});

const receptionsRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/receptions',
  component: ReceptionsScreen,
  staticData: { place: 'receptions' },
});

const newExpectedReceiptRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/expected-receipts/new',
  component: NewExpectedReceiptScreen,
  staticData: { place: 'receptions' },
});

const expectedReceiptRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/expected-receipts/$expectedReceiptId',
  component: ExpectedReceiptScreen,
  staticData: { place: 'receptions' },
});

const openArrivalRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/docks/$dockId/arrival',
  component: OpenArrivalScreen,
  staticData: { place: 'receptions' },
});

const itemsRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/items',
  component: ItemsScreen,
  staticData: { place: 'items' },
});

const newItemRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/items/new',
  component: NewItemScreen,
  staticData: { place: 'items' },
  validateSearch: (search: Record<string, unknown>) => ({
    principalId: typeof search['principalId'] === 'string' ? search['principalId'] : '',
  }),
});

const itemRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/items/$itemId',
  component: ItemScreen,
  staticData: { place: 'items' },
});

const settingsRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/administration/settings',
  component: SettingsScreen,
  staticData: { place: 'settings' },
});
const siteRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/administration/sites/$siteId',
  component: SiteScreen,
  staticData: { place: 'settings' },
});
const usersRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/administration/users',
  component: UsersAndTeamsScreen,
  staticData: { place: 'usersAndTeams' },
});
const userRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/administration/users/$userId',
  component: UserScreen,
  staticData: { place: 'usersAndTeams' },
});
const roleRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/administration/roles/$roleId',
  component: RoleScreen,
  staticData: { place: 'usersAndTeams' },
});
const teamRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/administration/teams/$teamId',
  component: TeamScreen,
  staticData: { place: 'usersAndTeams' },
});
const principalsRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/administration/principals',
  component: PrincipalsScreen,
  staticData: { place: 'principals' },
});
const principalRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/administration/principals/$principalId',
  component: PrincipalScreen,
  staticData: { place: 'principals' },
});

const partiesRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/parties',
  component: PartiesScreen,
  staticData: { place: 'parties' },
});
const partyRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/parties/$partyId',
  component: PartyScreen,
  staticData: { place: 'parties' },
});
const mergeRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/parties/$partyId/merge',
  component: MergeScreen,
  staticData: { place: 'parties' },
  validateSearch: (search: Record<string, unknown>) => ({
    other: typeof search['other'] === 'string' ? search['other'] : '',
  }),
});

const routeTree = rootRoute.addChildren([
  sessionRoute,
  shellRoute.addChildren([
    homeRoute,
    searchRoute,
    receptionsRoute,
    newExpectedReceiptRoute,
    expectedReceiptRoute,
    openArrivalRoute,
    itemsRoute,
    newItemRoute,
    itemRoute,
    settingsRoute,
    siteRoute,
    usersRoute,
    userRoute,
    roleRoute,
    teamRoute,
    principalsRoute,
    principalRoute,
    partiesRoute,
    partyRoute,
    mergeRoute,
  ]),
]);

export function createAppRouter(queryClient: QueryClient) {
  return createRouter({ routeTree, context: { queryClient }, defaultPreload: false });
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
