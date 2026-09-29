import { listParties, saveParty, type PartyFamily, type PartyRow } from '@cairn/contrat';
import { Button, DataTable, Panel, Select, StatusBadge, TextField } from '@cairn/ui';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { contractQuery } from '../../contract/query.js';
import { RefusalBanner } from '../../contract/RefusalBanner.js';
import { useGesture } from '../../contract/useGesture.js';
import { useChangeSignal } from '../../signals/useChangeSignal.js';

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
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [nature, setNature] = useState<(typeof natures)[number] | null>(null);
  const query = contractQuery(listParties, {
    family,
    principalId,
    search: search.trim() === '' ? null : search,
  });
  const { data } = useQuery(query);
  useChangeSignal('Party', undefined, query.queryKey);

  const create = async () => {
    const created = await gesture.run(saveParty, {
      partyId: null,
      family,
      principalId,
      code: code.trim() === '' ? null : code.trim(),
      name,
      email: null,
      phone: null,
      subcontractingNature: family === 'subcontractor' ? nature : null,
      issuesDestructionCertificate: false,
    });
    if (created !== undefined)
      await navigate({ to: '/parties/$partyId', params: { partyId: created.partyId } });
  };

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
                <Link to="/parties/$partyId" params={{ partyId: row.id }}>
                  {row.code}
                </Link>
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
          <div className="grid grid-cols-(--cairn-line-columns) items-end gap-3">
            <TextField label={t('party.name')} value={name} onChange={setName} />
            {family === 'subcontractor' ? (
              <Select
                label={t('party.nature')}
                placeholder={t('expectedReceipt.choose')}
                options={natures.map((option) => ({ id: option, label: t(`party.natures.${option}`) }))}
                value={nature}
                onChange={(value) => {
                  setNature(natures.find((option) => option === value) ?? null);
                }}
              />
            ) : (
              <TextField label={t('party.code')} value={code} onChange={setCode} code />
            )}
            <Button
              variant="primary"
              isDisabled={
                name.trim() === '' ||
                (family !== 'endCustomer' && family !== 'subcontractor' && code.trim() === '') ||
                (family === 'subcontractor' && nature === null) ||
                gesture.sending
              }
              onPress={() => void create()}
            >
              {t('party.create')}
            </Button>
          </div>
        ) : null}
        {canCreate && family === 'endCustomer' ? <span>{t('party.codeHint')}</span> : null}
      </Panel>
    </>
  );
}
