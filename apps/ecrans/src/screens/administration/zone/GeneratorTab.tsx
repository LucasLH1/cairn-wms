import {
  describedCount,
  generateLocations,
  layoutGenerationSchema,
  locationTypeSchema,
  previewLayout,
  type AddressSegment,
  type LayoutGeneration,
  type ZoneLayout,
} from '@cairn/contrat';
import {
  Banner,
  Button,
  DataTable,
  NumberField,
  Panel,
  Select,
  StatusBadge,
  TextField,
  type DataColumn,
} from '@cairn/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Controller, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { textField, useGestureForm, valueField } from '../../../contract/form.js';
import { contractQuery } from '../../../contract/query.js';
import { RefusalBanner } from '../../../contract/RefusalBanner.js';
import { useGesture } from '../../../contract/useGesture.js';
import { isDocked, physicalTypes, typeForPurpose } from './locationTypes.js';

type Preview = z.infer<typeof previewLayout.output>;
type Generated = Preview['first'][number];
type Outcome = z.infer<typeof generateLocations.output>;

const capacity = z.number().nullable();

/**
 * La génération se saisit segment par segment ; le geste reçoit des bornes en capitales, des exclusions
 * découpées aux virgules, et un quai seulement pour un emplacement de quai. Le schéma du contrat valide
 * ce qui en résulte.
 */
const generatorForm = {
  input: z
    .object({
      zoneId: z.string(),
      ranges: z.array(z.object({ from: z.string(), to: z.string(), step: z.number().nullable() })),
      exclusions: z.string(),
      characteristics: z.object({
        type: locationTypeSchema,
        dockId: z.string().nullable(),
        maxWeightGrams: capacity,
        maxVolumeCm3: capacity,
        supportCapacity: capacity,
      }),
    })
    .transform(({ zoneId, ranges, exclusions, characteristics }): z.input<typeof layoutGenerationSchema> => ({
      zoneId,
      ranges: ranges.map((range) => ({
        from: range.from.trim().toUpperCase(),
        to: range.to.trim().toUpperCase(),
        step: range.step ?? 0,
      })),
      exclusions: exclusions
        .split(',')
        .map((exclusion) => exclusion.trim())
        .filter((exclusion) => exclusion !== ''),
      characteristics: {
        ...characteristics,
        dockId: isDocked(characteristics.type) ? characteristics.dockId : null,
      },
    }))
    .pipe(layoutGenerationSchema),
};

/**
 * Générateur de plan (RG-EMP-018 à 022 ; 0.3 § 6, « Générer une zone de racking », étapes 3 à 7) :
 * bornes et pas par segment, exclusions, caractéristiques communes. L'aperçu précède toute création :
 * « Générer » ne s'ouvre qu'après l'aperçu de la saisie en cours, sans problème et non vide (RG-EMP-019).
 */
export function GeneratorTab({ zone }: { zone: ZoneLayout }) {
  const { t } = useTranslation();
  if (zone.purpose === 'virtual')
    return (
      <Panel title={t('zone.generator')}>
        <Banner tone="info">{t('zone.generatorVirtual')}</Banner>
      </Panel>
    );
  if (zone.addressPattern === null)
    return (
      <Panel title={t('zone.generator')}>
        <Banner tone="info">{t('zone.generatorNeedsPattern')}</Banner>
      </Panel>
    );
  return <GeneratorForm zone={zone} pattern={zone.addressPattern} />;
}

