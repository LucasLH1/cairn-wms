import { listParties, saveParty, type PartyFamily, type PartyRow } from '@cairn/contrat';
import { Button, DataTable, Panel, Select, StatusBadge, TextField } from '@cairn/ui';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { Controller, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { textField, useGestureForm } from '../../contract/form.js';
import { contractQuery } from '../../contract/query.js';
import { RefusalBanner } from '../../contract/RefusalBanner.js';
import { useGesture } from '../../contract/useGesture.js';
import { useChangeSignal } from '../../signals/useChangeSignal.js';
import { RouteLink } from '../../shell/RouteLink.js';

const natures = ['repair', 'destruction', 'recycling', 'refurbishment', 'other'] as const;

/** Tiers d'une famille, avec recherche et création ; une ligne ouvre la fiche. */
export function PartyListPanel({
  family,
  principalId,
  title,
  canCreate,
}: {
  family: PartyFamily;
  principalId: string | null;
  title: string;
  canCreate: boolean;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const gesture = useGesture();
  const [search, setSearch] = useState('');
  const form = useGestureForm(saveParty, {
    partyId: null,
    family,
    principalId,
    code: null,
    name: '',
    email: null,
    phone: null,
    subcontractingNature: null,
    issuesDestructionCertificate: false,
  });
  const [code, nature] = useWatch({ control: form.control, name: ['code', 'subcontractingNature'] });
  const query = contractQuery(listParties, {
    family,
    principalId,
    search: search.trim() === '' ? null : search,
  });
  const { data } = useQuery(query);
  useChangeSignal('Party', undefined, query.queryKey);

  const submit = form.handleSubmit(async (input) => {
    const created = await gesture.run(saveParty, input);
    if (created !== undefined)
      await navigate({ to: '/parties/$partyId', params: { partyId: created.partyId } });
  });

  const state = (row: PartyRow) => {
    if (row.anonymized) return <StatusBadge tone="mute">{t('party.anonymized')}</StatusBadge>;
    if (row.mergedIntoPartyId !== null) return <StatusBadge tone="mute">{t('party.merged')}</StatusBadge>;
    if (row.toComplete) return <StatusBadge tone="warn">{t('party.toComplete')}</StatusBadge>;
    return (
      <StatusBadge tone={row.active ? 'ok' : 'mute'}>
        {row.active ? t('common.active') : t('common.inactive')}
      </StatusBadge>
    );
  };

  return (
    <>
      <RefusalBanner refusal={gesture.refusal} onDismiss={gesture.dismiss} />
      <Panel title={title}>
        <div className="grid grid-cols-2 gap-4">
          <TextField label={t('party.search')} value={search} onChange={setSearch} />
        </div>
        <DataTable<PartyRow>
          label={title}
          rows={data?.parties ?? []}
          rowKey={(row) => row.id}
          empty={t('party.none')}
          columns={[
            {
              id: 'code',
              header: t('party.code'),
              size: 'text',
              code: true,
              cell: (row) => (
                <RouteLink to="/parties/$partyId" params={{ partyId: row.id }}>
                  {row.code}
                </RouteLink>
              ),
            },
            {
              id: 'name',
              header: t('party.name'),
              size: 'text',
              cell: (row) => (row.anonymized ? t('party.anonymized') : row.name),
            },
            { id: 'city', header: t('party.city'), size: 'text', cell: (row) => row.city ?? '—' },
            { id: 'state', header: t('party.state'), size: 'status', cell: state },
          ]}
        />
        {canCreate ? (
          <form
            className="grid grid-cols-(--cairn-line-columns) items-end gap-3"
            onSubmit={(event) => void submit(event)}
          >
            <Controller
              control={form.control}
              name="name"
              render={({ field }) => <TextField label={t('party.name')} {...textField(field)} />}
            />
            {family === 'subcontractor' ? (
              <Controller
                control={form.control}
                name="subcontractingNature"
                render={({ field }) => (
                  <Select
                    label={t('party.nature')}
                    placeholder={t('expectedReceipt.choose')}
                    options={natures.map((option) => ({ id: option, label: t(`party.natures.${option}`) }))}
                    value={field.value}
                    onChange={(value) => {
                      field.onChange(natures.find((option) => option === value) ?? null);
                    }}
                  />
                )}
              />
            ) : (
              <Controller
                control={form.control}
                name="code"
                render={({ field }) => (
                  <TextField label={t('party.code')} {...textField(field, { optional: true })} code />
                )}
              />
            )}
            {/* Code exigé hors client final (clé générée) et sous-traitant, nature exigée du sous-traitant :
                le schéma du geste, commun à toutes les familles, ne le dit pas. */}
            <Button
              type="submit"
              variant="primary"
              isDisabled={
                !form.formState.isValid ||
                (family !== 'endCustomer' && family !== 'subcontractor' && code === null) ||
                (family === 'subcontractor' && nature === null) ||
                gesture.sending
              }
            >
              {t('party.create')}
            </Button>
          </form>
        ) : null}
        {canCreate && family === 'endCustomer' ? <span>{t('party.codeHint')}</span> : null}
      </Panel>
    </>
  );
}
