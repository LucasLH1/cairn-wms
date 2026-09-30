import {
  addItemBarcode,
  adrPackingGroupSchema,
  barcodeNatureSchema,
  baseUnitsPerLevel,
  changeItemState,
  getItem,
  isCompletePackagingLevel,
  listCustomFields,
  listItemFamilies,
  saveItem,
  saveItemCustomValues,
  saveItemPackaging,
  searchItems,
  setItemBarcodeActive,
  setItemComposition,
  setItemDeclaredValue,
  setItemReplacements,
  trackingModeSchema,
  type BarcodeNature,
  type Component,
  type CompositionKind,
  type CustomField,
  type CustomValue,
  type ItemBarcode,
  type ItemDetail,
  type PackagingLevel,
  type TrackingMode,
} from '@cairn/contrat';
import {
  Banner,
  Button,
  ChipGroup,
  DataTable,
  DateField,
  Disclosure,
  NumberField,
  Panel,
  Select,
  StatusBadge,
  TextField,
} from '@cairn/ui';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { contractQuery } from '../../contract/query.js';
import { RefusalBanner } from '../../contract/RefusalBanner.js';
import { useGesture } from '../../contract/useGesture.js';
import { useHasPermission } from '../../shell/site.js';
import { useChangeSignal } from '../../signals/useChangeSignal.js';
import { formatDate } from '../format.js';
import { StateBadge } from './StateBadge.js';

const NONE = 'none';

/** Création d'une référence (0.2 § 6, « Créer une référence ») : l'identité d'abord, en brouillon. */
export function NewItemScreen() {
  const { principalId } = useSearch({ from: '/shell/items/new' });
  return <IdentityPanel principalId={principalId} item={undefined} />;
}

/** Fiche d'une référence : chaque section du parcours du gestionnaire, dans son ordre (0.2 § 6). */
export function ItemScreen() {
  const { itemId } = useParams({ from: '/shell/items/$itemId' });
  const query = contractQuery(getItem, { itemId });
  const { data } = useQuery(query);
  useChangeSignal('Item', itemId, query.queryKey);
  const canManage = useHasPermission('manageItems');
  if (data === undefined) return null;
  const item = data.item;
  return (
    <>
      <IdentityPanel
        key={JSON.stringify([
          item.code,
          item.shortLabel,
          item.longLabel,
          item.familyId,
          item.trackingMode,
          item.serialBatchTracking,
          item.tracksExpiryDate,
          item.tracksManufacturingDate,
          item.isKit,
          item.adr,
        ])}
        principalId={item.principalId}
        item={item}
      />
      {canManage ? <StatePanel item={item} /> : null}
      <PackagingPanel key={JSON.stringify(item.packagingLevels)} item={item} />
      <BarcodesPanel item={item} />
      <CustomValuesPanel key={JSON.stringify(item.customValues)} item={item} />
      <ValuePanel key={String(item.declaredValueCents)} item={item} />
      {item.isKit ? (
        <CompositionPanel key={`kit${JSON.stringify(item.kitComponents)}`} item={item} kind="kit" />
      ) : (
        <CompositionPanel
          key={`bom${JSON.stringify(item.repairBomComponents)}`}
          item={item}
          kind="repairBom"
        />
      )}
      <ReplacementsPanel item={item} />
    </>
  );
}

/**
 * Identité, axe de gestion, dates, ADR (0.2 § 6, étapes 2, 3 et 7). Le donneur d'ordre ne change plus
 * après l'enregistrement (RG-REF-001) ; l'axe se fige au premier mouvement (RG-REF-013).
 */
