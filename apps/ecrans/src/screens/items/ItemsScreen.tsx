import {
  customFieldTypeSchema,
  itemStateSchema,
  listCustomFields,
  listItemFamilies,
  listPrincipals,
  removeCustomField,
  saveCustomField,
  saveItemFamily,
  searchItems,
  trackingModeSchema,
  changeItemState,
  type CustomField,
  type CustomFieldType,
  type ItemFamily,
  type ItemRow,
} from '@cairn/contrat';
import { Banner, Button, ChipGroup, DataTable, Panel, Select, Tabs, TextField } from '@cairn/ui';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { contractQuery } from '../../contract/query.js';
import { RefusalBanner } from '../../contract/RefusalBanner.js';
import { useGesture } from '../../contract/useGesture.js';
import { useHasPermission } from '../../shell/site.js';
import { useChangeSignal } from '../../signals/useChangeSignal.js';
import { formatDate } from '../format.js';
import { StateBadge } from './StateBadge.js';
import { RouteLink } from '../../shell/RouteLink.js';

/**
 * Référentiel produit d'un donneur d'ordre (0.2) : ses références, filtrées, et la bascule des
 * références à compléter ; ses familles ; ses champs personnalisés. Un geste du bureau (RG-SUR-127).
 */
export function ItemsScreen() {
  const { t } = useTranslation();
  const { data: principals } = useQuery(contractQuery(listPrincipals, {}));
  const [chosen, setChosen] = useState<string | null>(null);
  const principalId =
    chosen ??
    (principals?.principals.find((principal) => !principal.internal) ?? principals?.principals[0])?.id ??
    null;
  const canManage = useHasPermission('manageItems');
  const canDeclare = useHasPermission('manageCustomFields');
  return (
    <>
      <div className="grid grid-cols-3 gap-4">
        <Select
          label={t('item.principal')}
          placeholder={t('item.choose')}
          options={(principals?.principals ?? []).map((principal) => ({
            id: principal.id,
            label: principal.name,
          }))}
          value={principalId}
          onChange={setChosen}
        />
      </div>
      {principalId === null ? null : (
        <Tabs
          label={t('item.menu')}
          tabs={[
            {
              id: 'items',
              label: t('item.list'),
              content: <ItemListPanel key={principalId} principalId={principalId} canManage={canManage} />,
            },
            ...(canManage
              ? [
                  {
                    id: 'families',
                    label: t('itemFamily.title'),
                    content: <FamiliesPanel key={principalId} principalId={principalId} />,
                  },
                ]
              : []),
            ...(canDeclare
              ? [
                  {
                    id: 'customFields',
                    label: t('customField.title'),
                    content: <CustomFieldsPanel key={principalId} principalId={principalId} />,
                  },
                ]
              : []),
          ]}
        />
      )}
    </>
  );
}

const ALL = 'all';

