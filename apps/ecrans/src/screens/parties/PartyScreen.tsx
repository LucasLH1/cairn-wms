import {
  addressUsageSchema,
  anonymizeEndCustomer,
  getParty,
  listPrincipals,
  postalCodePatterns,
  saveAddress,
  saveCarrierAccount,
  saveCarrierService,
  saveParty,
  setAddressActive,
  setCarrierAccountActive,
  setCarrierServiceActive,
  setPartyActive,
  type AddressUsage,
  type CarrierAccount,
  type CarrierService,
  type PartyAddress,
  type PartyDetail,
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
} from '@cairn/ui';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { contractQuery } from '../../contract/query.js';
import { RefusalBanner } from '../../contract/RefusalBanner.js';
import { useGesture } from '../../contract/useGesture.js';
import { useHasPermission } from '../../shell/site.js';
import { useChangeSignal } from '../../signals/useChangeSignal.js';
import { formatDate } from '../format.js';

const postalExamples: Readonly<Record<string, string>> = {
  FR: '75001',
  DE: '10115',
  ES: '28001',
  IT: '00118',
  BE: '1000',
  CH: '1200',
  LU: '1111',
  AT: '1010',
  NL: '1012 AB',
  PT: '1000-001',
  GB: 'SW1A 1AA',
};

/** Fiche d'un tiers (0.5) : identité, adresses par usage ; client final, transporteur selon sa famille. */
export function PartyScreen() {
  const { partyId } = useParams({ from: '/shell/parties/$partyId' });
  const query = contractQuery(getParty, { partyId });
  const { data } = useQuery(query);
  useChangeSignal('Party', partyId, query.queryKey);
  if (data === undefined) return null;
  const party = data.party;
  const readOnly = party.anonymized || party.mergedIntoPartyId !== null;
  return (
    <>
      {readOnly ? <ReadOnlyBanner /> : null}
      <IdentityPanel
        key={JSON.stringify([party.name, party.email, party.phone, party.active])}
        party={party}
        readOnly={readOnly}
      />
      <AddressesPanel party={party} readOnly={readOnly} />
      {party.family === 'endCustomer' ? <EndCustomerPanel party={party} readOnly={readOnly} /> : null}
      {party.family === 'carrier' ? <ServicesPanel party={party} /> : null}
      {party.family === 'carrier' ? <AccountsPanel party={party} /> : null}
    </>
  );
}

/** Fiche absorbée ou anonymisée : consultable, jamais modifiable (RG-TRS-016, 020). */
function ReadOnlyBanner() {
  const { t } = useTranslation();
  return <Banner tone="info">{t('party.readOnly')}</Banner>;
}

const natures = ['repair', 'destruction', 'recycling', 'refurbishment', 'other'] as const;