function IdentityPanel({ principalId, item }: { principalId: string; item: ItemDetail | undefined }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const gesture = useGesture();
  const { data: families } = useQuery(contractQuery(listItemFamilies, { principalId }));
  const [code, setCode] = useState(item?.code ?? '');
  const [shortLabel, setShortLabel] = useState(item?.shortLabel ?? '');
  const [longLabel, setLongLabel] = useState(item?.longLabel ?? '');
  const [familyId, setFamilyId] = useState<string | null>(item?.familyId ?? null);
  const [trackingMode, setTrackingMode] = useState<TrackingMode>(item?.trackingMode ?? 'quantity');
  const [options, setOptions] = useState<string[]>(
    [
      item?.serialBatchTracking === true ? 'serialBatchTracking' : '',
      item?.tracksExpiryDate === true ? 'tracksExpiryDate' : '',
      item?.tracksManufacturingDate === true ? 'tracksManufacturingDate' : '',
      item?.isKit === true ? 'isKit' : '',
    ].filter((option) => option !== ''),
  );
  const [dangerous, setDangerous] = useState(item?.adr != null);
  const [adrClass, setAdrClass] = useState(item?.adr?.adrClass ?? '');
  const [unNumber, setUnNumber] = useState(item?.adr?.unNumber ?? '');
  const [packingGroup, setPackingGroup] = useState<string>(item?.adr?.packingGroup ?? NONE);
  const has = (option: string) => options.includes(option);
  const locked = item?.trackingModeLocked ?? false;

  const save = async () => {
    const saved = await gesture.run(saveItem, {
      itemId: item?.id ?? null,
      principalId,
      code,
      shortLabel,
      longLabel: longLabel.trim() === '' ? null : longLabel,
      familyId,
      trackingMode,
      serialBatchTracking: trackingMode === 'serial' && has('serialBatchTracking'),
      tracksExpiryDate: has('tracksExpiryDate'),
      tracksManufacturingDate: has('tracksManufacturingDate'),
      adr: dangerous
        ? { adrClass, unNumber, packingGroup: adrPackingGroupSchema.safeParse(packingGroup).data ?? null }
        : null,
      isKit: has('isKit'),
    });
    if (saved !== undefined && item === undefined)
      await navigate({ to: '/items/$itemId', params: { itemId: saved.itemId } });
  };

  return (
    <>
      <RefusalBanner refusal={gesture.refusal} onDismiss={gesture.dismiss} />
      <Panel
        title={item === undefined ? t('item.newTitle') : `${item.code} · ${item.shortLabel}`}
        meta={item === undefined ? undefined : `${item.principalCode} · ${t('item.principalLocked')}`}
        actions={item === undefined ? undefined : <StateBadge state={item.state} />}
      >
        <div className="grid grid-cols-3 gap-4">
          <TextField label={t('item.code')} value={code} onChange={setCode} code />
          <TextField label={t('item.shortLabel')} value={shortLabel} onChange={setShortLabel} />
          <Select
            label={t('item.family')}
            placeholder={t('item.noFamily')}
            options={[
              { id: NONE, label: t('item.noFamily') },
              ...(families?.families ?? [])
                .filter((family) => family.active || family.id === familyId)
                .map((family) => ({ id: family.id, label: `${family.code} · ${family.name}` })),
            ]}
            value={familyId ?? NONE}
            onChange={(value) => {
              setFamilyId(value === NONE ? null : value);
            }}
          />
        </div>
        <TextField label={t('item.longLabel')} value={longLabel} onChange={setLongLabel} />
        <div className="grid grid-cols-3 gap-4">
          <Select
            label={t('item.trackingMode')}
            placeholder={t('item.choose')}
            isDisabled={locked}
            options={trackingModeSchema.options.map((option) => ({
              id: option,
              label: t(`item.trackingModes.${option}`),
            }))}
            value={trackingMode}
            onChange={(value) => {
              setTrackingMode(trackingModeSchema.safeParse(value).data ?? trackingMode);
            }}
          />
          <ChipGroup
            label={t('item.dates')}
            options={[
              { id: 'tracksExpiryDate', label: t('item.tracksExpiryDate') },
              { id: 'tracksManufacturingDate', label: t('item.tracksManufacturingDate') },
            ]}
            value={options}
            onChange={setOptions}
          />
          <ChipGroup
            label={t('item.kind')}
            options={[
              { id: 'isKit', label: t('item.isKit') },
              // Le suivi par lot n'est proposé qu'en gestion série (0.2 § 6, étape 3).
              ...(trackingMode === 'serial'
                ? [{ id: 'serialBatchTracking', label: t('item.serialBatchTracking') }]
                : []),
            ]}
            value={options}
            onChange={setOptions}
          />
        </div>
        <Banner tone={locked ? 'info' : 'warn'}>
          {locked ? t('item.trackingLocked') : t('item.trackingWarning')}
        </Banner>
        {/* Replié par défaut, ouvert si la référence est déclarée dangereuse (0.2 § 6, étape 7). */}
        <Disclosure title={t('item.adr')} defaultExpanded={item?.adr != null}>
          <span>{t('item.adrHint')}</span>
          <ChipGroup
            label={t('item.dangerous')}
            options={[{ id: 'dangerous', label: t('item.dangerous') }]}
            value={dangerous ? ['dangerous'] : []}
            onChange={(value) => {
              setDangerous(value.includes('dangerous'));
            }}
          />
          {dangerous ? (
            <div className="grid grid-cols-3 gap-4">
              <TextField label={t('item.adrClass')} value={adrClass} onChange={setAdrClass} code />
              <TextField label={t('item.unNumber')} value={unNumber} onChange={setUnNumber} code />
              <Select
                label={t('item.packingGroup')}
                placeholder={t('item.noPackingGroup')}
                options={[
                  { id: NONE, label: t('item.noPackingGroup') },
                  ...adrPackingGroupSchema.options.map((group) => ({ id: group, label: group })),
                ]}
                value={packingGroup}
                onChange={(value) => {
                  setPackingGroup(value ?? NONE);
                }}
              />
            </div>
          ) : null}
        </Disclosure>
        <div className="flex justify-end">
          <Button
            variant="primary"
            isDisabled={
              code.trim() === '' ||
              shortLabel.trim() === '' ||
              (dangerous && (adrClass.trim() === '' || !/^\d{4}$/u.test(unNumber))) ||
              gesture.sending
            }
            onPress={() => void save()}
          >
            {item === undefined ? t('common.create') : t('common.save')}
          </Button>
        </div>
      </Panel>
    </>
  );
}

