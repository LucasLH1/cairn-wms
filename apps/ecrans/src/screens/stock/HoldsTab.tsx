import { liftStockHold, listStockHolds, type StockHold } from '@cairn/contrat';
import { Banner, Button, DataTable, Panel, TextField } from '@cairn/ui';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { textField, useGestureForm } from '../../contract/form.js';
import { contractQuery } from '../../contract/query.js';
import { RefusalBanner } from '../../contract/RefusalBanner.js';
import { useGesture } from '../../contract/useGesture.js';
import { useHasPermission, useWorkingSite } from '../../shell/site.js';
import { useChangeSignal } from '../../signals/useChangeSignal.js';
import { formatDate, formatDateTime } from '../format.js';
import { HoldPanel } from './HoldPanel.js';

const NONE = '—';

/**
 * Blocages en cours du site de travail (RG-STK-034 à 039) : motif, auteur, pose, levée prévue,
 * quantité retenue ; la levée sous permission, motivée (RG-STK-038) ; la pose d'un blocage.
 */
export function HoldsTab() {
  const { t, i18n } = useTranslation();
  const site = useWorkingSite();
  const query = contractQuery(listStockHolds, { siteId: site?.id ?? '' });
  const { data } = useQuery({ ...query, enabled: site !== undefined });
  useChangeSignal('StockHold', undefined, query.queryKey);
  const canLift = useHasPermission('liftStockHold');
  const canPlace = useHasPermission('placeStockHold');
  const [lifting, setLifting] = useState<StockHold>();
  const [lifted, setLifted] = useState(false);
  if (site === undefined) return <Banner tone="info">{t('stock.noSite')}</Banner>;
  return (
    <>
      {lifted ? <Banner tone="ok">{t('hold.lifted')}</Banner> : null}
      <Panel title={t('hold.list')} meta={site.name}>
        <DataTable<StockHold>
          label={t('hold.list')}
          rows={data?.holds ?? []}
          rowKey={(hold) => hold.id}
          empty={t('hold.none')}
          columns={[
            { id: 'target', header: t('hold.target'), size: 'date', code: true, cell: (hold) => hold.target },
            {
              id: 'scope',
              header: t('hold.scope'),
              size: 'date',
              cell: (hold) => t(`hold.scopes.${hold.scope}`),
            },
            { id: 'reason', header: t('hold.reason'), size: 'text', cell: (hold) => hold.reason },
            {
              id: 'origin',
              header: t('hold.origin'),
              size: 'code',
              cell: (hold) => t(`hold.origins.${hold.origin}`),
            },
            {
              id: 'placedBy',
              header: t('hold.placedBy'),
              size: 'code',
              cell: (hold) => hold.placedBy ?? NONE,
            },
            {
              id: 'placedAt',
              header: t('hold.placedAt'),
              size: 'date',
              cell: (hold) => formatDateTime(hold.placedAt, i18n.language),
            },
            {
              id: 'plannedLiftOn',
              header: t('hold.plannedLiftOn'),
              size: 'date',
              cell: (hold) =>
                hold.plannedLiftOn === null ? NONE : formatDate(hold.plannedLiftOn, i18n.language),
            },
            {
              id: 'quantity',
              header: t('hold.quantity'),
              size: 'number',
              numeric: true,
              cell: (hold) => hold.quantity,
            },
            ...(canLift
              ? [
                  {
                    id: 'actions',
                    header: '',
                    size: 'code' as const,
                    cell: (hold: StockHold) => (
                      <Button
                        onPress={() => {
                          setLifted(false);
                          setLifting(hold);
                        }}
                      >
                        {t('hold.lift')}
                      </Button>
                    ),
                  },
                ]
              : []),
          ]}
        />
      </Panel>
      {lifting === undefined ? null : (
        <LiftPanel
          key={lifting.id}
          hold={lifting}
          onClose={() => {
            setLifting(undefined);
          }}
          onLifted={() => {
            setLifting(undefined);
            setLifted(true);
          }}
        />
      )}
      {canPlace ? <HoldPanel /> : null}
    </>
  );
}

/** Levée d'un blocage, avec motif ; autorisée même si la cause subsiste, la responsabilité est tracée. */
function LiftPanel({
  hold,
  onClose,
  onLifted,
}: {
  hold: StockHold;
  onClose: () => void;
  onLifted: () => void;
}) {
  const { t } = useTranslation();
  const gesture = useGesture();
  const form = useGestureForm(liftStockHold, { holdId: hold.id, reason: '' });
  const submit = form.handleSubmit(async (input) => {
    if ((await gesture.run(liftStockHold, input)) !== undefined) onLifted();
  });
  return (
    <>
      <RefusalBanner refusal={gesture.refusal} onDismiss={gesture.dismiss} />
      <Panel
        title={t('hold.liftTitle', { target: hold.target })}
        meta={hold.reason}
        actions={<Button onPress={onClose}>{t('stock.close')}</Button>}
      >
        <form
          className="grid grid-cols-(--cairn-line-columns) items-end gap-3"
          onSubmit={(event) => void submit(event)}
        >
          <Controller
            control={form.control}
            name="reason"
            render={({ field }) => <TextField label={t('hold.liftReason')} {...textField(field)} />}
          />
          <span />
          <Button type="submit" variant="primary" isDisabled={!form.formState.isValid || gesture.sending}>
            {t('hold.lift')}
          </Button>
        </form>
      </Panel>
    </>
  );
}