function IdentityPanel({ party, readOnly }: { party: PartyDetail; readOnly: boolean }) {
  const { t } = useTranslation();
  const gesture = useGesture();
  const [code, setCode] = useState(party.code);
  const [name, setName] = useState(party.name);
  const [email, setEmail] = useState(party.email ?? '');
  const [phone, setPhone] = useState(party.phone ?? '');
  const [nature, setNature] = useState(party.subcontractingNature);
  const [certificate, setCertificate] = useState(party.issuesDestructionCertificate);
  const optional = (value: string) => (value.trim() === '' ? null : value.trim());
  return (
    <>
      <RefusalBanner refusal={gesture.refusal} onDismiss={gesture.dismiss} />
      <Panel
        title={party.anonymized ? t('party.anonymized') : party.name}
        meta={`${t(`party.families.${party.family}`)} · ${party.code}`}
        actions={
          readOnly ? undefined : (
            <>
              {party.toComplete ? <StatusBadge tone="warn">{t('party.toComplete')}</StatusBadge> : null}
              <StatusBadge tone={party.active ? 'ok' : 'mute'}>
                {party.active ? t('common.active') : t('common.inactive')}
              </StatusBadge>
              <Button
                onPress={() => void gesture.run(setPartyActive, { partyId: party.id, active: !party.active })}
              >
                {party.active ? t('common.deactivate') : t('common.activate')}
              </Button>
            </>
          )
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <TextField label={t('party.code')} value={code} onChange={setCode} isDisabled={readOnly} code />
          <TextField label={t('party.name')} value={name} onChange={setName} isDisabled={readOnly} />
          <TextField
            label={t('party.email')}
            value={email}
            onChange={setEmail}
            type="email"
            isDisabled={readOnly}
          />
          <TextField
            label={t('party.phone')}
            value={phone}
            onChange={setPhone}
            type="tel"
            isDisabled={readOnly}
          />
          {party.family === 'subcontractor' ? (
            <Select
              label={t('party.nature')}
              placeholder={t('expectedReceipt.choose')}
              options={natures.map((option) => ({ id: option, label: t(`party.natures.${option}`) }))}
              value={nature}
              onChange={(value) => {
                setNature(natures.find((option) => option === value) ?? null);
              }}
            />
          ) : null}
          {party.family === 'subcontractor' && nature === 'destruction' ? (
            <ChipGroup
              label={t('party.certificate')}
              options={[{ id: 'certificate', label: t('party.certificate') }]}
              value={certificate ? ['certificate'] : []}
              onChange={(value) => {
                setCertificate(value.includes('certificate'));
              }}
            />
          ) : null}
        </div>
        {readOnly ? null : (
          <div className="flex justify-end">
            <Button
              variant="primary"
              isDisabled={name.trim() === '' || gesture.sending}
              onPress={() =>
                void gesture.run(saveParty, {
                  partyId: party.id,
                  family: party.family,
                  principalId: party.principalId,
                  code: optional(code),
                  name,
                  email: optional(email),
                  phone: optional(phone),
                  subcontractingNature: party.family === 'subcontractor' ? nature : null,
                  issuesDestructionCertificate: certificate,
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

interface AddressDraft {
  readonly addressId: string | null;
  readonly usage: AddressUsage;
  readonly isDefault: boolean;
  readonly recipient: string;
  readonly line1: string;
  readonly line2: string;
  readonly postalCode: string;
  readonly city: string;
  readonly countryCode: string;
}

const emptyAddress: AddressDraft = {
  addressId: null,
  usage: 'delivery',
  isDefault: true,
  recipient: '',
  line1: '',
  line2: '',
  postalCode: '',
  city: '',
  countryCode: 'FR',
};

/** Adresses par usage, une par défaut de chaque usage (RG-TRS-007, 008) ; format du pays (RG-TRS-009). */
function AddressesPanel({ party, readOnly }: { party: PartyDetail; readOnly: boolean }) {
  const { t } = useTranslation();
  const gesture = useGesture();
  const [draft, setDraft] = useState<AddressDraft | undefined>();
  const pattern = draft === undefined ? undefined : postalCodePatterns[draft.countryCode.toUpperCase()];
  const postalValid =
    draft === undefined || pattern === undefined || pattern.test(draft.postalCode.trim().toUpperCase());
  return (
    <>
      <RefusalBanner refusal={gesture.refusal} onDismiss={gesture.dismiss} />
      <Panel
        title={t('address.title')}
        actions={
          readOnly ? undefined : (
            <Button
              onPress={() => {
                setDraft(emptyAddress);
              }}
            >
              {t('address.add')}
            </Button>
          )
        }
      >
        <DataTable<PartyAddress>
          label={t('address.title')}
          rows={party.addresses}
          rowKey={(address) => address.id}
          empty={t('address.none')}
          columns={[
            {
              id: 'usage',
              header: t('address.usage'),
              size: 'date',
              cell: (address) => t(`address.usages.${address.usage}`),
            },
            {
              id: 'line',
              header: t('address.line1'),
              size: 'text',
              cell: (address) =>
                [address.recipient, address.line1, address.postalCode, address.city, address.countryCode]
                  .filter(Boolean)
                  .join(', '),
            },
            {
              id: 'default',
              header: t('address.isDefault'),
              size: 'number',
              cell: (address) =>
                address.isDefault ? <StatusBadge tone="ok">{t('address.isDefault')}</StatusBadge> : '—',
            },
            {
              id: 'actions',
              header: '',
              size: 'status',
              cell: (address) =>
                readOnly ? null : (
                  <div className="flex gap-2">
                    <Button
                      onPress={() => {
                        setDraft({
                          addressId: address.id,
                          usage: address.usage,
                          isDefault: address.isDefault,
                          recipient: address.recipient ?? '',
                          line1: address.line1 ?? '',
                          line2: address.line2 ?? '',
                          postalCode: address.postalCode ?? '',
                          city: address.city ?? '',
                          countryCode: address.countryCode,
                        });
                      }}
                    >
                      {t('common.edit')}
                    </Button>
                    <Button
                      onPress={() =>
                        void gesture.run(setAddressActive, { addressId: address.id, active: !address.active })
                      }
                    >
                      {address.active ? t('common.deactivate') : t('common.activate')}
                    </Button>
                  </div>
                ),
            },
          ]}
        />
        {draft === undefined ? null : (
          <>
            <div className="grid grid-cols-3 gap-4">
              <Select
                label={t('address.usage')}
                placeholder={t('expectedReceipt.choose')}
                options={addressUsageSchema.options.map((usage) => ({
                  id: usage,
                  label: t(`address.usages.${usage}`),
                }))}
                value={draft.usage}
                onChange={(value) => {
                  const usage = addressUsageSchema.safeParse(value);
                  if (usage.success) setDraft({ ...draft, usage: usage.data });
                }}
              />
              <TextField
                label={t('address.recipient')}
                value={draft.recipient}
                onChange={(recipient) => {
                  setDraft({ ...draft, recipient });
                }}
              />
              <TextField
                label={t('address.countryCode')}
                value={draft.countryCode}
                onChange={(countryCode) => {
                  setDraft({ ...draft, countryCode: countryCode.toUpperCase() });
                }}
                code
              />
              <TextField
                label={t('address.line1')}
                value={draft.line1}
                onChange={(line1) => {
                  setDraft({ ...draft, line1 });
                }}
              />
              <TextField
                label={t('address.line2')}
                value={draft.line2}
                onChange={(line2) => {
                  setDraft({ ...draft, line2 });
                }}
              />
              <TextField
                label={t('address.postalCode')}
                value={draft.postalCode}
                onChange={(postalCode) => {
                  setDraft({ ...draft, postalCode });
                }}
                code
              />
              <TextField
                label={t('address.city')}
                value={draft.city}
                onChange={(city) => {
                  setDraft({ ...draft, city });
                }}
              />
              <ChipGroup
                label={t('address.isDefault')}
                options={[{ id: 'default', label: t('address.isDefault') }]}
                value={draft.isDefault ? ['default'] : []}
                onChange={(value) => {
                  setDraft({ ...draft, isDefault: value.includes('default') });
                }}
              />
            </div>
            {postalValid ? null : (
              <Banner tone="warn">
                {t('address.postalFormat', {
                  example: postalExamples[draft.countryCode.toUpperCase()] ?? '',
                })}
              </Banner>
            )}
            <div className="flex justify-end gap-2">
              <Button
                onPress={() => {
                  setDraft(undefined);
                }}
              >
                {t('common.cancel')}
              </Button>
              <Button
                variant="primary"
                isDisabled={
                  !postalValid || draft.line1.trim() === '' || draft.city.trim() === '' || gesture.sending
                }
                onPress={() =>
                  void gesture
                    .run(saveAddress, {
                      addressId: draft.addressId,
                      partyId: party.id,
                      usage: draft.usage,
                      isDefault: draft.isDefault,
                      recipient: draft.recipient.trim() === '' ? null : draft.recipient,
                      line1: draft.line1,
                      line2: draft.line2.trim() === '' ? null : draft.line2,
                      postalCode: draft.postalCode,
                      city: draft.city,
                      countryCode: draft.countryCode.toUpperCase(),
                    })
                    .then((saved) => {
                      if (saved !== undefined) setDraft(undefined);
                    })
                }
              >
                {t('common.save')}
              </Button>
            </div>
          </>
        )}
      </Panel>
    </>
  );
}

/** Client final : dernier flux, échéance, historique unifié, anonymisation et fusion (RG-TRS-014 à 023). */
function EndCustomerPanel({ party, readOnly }: { party: PartyDetail; readOnly: boolean }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const gesture = useGesture();
  const canAnonymize = useHasPermission('anonymizeEndCustomers');
  const canMerge = useHasPermission('mergeEndCustomers');
  const [anonymizing, setAnonymizing] = useState(false);
  const [reason, setReason] = useState('');
  return (
    <>
      <RefusalBanner refusal={gesture.refusal} onDismiss={gesture.dismiss} />
      <Panel
        title={t('endCustomer.history')}
        meta={`${t('endCustomer.counters')} : 0 · 0 · 0 · 0`}
        actions={
          readOnly ? undefined : (
            <>
              {canMerge ? (
                <Button
                  onPress={() =>
                    void navigate({
                      to: '/parties/$partyId/merge',
                      params: { partyId: party.id },
                      search: { other: '' },
                    })
                  }
                >
                  {t('endCustomer.merge')}
                </Button>
              ) : null}
              {canAnonymize ? (
                <Button
                  onPress={() => {
                    setAnonymizing(true);
                  }}
                >
                  {t('endCustomer.anonymize')}
                </Button>
              ) : null}
            </>
          )
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            {t('endCustomer.lastFlow')} :{' '}
            {party.lastFlowAt === null
              ? t('endCustomer.noFlow')
              : formatDate(party.lastFlowAt.slice(0, 10), i18n.language)}
          </div>
          <div>
            {t('endCustomer.dueOn')} :{' '}
            {party.anonymizationDueOn === null
              ? t('endCustomer.noRetention')
              : formatDate(party.anonymizationDueOn, i18n.language)}
          </div>
        </div>
        <span>{t('endCustomer.historyEmpty')}</span>
        {anonymizing ? (
          <>
            {/* L'écran dit, avant validation, que l'anonymisation est irréversible (RG-TRS-023). */}
            <Banner tone="warn">{t('endCustomer.anonymizeWarning')}</Banner>
            <div className="grid grid-cols-(--cairn-line-columns) items-end gap-3">
              <TextField label={t('endCustomer.reason')} value={reason} onChange={setReason} />
              <Button
                onPress={() => {
                  setAnonymizing(false);
                }}
              >
                {t('common.cancel')}
              </Button>
              <Button
                variant="primary"
                isDisabled={reason.trim() === '' || gesture.sending}
                onPress={() => void gesture.run(anonymizeEndCustomer, { partyId: party.id, reason })}
              >
                {t('endCustomer.confirm')}
              </Button>
            </div>
          </>
        ) : null}
      </Panel>
    </>
  );
}

const directions = ['outbound', 'return', 'both'] as const;
const labelKinds = ['none', 'carrier', 'provider'] as const;

interface ServiceDraft {
  readonly serviceId: string | null;
  readonly code: string;
  readonly name: string;
  readonly direction: (typeof directions)[number];
  readonly maxWeightGrams: number | null;
  readonly maxLengthMm: number | null;
  readonly maxWidthMm: number | null;
  readonly maxHeightMm: number | null;
  readonly maxDimensionSumMm: number | null;
  readonly maxInsuredValueCents: number | null;
  readonly acceptsDangerousGoods: boolean;
  readonly label: (typeof labelKinds)[number];
  readonly leadTimeDays: number | null;
}

const emptyService: ServiceDraft = {
  serviceId: null,
  code: '',
  name: '',
  direction: 'outbound',
  maxWeightGrams: null,
  maxLengthMm: null,
  maxWidthMm: null,
  maxHeightMm: null,
  maxDimensionSumMm: null,
  maxInsuredValueCents: null,
  acceptsDangerousGoods: false,
  label: 'carrier',
  leadTimeDays: 1,
};

/** Services d'un transporteur (0.5, parcours « Déclarer un service transporteur »). */
function ServicesPanel({ party }: { party: PartyDetail }) {
  const { t } = useTranslation();
  const gesture = useGesture();
  const [draft, setDraft] = useState<ServiceDraft | undefined>();
  const numeric = (key: keyof ServiceDraft & `max${string}`, label: string) =>
    draft === undefined ? null : (
      <NumberField
        label={label}
        value={draft[key]}
        minValue={1}
        onChange={(value) => {
          setDraft({ ...draft, [key]: value });
        }}
      />
    );
  return (
    <>
      <RefusalBanner refusal={gesture.refusal} onDismiss={gesture.dismiss} />
      <Panel
        title={t('carrier.services')}
        actions={
          <Button
            onPress={() => {
              setDraft(emptyService);
            }}
          >
            {t('carrier.addService')}
          </Button>
        }
      >
        <DataTable<CarrierService>
          label={t('carrier.services')}
          rows={party.services}
          rowKey={(service) => service.id}
          empty={t('party.none')}
          columns={[
            {
              id: 'code',
              header: t('carrier.serviceCode'),
              size: 'code',
              cell: (service) => (
                <Button
                  onPress={() => {
                    setDraft({ ...service, serviceId: service.id });
                  }}
                >
                  {service.code}
                </Button>
              ),
            },
            { id: 'name', header: t('carrier.serviceName'), size: 'text', cell: (service) => service.name },
            {
              id: 'direction',
              header: t('carrier.direction'),
              size: 'status',
              cell: (service) => t(`carrier.directions.${service.direction}`),
            },
            {
              id: 'lead',
              header: t('carrier.leadTimeDays'),
              size: 'number',
              numeric: true,
              cell: (service) => service.leadTimeDays,
            },
            {
              id: 'state',
              header: '',
              size: 'status',
              cell: (service) => (
                <Button
                  onPress={() =>
                    void gesture.run(setCarrierServiceActive, {
                      serviceId: service.id,
                      active: !service.active,
                    })
                  }
                >
                  {service.active ? t('common.deactivate') : t('common.activate')}
                </Button>
              ),
            },
          ]}
        />
        {draft === undefined ? null : (
          <>
            <div className="grid grid-cols-3 gap-4">
              <TextField
                label={t('carrier.serviceCode')}
                value={draft.code}
                onChange={(code) => {
                  setDraft({ ...draft, code });
                }}
                code
              />
              <TextField
                label={t('carrier.serviceName')}
                value={draft.name}
                onChange={(name) => {
                  setDraft({ ...draft, name });
                }}
              />
              <Select
                label={t('carrier.direction')}
                placeholder={t('expectedReceipt.choose')}
                options={directions.map((option) => ({
                  id: option,
                  label: t(`carrier.directions.${option}`),
                }))}
                value={draft.direction}
                onChange={(value) => {
                  setDraft({
                    ...draft,
                    direction: directions.find((option) => option === value) ?? 'outbound',
                  });
                }}
              />
              {numeric('maxWeightGrams', t('carrier.maxWeightGrams'))}
              {numeric('maxLengthMm', t('carrier.maxLengthMm'))}
              {numeric('maxWidthMm', t('carrier.maxWidthMm'))}
              {numeric('maxHeightMm', t('carrier.maxHeightMm'))}
              {numeric('maxDimensionSumMm', t('carrier.maxDimensionSumMm'))}
              {numeric('maxInsuredValueCents', t('carrier.maxInsuredValueCents'))}
              <Select
                label={t('carrier.label')}
                placeholder={t('expectedReceipt.choose')}
                options={labelKinds.map((option) => ({ id: option, label: t(`carrier.labels.${option}`) }))}
                value={draft.label}
                onChange={(value) => {
                  setDraft({ ...draft, label: labelKinds.find((option) => option === value) ?? 'carrier' });
                }}
              />
              <NumberField
                label={t('carrier.leadTimeDays')}
                value={draft.leadTimeDays}
                onChange={(leadTimeDays) => {
                  setDraft({ ...draft, leadTimeDays });
                }}
              />
              <ChipGroup
                label={t('carrier.dangerousGoods')}
                options={[{ id: 'adr', label: t('carrier.dangerousGoods') }]}
                value={draft.acceptsDangerousGoods ? ['adr'] : []}
                onChange={(value) => {
                  setDraft({ ...draft, acceptsDangerousGoods: value.includes('adr') });
                }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                onPress={() => {
                  setDraft(undefined);
                }}
              >
                {t('common.cancel')}
              </Button>
              <Button
                variant="primary"
                isDisabled={
                  draft.code.trim() === '' ||
                  draft.name.trim() === '' ||
                  draft.leadTimeDays === null ||
                  gesture.sending
                }
                onPress={() =>
                  void gesture
                    .run(saveCarrierService, {
                      ...draft,
                      carrierId: party.id,
                      leadTimeDays: draft.leadTimeDays ?? 0,
                    })
                    .then((saved) => {
                      if (saved !== undefined) setDraft(undefined);
                    })
                }
              >
                {t('common.save')}
              </Button>
            </div>
          </>
        )}
      </Panel>
    </>
  );
}

const PROVIDER = 'provider';

/** Comptes d'un transporteur, du prestataire ou d'un donneur d'ordre (RG-TRS-030). */
function AccountsPanel({ party }: { party: PartyDetail }) {
  const { t } = useTranslation();
  const gesture = useGesture();
  const principals = useQuery(contractQuery(listPrincipals, {}));
  const [accountNumber, setAccountNumber] = useState('');
  const [contractReference, setContractReference] = useState('');
  const [principalId, setPrincipalId] = useState<string>(PROVIDER);
  const principalName = (id: string | null) =>
    id === null
      ? t('carrier.providerAccount')
      : (principals.data?.principals.find((principal) => principal.id === id)?.name ?? '');
  return (
    <>
      <RefusalBanner refusal={gesture.refusal} onDismiss={gesture.dismiss} />
      <Panel title={t('carrier.accounts')}>
        <DataTable<CarrierAccount>
          label={t('carrier.accounts')}
          rows={party.accounts}
          rowKey={(account) => account.id}
          empty={t('party.none')}
          columns={[
            {
              id: 'number',
              header: t('carrier.accountNumber'),
              size: 'text',
              code: true,
              cell: (account) => account.accountNumber,
            },
            {
              id: 'contract',
              header: t('carrier.contractReference'),
              size: 'text',
              cell: (account) => account.contractReference ?? '—',
            },
            {
              id: 'principal',
              header: t('carrier.accountPrincipal'),
              size: 'text',
              cell: (account) => principalName(account.principalId),
            },
            {
              id: 'state',
              header: '',
              size: 'status',
              cell: (account) => (
                <Button
                  onPress={() =>
                    void gesture.run(setCarrierAccountActive, {
                      accountId: account.id,
                      active: !account.active,
                    })
                  }
                >
                  {account.active ? t('common.deactivate') : t('common.activate')}
                </Button>
              ),
            },
          ]}
        />
        <div className="grid grid-cols-3 gap-4">
          <TextField
            label={t('carrier.accountNumber')}
            value={accountNumber}
            onChange={setAccountNumber}
            code
          />
          <TextField
            label={t('carrier.contractReference')}
            value={contractReference}
            onChange={setContractReference}
          />
          <Select
            label={t('carrier.accountPrincipal')}
            placeholder={t('carrier.providerAccount')}
            options={[
              { id: PROVIDER, label: t('carrier.providerAccount') },
              ...(principals.data?.principals ?? []).map((principal) => ({
                id: principal.id,
                label: principal.name,
              })),
            ]}
            value={principalId}
            onChange={(value) => {
              setPrincipalId(value ?? PROVIDER);
            }}
          />
        </div>
        <div className="flex justify-end">
          <Button
            variant="primary"
            isDisabled={accountNumber.trim() === '' || gesture.sending}
            onPress={() =>
              void gesture
                .run(saveCarrierAccount, {
                  accountId: null,
                  carrierId: party.id,
                  principalId: principalId === PROVIDER ? null : principalId,
                  accountNumber,
                  contractReference: contractReference.trim() === '' ? null : contractReference,
                })
                .then((saved) => {
                  if (saved !== undefined) {
                    setAccountNumber('');
                    setContractReference('');
                  }
                })
            }
          >
            {t('carrier.addAccount')}
          </Button>
        </div>
      </Panel>
    </>
  );
}