/** État et activation : le bouton dit ce qui manque tant que RG-REF-040 n'est pas rempli (0.2 § 6, étape 8). */
function StatePanel({ item }: { item: ItemDetail }) {
  const { t } = useTranslation();
  const gesture = useGesture();
  const [obsoleteStock, setObsoleteStock] = useState<number>();
  const change = async (state: 'active' | 'dormant' | 'obsolete') => {
    const changed = await gesture.run(changeItemState, { itemId: item.id, state });
    if (changed !== undefined && state === 'obsolete' && changed.stockQuantity > 0)
      setObsoleteStock(changed.stockQuantity);
  };
  return (
    <>
      <RefusalBanner refusal={gesture.refusal} onDismiss={gesture.dismiss} />
      {obsoleteStock === undefined ? null : (
        <Banner
          tone="warn"
          dismissLabel={t('shell.dismiss')}
          onDismiss={() => {
            setObsoleteStock(undefined);
          }}
        >
          {t('item.obsoleteWithStock', { count: obsoleteStock })}
        </Banner>
      )}
      <Panel title={t('item.activation')} actions={<StateBadge state={item.state} />}>
        {item.state === 'draft' && item.activationMissing.length > 0 ? (
          <span>
            {t('item.missingIntro', {
              list: item.activationMissing.map((missing) => t(`item.missing.${missing}`)).join(', '),
            })}
          </span>
        ) : null}
        <div className="flex gap-2">
          {item.state === 'draft' ? (
            <Button
              variant="primary"
              isDisabled={item.activationMissing.length > 0 || gesture.sending}
              onPress={() => void change('active')}
            >
              {t('item.activate')}
            </Button>
          ) : null}
          {item.state === 'dormant' || item.state === 'obsolete' ? (
            <Button onPress={() => void change('active')}>{t('item.reactivate')}</Button>
          ) : null}
          {item.state === 'active' ? (
            <Button onPress={() => void change('dormant')}>{t('item.toDormant')}</Button>
          ) : null}
          {item.state === 'active' || item.state === 'dormant' ? (
            <Button onPress={() => void change('obsolete')}>{t('item.toObsolete')}</Button>
          ) : null}
        </div>
      </Panel>
    </>
  );
}

