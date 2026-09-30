import {
  listNumberingSchemes,
  numberingProblems,
  saveNumberingScheme,
  type NumberingSegment,
} from '@cairn/contrat';
import { fr } from '@cairn/libelles';
import { Banner, Button, NumberField, Panel, Select, TextField } from '@cairn/ui';
import { useQuery } from '@tanstack/react-query';
import { Controller, useFieldArray } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { textField, useGestureForm } from '../../contract/form.js';
import { contractQuery } from '../../contract/query.js';
import { RefusalBanner } from '../../contract/RefusalBanner.js';
import { useGesture } from '../../contract/useGesture.js';

type Kind = NumberingSegment['kind'];
const kinds: readonly Kind[] = ['literal', 'site', 'principal', 'year', 'month', 'counter'];

const objectTypeLabel = (objectType: string): objectType is keyof typeof fr.numbering.objectTypes =>
  Object.hasOwn(fr.numbering.objectTypes, objectType);

/** Un exemple d'identifiant, pour voir la composition avant de l'enregistrer. */
function example(segments: readonly NumberingSegment[]): string {
  const now = new Date();
  return segments
    .map((segment) => {
      switch (segment.kind) {
        case 'literal':
          return segment.value;
        case 'site':
          return 'A';
        case 'principal':
          return 'MD';
        case 'year':
          return String(now.getFullYear());
        case 'month':
          return String(now.getMonth() + 1).padStart(2, '0');
        case 'counter':
          return '1'.padStart(segment.width, '0');
      }
    })
    .join('');
}

function segmentOf(kind: Kind): NumberingSegment {
  switch (kind) {
    case 'literal':
      return { kind, value: '-' };
    case 'counter':
      return { kind, width: 4 };
    case 'site':
    case 'principal':
    case 'year':
    case 'month':
      return { kind };
  }
}

/** Schémas de numérotation (RG-ORG-025 à 030) : composer les segments d'un type d'objet. */
export function NumberingTab() {
  const { t } = useTranslation();
  const { data } = useQuery(contractQuery(listNumberingSchemes, {}));
  return (
    <>
      {(data?.schemes ?? []).map((scheme) => (
        <SchemeEditor
          key={scheme.objectType}
          objectType={scheme.objectType}
          initial={scheme.segments}
          others={(data?.schemes ?? [])
            .filter((other) => other.objectType !== scheme.objectType)
            .flatMap((other) => (other.segments[0]?.kind === 'literal' ? [other.segments[0].value] : []))}
          title={
            objectTypeLabel(scheme.objectType)
              ? t(`numbering.objectTypes.${scheme.objectType}`)
              : scheme.objectType
          }
        />
      ))}
    </>
  );
}

function SchemeEditor(props: {
  objectType: string;
  initial: readonly NumberingSegment[];
  others: readonly string[];
  title: string;
}) {
  const { t } = useTranslation();
  const gesture = useGesture();
  const form = useGestureForm(saveNumberingScheme, {
    objectType: props.objectType,
    segments: [...props.initial],
  });
  const { fields, append, remove, update } = useFieldArray({ control: form.control, name: 'segments' });
  const segments = form.watch('segments');
  const problems = numberingProblems(segments, props.others);
  const submit = form.handleSubmit((input) => gesture.run(saveNumberingScheme, input));
  return (
    <>
      <RefusalBanner refusal={gesture.refusal} onDismiss={gesture.dismiss} />
      <Panel title={props.title} meta={`${t('numbering.example')} : ${example(segments)}`}>
        <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
          {fields.map((segment, index) => (
            <div key={segment.id} className="grid grid-cols-(--cairn-line-columns) items-end gap-3">
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label={`${t('numbering.segment')} ${String(index + 1)}`}
                  placeholder={t('expectedReceipt.choose')}
                  options={kinds.map((kind) => ({ id: kind, label: t(`numbering.kinds.${kind}`) }))}
                  value={segment.kind}
                  onChange={(kind) => {
                    const next = kinds.find((candidate) => candidate === kind);
                    if (next !== undefined) update(index, segmentOf(next));
                  }}
                />
                {segment.kind === 'literal' ? (
                  <Controller
                    control={form.control}
                    name={`segments.${index}.value`}
                    render={({ field }) => (
                      <TextField label={t('numbering.value')} {...textField(field)} code />
                    )}
                  />
                ) : null}
              </div>
              {segment.kind === 'counter' ? (
                <Controller
                  control={form.control}
                  name={`segments.${index}.width`}
                  render={({ field }) => (
                    <NumberField
                      label={t('numbering.width')}
                      value={field.value}
                      minValue={1}
                      onChange={(width) => {
                        field.onChange(Math.min(Math.max(width ?? 1, 1), 12));
                      }}
                    />
                  )}
                />
              ) : (
                <span />
              )}
              <Button
                isDisabled={fields.length <= 2}
                onPress={() => {
                  remove(index);
                }}
              >
                {t('common.remove')}
              </Button>
            </div>
          ))}
          {problems.length === 0 ? null : (
            <Banner tone="warn">
              {problems.map((problem) => t(`numbering.problems.${problem}`)).join(' ')}
            </Banner>
          )}
          <div className="flex justify-end gap-2">
            <Button
              onPress={() => {
                append(segmentOf('literal'));
              }}
            >
              {t('numbering.addSegment')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              isDisabled={!form.formState.isValid || problems.length > 0 || gesture.sending}
            >
              {t('common.save')}
            </Button>
          </div>
        </form>
      </Panel>
    </>
  );
}
