import type { QueryClient } from '@tanstack/react-query';
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router';
import { currentSessionQuery } from './contract/session.js';
import { HomeScreen } from './screens/HomeScreen.js';
import { SessionScreen } from './screens/SessionScreen.js';
import { Shell } from './shell/Shell.js';

interface RouterContext {
  readonly queryClient: QueryClient;
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

const homeRoute = createRoute({ getParentRoute: () => shellRoute, path: '/', component: HomeScreen });

const routeTree = rootRoute.addChildren([sessionRoute, shellRoute.addChildren([homeRoute])]);

export function createAppRouter(queryClient: QueryClient) {
  return createRouter({ routeTree, context: { queryClient }, defaultPreload: false });
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
