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
  type AdrClassification,
  type Component,
  type CompositionKind,
  type CustomField,
  type CustomValue,
  type ItemBarcode,
  type ItemDetail,
  type PackagingLevel,
} from '@cairn/contrat';
import {
  Banner,
  Button,
  ChipGroup,
  DataTable,
  DateField,
  Disclosure,
  MoneyField,
  NumberField,
  Panel,
  Select,
  StatusBadge,
  TextField,
} from '@cairn/ui';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { useState } from 'react';
import { Controller, useFieldArray, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { textField, useGestureForm, valueField } from '../../contract/form.js';
import { contractQuery } from '../../contract/query.js';
import { RefusalBanner } from '../../contract/RefusalBanner.js';
import { useGesture } from '../../contract/useGesture.js';
import { useHasPermission } from '../../shell/site.js';
import { useChangeSignal } from '../../signals/useChangeSignal.js';
import { formatDate } from '../format.js';
import { StateBadge } from './StateBadge.js';

const NONE = 'none';

/** Les options de la référence, portées par deux groupes de pastilles. */
const OPTIONS = ['serialBatchTracking', 'tracksExpiryDate', 'tracksManufacturingDate', 'isKit'] as const;

const emptyAdr: AdrClassification = { adrClass: '', unNumber: '', packingGroup: null };

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
  const form = useGestureForm(saveItem, {
    itemId: item?.id ?? null,
    principalId,
    code: item?.code ?? '',
    shortLabel: item?.shortLabel ?? '',
    longLabel: item?.longLabel ?? null,
    familyId: item?.familyId ?? null,
    trackingMode: item?.trackingMode ?? 'quantity',
    serialBatchTracking: item?.serialBatchTracking ?? false,
    tracksExpiryDate: item?.tracksExpiryDate ?? false,
    tracksManufacturingDate: item?.tracksManufacturingDate ?? false,
    adr: item?.adr ?? null,
    isKit: item?.isKit ?? false,
  });
  const [familyId, trackingMode, adr] = useWatch({
    control: form.control,
    name: ['familyId', 'trackingMode', 'adr'],
  });
  const flags = useWatch({ control: form.control, name: OPTIONS });
  const options = OPTIONS.filter((_, index) => flags[index]);
  const setOptions = (value: string[]) => {
    for (const option of OPTIONS) form.setValue(option, value.includes(option), { shouldValidate: true });
  };
  // Décocher « dangereuse » met la classification de côté : la recocher la retrouve telle quelle.
  const [adrAside, setAdrAside] = useState<AdrClassification>(item?.adr ?? emptyAdr);
  const dangerous = adr !== null;
  const locked = item?.trackingModeLocked ?? false;

  const submit = form.handleSubmit(async (input) => {
    const saved = await gesture.run(saveItem, {
      ...input,
      // La pastille du suivi par lot reste cochée hors gestion série, sans effet (0.2 § 6, étape 3).
      serialBatchTracking: input.trackingMode === 'serial' && input.serialBatchTracking,
    });
    if (saved !== undefined && item === undefined)
      await navigate({ to: '/items/$itemId', params: { itemId: saved.itemId } });
  });

  return (
    <>
      <RefusalBanner refusal={gesture.refusal} onDismiss={gesture.dismiss} />
      <Panel
        title={item === undefined ? t('item.newTitle') : `${item.code} · ${item.shortLabel}`}
        meta={item === undefined ? undefined : `${item.principalCode} · ${t('item.principalLocked')}`}
        actions={item === undefined ? undefined : <StateBadge state={item.state} />}
      >
        <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
          <div className="grid grid-cols-3 gap-4">
            <Controller
              control={form.control}
              name="code"
              render={({ field }) => <TextField label={t('item.code')} {...textField(field)} code />}
            />
            <Controller
              control={form.control}
              name="shortLabel"
              render={({ field }) => <TextField label={t('item.shortLabel')} {...textField(field)} />}
            />
            <Controller
              control={form.control}
              name="familyId"
              render={({ field }) => (
                <Select
                  label={t('item.family')}
                  placeholder={t('item.noFamily')}
                  options={[
                    { id: NONE, label: t('item.noFamily') },
                    ...(families?.families ?? [])
                      .filter((family) => family.active || family.id === familyId)
                      .map((family) => ({ id: family.id, label: `${family.code} · ${family.name}` })),
                  ]}
                  value={field.value ?? NONE}
                  onChange={(value) => {
                    field.onChange(value === NONE ? null : value);
                  }}
                />
              )}
            />
          </div>
          <Controller
            control={form.control}
            name="longLabel"
            render={({ field }) => (
              <TextField label={t('item.longLabel')} {...textField(field, { optional: true })} />
            )}
          />
          <div className="grid grid-cols-3 gap-4">
            <Controller
              control={form.control}
              name="trackingMode"
              render={({ field }) => (
                <Select
                  label={t('item.trackingMode')}
                  placeholder={t('item.choose')}
                  isDisabled={locked}
                  options={trackingModeSchema.options.map((option) => ({
                    id: option,
                    label: t(`item.trackingModes.${option}`),
                  }))}
                  value={field.value}
                  onChange={(value) => {
                    field.onChange(trackingModeSchema.safeParse(value).data ?? field.value);
                  }}
                />
              )}
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
                if (value.includes('dangerous') === dangerous) return;
                if (dangerous) setAdrAside(adr);
                form.setValue('adr', dangerous ? null : adrAside, { shouldValidate: true });
              }}
            />
            {dangerous ? (
              <div className="grid grid-cols-3 gap-4">
                <Controller
                  control={form.control}
                  name="adr.adrClass"
                  render={({ field }) => <TextField label={t('item.adrClass')} {...textField(field)} code />}
                />
                <Controller
                  control={form.control}
                  name="adr.unNumber"
                  render={({ field }) => <TextField label={t('item.unNumber')} {...textField(field)} code />}
                />
                <Controller
                  control={form.control}
                  name="adr.packingGroup"
                  render={({ field }) => (
                    <Select
                      label={t('item.packingGroup')}
                      placeholder={t('item.noPackingGroup')}
                      options={[
                        { id: NONE, label: t('item.noPackingGroup') },
                        ...adrPackingGroupSchema.options.map((group) => ({ id: group, label: group })),
                      ]}
                      value={field.value ?? NONE}
                      onChange={(value) => {
                        field.onChange(adrPackingGroupSchema.safeParse(value).data ?? null);
                      }}
                    />
                  )}
                />
              </div>
            ) : null}
          </Disclosure>
          <div className="flex justify-end">
            <Button type="submit" variant="primary" isDisabled={!form.formState.isValid || gesture.sending}>
              {item === undefined ? t('common.create') : t('common.save')}
            </Button>
          </div>
        </form>
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
  const form = useGestureForm(saveItemPackaging, {
    itemId: item.id,
    levels: item.packagingLevels.length === 0 ? [emptyLevel(true)] : item.packagingLevels,
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'levels' });
  const levels = useWatch({ control: form.control, name: 'levels' });
  const submit = form.handleSubmit((input) => gesture.run(saveItemPackaging, input));
  const top = baseUnitsPerLevel(levels).at(-1) ?? 1;
  const levelField = (
    rank: number,
    name: 'unitsOfLowerLevel' | 'grossWeightGrams' | 'lengthMm' | 'widthMm' | 'heightMm',
    label: string,
  ) => (
    <Controller
      control={form.control}
      name={`levels.${rank}.${name}`}
      render={({ field }) => <NumberField label={label} {...valueField(field)} minValue={1} />}
    />
  );
  return (
    <>
      <RefusalBanner refusal={gesture.refusal} onDismiss={gesture.dismiss} />
      <Panel title={t('item.packaging')} meta={t('item.topLevelUnits', { count: top })}>
        <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
          {fields.map((row, rank) => {
            const level = levels[rank];
            const complete = level !== undefined && isCompletePackagingLevel(level);
            return (
              <div key={row.id} className="grid grid-cols-4 items-end gap-3">
                <Controller
                  control={form.control}
                  name={`levels.${rank}.name`}
                  render={({ field }) => (
                    <TextField
                      label={rank === 0 ? t('item.baseLevel') : t('item.levelName')}
                      {...textField(field)}
                    />
                  )}
                />
                {rank === 0 ? <span /> : levelField(rank, 'unitsOfLowerLevel', t('item.unitsOfLowerLevel'))}
                {levelField(rank, 'grossWeightGrams', t('item.grossWeight'))}
                <div className="flex items-center pb-2-5">
                  <StatusBadge tone={complete ? 'ok' : 'warn'}>
                    {complete ? t('item.complete') : t('item.incomplete')}
                  </StatusBadge>
                </div>
                {levelField(rank, 'lengthMm', t('item.length'))}
                {levelField(rank, 'widthMm', t('item.width'))}
                {levelField(rank, 'heightMm', t('item.height'))}
              </div>
            );
          })}
          <div className="flex justify-end gap-2">
            <Button
              onPress={() => {
                append(emptyLevel(false));
              }}
            >
              {t('item.addLevel')}
            </Button>
            {fields.length > 1 ? (
              <Button
                onPress={() => {
                  remove(fields.length - 1);
                }}
              >
                {t('item.removeLevel')}
              </Button>
            ) : null}
            <Button
              type="submit"
              variant="primary"
              isDisabled={
                !form.formState.isValid ||
                // Le schéma admet un coefficient vide, celui du niveau de base ; au-dessus, il le faut (RG-REF-019).
                levels.some((level, rank) => rank > 0 && level.unitsOfLowerLevel === null) ||
                gesture.sending
              }
            >
              {t('common.save')}
            </Button>
          </div>
        </form>
      </Panel>
    </>
  );
}