const emptyLevel = (base: boolean): PackagingLevel => ({
  name: '',
  unitsOfLowerLevel: base ? null : 1,
  grossWeightGrams: null,
  lengthMm: null,
  widthMm: null,
  heightMm: null,
});

/**
 * Niveaux de conditionnement, de la base au plus haut (RG-REF-018 à 021). Le nombre d'unités de base du
 * niveau le plus haut reste affiché, pour qu'une erreur de coefficient se voie (0.2 § 6, étape 4).
 */
function PackagingPanel({ item }: { item: ItemDetail }) {
  const { t } = useTranslation();
  const gesture = useGesture();
  const [levels, setLevels] = useState<PackagingLevel[]>(
    item.packagingLevels.length === 0 ? [emptyLevel(true)] : item.packagingLevels,
  );
  const update = (rank: number, change: Partial<PackagingLevel>) => {
    setLevels(levels.map((level, index) => (index === rank ? { ...level, ...change } : level)));
  };
  const top = baseUnitsPerLevel(levels).at(-1) ?? 1;
  return (
    <>
      <RefusalBanner refusal={gesture.refusal} onDismiss={gesture.dismiss} />
      <Panel title={t('item.packaging')} meta={t('item.topLevelUnits', { count: top })}>
        {levels.map((level, rank) => (
          <div key={rank} className="grid grid-cols-4 items-end gap-3">
            <TextField
              label={rank === 0 ? t('item.baseLevel') : t('item.levelName')}
              value={level.name}
              onChange={(name) => {
                update(rank, { name });
              }}
            />
            {rank === 0 ? (
              <span />
            ) : (
              <NumberField
                label={t('item.unitsOfLowerLevel')}
                value={level.unitsOfLowerLevel}
                minValue={1}
                onChange={(unitsOfLowerLevel) => {
                  update(rank, { unitsOfLowerLevel });
                }}
              />
            )}
            <NumberField
              label={t('item.grossWeight')}
              value={level.grossWeightGrams}
              minValue={1}
              onChange={(grossWeightGrams) => {
                update(rank, { grossWeightGrams });
              }}
            />
            <div className="flex items-center pb-2-5">
              <StatusBadge tone={isCompletePackagingLevel(level) ? 'ok' : 'warn'}>
                {isCompletePackagingLevel(level) ? t('item.complete') : t('item.incomplete')}
              </StatusBadge>
            </div>
            <NumberField
              label={t('item.length')}
              value={level.lengthMm}
              minValue={1}
              onChange={(lengthMm) => {
                update(rank, { lengthMm });
              }}
            />
            <NumberField
              label={t('item.width')}
              value={level.widthMm}
              minValue={1}
              onChange={(widthMm) => {
                update(rank, { widthMm });
              }}
            />
            <NumberField
              label={t('item.height')}
              value={level.heightMm}
              minValue={1}
              onChange={(heightMm) => {
                update(rank, { heightMm });
              }}
            />
          </div>
        ))}
        <div className="flex justify-end gap-2">
          <Button
            onPress={() => {
              setLevels([...levels, emptyLevel(false)]);
            }}
          >
            {t('item.addLevel')}
          </Button>
          {levels.length > 1 ? (
            <Button
              onPress={() => {
                setLevels(levels.slice(0, -1));
              }}
            >
              {t('item.removeLevel')}
            </Button>
          ) : null}
          <Button
            variant="primary"
            isDisabled={
              levels.some(
                (level, rank) => level.name.trim() === '' || (rank > 0 && level.unitsOfLowerLevel === null),
              ) || gesture.sending
            }
            onPress={() => void gesture.run(saveItemPackaging, { itemId: item.id, levels })}
          >
            {t('common.save')}
          </Button>
        </div>
      </Panel>
    </>
  );
}

