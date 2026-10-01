import { listDocks, listPrincipals, setOwnLanguage, type Permission } from '@cairn/contrat';
import {
  AppShell,
  Button,
  Clock,
  ContextSelect,
  ItemIcon,
  NavigationGroup,
  NavigationItem,
  PartyIcon,
  PrincipalIcon,
  ReceiptIcon,
  SearchField,
  SettingsIcon,
  StockIcon,
  UserIcon,
} from '@cairn/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Outlet, useMatches, useNavigate } from '@tanstack/react-router';
import { useContext, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ListExportProvider } from '../contract/export.js';
import { contractQuery } from '../contract/query.js';
import { closeSession, currentSessionQuery } from '../contract/session.js';
import { useGesture } from '../contract/useGesture.js';
import { useNow } from '../screens/time.js';
import { SignalChannelContext, useChangeSignal } from '../signals/useChangeSignal.js';
import type { ScreenPlace } from './place.js';
import { defaultPrincipal, WorkingPrincipalContext } from './principal.js';
import { defaultSite, useRememberedChoice, WorkingSiteContext } from './site.js';

const titles = {
  home: 'shell.home',
  search: 'search.title',
  receptions: 'navigation.receptions',
  stock: 'navigation.stock',
  items: 'navigation.items',
  parties: 'party.menu',
  settings: 'administration.settings',
  usersAndTeams: 'administration.usersAndTeams',
  principals: 'administration.principals',
} as const satisfies Record<ScreenPlace, string>;

const administrationPlaces: readonly ScreenPlace[] = ['settings', 'usersAndTeams', 'principals'];
const settingsPermissions: readonly Permission[] = [
  'administerSites',
  'administerNumbering',
  'administerProvider',
  'administerStockSettings',
  'declareWorkstation',
];
const usersPermissions: readonly Permission[] = [
  'administerUsers',
  'administerExecutionSites',
  'administerRoles',
  'administerTeams',
];

/** Rafraîchissement de l'heure de la barre du haut : elle ne montre que les minutes. */
const CLOCK_INTERVAL_MILLISECONDS = 30_000;

/**
 * Ossature de l'application, tenue par une session en cours : marque et site, navigation, pied avec
 * l'utilisateur, ses rôles et son poste, barre du haut avec le contexte de travail (donneur d'ordre et
 * site) et l'heure du site. Le canal temps réel s'ouvre avec elle.
 */