/** Identifiants scannables : uniques chez le donneur d'ordre, désactivés, jamais supprimés (RG-REF-007 à 010). */
function BarcodesPanel({ item }: { item: ItemDetail }) {
  const { t } = useTranslation();
  const gesture = useGesture();
  const form = useGestureForm(addItemBarcode, {
    itemId: item.id,
    code: '',
    nature: 'gtin',
    packagingRank: null,
  });
  const submit = form.handleSubmit(async (input) => {
    const added = await gesture.run(addItemBarcode, input);
    // L'identifiant ajouté, le champ se vide pour le suivant ; nature et niveau restent.
    if (added !== undefined) form.setValue('code', '', { shouldValidate: true });
  });
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
        <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
          <div className="grid grid-cols-(--cairn-line-columns) items-end gap-3">
            <Controller
              control={form.control}
              name="code"
              render={({ field }) => <TextField label={t('item.barcode')} {...textField(field)} code />}
            />
            <Controller
              control={form.control}
              name="nature"
              render={({ field }) => (
                <Select
                  label={t('item.nature')}
                  placeholder={t('item.choose')}
                  options={barcodeNatureSchema.options.map((option) => ({
                    id: option,
                    label: t(`item.natures.${option}`),
                  }))}
                  value={field.value}
                  onChange={(value) => {
                    field.onChange(barcodeNatureSchema.safeParse(value).data ?? field.value);
                  }}
                />
              )}
            />
            <Button type="submit" variant="primary" isDisabled={!form.formState.isValid || gesture.sending}>
              {t('item.addBarcode')}
            </Button>
          </div>
          {item.packagingLevels.length > 1 ? (
            <div className="grid grid-cols-3 gap-4">
              <Controller
                control={form.control}
                name="packagingRank"
                render={({ field }) => (
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
                    value={field.value === null ? NONE : String(field.value)}
                    onChange={(value) => {
                      field.onChange(value === null || value === NONE ? null : Number(value));
                    }}
                  />
                )}
              />
            </div>
          ) : null}
        </form>
      </Panel>
    </>
  );
}

