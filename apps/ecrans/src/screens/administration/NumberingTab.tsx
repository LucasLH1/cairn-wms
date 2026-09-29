import {
  listNumberingSchemes,
  numberingProblems,
  saveNumberingScheme,
  type NumberingSegment,
} from '@cairn/contrat';
import { fr } from '@cairn/libelles';
import { Banner, Button, NumberField, Panel, Select, TextField } from '@cairn/ui';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const [segments, setSegments] = useState<readonly NumberingSegment[]>(props.initial);
  const gesture = useGesture();
  const problems = numberingProblems(segments, props.others);
  const replace = (index: number, segment: NumberingSegment) => {
    setSegments(segments.map((current, position) => (position === index ? segment : current)));
  };
  return (
    <>
      <RefusalBanner refusal={gesture.refusal} onDismiss={gesture.dismiss} />
      <Panel title={props.title} meta={`${t('numbering.example')} : ${example(segments)}`}>
        {segments.map((segment, index) => (
          <div key={index} className="grid grid-cols-(--cairn-line-columns) items-end gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Select
                label={`${t('numbering.segment')} ${String(index + 1)}`}
                placeholder={t('expectedReceipt.choose')}
                options={kinds.map((kind) => ({ id: kind, label: t(`numbering.kinds.${kind}`) }))}
                value={segment.kind}
                onChange={(kind) => {
                  const next = kinds.find((candidate) => candidate === kind);
                  if (next !== undefined) replace(index, segmentOf(next));
                }}
              />
              {segment.kind === 'literal' ? (
                <TextField
                  label={t('numbering.value')}
                  value={segment.value}
                  onChange={(value) => {
                    replace(index, { kind: 'literal', value });
                  }}
                  code
                />
              ) : null}
            </div>
            {segment.kind === 'counter' ? (
              <NumberField
                label={t('numbering.width')}
                value={segment.width}
                minValue={1}
                onChange={(width) => {
                  replace(index, { kind: 'counter', width: Math.min(Math.max(width ?? 1, 1), 12) });
                }}
              />
            ) : (
              <span />
            )}
            <Button
              isDisabled={segments.length <= 2}
              onPress={() => {
                setSegments(segments.filter((_, position) => position !== index));
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
              setSegments([...segments, segmentOf('literal')]);
            }}
          >
            {t('numbering.addSegment')}
          </Button>
          <Button
            variant="primary"
            isDisabled={problems.length > 0 || gesture.sending}
            onPress={() =>
              void gesture.run(saveNumberingScheme, { objectType: props.objectType, segments: [...segments] })
            }
          >
            {t('common.save')}
          </Button>
        </div>
      </Panel>
    </>
  );
}
