import { setLocationActive, setTraversalRanks, type ZoneLayout, type ZoneLocation } from '@cairn/contrat';
import { Button, DataTable, NumberField, Panel, Select, StatusBadge } from '@cairn/ui';
import { useState } from 'react';
import { Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { useGestureForm, valueField } from '../../../contract/form.js';
import { RefusalBanner } from '../../../contract/RefusalBanner.js';
import { useGesture } from '../../../contract/useGesture.js';
import { CharacteristicsPanel, FixedPickPanel, RankPanel, VirtualLocationPanel } from './LocationPanels.js';

const NONE = '—';

/**
 * Emplacements d'une zone, triés par séquence de parcours (0.3 § 6, « Ajuster un parcours ») : la
 * liste, la fiche de l'emplacement choisi, la renumérotation d'une plage ; en zone virtuelle, la
 * création d'un emplacement virtuel (RG-EMP-039 à 042).
 */
export function LocationsTab({ zone, locations }: { zone: ZoneLayout; locations: readonly ZoneLocation[] }) {
  const [editingId, setEditingId] = useState<string>();
  const editing = locations.find((location) => location.id === editingId);
  const close = () => {
    setEditingId(undefined);
  };
  return (
    <>
      <LocationsPanel locations={locations} onEdit={setEditingId} />
      {editing === undefined ? null : (
        <>
          <CharacteristicsPanel
            key={`c${JSON.stringify(editing)}`}
            zone={zone}
            location={editing}
            onClose={close}
          />
          <RankPanel key={`r${editing.id}${String(editing.traversalRank)}`} zone={zone} location={editing} />
          {zone.pickMode === 'dedicated' && editing.type === 'picking' ? (
            <FixedPickPanel key={`f${editing.id}${JSON.stringify(editing.fixedPick)}`} location={editing} />
          ) : null}
        </>
      )}
      {locations.length > 1 ? (
        <RenumberPanel
          key={JSON.stringify(locations.map((location) => [location.id, location.traversalRank]))}
          zone={zone}
          locations={locations}
        />
      ) : null}
      {zone.purpose === 'virtual' && zone.addressPattern !== null ? (
        <VirtualLocationPanel zone={zone} pattern={zone.addressPattern} />
      ) : null}
    </>
  );
}

function LocationsPanel({
  locations,
  onEdit,
}: {
  locations: readonly ZoneLocation[];
  onEdit: (locationId: string) => void;
}) {
  const { t } = useTranslation();
  const gesture = useGesture();
  const capacityOf = (location: ZoneLocation) => {
    const parts = [
      location.maxWeightGrams === null ? null : t('zone.capacityWeight', { value: location.maxWeightGrams }),
      location.maxVolumeCm3 === null ? null : t('zone.capacityVolume', { value: location.maxVolumeCm3 }),
      location.supportCapacity === null
        ? null
        : t('zone.capacitySupports', { value: location.supportCapacity }),
    ].filter((part) => part !== null);
    return parts.length === 0 ? NONE : parts.join(' · ');
  };
  const assignmentOf = (location: ZoneLocation) => {
    if (location.fixedPick !== null)
      return t('zone.fixedPickSummary', {
        principal: location.fixedPick.principalCode,
        item: location.fixedPick.itemCode,
        threshold: location.fixedPick.replenishmentThreshold,
        target: location.fixedPick.replenishmentTarget,
      });
    if (location.virtualFamily !== null) {
      const family = t(`virtualFamily.${location.virtualFamily}`);
      return location.partyName === null ? family : `${family} · ${location.partyName}`;
    }
    return NONE;
  };
  return (
    <>
      <RefusalBanner refusal={gesture.refusal} onDismiss={gesture.dismiss} />
      <Panel title={t('zone.locations')} meta={t('zone.locationCount', { count: locations.length })}>
        <DataTable<ZoneLocation>
          label={t('zone.locations')}
          rows={locations}
          rowKey={(location) => location.id}
          empty={t('zone.noLocation')}
          columns={[
            {
              id: 'rank',
              header: t('zone.rank'),
              size: 'number',
              numeric: true,
              cell: (location) => location.traversalRank,
            },
            {
              id: 'address',
              header: t('zone.address'),
              size: 'code',
              code: true,
              cell: (location) => location.address,
            },
            // L'identifiant scannable se déduit de l'adresse ; le panneau de modification le montre. Le
            // quai s'écrit avec le type : le tableau tient dans la largeur, états et actions compris.
            {
              id: 'type',
              header: t('zone.type'),
              size: 'status',
              cell: (location) =>
                location.dockCode === null
                  ? t(`locationType.${location.type}`)
                  : `${t(`locationType.${location.type}`)} · ${location.dockCode}`,
            },
            { id: 'capacity', header: t('zone.capacity'), size: 'date', cell: capacityOf },
            { id: 'assignment', header: t('zone.assignment'), size: 'text', cell: assignmentOf },
            {
              id: 'state',
              header: t('site.state'),
              size: 'status',
              cell: (location) => (
                <StatusBadge tone={location.active ? 'ok' : 'mute'}>
                  {location.active ? t('common.active') : t('common.inactive')}
                </StatusBadge>
              ),
            },
            {
              id: 'actions',
              header: '',
              size: 'text',
              cell: (location) => (
                <div className="flex gap-2">
                  <Button
                    onPress={() => {
                      onEdit(location.id);
                    }}
                  >
                    {t('common.edit')}
                  </Button>
                  <Button
                    onPress={() =>
                      void gesture.run(setLocationActive, {
                        locationId: location.id,
                        active: !location.active,
                      })
                    }
                  >
                    {location.active ? t('common.deactivate') : t('common.activate')}
                  </Button>
                </div>
              ),
            },
          ]}
        />
      </Panel>
    </>
  );
}

/**
 * Renumérotation par lot (RG-EMP-015) : les emplacements d'une plage, dans leur ordre actuel,
 * reçoivent une séquence à partir de la première, au pas donné. La plage se choisit par ses deux
 * bornes ; le formulaire, construit sur la liste affichée, repart d'elle quand elle change.
 */
function renumberForm(zoneId: string, locations: readonly ZoneLocation[]) {
  return {
    input: z
      .object({
        fromId: z.string(),
        toId: z.string(),
        start: z.number().nullable(),
        step: z.number().nullable(),
      })
      .transform(({ fromId, toId, start, step }): z.input<typeof setTraversalRanks.input> => {
        const from = locations.findIndex((location) => location.id === fromId);
        const to = locations.findIndex((location) => location.id === toId);
        // Une plage incomplète ne renumérote rien : le schéma du geste refuse une liste vide.
        if (from < 0 || to < 0 || start === null || step === null || step < 1) return { zoneId, ranks: [] };
        const range = locations.slice(Math.min(from, to), Math.max(from, to) + 1);
        return {
          zoneId,
          ranks: range.map((location, index) => ({
            locationId: location.id,
            traversalRank: start + index * step,
          })),
        };
      })
      .pipe(setTraversalRanks.input),
  };
}

function RenumberPanel({ zone, locations }: { zone: ZoneLayout; locations: readonly ZoneLocation[] }) {
  const { t } = useTranslation();
  const gesture = useGesture();
  const [definition] = useState(() => renumberForm(zone.id, locations));
  const form = useGestureForm(definition, { fromId: '', toId: '', start: null, step: 10 });
  const submit = form.handleSubmit((input) => gesture.run(setTraversalRanks, input));
  const options = locations.map((location) => ({ id: location.id, label: location.address }));
  const boundField = (name: 'fromId' | 'toId', label: string) => (
    <Controller
      control={form.control}
      name={name}
      render={({ field }) => (
        <Select
          label={label}
          placeholder={t('zone.choose')}
          options={options}
          value={field.value === '' ? null : field.value}
          onChange={(value) => {
            field.onChange(value ?? '');
          }}
        />
      )}
    />
  );
  return (
    <>
      <RefusalBanner refusal={gesture.refusal} onDismiss={gesture.dismiss} />
      <Panel title={t('zone.renumber')}>
        <span>{t('zone.renumberHint')}</span>
        <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
          <div className="grid grid-cols-4 items-end gap-3">
            {boundField('fromId', t('zone.fromLocation'))}
            {boundField('toId', t('zone.toLocation'))}
            <Controller
              control={form.control}
              name="start"
              render={({ field }) => <NumberField label={t('zone.startRank')} {...valueField(field)} />}
            />
            <Controller
              control={form.control}
              name="step"
              render={({ field }) => (
                <NumberField label={t('zone.step')} {...valueField(field)} minValue={1} />
              )}
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="primary" isDisabled={!form.formState.isValid || gesture.sending}>
              {t('zone.renumber')}
            </Button>
          </div>
        </form>
      </Panel>
    </>
  );
}
