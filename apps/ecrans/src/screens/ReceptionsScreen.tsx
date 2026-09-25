import { listOpenExpectedReceipts, type ExpectedReceiptSummary } from '@cairn/contrat';
import { Button, DataTable, Panel, StatusBadge } from '@cairn/ui';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { contractQuery } from '../contract/query.js';
import { useHasPermission, useWorkingSite } from '../shell/site.js';
import { useChangeSignal } from '../signals/useChangeSignal.js';
import { formatDate } from './format.js';

/** Réceptions du site : les attendus ouverts (1.1, « Surveiller les attendus »). */
export function ReceptionsScreen() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const site = useWorkingSite();
  const canCreate = useHasPermission('createExpectedReceipt');
  const query = contractQuery(listOpenExpectedReceipts, { siteId: site?.id ?? '' });
  const { data } = useQuery({ ...query, enabled: site !== undefined });
  // Un attendu créé ou modifié sur le site fait relire la liste des attendus ouverts.
  useChangeSignal('ExpectedReceipt', undefined, query.queryKey);

  return (
    <Panel
      title={t('expectedReceipt.openList')}
      meta={site?.name}
      actions={
        canCreate ? (
          <Button variant="primary" onPress={() => void navigate({ to: '/expected-receipts/new' })}>
            {t('expectedReceipt.create')}
          </Button>
        ) : undefined
      }
    >
      <DataTable<ExpectedReceiptSummary>
        label={t('expectedReceipt.openList')}
        rows={data?.expectedReceipts ?? []}
        rowKey={(row) => row.id}
        empty={t('expectedReceipt.none')}
        columns={[
          {
            id: 'number',
            header: t('expectedReceipt.number'),
            size: 'code',
            code: true,
            cell: (row) => (
              <Link to="/expected-receipts/$expectedReceiptId" params={{ expectedReceiptId: row.id }}>
                {row.number}
              </Link>
            ),
          },
          {
            id: 'principal',
            header: t('expectedReceipt.principal'),
            size: 'text',
            cell: (row) => row.principal.name,
          },
          {
            id: 'supplier',
            header: t('expectedReceipt.supplier'),
            size: 'text',
            cell: (row) => row.supplier.name,
          },
          {
            id: 'date',
            header: t('expectedReceipt.expectedArrivalDate'),
            size: 'date',
            cell: (row) => formatDate(row.expectedArrivalDate, i18n.language),
          },
          {
            id: 'lines',
            header: t('expectedReceipt.lineCount'),
            size: 'number',
            numeric: true,
            cell: (row) => row.lineCount,
          },
          {
            id: 'state',
            header: t('expectedReceipt.state'),
            size: 'status',
            cell: (row) => <StatusBadge tone="info">{t(`expectedReceipt.states.${row.state}`)}</StatusBadge>,
          },
        ]}
      />
    </Panel>
  );
}