function GeneratorForm({ zone, pattern }: { zone: ZoneLayout; pattern: readonly AddressSegment[] }) {
  const { t } = useTranslation();
  const gesture = useGesture();
  const queryClient = useQueryClient();
  const [preview, setPreview] = useState<{ readonly key: string; readonly result: Preview }>();
  const [outcome, setOutcome] = useState<Outcome>();
  const form = useGestureForm(generatorForm, {
    zoneId: zone.id,
    ranges: pattern.map(() => ({ from: '', to: '', step: 1 })),
    exclusions: '',
    characteristics: {
      type: typeForPurpose[zone.purpose],
      dockId: null,
      maxWeightGrams: null,
      maxVolumeCm3: null,
      supportCapacity: null,
    },
  });
  const values = useWatch({ control: form.control });
  const current = generatorForm.input.safeParse(values);
  const currentKey = current.success ? JSON.stringify(current.data) : undefined;
  const type = values.characteristics?.type;
  const upToDate = preview !== undefined && preview.key === currentKey;
  const canGenerate = upToDate && preview.result.problem === null && preview.result.count > 0;
  // En permanence, le nombre d'emplacements que décrivent les bornes (0.3 § 6, étape 3) ; l'aperçu
  // donne ensuite le décompte exact, exclusions et collisions déduites.
  const described = current.success ? describedCount(pattern, current.data.ranges) : undefined;

  const runPreview = form.handleSubmit(async (input: LayoutGeneration) => {
    setOutcome(undefined);
    const result = await queryClient.query({ ...contractQuery(previewLayout, input), staleTime: 0 });
    setPreview({ key: JSON.stringify(input), result });
  });
  const submit = form.handleSubmit(async (input) => {
    const generated = await gesture.run(generateLocations, input);
    if (generated !== undefined) {
      setOutcome(generated);
      setPreview(undefined);
    }
  });

  const capacityField = (name: 'maxWeightGrams' | 'maxVolumeCm3' | 'supportCapacity', label: string) => (
    <Controller
      control={form.control}
      name={`characteristics.${name}`}
      render={({ field }) => <NumberField label={label} {...valueField(field)} minValue={1} />}
    />
  );

  return (
    <>
      <RefusalBanner refusal={gesture.refusal} onDismiss={gesture.dismiss} />
      {outcome === undefined ? null : (
        <Banner
          tone="ok"
          dismissLabel={t('shell.dismiss')}
          onDismiss={() => {
            setOutcome(undefined);
          }}
        >
          {t('zone.generated', { count: outcome.created })}
          {outcome.collisionCount > 0
            ? ` ${t('zone.collisions', { count: outcome.collisionCount, list: outcome.collisions.join(', ') })}`
            : ''}
        </Banner>
      )}
      <Panel title={t('zone.generator')}>
        <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
          {pattern.map((segment, index) => {
            const name = { segment: segment.name };
            return (
              <div key={`${String(index)}${segment.name}`} className="grid grid-cols-3 items-end gap-3">
                <Controller
                  control={form.control}
                  name={`ranges.${index}.from`}
                  render={({ field }) => (
                    <TextField label={t('zone.rangeFrom', name)} {...textField(field)} code />
                  )}
                />
                <Controller
                  control={form.control}
                  name={`ranges.${index}.to`}
                  render={({ field }) => (
                    <TextField label={t('zone.rangeTo', name)} {...textField(field)} code />
                  )}
                />
                <Controller
                  control={form.control}
                  name={`ranges.${index}.step`}
                  render={({ field }) => (
                    <NumberField label={t('zone.rangeStep', name)} {...valueField(field)} minValue={1} />
                  )}
                />
              </div>
            );
          })}
          <div className="grid gap-1-5">
            <Controller
              control={form.control}
              name="exclusions"
              render={({ field }) => <TextField label={t('zone.exclusions')} {...textField(field)} code />}
            />
            <span>{t('zone.exclusionsHint')}</span>
          </div>
          <div className="grid grid-cols-3 items-end gap-3">
            <Controller
              control={form.control}
              name="characteristics.type"
              render={({ field }) => (
                <Select
                  label={t('zone.type')}
                  placeholder={t('zone.choose')}
                  options={physicalTypes.map((option) => ({
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
            {type !== undefined && isDocked(type) ? (
              <Controller
                control={form.control}
                name="characteristics.dockId"
                render={({ field }) => (
                  <Select
                    label={t('zone.dock')}
                    placeholder={t('zone.choose')}
                    options={zone.docks
                      .filter((dock) => dock.active)
                      .map((dock) => ({ id: dock.id, label: dock.code }))}
                    {...valueField(field)}
                  />
                )}
              />
            ) : null}
            {capacityField('maxWeightGrams', t('zone.maxWeight'))}
            {capacityField('maxVolumeCm3', t('zone.maxVolume'))}
            {capacityField('supportCapacity', t('zone.supportCapacity'))}
          </div>
          <div className="flex items-center justify-end gap-2">
            {described === undefined ? null : (
              <StatusBadge tone="info">{t('zone.describedCount', { count: described })}</StatusBadge>
            )}
            <Button isDisabled={!form.formState.isValid} onPress={() => void runPreview()}>
              {t('zone.preview')}
            </Button>
            <Button type="submit" variant="primary" isDisabled={!canGenerate || gesture.sending}>
              {t('zone.generate')}
            </Button>
          </div>
        </form>
      </Panel>
      {preview === undefined ? null : <PreviewPanel result={preview.result} outdated={!upToDate} />}
    </>
  );
}

/** Aperçu (0.3 § 6, étape 6) : décompte, collisions, dix premières et dix dernières adresses. */
function PreviewPanel({ result, outdated }: { result: Preview; outdated: boolean }) {
  const { t } = useTranslation();
  const shown = new Set(result.first.map((entry) => entry.address));
  const last = result.last.filter((entry) => !shown.has(entry.address));
  const columns: readonly DataColumn<Generated>[] = [
    {
      id: 'rank',
      header: t('zone.rank'),
      size: 'number',
      numeric: true,
      cell: (entry) => entry.traversalRank,
    },
    { id: 'address', header: t('zone.address'), size: 'text', code: true, cell: (entry) => entry.address },
  ];
  return (
    <Panel
      title={t('zone.previewTitle')}
      meta={result.problem === null ? t('zone.previewCount', { count: result.count }) : undefined}
    >
      {outdated ? <Banner tone="warn">{t('zone.previewOutdated')}</Banner> : null}
      {result.problem === null ? (
        <>
          {result.count === 0 ? <Banner tone="warn">{t('zone.previewEmpty')}</Banner> : null}
          <span>{t('zone.previewExcluded', { count: result.excludedCount })}</span>
          <Banner tone={result.collisionCount > 0 ? 'warn' : 'info'}>
            {result.collisionCount > 0
              ? t('zone.collisions', { count: result.collisionCount, list: result.collisions.join(', ') })
              : t('zone.noCollision')}
          </Banner>
          <div className="grid grid-cols-2 items-start gap-4">
            <SampleTable label={t('zone.firstAddresses')} rows={result.first} columns={columns} />
            {last.length > 0 ? (
              <SampleTable label={t('zone.lastAddresses')} rows={last} columns={columns} />
            ) : null}
          </div>
        </>
      ) : (
        <Banner tone="bad">{t(`refusal.${result.problem}`)}</Banner>
      )}
    </Panel>
  );
}

function SampleTable({
  label,
  rows,
  columns,
}: {
  label: string;
  rows: readonly Generated[];
  columns: readonly DataColumn<Generated>[];
}) {
  const { t } = useTranslation();
  return (
    <div className="grid gap-2">
      <span>{label}</span>
      <DataTable<Generated>
        label={label}
        rows={rows}
        rowKey={(entry) => entry.address}
        empty={t('zone.previewEmpty')}
        columns={columns}
      />
    </div>
  );
}
