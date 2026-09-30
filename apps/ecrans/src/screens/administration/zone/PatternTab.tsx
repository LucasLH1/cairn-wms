import {
  addressSegmentSchema,
  pickModeSchema,
  sampleAddress,
  saveZoneLayout,
  traversalSchema,
  type AddressSegment,
  type ZoneLayout,
} from '@cairn/contrat';
import { Banner, Button, NumberField, Panel, Select, TextField } from '@cairn/ui';
import { Controller, useFieldArray, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { textField, useGestureForm, valueField } from '../../../contract/form.js';
import { RefusalBanner } from '../../../contract/RefusalBanner.js';
import { useGesture } from '../../../contract/useGesture.js';

const formatSchema = addressSegmentSchema.shape.format;
const formats = formatSchema.options;
const MAX_SEGMENTS = 6;
const MAX_LENGTH = 10;

/**
 * Masque d'adressage, sens de circulation et mode de prélèvement (RG-EMP-009 à 012, 016, 032 ; 0.3 § 6,
 * « Générer une zone de racking », étape 2). Un exemple d'adresse se construit sous les champs à la
 * saisie. Dès que la zone porte des emplacements, segments et séparateur ne changent plus (RG-EMP-012).
 */
export function PatternTab({ zone }: { zone: ZoneLayout }) {
  const { t } = useTranslation();
  const gesture = useGesture();
  const locked = zone.locationCount > 0;
  const form = useGestureForm(saveZoneLayout, {
    zoneId: zone.id,
    addressPattern: zone.addressPattern ?? [{ name: '', format: 'numeric', length: 2 }],
    addressSeparator: zone.addressSeparator,
    traversal: zone.traversal,
    pickMode: zone.pickMode,
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'addressPattern' });
  const [segments, separator] = useWatch({
    control: form.control,
    name: ['addressPattern', 'addressSeparator'],
  });
  // L'exemple suit la saisie, bornée à ce que le contrat admet : une longueur en cours de frappe ne
  // l'étire pas au-delà.
  const sample = sampleAddress(
    segments.map((segment): AddressSegment => ({
      name: segment.name,
      format: formatSchema.safeParse(segment.format).data ?? 'numeric',
      length: Math.min(Math.max(segment.length || 1, 1), MAX_LENGTH),
    })),
    separator,
  );
  const submit = form.handleSubmit((input) => gesture.run(saveZoneLayout, input));
  return (
    <>
      <RefusalBanner refusal={gesture.refusal} onDismiss={gesture.dismiss} />
      <Panel title={t('zone.pattern')} meta={zone.addressPattern === null ? t('zone.noPattern') : undefined}>
        <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
          {locked ? <Banner tone="info">{t('zone.patternLocked')}</Banner> : null}
          {fields.map((row, index) => {
            const rank = { rank: index + 1 };
            return (
              <div key={row.id} className="grid grid-cols-4 items-end gap-3">
                <Controller
                  control={form.control}
                  name={`addressPattern.${index}.name`}
                  render={({ field }) => (
                    <TextField
                      label={t('zone.segmentName', rank)}
                      {...textField(field)}
                      isDisabled={locked}
                    />
                  )}
                />
                <Controller
                  control={form.control}
                  name={`addressPattern.${index}.format`}
                  render={({ field }) => (
                    <Select
                      label={t('zone.segmentFormat', rank)}
                      placeholder={t('zone.choose')}
                      isDisabled={locked}
                      options={formats.map((format) => ({ id: format, label: t(`segmentFormat.${format}`) }))}
                      value={field.value}
                      onChange={(value) => {
                        field.onChange(formatSchema.safeParse(value).data ?? field.value);
                      }}
                    />
                  )}
                />
                <Controller
                  control={form.control}
                  name={`addressPattern.${index}.length`}
                  render={({ field }) => (
                    <NumberField
                      label={t('zone.segmentLength', rank)}
                      {...valueField(field)}
                      minValue={1}
                      isDisabled={locked}
                    />
                  )}
                />
                <div className="flex">
                  <Button
                    isDisabled={locked || fields.length === 1}
                    onPress={() => {
                      remove(index);
                    }}
                  >
                    {t('common.remove')}
                  </Button>
                </div>
              </div>
            );
          })}
          <div className="grid grid-cols-4 items-end gap-3">
            <Controller
              control={form.control}
              name="addressSeparator"
              render={({ field }) => (
                <TextField label={t('zone.separator')} {...textField(field)} isDisabled={locked} code />
              )}
            />
            <Controller
              control={form.control}
              name="traversal"
              render={({ field }) => (
                <Select
                  label={t('zone.traversal')}
                  placeholder={t('zone.choose')}
                  options={traversalSchema.options.map((traversal) => ({
                    id: traversal,
                    label: t(`traversal.${traversal}`),
                  }))}
                  value={field.value}
                  onChange={(value) => {
                    field.onChange(traversalSchema.safeParse(value).data ?? field.value);
                  }}
                />
              )}
            />
            <Controller
              control={form.control}
              name="pickMode"
              render={({ field }) => (
                <Select
                  label={t('zone.pickMode')}
                  placeholder={t('zone.choose')}
                  options={pickModeSchema.options.map((mode) => ({ id: mode, label: t(`pickMode.${mode}`) }))}
                  value={field.value}
                  onChange={(value) => {
                    field.onChange(pickModeSchema.safeParse(value).data ?? field.value);
                  }}
                />
              )}
            />
            <TextField label={t('zone.sampleAddress')} value={sample} isReadOnly code />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              isDisabled={locked || fields.length >= MAX_SEGMENTS}
              onPress={() => {
                append({ name: '', format: 'numeric', length: 2 });
              }}
            >
              {t('zone.addSegment')}
            </Button>
            <Button type="submit" variant="primary" isDisabled={!form.formState.isValid || gesture.sending}>
              {t('common.save')}
            </Button>
          </div>
        </form>
      </Panel>
    </>
  );
}
