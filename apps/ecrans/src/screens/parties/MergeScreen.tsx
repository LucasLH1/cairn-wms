import {
  getParty,
  listParties,
  mergeEndCustomers,
  mergeableFieldSchema,
  type PartyDetail,
} from '@cairn/contrat';
import { Banner, Button, ChipGroup, Panel, Select } from '@cairn/ui';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { contractQuery } from '../../contract/query.js';
import { RefusalBanner } from '../../contract/RefusalBanner.js';
import { useGesture } from '../../contract/useGesture.js';

const fields = mergeableFieldSchema.options;

/**
 * Fusion de deux fiches (0.5, parcours « Fusionner deux fiches clients ») : comparaison côte à côte, choix
 * de la fiche conservée et, champ par champ, de la valeur retenue ; avertissement explicite, puis
 * validation. La fusion est toujours décidée par un humain (RG-TRS-015).
 */
export function MergeScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { partyId } = useParams({ from: '/shell/parties/$partyId/merge' });
  const search = useSearch({ from: '/shell/parties/$partyId/merge' });
  const gesture = useGesture();
  const [otherId, setOtherId] = useState<string | null>(search.other === '' ? null : search.other);
  const [keepFirst, setKeepFirst] = useState(true);
  const [taken, setTaken] = useState<readonly string[]>([]);
  const first = useQuery(contractQuery(getParty, { partyId })).data?.party;
  const second = useQuery({
    ...contractQuery(getParty, { partyId: otherId ?? '' }),
    enabled: otherId !== null,
  }).data?.party;
  const candidates = useQuery({
    ...contractQuery(listParties, {
      family: 'endCustomer',
      principalId: first?.principalId ?? null,
      search: null,
    }),
    enabled: first !== undefined,
  }).data?.parties.filter(
    (party) => party.id !== partyId && !party.anonymized && party.mergedIntoPartyId === null,
  );
  if (first === undefined) return null;
  const [kept, absorbed] = keepFirst ? [first, second] : [second, first];

  const merge = async () => {
    if (kept === undefined || absorbed === undefined) return;
    const done = await gesture.run(mergeEndCustomers, {
      keptPartyId: kept.id,
      absorbedPartyId: absorbed.id,
      takeFromAbsorbed: fields.filter((field) => taken.includes(field)),
    });
    if (done !== undefined) await navigate({ to: '/parties/$partyId', params: { partyId: kept.id } });
  };

  const column = (party: PartyDetail | undefined, title: string) => (
    <Panel title={title} meta={party?.code}>
      {party === undefined ? null : (
        <>
          <div>{party.name}</div>
          <div>{party.email ?? '—'}</div>
          <div>{party.phone ?? '—'}</div>
          <div>
            {party.addresses
              .filter((address) => address.active)
              .map((address) => [address.line1, address.postalCode, address.city].filter(Boolean).join(' '))
              .join(' · ') || '—'}
          </div>
        </>
      )}
    </Panel>
  );

  return (
    <>
      <RefusalBanner refusal={gesture.refusal} onDismiss={gesture.dismiss} />
      <Panel title={t('endCustomer.mergeTitle')}>
        <div className="grid grid-cols-2 gap-4">
          <Select
            label={t('endCustomer.other')}
            placeholder={t('expectedReceipt.choose')}
            options={(candidates ?? []).map((party) => ({
              id: party.id,
              label: `${party.code} · ${party.name}`,
            }))}
            value={otherId}
            onChange={setOtherId}
          />
          <Select
            label={t('endCustomer.kept')}
            placeholder={t('expectedReceipt.choose')}
            options={[
              { id: 'first', label: first.code },
              ...(second === undefined ? [] : [{ id: 'second', label: second.code }]),
            ]}
            value={keepFirst ? 'first' : 'second'}
            onChange={(value) => {
              setKeepFirst(value !== 'second');
            }}
          />
        </div>
      </Panel>
      <div className="grid grid-cols-2 gap-4">
        {column(kept, t('endCustomer.kept'))}
        {column(absorbed, t('endCustomer.absorbed'))}
      </div>
      {absorbed === undefined ? null : (
        <Panel title={t('endCustomer.takeFrom')}>
          <ChipGroup
            label={t('endCustomer.absorbed')}
            options={fields.map((field) => ({ id: field, label: t(`party.${field}`) }))}
            value={taken}
            onChange={setTaken}
          />
          <Banner tone="warn">{t('endCustomer.mergeWarning')}</Banner>
          <div className="flex justify-end">
            <Button variant="primary" isDisabled={gesture.sending} onPress={() => void merge()}>
              {t('endCustomer.confirmMerge')}
            </Button>
          </div>
        </Panel>
      )}
    </>
  );
}
