import {
  listHandlingUnitTypes,
  listMovementReasons,
  listQualityStates,
  listSnapshots,
  locationTypeSchema,
  pickingRuleSchema,
  reasonNatureSchema,
  saveHandlingUnitType,
  saveMovementReason,
  saveQualityState,
  setItemPickingRule,
  setPickingRule,
  setSnapshotTime,
  type HandlingUnitType,
  type MovementReason,
  type PickingRule,
  type QualityState,
} from '@cairn/contrat';
import {
  Banner,
  Button,
  ChipGroup,
  DataTable,
  NumberField,
  Panel,
  Select,
  StatusBadge,
  TextField,
  TimeField,
} from '@cairn/ui';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Controller, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { textField, useGestureForm, valueField } from '../../contract/form.js';
import { contractQuery } from '../../contract/query.js';
import { RefusalBanner } from '../../contract/RefusalBanner.js';
import { useGesture } from '../../contract/useGesture.js';
import { RouteLink } from '../../shell/RouteLink.js';

const NONE = '—';
const NO_SUGGESTION = 'none';
const PRINCIPAL_RULE = 'principal';
const NEW = 'new';

/** Un état qualité ne suggère qu'un emplacement physique (RG-STK-014). */
const suggestableType = locationTypeSchema.exclude(['virtual']);

function ActiveBadge({ active }: { active: boolean }) {
  const { t } = useTranslation();
  return (
    <StatusBadge tone={active ? 'ok' : 'mute'}>
      {active ? t('common.active') : t('common.inactive')}
    </StatusBadge>
  );
}

/** Ce qu'on édite dans un panneau de paramétrage : rien, un nouvel objet, ou un objet existant. */
type Editing = string | undefined;

// — États qualité et règle de prélèvement du donneur d'ordre —

/**
 * États qualité d'un donneur d'ordre (RG-STK-009 à 014) : libellé, prélevable, déplacement suggéré,
 * état par défaut. Un état se désactive, jamais ne se supprime (RG-STK-013).
 */
export function QualityStatesPanel({ principalId }: { principalId: string }) {
  const { t } = useTranslation();
  const { data } = useQuery(contractQuery(listQualityStates, { principalId }));
  const [editing, setEditing] = useState<Editing>();
  const states = data?.qualityStates ?? [];
  const edited = editing === NEW ? undefined : states.find((state) => state.id === editing);
  const close = () => {
    setEditing(undefined);
  };
  return (
    <>
      <Panel
        title={t('stockSettings.qualityStates')}
        meta={t('stockSettings.qualityStatesHint')}
        actions={
          <Button
            onPress={() => {
              setEditing(NEW);
            }}
          >
            {t('stockSettings.addQualityState')}
          </Button>
        }
      >
        <DataTable<QualityState>
          label={t('stockSettings.qualityStates')}
          rows={states}
          rowKey={(state) => state.id}
          empty={null}
          columns={[
            {
              id: 'code',
              header: t('stockSettings.code'),
              size: 'date',
              code: true,
              cell: (state) => state.code,
            },
            { id: 'label', header: t('stockSettings.label'), size: 'text', cell: (state) => state.label },
            {
              id: 'pickable',
              header: t('stockSettings.pickable'),
              size: 'code',
              cell: (state) => (state.pickable ? t('common.yes') : t('common.no')),
            },
            {
              id: 'suggested',
              header: t('stockSettings.suggestedLocationType'),
              size: 'date',
              cell: (state) =>
                state.suggestedLocationType === null
                  ? NONE
                  : t(`locationType.${state.suggestedLocationType}`),
            },
            {
              id: 'default',
              header: t('stockSettings.isDefault'),
              size: 'code',
              cell: (state) =>
                state.isDefault ? (
                  <StatusBadge tone="info">{t('stockSettings.isDefault')}</StatusBadge>
                ) : null,
            },
            {
              id: 'state',
              header: t('stockSettings.state'),
              size: 'code',
              cell: (state) => <ActiveBadge active={state.active} />,
            },
            {
              id: 'actions',
              header: '',
              size: 'code',
              cell: (state) => (
                <Button
                  onPress={() => {
                    setEditing(state.id);
                  }}
                >
                  {t('common.edit')}
                </Button>
              ),
            },
          ]}
        />
      </Panel>
      {editing === undefined ? null : (
        <QualityStateForm
          key={editing === NEW ? NEW : JSON.stringify(edited)}
          principalId={principalId}
          state={edited}
          onClose={close}
        />
      )}
    </>
  );
}

