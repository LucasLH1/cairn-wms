import { listDocks, type DockSummary } from '@cairn/contrat';
import { Button, Card, CardGrid, StatusBadge } from '@cairn/ui';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { contractQuery } from '../contract/query.js';
import { useHasPermission } from '../shell/site.js';
import { useChangeSignal } from '../signals/useChangeSignal.js';
import { formatElapsed, formatTime, useNow } from './time.js';

/**
 * Écran des quais (1.1, parcours « Ouvrir un arrivage ») : un bloc par quai, libre ou occupé, le
 * véhicule en cours et sa durée d'occupation affichée en direct.
 */
export function DockCards({ siteId }: { readonly siteId: string }) {
  const { t } = useTranslation();
  const query = contractQuery(listDocks, { siteId });
  const { data } = useQuery(query);
  // Un quai qui passe occupé ou libre, d'où que vienne le geste, s'affiche sans rechargement (RG-EXI-001).
  useChangeSignal('Dock', undefined, query.queryKey);

  return (
    <CardGrid label={t('dock.list')}>
      {(data?.docks ?? []).map((dock) => (
        <DockCard key={dock.id} dock={dock} />
      ))}
    </CardGrid>
  );
}

function DockCard({ dock }: { readonly dock: DockSummary }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const now = useNow();
  const canOpen = useHasPermission('openInboundArrival');
  const title = t('dock.title', { code: dock.code });

  if (dock.arrival === null) {
    return (
      <Card
        title={title}
        badge={<StatusBadge tone="mute">{t('dock.free')}</StatusBadge>}
        lines={[t('dock.noVehicle')]}
        actions={
          canOpen ? (
            <Button
              onPress={() => void navigate({ to: '/docks/$dockId/arrival', params: { dockId: dock.id } })}
            >
              {t('arrival.open')}
            </Button>
          ) : undefined
        }
      />
    );
  }
  const arrival = dock.arrival;
  return (
    <Card
      title={title}
      highlighted
      badge={<StatusBadge tone="ok">{t('dock.occupied')}</StatusBadge>}
      lines={[
        [t('dock.arrival', { vehicle: arrival.vehicleIdentification }), arrival.carrier?.name]
          .filter((part) => part !== undefined)
          .join(' · '),
        t('dock.openedBy', {
          name: arrival.openedBy ?? '—',
          time: formatTime(arrival.arrivedAt, i18n.language),
        }),
      ]}
      figure={{ label: t('dock.occupiedSince'), value: formatElapsed(arrival.arrivedAt, now) }}
    />
  );
}