/** Identifiants scannables : uniques chez le donneur d'ordre, désactivés, jamais supprimés (RG-REF-007 à 010). */
function BarcodesPanel({ item }: { item: ItemDetail }) {
  const { t } = useTranslation();
  const gesture = useGesture();
  const [code, setCode] = useState('');
  const [nature, setNature] = useState<BarcodeNature>('gtin');
  const [level, setLevel] = useState<string>(NONE);
  const levelName = (rank: number | null) =>
    rank === null ? t('item.wholeItem') : (item.packagingLevels[rank]?.name ?? String(rank));
  return (
    <>
      <RefusalBanner refusal={gesture.refusal} onDismiss={gesture.dismiss} />
      <Panel title={t('item.barcodes')}>
        <DataTable<ItemBarcode>
          label={t('item.barcodes')}
          rows={item.barcodes}
          rowKey={(barcode) => barcode.code}
          empty={t('item.noBarcode')}
          columns={[
            {
              id: 'code',
              header: t('item.barcode'),
              size: 'text',
              code: true,
              cell: (barcode) => barcode.code,
            },
            {
              id: 'nature',
              header: t('item.nature'),
              size: 'date',
              cell: (barcode) => t(`item.natures.${barcode.nature}`),
            },
            {
              id: 'level',
              header: t('item.onLevel'),
              size: 'date',
              cell: (barcode) => levelName(barcode.packagingRank),
            },
            {
              id: 'active',
              header: '',
              size: 'status',
              cell: (barcode) => (
                <div className="flex items-center gap-2">
                  <StatusBadge tone={barcode.active ? 'ok' : 'mute'}>
                    {barcode.active ? t('common.active') : t('common.inactive')}
                  </StatusBadge>
                  <Button
                    onPress={() =>
                      void gesture.run(setItemBarcodeActive, {
                        itemId: item.id,
                        code: barcode.code,
                        active: !barcode.active,
                      })
                    }
                  >
                    {barcode.active ? t('common.deactivate') : t('common.activate')}
                  </Button>
                </div>
              ),
            },
          ]}
        />
        <div className="grid grid-cols-(--cairn-line-columns) items-end gap-3">
          <TextField label={t('item.barcode')} value={code} onChange={setCode} code />
          <Select
            label={t('item.nature')}
            placeholder={t('item.choose')}
            options={barcodeNatureSchema.options.map((option) => ({
              id: option,
              label: t(`item.natures.${option}`),
            }))}
            value={nature}
            onChange={(value) => {
              setNature(barcodeNatureSchema.safeParse(value).data ?? nature);
            }}
          />
          <Button
            variant="primary"
            isDisabled={code.trim() === '' || gesture.sending}
            onPress={() =>
              void gesture
                .run(addItemBarcode, {
                  itemId: item.id,
                  code,
                  nature,
                  packagingRank: level === NONE ? null : Number(level),
                })
                .then((added) => {
                  if (added !== undefined) setCode('');
                })
            }
          >
            {t('item.addBarcode')}
          </Button>
        </div>
        {item.packagingLevels.length > 1 ? (
          <div className="grid grid-cols-3 gap-4">
            <Select
              label={t('item.onLevel')}
              placeholder={t('item.wholeItem')}
              options={[
                { id: NONE, label: t('item.wholeItem') },
                ...item.packagingLevels.map((packagingLevel, rank) => ({
                  id: String(rank),
                  label: packagingLevel.name,
                })),
              ]}
              value={level}
              onChange={(value) => {
                setLevel(value ?? NONE);
              }}
            />
          </div>
        ) : null}
      </Panel>
    </>
  );
}

