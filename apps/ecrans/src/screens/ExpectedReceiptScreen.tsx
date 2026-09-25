import { getExpectedReceipt, type ExpectedReceiptLine } from '@cairn/contrat';
import { DataTable, Panel, StatusBadge } from '@cairn/ui';
import { useQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { contractQuery } from '../contract/query.js';
import { useChangeSignal } from '../signals/useChangeSignal.js';
import { formatDate } from './format.js';

/** Un attendu, ses lignes et leur solde : attendu, servi, restant dû (RG-REC-014). */
export function ExpectedReceiptScreen() {
  const { t, i18n } = useTranslation();
  const { expectedReceiptId } = useParams({ from: '/shell/expected-receipts/$expectedReceiptId' });
  const query = contractQuery(getExpectedReceipt, { expectedReceiptId });
  const { data } = useQuery(query);
  useChangeSignal('ExpectedReceipt', expectedReceiptId, query.queryKey);
  const receipt = data?.expectedReceipt;
  if (receipt === undefined) return null;

  return (
    <Panel
      title={t('expectedReceipt.title', { number: receipt.number })}
      meta={[
        receipt.supplier.name,
        receipt.principal.name,
        formatDate(receipt.expectedArrivalDate, i18n.language),
      ].join(' · ')}
      actions={<StatusBadge tone="info">{t(`expectedReceipt.states.${receipt.state}`)}</StatusBadge>}
    >
      <DataTable<ExpectedReceiptLine>
        label={t('expectedReceipt.lines')}
        rows={receipt.lines}
        rowKey={(line) => line.id}
        empty={null}
        columns={[
          {
            id: 'item',
            header: t('expectedReceipt.item'),
            size: 'code',
            code: true,
            cell: (line) => line.item.code,
          },
          {
            id: 'label',
            header: t('expectedReceipt.shortLabel'),
            size: 'text',
            cell: (line) => line.item.shortLabel,
          },
          {
            id: 'expected',
            header: t('expectedReceipt.expectedQuantity'),
            size: 'number',
            numeric: true,
            cell: (line) => line.expectedQuantity,
          },
          {
            id: 'served',
            header: t('expectedReceipt.servedQuantity'),
            size: 'number',
            numeric: true,
            cell: (line) => line.servedQuantity,
          },
          {
            id: 'remaining',
            header: t('expectedReceipt.remainingQuantity'),
            size: 'number',
            numeric: true,
            cell: (line) => line.remainingQuantity,
          },
        ]}
      />
    </Panel>
  );
}