function QualityStateForm({
  principalId,
  state,
  onClose,
}: {
  principalId: string;
  state: QualityState | undefined;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const gesture = useGesture();
  const form = useGestureForm(saveQualityState, {
    qualityStateId: state?.id ?? null,
    principalId,
    code: state?.code ?? '',
    label: state?.label ?? '',
    pickable: state?.pickable ?? true,
    suggestedLocationType: suggestableType.safeParse(state?.suggestedLocationType).data ?? null,
    isDefault: state?.isDefault ?? false,
    active: state?.active ?? true,
  });
  const [pickable, isDefault, active] = useWatch({
    control: form.control,
    name: ['pickable', 'isDefault', 'active'],
  });
  const submit = form.handleSubmit(async (input) => {
    if ((await gesture.run(saveQualityState, input)) !== undefined) onClose();
  });
  const flags = { pickable, isDefault, active };
  return (
    <>
      <RefusalBanner refusal={gesture.refusal} onDismiss={gesture.dismiss} />
      <Panel
        title={
          state === undefined
            ? t('stockSettings.newQualityState')
            : t('stockSettings.editQualityState', { code: state.code })
        }
        actions={<Button onPress={onClose}>{t('stock.close')}</Button>}
      >
        <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
          <div className="grid grid-cols-3 items-end gap-4">
            <Controller
              control={form.control}
              name="code"
              render={({ field }) => <TextField label={t('stockSettings.code')} {...textField(field)} code />}
            />
            <Controller
              control={form.control}
              name="label"
              render={({ field }) => <TextField label={t('stockSettings.label')} {...textField(field)} />}
            />
            <Controller
              control={form.control}
              name="suggestedLocationType"
              render={({ field }) => (
                <Select
                  label={t('stockSettings.suggestedLocationType')}
                  placeholder={t('stockSettings.noSuggestion')}
                  options={[
                    { id: NO_SUGGESTION, label: t('stockSettings.noSuggestion') },
                    ...suggestableType.options.map((type) => ({
                      id: type,
                      label: t(`locationType.${type}`),
                    })),
                  ]}
                  value={field.value ?? NO_SUGGESTION}
                  onChange={(value) => {
                    field.onChange(suggestableType.safeParse(value).data ?? null);
                  }}
                />
              )}
            />
          </div>
          <ChipGroup
            label={t('stockSettings.characteristics')}
            options={[
              { id: 'pickable', label: t('stockSettings.pickable') },
              { id: 'isDefault', label: t('stockSettings.isDefault') },
              { id: 'active', label: t('common.active') },
            ]}
            value={Object.entries(flags).flatMap(([key, on]) => (on ? [key] : []))}
            onChange={(value) => {
              for (const key of ['pickable', 'isDefault', 'active'] as const)
                form.setValue(key, value.includes(key), { shouldValidate: true, shouldDirty: true });
            }}
          />
          <div className="flex justify-end">
            <Button type="submit" variant="primary" isDisabled={!form.formState.isValid || gesture.sending}>
              {state === undefined ? t('common.create') : t('common.save')}
            </Button>
          </div>
        </form>
      </Panel>
    </>
  );
}

/** Règle de prélèvement du donneur d'ordre (RG-STK-053, 054). */
export function PickingRulePanel({ principalId }: { principalId: string }) {
  const { data } = useQuery(contractQuery(listQualityStates, { principalId }));
  if (data === undefined) return null;
  return <PickingRuleForm key={data.pickingRule} principalId={principalId} current={data.pickingRule} />;
}

function PickingRuleForm({ principalId, current }: { principalId: string; current: PickingRule }) {
  const { t } = useTranslation();
  const gesture = useGesture();
  const form = useGestureForm(setPickingRule, { principalId, pickingRule: current });
  const submit = form.handleSubmit((input) => gesture.run(setPickingRule, input));
  return (
    <>
      <RefusalBanner refusal={gesture.refusal} onDismiss={gesture.dismiss} />
      <Panel title={t('stockSettings.pickingRule')} meta={t(`pickingRule.${current}`)}>
        <form
          className="grid grid-cols-(--cairn-line-columns) items-end gap-3"
          onSubmit={(event) => void submit(event)}
        >
          <Controller
            control={form.control}
            name="pickingRule"
            render={({ field }) => (
              <Select
                label={t('stockSettings.pickingRule')}
                placeholder={t('stock.choose')}
                options={pickingRuleSchema.options.map((rule) => ({
                  id: rule,
                  label: t(`pickingRule.${rule}`),
                }))}
                value={field.value}
                onChange={(value) => {
                  field.onChange(pickingRuleSchema.safeParse(value).data ?? field.value);
                }}
              />
            )}
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

/** La règle d'une référence : celle de son donneur d'ordre, ou une surcharge (RG-STK-054). */
const itemRuleForm = {
  input: z
    .object({ itemId: z.string(), choice: z.string() })
    .pipe(z.object({ itemId: z.string(), choice: z.union([z.literal(PRINCIPAL_RULE), pickingRuleSchema]) }))
    .transform(({ itemId, choice }): z.input<typeof setItemPickingRule.input> => ({
      itemId,
      pickingRule: choice === PRINCIPAL_RULE ? null : choice,
    }))
    .pipe(setItemPickingRule.input),
};

/** Sur la fiche référence : sa règle de prélèvement, et le chemin vers son stock. */
export function ItemPickingRulePanel({
  itemId,
  current,
  canManage,
}: {
  itemId: string;
  current: PickingRule | null;
  canManage: boolean;
}) {
  const { t } = useTranslation();
  const gesture = useGesture();
  const form = useGestureForm(itemRuleForm, { itemId, choice: current ?? PRINCIPAL_RULE });
  const [saved, setSaved] = useState(false);
  const submit = form.handleSubmit(async (input) => {
    setSaved((await gesture.run(setItemPickingRule, input)) !== undefined);
  });
  return (
    <>
      <RefusalBanner refusal={gesture.refusal} onDismiss={gesture.dismiss} />
      <Panel
        title={t('stockSettings.pickingRule')}
        meta={t('stockSettings.itemPickingRuleHint')}
        actions={
          <RouteLink to="/stock" search={{ itemId }}>
            {t('stockSettings.seeStock')}
          </RouteLink>
        }
      >
        {saved ? <Banner tone="ok">{t('common.saved')}</Banner> : null}
        {canManage ? (
          <form
            className="grid grid-cols-(--cairn-line-columns) items-end gap-3"
            onSubmit={(event) => void submit(event)}
          >
            <Controller
              control={form.control}
              name="choice"
              render={({ field }) => (
                <Select
                  label={t('stockSettings.pickingRule')}
                  placeholder={t('stock.choose')}
                  options={[
                    { id: PRINCIPAL_RULE, label: t('stockSettings.principalRule') },
                    ...pickingRuleSchema.options.map((rule) => ({
                      id: rule,
                      label: t(`pickingRule.${rule}`),
                    })),
                  ]}
                  value={field.value === '' ? null : field.value}
                  onChange={(value) => {
                    setSaved(false);
                    field.onChange(value ?? '');
                  }}
                />
              )}
            />
            <span />
            <Button type="submit" variant="primary" isDisabled={!form.formState.isValid || gesture.sending}>
              {t('common.save')}
            </Button>
          </form>
        ) : null}
      </Panel>
    </>
  );
}

// — Motifs de mouvement —

/** Motifs de mouvement (RG-STK-026) : rattachés à une nature, commentaire obligatoire ou non. */
export function MovementReasonsTab() {
  const { t } = useTranslation();
  const { data } = useQuery(contractQuery(listMovementReasons, {}));
  const [editing, setEditing] = useState<Editing>();
  const reasons = data?.reasons ?? [];
  const edited = editing === NEW ? undefined : reasons.find((reason) => reason.id === editing);
  return (
    <>
      <Panel
        title={t('stockSettings.reasons')}
        actions={
          <Button
            onPress={() => {
              setEditing(NEW);
            }}
          >
            {t('stockSettings.addReason')}
          </Button>
        }
      >
        <DataTable<MovementReason>
          label={t('stockSettings.reasons')}
          rows={reasons}
          rowKey={(reason) => reason.id}
          empty={null}
          columns={[
            {
              id: 'nature',
              header: t('stockSettings.nature'),
              size: 'date',
              cell: (reason) => t(`reasonNature.${reason.nature}`),
            },
            { id: 'label', header: t('stockSettings.label'), size: 'text', cell: (reason) => reason.label },
            {
              id: 'comment',
              header: t('stockSettings.commentRequired'),
              size: 'date',
              cell: (reason) => (reason.commentRequired ? t('common.yes') : t('common.no')),
            },
            {
              id: 'state',
              header: t('stockSettings.state'),
              size: 'code',
              cell: (reason) => <ActiveBadge active={reason.active} />,
            },
            {
              id: 'actions',
              header: '',
              size: 'code',
              cell: (reason) => (
                <Button
                  onPress={() => {
                    setEditing(reason.id);
                  }}
                >
                  {t('common.edit')}
                </Button>
              ),
            },
          ]}
        />
      </Panel>
      {editing === undefined ? null : (
        <ReasonForm
          key={editing === NEW ? NEW : JSON.stringify(edited)}
          reason={edited}
          onClose={() => {
            setEditing(undefined);
          }}
        />
      )}
    </>
  );
}

function ReasonForm({ reason, onClose }: { reason: MovementReason | undefined; onClose: () => void }) {
  const { t } = useTranslation();
  const gesture = useGesture();
  const form = useGestureForm(saveMovementReason, {
    reasonId: reason?.id ?? null,
    nature: reason?.nature,
    label: reason?.label ?? '',
    commentRequired: reason?.commentRequired ?? false,
    active: reason?.active ?? true,
  });
  const [commentRequired, active] = useWatch({ control: form.control, name: ['commentRequired', 'active'] });
  const submit = form.handleSubmit(async (input) => {
    if ((await gesture.run(saveMovementReason, input)) !== undefined) onClose();
  });
  const flags = { commentRequired, active };
  return (
    <>
      <RefusalBanner refusal={gesture.refusal} onDismiss={gesture.dismiss} />
      <Panel
        title={
          reason === undefined
            ? t('stockSettings.newReason')
            : t('stockSettings.editReason', { label: reason.label })
        }
        actions={<Button onPress={onClose}>{t('stock.close')}</Button>}
      >
        <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
          <div className="grid grid-cols-2 items-end gap-4">
            <Controller
              control={form.control}
              name="nature"
              render={({ field }) => (
                <Select
                  label={t('stockSettings.nature')}
                  placeholder={t('stock.choose')}
                  options={reasonNatureSchema.options.map((nature) => ({
                    id: nature,
                    label: t(`reasonNature.${nature}`),
                  }))}
                  value={field.value ?? null}
                  onChange={(value) => {
                    field.onChange(reasonNatureSchema.safeParse(value).data ?? field.value);
                  }}
                />
              )}
            />
            <Controller
              control={form.control}
              name="label"
              render={({ field }) => <TextField label={t('stockSettings.label')} {...textField(field)} />}
            />
          </div>
          <ChipGroup
            label={t('stockSettings.characteristics')}
            options={[
              { id: 'commentRequired', label: t('stockSettings.commentRequired') },
              { id: 'active', label: t('common.active') },
            ]}
            value={Object.entries(flags).flatMap(([key, on]) => (on ? [key] : []))}
            onChange={(value) => {
              for (const key of ['commentRequired', 'active'] as const)
                form.setValue(key, value.includes(key), { shouldValidate: true, shouldDirty: true });
            }}
          />
          <div className="flex justify-end">
            <Button type="submit" variant="primary" isDisabled={!form.formState.isValid || gesture.sending}>
              {reason === undefined ? t('common.create') : t('common.save')}
            </Button>
          </div>
        </form>
      </Panel>
    </>
  );
}

// — Types de support —

/** Types de support (RG-STK-046) : caractéristiques physiques par défaut, caractère consigné. */
export function HandlingUnitTypesTab() {
  const { t } = useTranslation();
  const { data } = useQuery(contractQuery(listHandlingUnitTypes, {}));
  const [editing, setEditing] = useState<Editing>();
  const types = data?.types ?? [];
  const edited = editing === NEW ? undefined : types.find((type) => type.id === editing);
  const dimensions = (type: HandlingUnitType) =>
    [type.lengthMm, type.widthMm, type.heightMm]
      .map((value) => (value === null ? NONE : String(value)))
      .join(' × ');
  return (
    <>
      <Panel
        title={t('stockSettings.handlingUnitTypes')}
        actions={
          <Button
            onPress={() => {
              setEditing(NEW);
            }}
          >
            {t('stockSettings.addType')}
          </Button>
        }
      >
        <DataTable<HandlingUnitType>
          label={t('stockSettings.handlingUnitTypes')}
          rows={types}
          rowKey={(type) => type.id}
          empty={null}
          columns={[
            {
              id: 'code',
              header: t('stockSettings.code'),
              size: 'code',
              code: true,
              cell: (type) => type.code,
            },
            { id: 'label', header: t('stockSettings.label'), size: 'text', cell: (type) => type.label },
            {
              id: 'dimensions',
              header: t('stockSettings.dimensions'),
              size: 'date',
              code: true,
              cell: dimensions,
            },
            {
              id: 'tare',
              header: t('stockSettings.tare'),
              size: 'number',
              numeric: true,
              cell: (type) => type.tareWeightGrams ?? NONE,
            },
            {
              id: 'returnable',
              header: t('stockSettings.returnable'),
              size: 'code',
              cell: (type) => (type.returnable ? t('common.yes') : t('common.no')),
            },
            {
              id: 'state',
              header: t('stockSettings.state'),
              size: 'code',
              cell: (type) => <ActiveBadge active={type.active} />,
            },
            {
              id: 'actions',
              header: '',
              size: 'code',
              cell: (type) => (
                <Button
                  onPress={() => {
                    setEditing(type.id);
                  }}
                >
                  {t('common.edit')}
                </Button>
              ),
            },
          ]}
        />
      </Panel>
      {editing === undefined ? null : (
        <HandlingUnitTypeForm
          key={editing === NEW ? NEW : JSON.stringify(edited)}
          type={edited}
          onClose={() => {
            setEditing(undefined);
          }}
        />
      )}
    </>
  );
}

function HandlingUnitTypeForm({
  type,
  onClose,
}: {
  type: HandlingUnitType | undefined;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const gesture = useGesture();
  const form = useGestureForm(saveHandlingUnitType, {
    typeId: type?.id ?? null,
    code: type?.code ?? '',
    label: type?.label ?? '',
    lengthMm: type?.lengthMm ?? null,
    widthMm: type?.widthMm ?? null,
    heightMm: type?.heightMm ?? null,
    tareWeightGrams: type?.tareWeightGrams ?? null,
    returnable: type?.returnable ?? false,
    active: type?.active ?? true,
  });
  const [returnable, active] = useWatch({ control: form.control, name: ['returnable', 'active'] });
  const submit = form.handleSubmit(async (input) => {
    if ((await gesture.run(saveHandlingUnitType, input)) !== undefined) onClose();
  });
  const flags = { returnable, active };
  const measure = (name: 'lengthMm' | 'widthMm' | 'heightMm' | 'tareWeightGrams', label: string) => (
    <Controller
      control={form.control}
      name={name}
      render={({ field }) => <NumberField label={label} minValue={1} {...valueField(field)} />}
    />
  );
  return (
    <>
      <RefusalBanner refusal={gesture.refusal} onDismiss={gesture.dismiss} />
      <Panel
        title={
          type === undefined ? t('stockSettings.newType') : t('stockSettings.editType', { code: type.code })
        }
        actions={<Button onPress={onClose}>{t('stock.close')}</Button>}
      >
        <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
          <div className="grid grid-cols-2 gap-4">
            <Controller
              control={form.control}
              name="code"
              render={({ field }) => <TextField label={t('stockSettings.code')} {...textField(field)} code />}
            />
            <Controller
              control={form.control}
              name="label"
              render={({ field }) => <TextField label={t('stockSettings.label')} {...textField(field)} />}
            />
          </div>
          <div className="grid grid-cols-4 gap-4">
            {measure('lengthMm', t('stockSettings.length'))}
            {measure('widthMm', t('stockSettings.width'))}
            {measure('heightMm', t('stockSettings.height'))}
            {measure('tareWeightGrams', t('stockSettings.tare'))}
          </div>
          <ChipGroup
            label={t('stockSettings.characteristics')}
            options={[
              { id: 'returnable', label: t('stockSettings.returnable') },
              { id: 'active', label: t('common.active') },
            ]}
            value={Object.entries(flags).flatMap(([key, on]) => (on ? [key] : []))}
            onChange={(value) => {
              for (const key of ['returnable', 'active'] as const)
                form.setValue(key, value.includes(key), { shouldValidate: true, shouldDirty: true });
            }}
          />
          <div className="flex justify-end">
            <Button type="submit" variant="primary" isDisabled={!form.formState.isValid || gesture.sending}>
              {type === undefined ? t('common.create') : t('common.save')}
            </Button>
          </div>
        </form>
      </Panel>
    </>
  );
}

// — Photo quotidienne du site —

/** Heure de la photo quotidienne d'un site, hors de ses plages d'ouverture (RG-STK-060). */
export function SnapshotTimePanel({ siteId }: { siteId: string }) {
  const { data } = useQuery(contractQuery(listSnapshots, { siteId }));
  if (data === undefined) return null;
  return <SnapshotTimeForm key={data.snapshotTime} siteId={siteId} current={data.snapshotTime} />;
}

function SnapshotTimeForm({ siteId, current }: { siteId: string; current: string }) {
  const { t } = useTranslation();
  const gesture = useGesture();
  const form = useGestureForm(setSnapshotTime, { siteId, snapshotTime: current });
  const submit = form.handleSubmit((input) => gesture.run(setSnapshotTime, input));
  return (
    <>
      <RefusalBanner refusal={gesture.refusal} onDismiss={gesture.dismiss} />
      <Panel title={t('stockSettings.snapshotTitle')} meta={t('stockSettings.snapshotHint')}>
        <form
          className="grid grid-cols-(--cairn-line-columns) items-end gap-3"
          onSubmit={(event) => void submit(event)}
        >
          <Controller
            control={form.control}
            name="snapshotTime"
            render={({ field }) => (
              <TimeField
                label={t('stockSettings.snapshotTime')}
                value={field.value}
                onChange={(time) => {
                  if (time !== null) field.onChange(time);
                }}
              />
            )}
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