/** Champs déclarés par le donneur d'ordre, les obligatoires signalés (0.2 § 6, étape 6). */
function CustomValuesPanel({ item }: { item: ItemDetail }) {
  const { t } = useTranslation();
  const gesture = useGesture();
  const { data } = useQuery(contractQuery(listCustomFields, { principalId: item.principalId }));
  const [values, setValues] = useState<Readonly<Record<string, CustomValue | null>>>(item.customValues);
  // Un champ désactivé reste lisible là où il est renseigné (RG-REF-037).
  const fields = (data?.fields ?? []).filter(
    (field) => field.active || item.customValues[field.id] !== undefined,
  );
  const set = (fieldId: string, value: CustomValue | null) => {
    setValues({ ...values, [fieldId]: value });
  };
  return (
    <>
      <RefusalBanner refusal={gesture.refusal} onDismiss={gesture.dismiss} />
      <Panel title={t('item.customValues')}>
        {fields.length === 0 ? <span>{t('item.noCustomFields')}</span> : null}
        <div className="grid grid-cols-3 gap-4">
          {fields.map((field) => (
            <CustomValueField
              key={field.id}
              field={field}
              value={values[field.id] ?? null}
              onChange={(value) => {
                set(field.id, value);
              }}
            />
          ))}
        </div>
        {fields.length === 0 ? null : (
          <div className="flex justify-end">
            <Button
              variant="primary"
              isDisabled={gesture.sending}
              onPress={() =>
                void gesture.run(saveItemCustomValues, {
                  itemId: item.id,
                  values: fields
                    .filter((field) => field.active)
                    .map((field) => ({ customFieldId: field.id, value: values[field.id] ?? null })),
                })
              }
            >
              {t('common.save')}
            </Button>
          </div>
        )}
      </Panel>
    </>
  );
}

function CustomValueField({
  field,
  value,
  onChange,
}: {
  field: CustomField;
  value: CustomValue | null;
  onChange: (value: CustomValue | null) => void;
}) {
  const { t } = useTranslation();
  const label = [
    field.label,
    field.required ? t('item.required') : '',
    field.active ? '' : t('item.inactiveField'),
  ]
    .filter((part) => part !== '')
    .join(' · ');
  switch (field.fieldType) {
    case 'number':
      return (
        <NumberField
          label={label}
          value={typeof value === 'number' ? value : null}
          minValue={Number.MIN_SAFE_INTEGER}
          onChange={onChange}
        />
      );
    case 'date':
      return (
        <DateField
          label={label}
          value={typeof value === 'string' && value !== '' ? value : null}
          onChange={onChange}
        />
      );
    case 'list':
      return (
        <Select
          label={label}
          placeholder={t('item.choose')}
          options={field.listValues.map((option) => ({ id: option, label: option }))}
          value={typeof value === 'string' ? value : null}
          onChange={onChange}
        />
      );
    case 'boolean':
      return (
        <ChipGroup
          label={label}
          options={[{ id: 'yes', label: t('common.yes') }]}
          value={value === true ? ['yes'] : []}
          onChange={(chosen) => {
            onChange(chosen.includes('yes'));
          }}
        />
      );
    case 'text':
      return (
        <TextField
          label={label}
          value={typeof value === 'string' ? value : ''}
          onChange={(text) => {
            onChange(text === '' ? null : text);
          }}
        />
      );
  }
}

