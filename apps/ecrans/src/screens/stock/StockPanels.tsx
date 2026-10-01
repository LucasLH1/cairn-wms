import {
  adjustStockQuantity,
  changeQualityState,
  correctMovement,
  listMovementReasons,
  listQualityStates,
  releaseReservation,
  type ReasonNature,
  type StockMovement,
  type StockUnit,
} from '@cairn/contrat';
import { Banner, Button, ChipGroup, NumberField, Panel, Select, TextField, type StatusTone } from '@cairn/ui';
import { useQuery } from '@tanstack/react-query';
import { Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { textField, useGestureForm, valueField } from '../../contract/form.js';
import { contractQuery } from '../../contract/query.js';
import { RefusalBanner } from '../../contract/RefusalBanner.js';
import { useGesture } from '../../contract/useGesture.js';
import { formatDateTime } from '../format.js';

/** Ce qu'un geste enregistré laisse à lire au-dessus de la consultation. */
export interface StockNotice {
  readonly tone: StatusTone;
  readonly text: string;
}

/** Les motifs actifs d'une nature (RG-STK-026), en options de liste. */
function useReasonOptions(nature: ReasonNature) {
  const { data } = useQuery(contractQuery(listMovementReasons, {}));
  return (data?.reasons ?? [])
    .filter((reason) => reason.active && reason.nature === nature)
    .map((reason) => ({ id: reason.id, label: reason.label }));
}

/**
 * Motif choisi dans la liste configurée (RG-STK-023, 026). Sans motif actif pour la nature, le geste
 * ne peut pas s'envoyer : l'écran dit où il se déclare.
 */
function ReasonSelect({
  nature,
  value,
  onChange,
}: {
  nature: ReasonNature;
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useTranslation();
  const options = useReasonOptions(nature);
  if (options.length === 0) return <Banner tone="info">{t('stock.noReason')}</Banner>;
  return (
    <Select
      label={t('stock.reason')}
      placeholder={t('stock.choose')}
      options={options}
      value={value === '' ? null : value}
      onChange={(chosen) => {
        onChange(chosen ?? '');
      }}
    />
  );
}

const unitLabel = (unit: StockUnit) => `${unit.address} · ${String(unit.quantity)} · ${unit.qualityLabel}`;

/**
 * Changer l'état qualité (0.4 § 6, « Gestionnaire de stock ») : une ou plusieurs unités, le nouvel état
 * parmi ceux du donneur d'ordre, un motif obligatoire. Le déplacement suggéré est proposé, jamais
 * imposé (RG-STK-014) ; le stock réservé rendu non prélevable est signalé.
 */
export function QualityChangePanel({
  unit,
  units,
  principalId,
  onClose,
  onDone,
}: {
  unit: StockUnit;
  units: readonly StockUnit[];
  principalId: string;
  onClose: () => void;
  onDone: (notices: StockNotice[]) => void;
}) {
  const { t } = useTranslation();
  const gesture = useGesture();
  const { data } = useQuery(contractQuery(listQualityStates, { principalId }));
  const form = useGestureForm(changeQualityState, {
    stockUnitIds: [unit.id],
    qualityStateId: '',
    reasonId: '',
    comment: null,
  });
  const submit = form.handleSubmit(async (input) => {
    const result = await gesture.run(changeQualityState, input);
    if (result === undefined) return;
    onDone([
      { tone: 'ok', text: t('stock.qualityChanged') },
      ...(result.suggestedLocationType === null
        ? []
        : [
            {
              tone: 'info' as const,
              text: t('stock.suggestedMove', { type: t(`locationType.${result.suggestedLocationType}`) }),
            },
          ]),
      ...(result.reservedMadeUnpickable > 0
        ? [
            {
              tone: 'warn' as const,
              text: t('stock.reservedUnpickable', { count: result.reservedMadeUnpickable }),
            },
          ]
        : []),
    ]);
  });
  // Une unité en cours de mouvement n'accepte aucune autre opération (RG-STK-018).
  const choices = units.filter((candidate) => candidate.status !== 'moving');
  return (
    <>
      <RefusalBanner refusal={gesture.refusal} onDismiss={gesture.dismiss} />
      <Panel title={t('stock.qualityTitle')} actions={<Button onPress={onClose}>{t('stock.close')}</Button>}>
        <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
          <Controller
            control={form.control}
            name="stockUnitIds"
            render={({ field }) => (
              <ChipGroup
                label={t('stock.qualityUnits')}
                options={choices.map((choice) => ({ id: choice.id, label: unitLabel(choice) }))}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
          <Controller
            control={form.control}
            name="qualityStateId"
            render={({ field }) => (
              <Select
                label={t('stock.newQuality')}
                placeholder={t('stock.choose')}
                options={(data?.qualityStates ?? [])
                  .filter((state) => state.active)
                  .map((state) => ({ id: state.id, label: state.label }))}
                value={field.value === '' ? null : field.value}
                onChange={(value) => {
                  field.onChange(value ?? '');
                }}
              />
            )}
          />
          <div className="grid grid-cols-2 gap-4">
            <Controller
              control={form.control}
              name="reasonId"
              render={({ field }) => (
                <ReasonSelect nature="qualityChange" value={field.value} onChange={field.onChange} />
              )}
            />
            <Controller
              control={form.control}
              name="comment"
              render={({ field }) => (
                <TextField label={t('stock.comment')} {...textField(field, { optional: true })} />
              )}
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="primary" isDisabled={!form.formState.isValid || gesture.sending}>
              {t('stock.changeQuality')}
            </Button>
          </div>
        </form>
      </Panel>
    </>
  );
}

/** Ajustement de quantité hors inventaire, toujours motivé (RG-STK-027). */
export function AdjustPanel({
  unit,
  onClose,
  onDone,
}: {
  unit: StockUnit;
  onClose: () => void;
  onDone: (notices: StockNotice[]) => void;
}) {
  const { t } = useTranslation();
  const gesture = useGesture();
  const form = useGestureForm(adjustStockQuantity, {
    stockUnitId: unit.id,
    quantity: unit.quantity,
    reasonId: '',
    comment: null,
  });
  const submit = form.handleSubmit(async (input) => {
    if ((await gesture.run(adjustStockQuantity, input)) !== undefined)
      onDone([{ tone: 'ok', text: t('stock.adjusted') }]);
  });
  return (
    <>
      <RefusalBanner refusal={gesture.refusal} onDismiss={gesture.dismiss} />
      <Panel
        title={t('stock.adjustTitle', { address: unit.address })}
        meta={unitLabel(unit)}
        actions={<Button onPress={onClose}>{t('stock.close')}</Button>}
      >
        <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
          <div className="grid grid-cols-2 gap-4">
            <Controller
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <NumberField label={t('stock.newQuantity')} minValue={0} {...valueField(field)} />
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Controller
              control={form.control}
              name="reasonId"
              render={({ field }) => (
                <ReasonSelect nature="quantityAdjustment" value={field.value} onChange={field.onChange} />
              )}
            />
            <Controller
              control={form.control}
              name="comment"
              render={({ field }) => (
                <TextField label={t('stock.comment')} {...textField(field, { optional: true })} />
              )}
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="primary" isDisabled={!form.formState.isValid || gesture.sending}>
              {t('stock.adjust')}
            </Button>
          </div>
        </form>
      </Panel>
    </>
  );
}

/** Levée manuelle d'une réservation, motivée ; la demande en est avertie (RG-STK-031). */
export function ReleasePanel({
  unit,
  onClose,
  onDone,
}: {
  unit: StockUnit;
  onClose: () => void;
  onDone: (notices: StockNotice[]) => void;
}) {
  const { t } = useTranslation();
  const gesture = useGesture();
  const form = useGestureForm(releaseReservation, { stockUnitId: unit.id, reason: '' });
  const submit = form.handleSubmit(async (input) => {
    if ((await gesture.run(releaseReservation, input)) !== undefined)
      onDone([{ tone: 'ok', text: t('stock.released') }]);
  });
  return (
    <>
      <RefusalBanner refusal={gesture.refusal} onDismiss={gesture.dismiss} />
      <Panel
        title={t('stock.releaseTitle', { address: unit.address })}
        meta={unitLabel(unit)}
        actions={<Button onPress={onClose}>{t('stock.close')}</Button>}
      >
        <form
          className="grid grid-cols-(--cairn-line-columns) items-end gap-3"
          onSubmit={(event) => void submit(event)}
        >
          <Controller
            control={form.control}
            name="reason"
            render={({ field }) => <TextField label={t('stock.releaseReason')} {...textField(field)} />}
          />
          <span />
          <Button type="submit" variant="primary" isDisabled={!form.formState.isValid || gesture.sending}>
            {t('stock.releaseReservation')}
          </Button>
        </form>
      </Panel>
    </>
  );
}

/** Correction d'un mouvement par son inverse, motivé et rattaché à lui (RG-STK-022 à 024). */
export function CorrectPanel({
  movement,
  onClose,
  onDone,
}: {
  movement: StockMovement;
  onClose: () => void;
  onDone: (notices: StockNotice[]) => void;
}) {
  const { t, i18n } = useTranslation();
  const gesture = useGesture();
  const form = useGestureForm(correctMovement, { movementId: movement.id, reasonId: '', comment: null });
  const submit = form.handleSubmit(async (input) => {
    if ((await gesture.run(correctMovement, input)) !== undefined)
      onDone([{ tone: 'ok', text: t('stock.movementCorrected') }]);
  });
  return (
    <>
      <RefusalBanner refusal={gesture.refusal} onDismiss={gesture.dismiss} />
      <Panel
        title={t('stock.correctTitle', { date: formatDateTime(movement.occurredAt, i18n.language) })}
        meta={t(`reasonNature.${movement.nature}`)}
        actions={<Button onPress={onClose}>{t('stock.close')}</Button>}
      >
        <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
          <span>{t('stock.correctHint')}</span>
          <div className="grid grid-cols-2 gap-4">
            <Controller
              control={form.control}
              name="reasonId"
              render={({ field }) => (
                <ReasonSelect nature="correction" value={field.value} onChange={field.onChange} />
              )}
            />
            <Controller
              control={form.control}
              name="comment"
              render={({ field }) => (
                <TextField label={t('stock.comment')} {...textField(field, { optional: true })} />
              )}
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="primary" isDisabled={!form.formState.isValid || gesture.sending}>
              {t('stock.correct')}
            </Button>
          </div>
        </form>
      </Panel>
    </>
  );
}
