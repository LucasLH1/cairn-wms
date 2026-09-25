import { AppShell, Button, NavigationGroup, NavigationItem } from '@cairn/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Outlet, useMatches, useNavigate } from '@tanstack/react-router';
import { useContext, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { closeSession, currentSessionQuery } from '../contract/session.js';
import type { ScreenPlace } from './place.js';
import { SignalChannelContext } from '../signals/useChangeSignal.js';
import { useWorkingSite } from './site.js';

const titles = { home: 'shell.home', receptions: 'navigation.receptions' } as const satisfies Record<
  ScreenPlace,
  string
>;

/**
 * Ossature de l'application, tenue par une session en cours : marque et site, navigation, pied avec
 * l'utilisateur et son poste, barre du haut. Le canal temps réel s'ouvre avec elle.
 */
export function Shell() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const signals = useContext(SignalChannelContext);
  const { data: session } = useQuery(currentSessionQuery);
  const site = useWorkingSite();
  const place: ScreenPlace =
    useMatches().findLast((match) => match.staticData.place !== undefined)?.staticData.place ?? 'home';

  useEffect(() => {
    signals?.open();
    return () => signals?.close();
  }, [signals]);

  const close = async () => {
    await closeSession();
    signals?.close();
    queryClient.setQueryData(currentSessionQuery.queryKey, null);
    await navigate({ to: '/session' });
  };

  return (
    <AppShell
      productName={t('application.name')}
      context={site?.name}
      navigation={
        <NavigationGroup title={t('navigation.office')}>
          <NavigationItem href="/receptions" isCurrent={place === 'receptions'}>
            {t('navigation.receptions')}
          </NavigationItem>
        </NavigationGroup>
      }
      user={session?.user.displayName ?? ''}
      workstation={session?.workstation?.name ?? t('workstation.undeclared')}
      footerAction={<Button onPress={() => void close()}>{t('session.close')}</Button>}
      breadcrumb={place === 'home' ? t('shell.home') : t('navigation.office')}
      title={t(titles[place])}
    >
      <Outlet />
    </AppShell>
  );
}