/** Valeur déclarée, dans la devise du donneur d'ordre, et son historique (RG-REF-047 à 051). */
function ValuePanel({ item }: { item: ItemDetail }) {
  const { t, i18n } = useTranslation();
  const gesture = useGesture();
  const [cents, setCents] = useState<number | null>(item.declaredValueCents);
  const amount = (value: number | null, currency: string | null) =>
    value === null
      ? t('item.noValue')
      : new Intl.NumberFormat(i18n.language, { style: 'currency', currency: currency ?? 'XXX' }).format(
          value / 100,
        );
  return (
    <>
      <RefusalBanner refusal={gesture.refusal} onDismiss={gesture.dismiss} />
      <Panel title={t('item.value')} meta={amount(item.declaredValueCents, item.currency)}>
        {item.currency === null ? (
          <Banner tone="info">{t('item.noCurrency')}</Banner>
        ) : (
          <div className="grid grid-cols-(--cairn-line-columns) items-end gap-3">
            <NumberField
              label={t('item.valueAmount', { currency: item.currency })}
              value={cents}
              onChange={setCents}
            />
            <Button
              isDisabled={item.declaredValueCents === null || gesture.sending}
              onPress={() => void gesture.run(setItemDeclaredValue, { itemId: item.id, valueCents: null })}
            >
              {t('item.clearValue')}
            </Button>
            <Button
              variant="primary"
              isDisabled={cents === null || cents === item.declaredValueCents || gesture.sending}
              onPress={() => void gesture.run(setItemDeclaredValue, { itemId: item.id, valueCents: cents })}
            >
              {t('common.save')}
            </Button>
          </div>
        )}
        <DataTable<ItemDetail['declaredValueHistory'][number]>
          label={t('item.value')}
          rows={item.declaredValueHistory}
          rowKey={(entry) => entry.setAt}
          empty={t('item.noValue')}
          columns={[
            {
              id: 'setAt',
              header: t('item.setAt'),
              size: 'date',
              cell: (entry) => formatDate(entry.setAt.slice(0, 10), i18n.language),
            },
            {
              id: 'value',
              header: t('item.value'),
              size: 'text',
              cell: (entry) => amount(entry.valueCents, entry.currency),
            },
          ]}
        />
      </Panel>
    </>
  );
}

/** Autres références du donneur d'ordre, à proposer comme composant ou remplaçante. */
function useOtherItems(item: ItemDetail) {
  const { data } = useQuery(
    contractQuery(searchItems, {
      principalId: item.principalId,
      familyId: null,
      state: null,
      trackingMode: null,
      search: null,
      draftsOnly: false,
    }),
  );
  return (data?.items ?? []).filter((other) => other.id !== item.id);
}

/**
 * Composition d'un kit (RG-REF-024 à 027) ou nomenclature de réparation (RG-REF-028), jamais les deux
 * (RG-REF-030). La composition s'enregistre d'un bloc.
 */
