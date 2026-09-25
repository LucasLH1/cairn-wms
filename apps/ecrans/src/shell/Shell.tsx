import { AppShell, Button } from '@cairn/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Outlet, useNavigate } from '@tanstack/react-router';
import { useContext, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { closeSession, currentSessionQuery } from '../contract/session.js';
import { SignalChannelContext } from '../signals/useChangeSignal.js';

/**
 * Ossature de l'application, tenue par une session en cours : marque, pied avec l'utilisateur et son
 * poste, barre du haut. Le canal temps réel s'ouvre avec elle et se ferme avec la session.
 */
export function Shell() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const signals = useContext(SignalChannelContext);
  const { data: session } = useQuery(currentSessionQuery);

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
      user={session?.user.displayName ?? ''}
      workstation={session?.workstation?.name ?? t('workstation.undeclared')}
      footerAction={<Button onPress={() => void close()}>{t('session.close')}</Button>}
      breadcrumb={t('shell.home')}
      title={t('shell.home')}
    >
      <Outlet />
    </AppShell>
  );
}
