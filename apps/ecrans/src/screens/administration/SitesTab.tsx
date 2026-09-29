import { listSites } from '@cairn/contrat';
import { Button, DataTable, Panel, StatusBadge } from '@cairn/ui';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import type { z } from 'zod';
import { contractQuery } from '../../contract/query.js';

type SiteRow = z.infer<typeof listSites.output>['sites'][number];

/** Liste des sites : code, libellé, ville, nombre de zones, état (0.1, parcours « Créer un site »). */
export function SitesTab() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data } = useQuery(contractQuery(listSites, {}));
  return (
    <Panel
      title={t('site.list')}
      actions={
        <Button
          variant="primary"
          onPress={() => void navigate({ to: '/administration/sites/$siteId', params: { siteId: 'new' } })}
        >
          {t('site.create')}
        </Button>
      }
    >
      <DataTable<SiteRow>
        label={t('site.list')}
        rows={data?.sites ?? []}
        rowKey={(row) => row.id}
        empty={null}
        columns={[
          {
            id: 'code',
            header: t('site.code'),
            size: 'code',
            code: true,
            cell: (row) => (
              <Link to="/administration/sites/$siteId" params={{ siteId: row.id }}>
                {row.code}
              </Link>
            ),
          },
          { id: 'name', header: t('site.name'), size: 'text', cell: (row) => row.name },
          { id: 'city', header: t('site.city'), size: 'text', cell: (row) => row.city ?? '—' },
          {
            id: 'zones',
            header: t('site.zoneCount'),
            size: 'number',
            numeric: true,
            cell: (row) => row.zoneCount,
          },
          {
            id: 'state',
            header: t('site.state'),
            size: 'status',
            cell: (row) => (
              <StatusBadge tone={row.active ? 'ok' : 'mute'}>
                {row.active ? t('common.active') : t('common.inactive')}
              </StatusBadge>
            ),
          },
        ]}
      />
    </Panel>
  );
}