function CompositionPanel({ item, kind }: { item: ItemDetail; kind: CompositionKind }) {
  const { t } = useTranslation();
  const gesture = useGesture();
  const others = useOtherItems(item);
  const [components, setComponents] = useState<Component[]>(
    kind === 'kit' ? item.kitComponents : item.repairBomComponents,
  );
  const [chosen, setChosen] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<number | null>(1);
  const add = () => {
    const other = others.find((candidate) => candidate.id === chosen);
    if (other === undefined || quantity === null) return;
    setComponents([
      ...components.filter((component) => component.itemId !== other.id),
      { itemId: other.id, code: other.code, shortLabel: other.shortLabel, state: other.state, quantity },
    ]);
    setChosen(null);
  };
  const title = kind === 'kit' ? t('item.kit') : t('item.repairBom');
  return (
    <>
      <RefusalBanner refusal={gesture.refusal} onDismiss={gesture.dismiss} />
      <Panel title={title} meta={kind === 'repairBom' ? t('item.repairBomHint') : undefined}>
        <DataTable<Component>
          label={title}
          rows={components}
          rowKey={(component) => component.itemId}
          empty={t('item.noComponent')}
          columns={[
            {
              id: 'code',
              header: t('item.component'),
              size: 'text',
              cell: (component) => `${component.code} · ${component.shortLabel}`,
            },
            {
              id: 'quantity',
              header: t('item.quantity'),
              size: 'number',
              numeric: true,
              cell: (component) => component.quantity,
            },
            {
              id: 'remove',
              header: '',
              size: 'status',
              cell: (component) => (
                <Button
                  onPress={() => {
                    setComponents(components.filter((other) => other.itemId !== component.itemId));
                  }}
                >
                  {t('common.remove')}
                </Button>
              ),
            },
          ]}
        />
        <div className="grid grid-cols-(--cairn-line-columns) items-end gap-3">
          <Select
            label={t('item.component')}
            placeholder={t('item.choose')}
            options={others.map((other) => ({ id: other.id, label: `${other.code} · ${other.shortLabel}` }))}
            value={chosen}
            onChange={setChosen}
          />
          <NumberField label={t('item.quantity')} value={quantity} minValue={1} onChange={setQuantity} />
          <Button isDisabled={chosen === null || quantity === null} onPress={add}>
            {t('common.add')}
          </Button>
        </div>
        <div className="flex justify-end">
          <Button
            variant="primary"
            isDisabled={gesture.sending}
            onPress={() =>
              void gesture.run(setItemComposition, {
                itemId: item.id,
                kind,
                components: components.map((component) => ({
                  itemId: component.itemId,
                  quantity: component.quantity,
                })),
              })
            }
          >
            {t('common.save')}
          </Button>
        </div>
      </Panel>
    </>
  );
}

/** Équivalences : des propositions orientées, une remplaçante obsolète signalée (RG-REF-031 à 033). */
function ReplacementsPanel({ item }: { item: ItemDetail }) {
  const { t } = useTranslation();
  const gesture = useGesture();
  const others = useOtherItems(item);
  const [chosen, setChosen] = useState<string | null>(null);
  const current = item.replacements.map((replacing) => replacing.itemId);
  const replace = (replacingItemIds: string[]) =>
    void gesture.run(setItemReplacements, { itemId: item.id, replacingItemIds });
  return (
    <>
      <RefusalBanner refusal={gesture.refusal} onDismiss={gesture.dismiss} />
      <Panel title={t('item.replacements')} meta={t('item.replacementsHint')}>
        <DataTable<ItemDetail['replacements'][number]>
          label={t('item.replacements')}
          rows={item.replacements}
          rowKey={(replacing) => replacing.itemId}
          empty={t('item.noReplacement')}
          columns={[
            {
              id: 'code',
              header: t('item.replacing'),
              size: 'text',
              cell: (replacing) => `${replacing.code} · ${replacing.shortLabel}`,
            },
            {
              id: 'state',
              header: t('item.state'),
              size: 'status',
              cell: (replacing) => <StateBadge state={replacing.state} />,
            },
            {
              id: 'remove',
              header: '',
              size: 'status',
              cell: (replacing) => (
                <Button
                  onPress={() => {
                    replace(current.filter((id) => id !== replacing.itemId));
                  }}
                >
                  {t('common.remove')}
                </Button>
              ),
            },
          ]}
        />
        <div className="grid grid-cols-(--cairn-line-columns) items-end gap-3">
          <Select
            label={t('item.replacing')}
            placeholder={t('item.choose')}
            options={others
              .filter((other) => !current.includes(other.id))
              .map((other) => ({ id: other.id, label: `${other.code} · ${other.shortLabel}` }))}
            value={chosen}
            onChange={setChosen}
          />
          <Button
            isDisabled={chosen === null || gesture.sending}
            onPress={() => {
              if (chosen !== null) replace([...current, chosen]);
              setChosen(null);
            }}
          >
            {t('common.add')}
          </Button>
        </div>
      </Panel>
    </>
  );
}
