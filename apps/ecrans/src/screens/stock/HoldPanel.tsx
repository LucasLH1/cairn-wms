import { holdImpact, placeStockHold, search, type HoldScope, type SearchObjectType } from '@cairn/contrat';
import { Banner, Button, ChipGroup, DataTable, DateField, Panel, Select, TextField } from '@cairn/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { z } from 'zod';
import { textField, useGestureForm } from '../../contract/form.js';
import { contractQuery } from '../../contract/query.js';
import { RefusalBanner } from '../../contract/RefusalBanner.js';
import { useGesture } from '../../contract/useGesture.js';

type Demand = z.infer<typeof holdImpact.output>['demands'][number];

/** Ce qu'un blocage désigne : sa portée, l'objet, et ce qu'on en lit à l'écran. */
export interface HoldTarget {
  readonly scope: HoldScope;
  readonly targetId: string;
  readonly label: string;
}

/**
 * Les portées qu'un code désigne par la recherche unique : un emplacement par son adresse ou son
 * identifiant scannable, une référence par l'un de ses codes, un objet sérialisé par son numéro.
 * L'unité de stock et le lot se bloquent depuis la ligne de la consultation.
 */
const searchedScopes = ['location', 'item', 'serializedUnit'] as const satisfies readonly (HoldScope &
  SearchObjectType)[];
type SearchedScope = (typeof searchedScopes)[number];
const isSearchedScope = (value: string | null): value is SearchedScope =>
  searchedScopes.some((scope) => scope === value);

const ALLOWS_TRANSFER = 'allowsMove';

/**
 * Poser un blocage (0.4 § 6, « Gestionnaire de stock ») : la portée et l'objet, puis, avant validation,
 * ce que le blocage va toucher — quantité, réservations levées, demandes concernées ; motif
 * obligatoire, levée prévue facultative. Après validation, les demandes dont la réservation est levée
 * restent affichées, et exportables comme toute liste (RG-STK-037).
 */
export function HoldPanel({ preset, onClose }: { preset?: HoldTarget; onClose?: () => void }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [scope, setScope] = useState<SearchedScope>('location');
  const [text, setText] = useState('');
  const [found, setFound] = useState<HoldTarget>();
  const [unknown, setUnknown] = useState<string>();
  const target = preset ?? found;

  const find = async () => {
    const typed = text.trim();
    if (typed === '') return;
    const { results } = await queryClient.query(contractQuery(search, { text: typed }));
    const match = results.find((result) => result.type === scope && result.exact && !result.outOfScope);
    setUnknown(match === undefined ? typed : undefined);
    setFound(
      match === undefined
        ? undefined
        : {
            scope,
            targetId: match.id,
            label: [t(`hold.scopes.${scope}`), match.code, match.label]
              .filter((part) => part !== null && part !== '')
              .join(' · '),
          },
    );
  };

  return (
    <Panel
      title={preset === undefined ? t('hold.place') : t('hold.placeOn', { target: preset.label })}
      actions={onClose === undefined ? undefined : <Button onPress={onClose}>{t('stock.close')}</Button>}
    >
      {preset === undefined ? (
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void find();
          }}
        >
          <span>{t('hold.unitHint')}</span>
          <div className="grid grid-cols-(--cairn-line-columns) items-end gap-3">
            <TextField label={t('hold.code')} value={text} onChange={setText} code />
            <Select
              label={t('hold.scope')}
              placeholder={t('stock.choose')}
              options={searchedScopes.map((option) => ({ id: option, label: t(`hold.scopes.${option}`) }))}
              value={scope}
              onChange={(value) => {
                if (isSearchedScope(value)) setScope(value);
              }}
            />
            <Button type="submit" isDisabled={text.trim() === ''}>
              {t('hold.find')}
            </Button>
          </div>
          {unknown === undefined ? null : <Banner tone="bad">{t('hold.notFound', { text: unknown })}</Banner>}
        </form>
      ) : null}
      {target === undefined ? null : <HoldForm key={`${target.scope}-${target.targetId}`} target={target} />}
    </Panel>
  );
}

function HoldForm({ target }: { target: HoldTarget }) {
  const { t } = useTranslation();
  const gesture = useGesture();
  const [released, setReleased] = useState<readonly Demand[]>();
  const { data: impact } = useQuery({
    ...contractQuery(holdImpact, { scope: target.scope, targetId: target.targetId }),
    enabled: released === undefined,
  });
  const form = useGestureForm(placeStockHold, {
    scope: target.scope,
    targetId: target.targetId,
    reason: '',
    plannedLiftOn: null,
    allowsMove: false,
  });
  const submit = form.handleSubmit(async (input) => {
    const result = await gesture.run(placeStockHold, input);
    if (result !== undefined) setReleased(result.releasedDemands);
  });
  const demandsTable = (label: string, demands: readonly Demand[]) => (
    <DataTable<Demand>
      label={label}
      rows={demands}
      rowKey={(demand) => `${demand.demandType}-${demand.demandId}`}
      empty={t('hold.noDemand')}
      columns={[
        { id: 'type', header: t('hold.demand'), size: 'date', cell: (demand) => demand.demandType },
        { id: 'id', header: t('hold.demandId'), size: 'text', code: true, cell: (demand) => demand.demandId },
      ]}
    />
  );

  if (released !== undefined)
    return (
      <>
        <Banner tone="ok">{t('hold.placed')}</Banner>
        <span>{t('hold.releasedDemands')}</span>
        {demandsTable(t('hold.releasedDemands'), released)}
      </>
    );
  return (
    <>
      <RefusalBanner refusal={gesture.refusal} onDismiss={gesture.dismiss} />
      <span>{t('hold.designated', { target: target.label })}</span>
      {impact === undefined ? null : (
        <>
          <Banner tone={impact.reservations > 0 ? 'warn' : 'info'}>
            {t('hold.impact', {
              quantity: impact.quantity,
              units: impact.stockUnits,
              reservations: impact.reservations,
            })}
          </Banner>
          {demandsTable(t('hold.demands'), impact.demands)}
        </>
      )}
      <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
        <div className="grid grid-cols-3 items-end gap-4">
          <Controller
            control={form.control}
            name="reason"
            render={({ field }) => <TextField label={t('hold.reason')} {...textField(field)} />}
          />
          <Controller
            control={form.control}
            name="plannedLiftOn"
            render={({ field }) => (
              <DateField label={t('hold.plannedLiftOn')} value={field.value} onChange={field.onChange} />
            )}
          />
          <Controller
            control={form.control}
            name="allowsMove"
            render={({ field }) => (
              <ChipGroup
                label={t('hold.options')}
                options={[{ id: ALLOWS_TRANSFER, label: t('hold.allowsMove') }]}
                value={field.value ? [ALLOWS_TRANSFER] : []}
                onChange={(value) => {
                  field.onChange(value.includes(ALLOWS_TRANSFER));
                }}
              />
            )}
          />
        </div>
        <div className="flex justify-end">
          <Button type="submit" variant="primary" isDisabled={!form.formState.isValid || gesture.sending}>
            {t('hold.place')}
          </Button>
        </div>
      </form>
    </>
  );
}
