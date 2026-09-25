import type { QueryClient } from '@tanstack/react-query';
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router';
import { currentSessionQuery } from './contract/session.js';
import { ExpectedReceiptScreen } from './screens/ExpectedReceiptScreen.js';
import { HomeScreen } from './screens/HomeScreen.js';
import { NewExpectedReceiptScreen } from './screens/NewExpectedReceiptScreen.js';
import { ReceptionsScreen } from './screens/ReceptionsScreen.js';
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

const routeTree = rootRoute.addChildren([
  sessionRoute,
  shellRoute.addChildren([homeRoute, receptionsRoute, newExpectedReceiptRoute, expectedReceiptRoute]),
]);

export function createAppRouter(queryClient: QueryClient) {
  return createRouter({ routeTree, context: { queryClient }, defaultPreload: false });
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