export function Shell() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const signals = useContext(SignalChannelContext);
  const { data: session } = useQuery(currentSessionQuery);
  const [chosenSite, chooseSite] = useRememberedChoice(`cairn.site.${session?.user.id ?? ''}`);
  const sites = session?.sites ?? [];
  const site = defaultSite(sites, chosenSite);
  // Le donneur d'ordre, contexte permanent comme le site (README du lot 1, décisions du 2026-09-30, point 1).
  const [chosenPrincipal, choosePrincipal] = useRememberedChoice(`cairn.principal.${session?.user.id ?? ''}`);
  const { data: visiblePrincipals } = useQuery(contractQuery(listPrincipals, {}));
  const principalChoices = visiblePrincipals?.principals ?? [];
  const principal = defaultPrincipal(principalChoices, chosenPrincipal);
  // Le compteur de Réceptions : les arrivages en cours du site, un par quai occupé (point 2). Il se
  // tient à jour par le signal des quais, comme l'écran des quais.
  const docksQuery = contractQuery(listDocks, { siteId: site?.id ?? '' });
  const { data: docks } = useQuery({ ...docksQuery, enabled: site !== undefined });
  useChangeSignal('Dock', undefined, docksQuery.queryKey);
  const arrivalsInProgress = (docks?.docks ?? []).filter((dock) => dock.arrival !== null).length;
  // L'heure locale du site de travail, sur vingt-quatre heures (point 4).
  const now = useNow(CLOCK_INTERVAL_MILLISECONDS);
  const siteTime =
    site === undefined
      ? undefined
      : new Intl.DateTimeFormat(i18n.language, {
          hour: '2-digit',
          minute: '2-digit',
          hourCycle: 'h23',
          timeZone: site.timeZone,
        }).format(now);
  const held = session?.permissions ?? [];
  const settings = settingsPermissions.some((permission) => held.includes(permission));
  const usersAndTeams = usersPermissions.some((permission) => held.includes(permission));
  const principals = held.includes('administerPrincipals');
  const parties = (['managePrincipalParties', 'mergeEndCustomers', 'anonymizeEndCustomers'] as const).some(
    (permission) => held.includes(permission),
  );
  const items = (['manageItems', 'manageCustomFields'] as const).some((permission) =>
    held.includes(permission),
  );
  const place: ScreenPlace =
    useMatches().findLast((match) => match.staticData.place !== undefined)?.staticData.place ?? 'home';

  useEffect(() => {
    signals?.open();
    return () => signals?.close();
  }, [signals]);

  // La langue de l'interface est celle du compte (RG-EXI-079) : elle suit la session, sur tout poste.
  const language = session?.language;
  useEffect(() => {
    if (language === undefined) return;
    document.documentElement.lang = language;
    if (i18n.language !== language) void i18n.changeLanguage(language);
  }, [language, i18n]);
  const languageGesture = useGesture();

  const close = async () => {
    await closeSession();
    signals?.close();
    queryClient.setQueryData(currentSessionQuery.queryKey, null);
    await navigate({ to: '/session' });
  };

  return (
    <AppShell
      productName={t('application.name')}
      // Sous la marque, le prestataire et le site, comme dans la maquette.
      context={[session?.providerName, site?.name].filter((part) => part != null).join(' · ')}
      navigation={
        <>
          <NavigationGroup title={t('navigation.office')}>
            <NavigationItem
              href="/receptions"
              isCurrent={place === 'receptions'}
              icon={<ReceiptIcon />}
              count={arrivalsInProgress}
              countLabel={t('navigation.arrivalsInProgress', { count: arrivalsInProgress })}
            >
              {t('navigation.receptions')}
            </NavigationItem>
            {/* Consulter le stock est ouvert à tous les rôles (0.4 § 6). */}
            <NavigationItem href="/stock" isCurrent={place === 'stock'} icon={<StockIcon />}>
              {t('navigation.stock')}
            </NavigationItem>
            {items ? (
              <NavigationItem href="/items" isCurrent={place === 'items'} icon={<ItemIcon />}>
                {t('navigation.items')}
              </NavigationItem>
            ) : null}
            {parties ? (
              <NavigationItem href="/parties" isCurrent={place === 'parties'} icon={<PartyIcon />}>
                {t('party.menu')}
              </NavigationItem>
            ) : null}
          </NavigationGroup>
          {/* L'administration n'apparaît qu'à qui en détient une permission (0.1 § 4). */}
          {settings || usersAndTeams || principals ? (
            <NavigationGroup title={t('administration.group')}>
              {settings ? (
                <NavigationItem
                  href="/administration/settings"
                  isCurrent={place === 'settings'}
                  icon={<SettingsIcon />}
                >
                  {t('administration.settings')}
                </NavigationItem>
              ) : null}
              {usersAndTeams ? (
                <NavigationItem
                  href="/administration/users"
                  isCurrent={place === 'usersAndTeams'}
                  icon={<UserIcon />}
                >
                  {t('administration.usersAndTeams')}
                </NavigationItem>
              ) : null}
              {principals ? (
                <NavigationItem
                  href="/administration/principals"
                  isCurrent={place === 'principals'}
                  icon={<PrincipalIcon />}
                >
                  {t('administration.principals')}
                </NavigationItem>
              ) : null}
            </NavigationGroup>
          ) : null}
        </>
      }
      user={session?.user.displayName ?? ''}
      roles={(session?.roles ?? []).join(', ')}
      workstation={session?.workstation?.name ?? t('workstation.undeclared')}
      footerAction={
        <div className="grid grid-cols-(--cairn-footer-actions) gap-2">
          <Button onPress={() => void close()}>{t('session.close')}</Button>
          {/* L'autre langue, par son code, et sous son propre nom pour qui ne lit pas l'écran : la
              session relue l'applique (point 7). Sur une ligne, le pied de 252 px garde deux boutons. */}
          <Button
            aria-label={t('session.otherLanguage')}
            isDisabled={languageGesture.sending}
            onPress={() =>
              void languageGesture.run(setOwnLanguage, { language: language === 'en' ? 'fr' : 'en' })
            }
          >
            {t('session.otherLanguageCode')}
          </Button>
        </div>
      }
      breadcrumb={
        place === 'home'
          ? t('shell.home')
          : administrationPlaces.includes(place)
            ? t('administration.group')
            : t('navigation.office')
      }
      title={t(titles[place])}
      tools={
        <>
          {/* Sans donneur d'ordre visible, rien à choisir : les écrans qui en demandent un restent vides. */}
          {principalChoices.length > 0 ? (
            <ContextSelect
              label={t('principalSelector.label')}
              placeholder={t('principalSelector.placeholder')}
              options={principalChoices.map((option) => ({
                id: option.id,
                code: option.code,
                label: option.name,
              }))}
              value={principal?.id ?? null}
              onChange={choosePrincipal}
            />
          ) : null}
          {/* Un seul site : une indication sous la marque, pas un choix (0.1, « Contexte de travail »). */}
          {sites.length > 1 ? (
            <ContextSelect
              label={t('siteSelector.label')}
              placeholder={t('siteSelector.label')}
              options={sites.map((option) => ({ id: option.id, code: option.code, label: option.name }))}
              value={site?.id ?? null}
              onChange={chooseSite}
            />
          ) : null}
          {/* L'entrée de recherche unique, sur tout écran (RG-SUR-059). */}
          <SearchField
            label={t('search.label')}
            placeholder={t('search.placeholder')}
            onSubmit={(text) => void navigate({ to: '/search', search: { q: text, scan: false } })}
          />
          {siteTime === undefined ? null : <Clock time={siteTime} label={t('shell.siteTime')} />}
        </>
      }
    >
      <WorkingSiteContext value={site}>
        <WorkingPrincipalContext value={principal}>
          <ListExportProvider siteId={site?.id ?? null} principalId={principal?.id ?? null}>
            <Outlet />
          </ListExportProvider>
        </WorkingPrincipalContext>
      </WorkingSiteContext>
    </AppShell>
  );
}