/** Liste filtrée (0.2 § 6, étape 1) ; la bascule met en avant les brouillons (RG-REF-041). */
function ItemListPanel({ principalId, canManage }: { principalId: string; canManage: boolean }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const gesture = useGesture();
  const [search, setSearch] = useState('');
  const [familyId, setFamilyId] = useState<string>(ALL);
  const [state, setState] = useState<string>(ALL);
  const [trackingMode, setTrackingMode] = useState<string>(ALL);
  const [draftsOnly, setDraftsOnly] = useState(false);
  const { data: families } = useQuery(contractQuery(listItemFamilies, { principalId }));
  const query = contractQuery(searchItems, {
    principalId,
    familyId: familyId === ALL ? null : familyId,
    state: itemStateSchema.safeParse(state).data ?? null,
    trackingMode: trackingModeSchema.safeParse(trackingMode).data ?? null,
    search: search.trim() === '' ? null : search.trim(),
    draftsOnly,
  });
  const { data } = useQuery(query);
  useChangeSignal('Item', undefined, query.queryKey);
  const day = (iso: string) => formatDate(iso.slice(0, 10), i18n.language);

  return (
    <>
      <RefusalBanner refusal={gesture.refusal} onDismiss={gesture.dismiss} />
      <Panel
        title={draftsOnly ? t('item.toComplete') : t('item.list')}
        meta={draftsOnly ? t('item.toCompleteHint') : undefined}
        actions={
          canManage ? (
            <Button
              variant="primary"
              onPress={() => void navigate({ to: '/items/new', search: { principalId } })}
            >
              {t('item.create')}
            </Button>
          ) : undefined
        }
      >
        <div className="grid grid-cols-4 gap-4">
          <TextField label={t('item.search')} value={search} onChange={setSearch} />
          <Select
            label={t('item.family')}
            placeholder={t('item.anyFamily')}
            options={[
              { id: ALL, label: t('item.anyFamily') },
              ...(families?.families ?? []).map((family) => ({
                id: family.id,
                label: `${family.code} · ${family.name}`,
              })),
            ]}
            value={familyId}
            onChange={(value) => {
              setFamilyId(value ?? ALL);
            }}
          />
          <Select
            label={t('item.state')}
            placeholder={t('item.anyState')}
            isDisabled={draftsOnly}
            options={[
              { id: ALL, label: t('item.anyState') },
              ...itemStateSchema.options.map((option) => ({ id: option, label: t(`item.states.${option}`) })),
            ]}
            value={state}
            onChange={(value) => {
              setState(value ?? ALL);
            }}
          />
          <Select
            label={t('item.trackingMode')}
            placeholder={t('item.anyTrackingMode')}
            options={[
              { id: ALL, label: t('item.anyTrackingMode') },
              ...trackingModeSchema.options.map((option) => ({
                id: option,
                label: t(`item.trackingModes.${option}`),
              })),
            ]}
            value={trackingMode}
            onChange={(value) => {
              setTrackingMode(value ?? ALL);
            }}
          />
        </div>
        <ChipGroup
          label={t('item.toComplete')}
          options={[{ id: 'drafts', label: t('item.toComplete') }]}
          value={draftsOnly ? ['drafts'] : []}
          onChange={(value) => {
            setDraftsOnly(value.includes('drafts'));
          }}
        />
        <DataTable<ItemRow>
          label={draftsOnly ? t('item.toComplete') : t('item.list')}
          rows={data?.items ?? []}
          rowKey={(row) => row.id}
          empty={t('item.none')}
          columns={[
            {
              id: 'code',
              header: t('item.code'),
              size: 'code',
              code: true,
              cell: (row) => (
                <RouteLink to="/items/$itemId" params={{ itemId: row.id }}>
                  {row.code}
                </RouteLink>
              ),
            },
            { id: 'label', header: t('item.shortLabel'), size: 'text', cell: (row) => row.shortLabel },
            ...(draftsOnly
              ? [
                  {
                    id: 'created',
                    header: t('item.createdOn'),
                    size: 'date' as const,
                    cell: (row: ItemRow) => day(row.createdAt),
                  },
                  {
                    id: 'stock',
                    header: t('item.stock'),
                    size: 'number' as const,
                    numeric: true,
                    cell: (row: ItemRow) => row.stockQuantity,
                  },
                  {
                    id: 'sites',
                    header: t('item.stockSites'),
                    size: 'date' as const,
                    cell: (row: ItemRow) => (row.stockSites.length === 0 ? '—' : row.stockSites.join(', ')),
                  },
                ]
              : [
                  {
                    id: 'family',
                    header: t('item.family'),
                    size: 'text' as const,
                    cell: (row: ItemRow) => row.familyName ?? '—',
                  },
                  {
                    id: 'tracking',
                    header: t('item.trackingMode'),
                    size: 'date' as const,
                    cell: (row: ItemRow) =>
                      row.serialBatchTracking
                        ? `${t('item.trackingModes.serial')} + ${t('item.trackingModes.batch')}`
                        : t(`item.trackingModes.${row.trackingMode}`),
                  },
                ]),
            {
              id: 'state',
              header: t('item.state'),
              size: 'status',
              cell: (row) => <StateBadge state={row.state} />,
            },
            ...(draftsOnly && canManage
              ? [
                  {
                    id: 'activate',
                    header: '',
                    size: 'status' as const,
                    // Activation à la volée depuis la liste, dès que les conditions sont réunies (0.2 § 6).
                    cell: (row: ItemRow) =>
                      row.activable ? (
                        <Button
                          onPress={() =>
                            void gesture.run(changeItemState, { itemId: row.id, state: 'active' })
                          }
                        >
                          {t('common.activate')}
                        </Button>
                      ) : null,
                  },
                ]
              : []),
          ]}
        />
      </Panel>
    </>
  );
}

