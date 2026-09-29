import type { Permission } from '@cairn/contrat';
import { AppShell, Button, NavigationGroup, NavigationItem, Select } from '@cairn/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Outlet, useMatches, useNavigate } from '@tanstack/react-router';
import { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { closeSession, currentSessionQuery } from '../contract/session.js';
import { SignalChannelContext } from '../signals/useChangeSignal.js';
import type { ScreenPlace } from './place.js';
import { defaultSite, WorkingSiteContext } from './site.js';

const titles = {
  home: 'shell.home',
  receptions: 'navigation.receptions',
  settings: 'administration.settings',
  usersAndTeams: 'administration.usersAndTeams',
  principals: 'administration.principals',
} as const satisfies Record<ScreenPlace, string>;

const administrationPlaces: readonly ScreenPlace[] = ['settings', 'usersAndTeams', 'principals'];
const settingsPermissions: readonly Permission[] = [
  'administerSites',
  'administerNumbering',
  'administerProvider',
  'declareWorkstation',
];
const usersPermissions: readonly Permission[] = [
  'administerUsers',
  'administerExecutionSites',
  'administerRoles',
  'administerTeams',
];

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
  const storageKey = `cairn.site.${session?.user.id ?? ''}`;
  const [chosen, setChosen] = useState<string | null>(() => {
    // Préférence de ce navigateur : son absence ne gêne rien.
    try {
      return localStorage.getItem(storageKey);
    } catch {
      return null;
    }
  });
  const sites = session?.sites ?? [];
  const site = defaultSite(sites, chosen);
  const choose = (siteId: string | null) => {
    setChosen(siteId);
    try {
      if (siteId !== null) localStorage.setItem(storageKey, siteId);
    } catch {
      // Stockage refusé : le choix vaut pour la page ouverte.
    }
  };
  const held = session?.permissions ?? [];
  const settings = settingsPermissions.some((permission) => held.includes(permission));
  const usersAndTeams = usersPermissions.some((permission) => held.includes(permission));
  const principals = held.includes('administerPrincipals');
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
        <>
          <NavigationGroup title={t('navigation.office')}>
            <NavigationItem href="/receptions" isCurrent={place === 'receptions'}>
              {t('navigation.receptions')}
            </NavigationItem>
          </NavigationGroup>
          {/* L'administration n'apparaît qu'à qui en détient une permission (0.1 § 4). */}
          {settings || usersAndTeams || principals ? (
            <NavigationGroup title={t('administration.group')}>
              {settings ? (
                <NavigationItem href="/administration/settings" isCurrent={place === 'settings'}>
                  {t('administration.settings')}
                </NavigationItem>
              ) : null}
              {usersAndTeams ? (
                <NavigationItem href="/administration/users" isCurrent={place === 'usersAndTeams'}>
                  {t('administration.usersAndTeams')}
                </NavigationItem>
              ) : null}
              {principals ? (
                <NavigationItem href="/administration/principals" isCurrent={place === 'principals'}>
                  {t('administration.principals')}
                </NavigationItem>
              ) : null}
            </NavigationGroup>
          ) : null}
        </>
      }
      user={session?.user.displayName ?? ''}
      workstation={session?.workstation?.name ?? t('workstation.undeclared')}
      footerAction={<Button onPress={() => void close()}>{t('session.close')}</Button>}
      breadcrumb={
        place === 'home'
          ? t('shell.home')
          : administrationPlaces.includes(place)
            ? t('administration.group')
            : t('navigation.office')
      }
      title={t(titles[place])}
      tools={
        // Un seul site : une indication sous la marque, pas un choix (0.1, « Contexte de travail »).
        sites.length > 1 ? (
          <Select
            label={t('siteSelector.label')}
            hideLabel
            placeholder={t('siteSelector.label')}
            options={sites.map((option) => ({ id: option.id, label: `${option.code} · ${option.name}` }))}
            value={site?.id ?? null}
            onChange={choose}
          />
        ) : undefined
      }
    >
      <WorkingSiteContext value={site}>
        <Outlet />
      </WorkingSiteContext>
    </AppShell>
  );
}