/** Champs déclarés par le donneur d'ordre, les obligatoires signalés (0.2 § 6, étape 6). */
function CustomValuesPanel({ item }: { item: ItemDetail }) {
  const { t } = useTranslation();
  const gesture = useGesture();
  const { data } = useQuery(contractQuery(listCustomFields, { principalId: item.principalId }));
  // Un champ désactivé reste lisible là où il est renseigné (RG-REF-037).
  const fields = (data?.fields ?? []).filter(
    (field) => field.active || item.customValues[field.id] !== undefined,
  );
  return (
    <>
      <RefusalBanner refusal={gesture.refusal} onDismiss={gesture.dismiss} />
      <Panel title={t('item.customValues')}>
        {fields.length === 0 ? <span>{t('item.noCustomFields')}</span> : null}
        {/* Le formulaire naît une fois les champs connus : ils en fixent les lignes. */}
        <CustomValuesForm
          key={fields.map((field) => field.id).join()}
          item={item}
          fields={fields}
          gesture={gesture}
        />
      </Panel>
    </>
  );
}

/** Une valeur par champ affiché ; seuls les champs actifs s'enregistrent (RG-REF-037). */
function CustomValuesForm({
  item,
  fields,
  gesture,
}: {
  item: ItemDetail;
  fields: readonly CustomField[];
  gesture: ReturnType<typeof useGesture>;
}) {
  const { t } = useTranslation();
  const form = useGestureForm(saveItemCustomValues, {
    itemId: item.id,
    values: fields.map((field) => ({ customFieldId: field.id, value: item.customValues[field.id] ?? null })),
  });
  const submit = form.handleSubmit((input) =>
    gesture.run(saveItemCustomValues, {
      itemId: input.itemId,
      values: input.values.filter((value) =>
        fields.some((field) => field.id === value.customFieldId && field.active),
      ),
    }),
  );
  return (
    <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
      <div className="grid grid-cols-3 gap-4">
        {fields.map((customField, index) => (
          <Controller
            key={customField.id}
            control={form.control}
            name={`values.${index}.value`}
            render={({ field }) => (
              <CustomValueField field={customField} value={field.value} onChange={field.onChange} />
            )}
          />
        ))}
      </div>
      {fields.length === 0 ? null : (
        <div className="flex justify-end">
          <Button type="submit" variant="primary" isDisabled={!form.formState.isValid || gesture.sending}>
            {t('common.save')}
          </Button>
        </div>
      )}
    </form>
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
  const form = useGestureForm(setItemDeclaredValue, { itemId: item.id, valueCents: item.declaredValueCents });
  const cents = useWatch({ control: form.control, name: 'valueCents' });
  const submit = form.handleSubmit((input) => gesture.run(setItemDeclaredValue, input));
  // Une constante : le test de son absence vaut encore dans le rendu du champ.
  const currency = item.currency;
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
        {currency === null ? (
          <Banner tone="info">{t('item.noCurrency')}</Banner>
        ) : (
          <form
            className="grid grid-cols-(--cairn-line-columns) items-end gap-3"
            onSubmit={(event) => void submit(event)}
          >
            <Controller
              control={form.control}
              name="valueCents"
              render={({ field }) => (
                <MoneyField
                  label={t('item.valueAmount', { currency })}
                  currency={currency}
                  {...valueField(field)}
                />
              )}
            />
            <Button
              isDisabled={item.declaredValueCents === null || gesture.sending}
              onPress={() => void gesture.run(setItemDeclaredValue, { itemId: item.id, valueCents: null })}
            >
              {t('item.clearValue')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              isDisabled={
                !form.formState.isValid ||
                // Le schéma admet l'absence de valeur (RG-REF-051) : elle passe par « effacer », pas ici.
                cents === null ||
                cents === item.declaredValueCents ||
                gesture.sending
              }
            >
              {t('common.save')}
            </Button>
          </form>
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
  const initial: readonly Component[] = kind === 'kit' ? item.kitComponents : item.repairBomComponents;
  const form = useGestureForm(setItemComposition, {
    itemId: item.id,
    kind,
    components: initial.map((component) => ({ itemId: component.itemId, quantity: component.quantity })),
  });
  const {
    fields: components,
    remove,
    replace,
  } = useFieldArray({ control: form.control, name: 'components' });
  const submit = form.handleSubmit((input) => gesture.run(setItemComposition, input));
  // Le composant choisi et sa quantité : un brouillon de ligne, pas encore la composition.
  const [chosen, setChosen] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<number | null>(1);
  const add = () => {
    const other = others.find((candidate) => candidate.id === chosen);
    if (other === undefined || quantity === null) return;
    replace([
      ...components
        .filter((component) => component.itemId !== other.id)
        .map((component) => ({ itemId: component.itemId, quantity: component.quantity })),
      { itemId: other.id, quantity },
    ]);
    setChosen(null);
  };
  // Le geste ne porte que la référence et sa quantité : le libellé se retrouve parmi les références connues.
  const describe = (itemId: string) => {
    const known =
      initial.find((component) => component.itemId === itemId) ?? others.find((other) => other.id === itemId);
    return known === undefined ? '' : `${known.code} · ${known.shortLabel}`;
  };
  const title = kind === 'kit' ? t('item.kit') : t('item.repairBom');
  return (
    <>
      <RefusalBanner refusal={gesture.refusal} onDismiss={gesture.dismiss} />
      <Panel title={title} meta={kind === 'repairBom' ? t('item.repairBomHint') : undefined}>
        <DataTable<(typeof components)[number]>
          label={title}
          rows={components}
          rowKey={(component) => component.itemId}
          empty={t('item.noComponent')}
          columns={[
            {
              id: 'code',
              header: t('item.component'),
              size: 'text',
              cell: (component) => describe(component.itemId),
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
                    remove(components.findIndex((other) => other.itemId === component.itemId));
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
        <form className="flex justify-end" onSubmit={(event) => void submit(event)}>
          <Button type="submit" variant="primary" isDisabled={!form.formState.isValid || gesture.sending}>
            {t('common.save')}
          </Button>
        </form>
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