/** Familles du donneur d'ordre, en liste plate ou en arborescence (RG-REF-004). */
function FamiliesPanel({ principalId }: { principalId: string }) {
  const { t } = useTranslation();
  const gesture = useGesture();
  const query = contractQuery(listItemFamilies, { principalId });
  const { data } = useQuery(query);
  useChangeSignal('ItemFamily', undefined, query.queryKey);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string | null>(null);
  const families = data?.families ?? [];
  const nameOf = (id: string | null) => families.find((family) => family.id === id)?.name ?? '—';
  return (
    <>
      <RefusalBanner refusal={gesture.refusal} onDismiss={gesture.dismiss} />
      <Panel title={t('itemFamily.title')}>
        <DataTable<ItemFamily>
          label={t('itemFamily.title')}
          rows={families}
          rowKey={(family) => family.id}
          empty={t('itemFamily.none')}
          columns={[
            {
              id: 'code',
              header: t('itemFamily.code'),
              size: 'code',
              code: true,
              cell: (family) => family.code,
            },
            { id: 'name', header: t('itemFamily.name'), size: 'text', cell: (family) => family.name },
            {
              id: 'parent',
              header: t('itemFamily.parent'),
              size: 'text',
              cell: (family) => nameOf(family.parentId),
            },
            {
              id: 'items',
              header: t('itemFamily.items'),
              size: 'number',
              numeric: true,
              cell: (family) => family.itemCount,
            },
            {
              id: 'active',
              header: '',
              size: 'status',
              cell: (family) => (
                <Button
                  onPress={() =>
                    void gesture.run(saveItemFamily, {
                      familyId: family.id,
                      principalId,
                      parentId: family.parentId,
                      code: family.code,
                      name: family.name,
                      active: !family.active,
                    })
                  }
                >
                  {family.active ? t('common.deactivate') : t('common.activate')}
                </Button>
              ),
            },
          ]}
        />
        <div className="grid grid-cols-(--cairn-line-columns) items-end gap-3">
          <TextField label={t('itemFamily.code')} value={code} onChange={setCode} code />
          <TextField label={t('itemFamily.name')} value={name} onChange={setName} />
          <Select
            label={t('itemFamily.parent')}
            placeholder={t('itemFamily.root')}
            options={[
              { id: ALL, label: t('itemFamily.root') },
              ...families.map((family) => ({ id: family.id, label: `${family.code} · ${family.name}` })),
            ]}
            value={parentId ?? ALL}
            onChange={(value) => {
              setParentId(value === ALL ? null : value);
            }}
          />
          <Button
            variant="primary"
            isDisabled={code.trim() === '' || name.trim() === '' || gesture.sending}
            onPress={() =>
              void gesture
                .run(saveItemFamily, { familyId: null, principalId, parentId, code, name, active: true })
                .then((saved) => {
                  if (saved === undefined) return;
                  setCode('');
                  setName('');
                })
            }
          >
            {t('itemFamily.create')}
          </Button>
        </div>
      </Panel>
    </>
  );
}

