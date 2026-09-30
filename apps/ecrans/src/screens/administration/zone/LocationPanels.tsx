import {
  createVirtualLocation,
  listCarriers,
  listParties,
  locationTypeSchema,
  saveLocation,
  searchItems,
  setFixedPickLocation,
  setTraversalRanks,
  virtualFamilySchema,
  type AddressSegment,
  type PartyFamily,
  type VirtualFamily,
  type ZoneLayout,
  type ZoneLocation,
} from '@cairn/contrat';
import { Banner, Button, NumberField, Panel, Select, TextField } from '@cairn/ui';
import { useQuery } from '@tanstack/react-query';
import { Controller, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { textField, useGestureForm, valueField } from '../../../contract/form.js';
import { contractQuery } from '../../../contract/query.js';
import { RefusalBanner } from '../../../contract/RefusalBanner.js';
import { useGesture } from '../../../contract/useGesture.js';
import { useWorkingPrincipal } from '../../../shell/principal.js';
import { isDocked, physicalTypes } from './locationTypes.js';

const NO_PARTY = 'none';

/** Un quai n'est retenu que pour un emplacement de quai ; ailleurs, le geste le reçoit nul. */
const characteristicsForm = {
  input: saveLocation.input
    .transform((values) => ({ ...values, dockId: isDocked(values.type) ? values.dockId : null }))
    .pipe(saveLocation.input),
};

/**
 * Type, quai et capacités d'un emplacement (RG-EMP-008, 022, 023, 031). Un emplacement virtuel n'a ni
 * autre type ni capacité (RG-EMP-045).
 */
export function CharacteristicsPanel({
  zone,
  location,
  onClose,
}: {
  zone: ZoneLayout;
  location: ZoneLocation;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const gesture = useGesture();
  const virtual = location.type === 'virtual';
  const form = useGestureForm(characteristicsForm, {
    locationId: location.id,
    type: location.type,
    dockId: location.dockId,
    maxWeightGrams: location.maxWeightGrams,
    maxVolumeCm3: location.maxVolumeCm3,
    supportCapacity: location.supportCapacity,
  });
  const type = useWatch({ control: form.control, name: 'type' });
  const submit = form.handleSubmit((input) => gesture.run(saveLocation, input));
  const capacityField = (name: 'maxWeightGrams' | 'maxVolumeCm3' | 'supportCapacity', label: string) => (
    <Controller
      control={form.control}
      name={name}
      render={({ field }) => <NumberField label={label} {...valueField(field)} minValue={1} />}
    />
  );
  return (
    <>
      <RefusalBanner refusal={gesture.refusal} onDismiss={gesture.dismiss} />
      <Panel
        title={t('zone.editTitle', { address: location.address })}
        meta={location.barcode}
        actions={<Button onPress={onClose}>{t('zone.close')}</Button>}
      >
        <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
          <div className="grid grid-cols-3 items-end gap-3">
            <Controller
              control={form.control}
              name="type"
              render={({ field }) => (
                <Select
                  label={t('zone.type')}
                  placeholder={t('zone.choose')}
                  isDisabled={virtual}
                  options={(virtual ? (['virtual'] as const) : physicalTypes).map((option) => ({
                    id: option,
                    label: t(`locationType.${option}`),
                  }))}
                  value={field.value}
                  onChange={(value) => {
                    field.onChange(locationTypeSchema.safeParse(value).data ?? field.value);
                  }}
                />
              )}
            />
            {isDocked(type) ? (
              <Controller
                control={form.control}
                name="dockId"
                render={({ field }) => (
                  <Select
                    label={t('zone.dock')}
                    placeholder={t('zone.choose')}
                    options={zone.docks
                      .filter((dock) => dock.active || dock.id === location.dockId)
                      .map((dock) => ({ id: dock.id, label: dock.code }))}
                    {...valueField(field)}
                  />
                )}
              />
            ) : null}
            {virtual ? null : (
              <>
                {capacityField('maxWeightGrams', t('zone.maxWeight'))}
                {capacityField('maxVolumeCm3', t('zone.maxVolume'))}
                {capacityField('supportCapacity', t('zone.supportCapacity'))}
              </>
            )}
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="primary" isDisabled={!form.formState.isValid || gesture.sending}>
              {t('common.save')}
            </Button>
          </div>
        </form>
      </Panel>
    </>
  );
}

/** La séquence d'un emplacement se saisit seule ; le geste la reçoit comme un lot d'une ligne. */
const rankForm = {
  input: z
    .object({ zoneId: z.string(), locationId: z.string(), traversalRank: z.number().nullable() })
    .transform(({ zoneId, locationId, traversalRank }): z.input<typeof setTraversalRanks.input> => ({
      zoneId,
      ranks: [{ locationId, traversalRank: traversalRank ?? -1 }],
    }))
    .pipe(setTraversalRanks.input),
};

/**
 * Saisie directe de la séquence de parcours d'un emplacement (RG-EMP-015 ; 0.3 § 6, « Ajuster un
 * parcours », étape 2). Un doublon est refusé en nommant l'emplacement en conflit (RG-EMP-013).
 */
export function RankPanel({ zone, location }: { zone: ZoneLayout; location: ZoneLocation }) {
  const { t } = useTranslation();
  const gesture = useGesture();
  const form = useGestureForm(rankForm, {
    zoneId: zone.id,
    locationId: location.id,
    traversalRank: location.traversalRank,
  });
  const submit = form.handleSubmit((input) => gesture.run(setTraversalRanks, input));
  return (
    <>
      <RefusalBanner refusal={gesture.refusal} onDismiss={gesture.dismiss} />
      <Panel title={t('zone.rankTitle', { address: location.address })}>
        <form
          className="grid grid-cols-(--cairn-line-columns) items-end gap-3"
          onSubmit={(event) => void submit(event)}
        >
          <Controller
            control={form.control}
            name="traversalRank"
            render={({ field }) => <NumberField label={t('zone.rank')} {...valueField(field)} />}
          />
          <span />
          <Button type="submit" variant="primary" isDisabled={!form.formState.isValid || gesture.sending}>
            {t('common.save')}
          </Button>
        </form>
      </Panel>
    </>
  );
}

/** Une référence est choisie pour attitrer l'emplacement ; le retrait passe par son propre bouton. */
const fixedPickForm = {
  input: setFixedPickLocation.input.extend({
    itemId: z.uuid(),
    replenishmentThreshold: z.int().nonnegative(),
    replenishmentTarget: z.int().positive(),
  }),
};

/**
 * Emplacement de prélèvement dédié et sa règle de réapprovisionnement (RG-EMP-033, 034, 038) : une
 * référence du donneur d'ordre du contexte de travail, un seuil, une cible.
 */
export function FixedPickPanel({ location }: { location: ZoneLocation }) {
  const { t } = useTranslation();
  const gesture = useGesture();
  const principal = useWorkingPrincipal();
  const { data } = useQuery({
    ...contractQuery(searchItems, {
      principalId: principal?.id ?? '',
      familyId: null,
      state: null,
      trackingMode: null,
      search: null,
      draftsOnly: false,
    }),
    enabled: principal !== undefined,
  });
  const current = location.fixedPick;
  const form = useGestureForm(fixedPickForm, {
    locationId: location.id,
    itemId: current?.itemId ?? '',
    replenishmentThreshold: current?.replenishmentThreshold ?? 0,
    replenishmentTarget: current?.replenishmentTarget ?? 1,
  });
  const submit = form.handleSubmit((input) => gesture.run(setFixedPickLocation, input));
  // Une référence en gestion série n'est jamais en prélèvement dédié (RG-EMP-038) : elle n'est pas proposée.
  const items = (data?.items ?? [])
    .filter((item) => item.trackingMode !== 'serial')
    .map((item) => ({ id: item.id, label: `${item.code} · ${item.shortLabel}` }));
  const options =
    current === null || items.some((item) => item.id === current.itemId)
      ? items
      : [{ id: current.itemId, label: `${current.principalCode} · ${current.itemCode}` }, ...items];
  return (
    <>
      <RefusalBanner refusal={gesture.refusal} onDismiss={gesture.dismiss} />
      <Panel
        title={t('zone.fixedPick', { address: location.address })}
        actions={
          current === null ? undefined : (
            <Button
              isDisabled={gesture.sending}
              onPress={() =>
                void gesture.run(setFixedPickLocation, {
                  locationId: location.id,
                  itemId: null,
                  replenishmentThreshold: current.replenishmentThreshold,
                  replenishmentTarget: current.replenishmentTarget,
                })
              }
            >
              {t('zone.removeFixedPick')}
            </Button>
          )
        }
      >
        {principal === undefined ? <Banner tone="info">{t('zone.noWorkingPrincipal')}</Banner> : null}
        <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
          <div className="grid grid-cols-3 items-end gap-3">
            <Controller
              control={form.control}
              name="itemId"
              render={({ field }) => (
                <Select
                  label={t('zone.item')}
                  placeholder={t('zone.choose')}
                  options={options}
                  value={field.value === '' ? null : field.value}
                  onChange={(value) => {
                    field.onChange(value ?? '');
                  }}
                />
              )}
            />
            <Controller
              control={form.control}
              name="replenishmentThreshold"
              render={({ field }) => <NumberField label={t('zone.threshold')} {...valueField(field)} />}
            />
            <Controller
              control={form.control}
              name="replenishmentTarget"
              render={({ field }) => (
                <NumberField label={t('zone.target')} {...valueField(field)} minValue={1} />
              )}
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="primary" isDisabled={!form.formState.isValid || gesture.sending}>
              {t('common.save')}
            </Button>
          </div>
        </form>
      </Panel>
    </>
  );
}

/** Le tiers qu'une famille virtuelle admet (RG-EMP-042), comme le serveur l'applique. */
const partyFamilyOf: Readonly<Record<VirtualFamily, PartyFamily | null>> = {
  interSiteTransit: null,
  atCarrier: 'carrier',
  atEndCustomer: 'endCustomer',
  atSubcontractor: 'subcontractor',
  awaitingReturn: 'endCustomer',
};

/** Les segments se saisissent en minuscules comme en capitales ; le geste les reçoit en capitales. */
const virtualForm = {
  input: createVirtualLocation.input
    .extend({ segments: z.array(z.string()) })
    .transform((values) => ({
      ...values,
      segments: values.segments.map((segment) => segment.trim().toUpperCase()),
    }))
    .pipe(createVirtualLocation.input),
};

/** Tiers proposés pour une famille : transporteurs et sous-traitants du prestataire, clients finaux du donneur d'ordre. */
function useParties(family: PartyFamily | null) {
  const principal = useWorkingPrincipal();
  const carriers = useQuery({ ...contractQuery(listCarriers, {}), enabled: family === 'carrier' });
  const subcontractors = useQuery({
    ...contractQuery(listParties, { family: 'subcontractor', principalId: null, search: null }),
    enabled: family === 'subcontractor',
  });
  const endCustomers = useQuery({
    ...contractQuery(listParties, {
      family: 'endCustomer',
      principalId: principal?.id ?? null,
      search: null,
    }),
    enabled: family === 'endCustomer' && principal !== undefined,
  });
  switch (family) {
    case 'carrier':
      return carriers.data?.carriers ?? [];
    case 'subcontractor':
      return (subcontractors.data?.parties ?? []).filter((party) => party.active);
    case 'endCustomer':
      return (endCustomers.data?.parties ?? []).filter((party) => party.active);
    case 'supplier':
    case null:
      return [];
  }
}

/**
 * Création d'un emplacement virtuel (RG-EMP-039 à 042 ; 0.3 § 4) : son adresse, segment par segment,
 * sa famille, et le tiers chez qui se trouve le stock s'il y a lieu.
 */
export function VirtualLocationPanel({
  zone,
  pattern,
}: {
  zone: ZoneLayout;
  pattern: readonly AddressSegment[];
}) {
  const { t } = useTranslation();
  const gesture = useGesture();
  const form = useGestureForm(virtualForm, {
    zoneId: zone.id,
    segments: pattern.map(() => ''),
    family: 'interSiteTransit',
    partyId: null,
  });
  const family = useWatch({ control: form.control, name: 'family' });
  const partyFamily = partyFamilyOf[family];
  const parties = useParties(partyFamily);
  const submit = form.handleSubmit(async (input) => {
    if ((await gesture.run(createVirtualLocation, input)) !== undefined) form.reset();
  });
  return (
    <>
      <RefusalBanner refusal={gesture.refusal} onDismiss={gesture.dismiss} />
      <Panel title={t('zone.virtualTitle')}>
        <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
          <div className="grid grid-cols-3 items-end gap-3">
            {pattern.map((segment, index) => (
              <Controller
                key={`${String(index)}${segment.name}`}
                control={form.control}
                name={`segments.${index}`}
                render={({ field }) => <TextField label={segment.name} {...textField(field)} code />}
              />
            ))}
          </div>
          <div className="grid grid-cols-3 items-end gap-3">
            <Controller
              control={form.control}
              name="family"
              render={({ field }) => (
                <Select
                  label={t('zone.family')}
                  placeholder={t('zone.choose')}
                  options={virtualFamilySchema.options.map((option) => ({
                    id: option,
                    label: t(`virtualFamily.${option}`),
                  }))}
                  value={field.value}
                  onChange={(value) => {
                    field.onChange(virtualFamilySchema.safeParse(value).data ?? field.value);
                    // Le tiers dépend de la famille : il se choisit de nouveau.
                    form.setValue('partyId', null, { shouldValidate: true });
                  }}
                />
              )}
            />
            {partyFamily === null ? null : (
              <Controller
                control={form.control}
                name="partyId"
                render={({ field }) => (
                  <Select
                    label={t('zone.party')}
                    placeholder={t('zone.noParty')}
                    options={[
                      { id: NO_PARTY, label: t('zone.noParty') },
                      ...parties.map((party) => ({ id: party.id, label: `${party.code} · ${party.name}` })),
                    ]}
                    value={field.value ?? NO_PARTY}
                    onChange={(value) => {
                      field.onChange(value === NO_PARTY ? null : value);
                    }}
                  />
                )}
              />
            )}
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="primary" isDisabled={!form.formState.isValid || gesture.sending}>
              {t('zone.createVirtual')}
            </Button>
          </div>
        </form>
      </Panel>
    </>
  );
}