/** Champs personnalisés déclarés par le donneur d'ordre (RG-REF-034 à 037). */
function CustomFieldsPanel({ principalId }: { principalId: string }) {
  const { t } = useTranslation();
  const gesture = useGesture();
  const query = contractQuery(listCustomFields, { principalId });
  const { data } = useQuery(query);
  useChangeSignal('CustomField', undefined, query.queryKey);
  const [label, setLabel] = useState('');
  const [fieldType, setFieldType] = useState<CustomFieldType>('text');
  const [listValues, setListValues] = useState('');
  const [required, setRequired] = useState(false);
  const [removal, setRemoval] = useState<{ removal: 'deleted' | 'deactivated'; itemCount: number }>();
  const values = listValues
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value !== '');
  const save = (field: CustomField, changes: Partial<Pick<CustomField, 'required' | 'active'>>) =>
    void gesture.run(saveCustomField, {
      customFieldId: field.id,
      principalId,
      label: field.label,
      fieldType: field.fieldType,
      listValues: field.listValues,
      required: changes.required ?? field.required,
      active: changes.active ?? field.active,
    });
  return (
    <>
      <RefusalBanner refusal={gesture.refusal} onDismiss={gesture.dismiss} />
      {removal === undefined ? null : (
        <Banner
          tone="info"
          dismissLabel={t('shell.dismiss')}
          onDismiss={() => {
            setRemoval(undefined);
          }}
        >
          {removal.removal === 'deleted'
            ? t('customField.deleted')
            : t('customField.deactivated', { count: removal.itemCount })}
        </Banner>
      )}
      <Panel title={t('customField.title')}>
        <DataTable<CustomField>
          label={t('customField.title')}
          rows={data?.fields ?? []}
          rowKey={(field) => field.id}
          empty={t('customField.none')}
          columns={[
            { id: 'label', header: t('customField.label'), size: 'text', cell: (field) => field.label },
            {
              id: 'type',
              header: t('customField.type'),
              size: 'date',
              cell: (field) =>
                field.fieldType === 'list'
                  ? `${t('customField.types.list')} (${field.listValues.join(', ')})`
                  : t(`customField.types.${field.fieldType}`),
            },
            {
              id: 'required',
              header: t('customField.required'),
              size: 'status',
              cell: (field) => (
                <Button
                  onPress={() => {
                    save(field, { required: !field.required });
                  }}
                >
                  {field.required ? t('common.yes') : t('common.no')}
                </Button>
              ),
            },
            {
              id: 'used',
              header: t('customField.used'),
              size: 'number',
              numeric: true,
              cell: (field) => field.itemCount,
            },
            {
              id: 'state',
              header: '',
              size: 'status',
              cell: (field) =>
                field.active ? (
                  <Button
                    onPress={() =>
                      void gesture.run(removeCustomField, { customFieldId: field.id }).then((removed) => {
                        setRemoval(removed);
                      })
                    }
                  >
                    {t('customField.remove')}
                  </Button>
                ) : (
                  <Button
                    onPress={() => {
                      save(field, { active: true });
                    }}
                  >
                    {t('common.activate')}
                  </Button>
                ),
            },
          ]}
        />
        <div className="grid grid-cols-(--cairn-line-columns) items-end gap-3">
          <TextField label={t('customField.label')} value={label} onChange={setLabel} />
          <Select
            label={t('customField.type')}
            placeholder={t('item.choose')}
            options={customFieldTypeSchema.options.map((option) => ({
              id: option,
              label: t(`customField.types.${option}`),
            }))}
            value={fieldType}
            onChange={(value) => {
              setFieldType(customFieldTypeSchema.safeParse(value).data ?? 'text');
            }}
          />
          <Button
            variant="primary"
            isDisabled={
              label.trim() === '' || (fieldType === 'list' && values.length === 0) || gesture.sending
            }
            onPress={() =>
              void gesture
                .run(saveCustomField, {
                  customFieldId: null,
                  principalId,
                  label,
                  fieldType,
                  listValues: fieldType === 'list' ? values : [],
                  required,
                  active: true,
                })
                .then((saved) => {
                  if (saved === undefined) return;
                  setLabel('');
                  setListValues('');
                })
            }
          >
            {t('customField.create')}
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {fieldType === 'list' ? (
            <TextField label={t('customField.listValues')} value={listValues} onChange={setListValues} />
          ) : null}
          <ChipGroup
            label={t('customField.required')}
            options={[{ id: 'required', label: t('customField.required') }]}
            value={required ? ['required'] : []}
            onChange={(value) => {
              setRequired(value.includes('required'));
            }}
          />
        </div>
      </Panel>
    </>
  );
}
