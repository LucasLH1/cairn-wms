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
import { Controller, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { textField, useGestureForm, valueField } from '../../contract/form.js';
import { contractQuery } from '../../contract/query.js';
import { RefusalBanner } from '../../contract/RefusalBanner.js';
import { useGesture } from '../../contract/useGesture.js';
import { useHasPermission } from '../../shell/site.js';
import { useChangeSignal } from '../../signals/useChangeSignal.js';
import { formatDate } from '../format.js';

type Gesture = ReturnType<typeof useGesture>;

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
  const form = useGestureForm(saveParty, {
    partyId: party.id,
    family: party.family,
    principalId: party.principalId,
    code: party.code,
    name: party.name,
    email: party.email,
    phone: party.phone,
    subcontractingNature: party.subcontractingNature,
    issuesDestructionCertificate: party.issuesDestructionCertificate,
  });
  const nature = useWatch({ control: form.control, name: 'subcontractingNature' });
  const submit = form.handleSubmit((input) =>
    gesture.run(saveParty, {
      ...input,
      subcontractingNature: party.family === 'subcontractor' ? input.subcontractingNature : null,
    }),
  );
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
        <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
          <div className="grid grid-cols-2 gap-4">
            <Controller
              control={form.control}
              name="code"
              render={({ field }) => (
                <TextField
                  label={t('party.code')}
                  {...textField(field, { optional: true })}
                  isDisabled={readOnly}
                  code
                />
              )}
            />
            <Controller
              control={form.control}
              name="name"
              render={({ field }) => (
                <TextField label={t('party.name')} {...textField(field)} isDisabled={readOnly} />
              )}
            />
            <Controller
              control={form.control}
              name="email"
              render={({ field }) => (
                <TextField
                  label={t('party.email')}
                  {...textField(field, { optional: true, compact: true })}
                  type="email"
                  isDisabled={readOnly}
                />
              )}
            />
            <Controller
              control={form.control}
              name="phone"
              render={({ field }) => (
                <TextField
                  label={t('party.phone')}
                  {...textField(field, { optional: true })}
                  type="tel"
                  isDisabled={readOnly}
                />
              )}
            />
            {party.family === 'subcontractor' ? (
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
            ) : null}
            {party.family === 'subcontractor' && nature === 'destruction' ? (
              <Controller
                control={form.control}
                name="issuesDestructionCertificate"
                render={({ field }) => (
                  <ChipGroup
                    label={t('party.certificate')}
                    options={[{ id: 'certificate', label: t('party.certificate') }]}
                    value={field.value ? ['certificate'] : []}
                    onChange={(value) => {
                      field.onChange(value.includes('certificate'));
                    }}
                  />
                )}
              />
            ) : null}
          </div>
          {readOnly ? null : (
            <div className="flex justify-end">
              <Button type="submit" variant="primary" isDisabled={!form.formState.isValid || gesture.sending}>
                {t('common.save')}
              </Button>
            </div>
          )}
        </form>
      </Panel>
    </>
  );
}

interface AddressDraft {
  readonly addressId: string | null;
  readonly usage: AddressUsage;
  readonly isDefault: boolean;
  readonly recipient: string | null;
  readonly line1: string;
  readonly line2: string | null;
  readonly postalCode: string;
  readonly city: string;
  readonly countryCode: string;
}

const emptyAddress: AddressDraft = {
  addressId: null,
  usage: 'delivery',
  isDefault: true,
  recipient: null,
  line1: '',
  line2: null,
  postalCode: '',
  city: '',
  countryCode: 'FR',
};

/** Adresses par usage, une par défaut de chaque usage (RG-TRS-007, 008) ; format du pays (RG-TRS-009). */
function AddressesPanel({ party, readOnly }: { party: PartyDetail; readOnly: boolean }) {
  const { t } = useTranslation();
  const gesture = useGesture();
  const [draft, setDraft] = useState<AddressDraft | undefined>();
  // Chaque ouverture repart de sa propre saisie, même quand une autre était déjà ouverte.
  const [opening, setOpening] = useState(0);
  const open = (values: AddressDraft) => {
    setDraft(values);
    setOpening((count) => count + 1);
  };
  return (
    <>
      <RefusalBanner refusal={gesture.refusal} onDismiss={gesture.dismiss} />
      <Panel
        title={t('address.title')}
        actions={
          readOnly ? undefined : (
            <Button
              onPress={() => {
                open(emptyAddress);
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
                        open({
                          addressId: address.id,
                          usage: address.usage,
                          isDefault: address.isDefault,
                          recipient: address.recipient,
                          line1: address.line1 ?? '',
                          line2: address.line2,
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
          <AddressForm
            key={opening}
            partyId={party.id}
            draft={draft}
            gesture={gesture}
            onClose={() => {
              setDraft(undefined);
            }}
          />
        )}
      </Panel>
    </>
  );
}

/** La saisie d'une adresse : un formulaire du geste `saveAddress`. */
function AddressForm({
  partyId,
  draft,
  gesture,
  onClose,
}: {
  partyId: string;
  draft: AddressDraft;
  gesture: Gesture;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const form = useGestureForm(saveAddress, { ...draft, partyId });
  const [countryCode, postalCode] = useWatch({ control: form.control, name: ['countryCode', 'postalCode'] });
  const pattern = postalCodePatterns[countryCode.toUpperCase()];
  const postalValid = pattern === undefined || pattern.test(postalCode.trim().toUpperCase());
  const submit = form.handleSubmit((input) =>
    gesture.run(saveAddress, input).then((saved) => {
      if (saved !== undefined) onClose();
    }),
  );
  return (
    <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
      <div className="grid grid-cols-3 gap-4">
        <Controller
          control={form.control}
          name="usage"
          render={({ field }) => (
            <Select
              label={t('address.usage')}
              placeholder={t('expectedReceipt.choose')}
              options={addressUsageSchema.options.map((usage) => ({
                id: usage,
                label: t(`address.usages.${usage}`),
              }))}
              value={field.value}
              onChange={(value) => {
                const usage = addressUsageSchema.safeParse(value);
                if (usage.success) field.onChange(usage.data);
              }}
            />
          )}
        />
        <Controller
          control={form.control}
          name="recipient"
          render={({ field }) => (
            <TextField label={t('address.recipient')} {...textField(field, { optional: true })} />
          )}
        />
        <Controller
          control={form.control}
          name="countryCode"
          render={({ field }) => (
            <TextField
              label={t('address.countryCode')}
              {...textField(field)}
              onChange={(text) => {
                field.onChange(text.toUpperCase());
              }}
              code
            />
          )}
        />
        <Controller
          control={form.control}
          name="line1"
          render={({ field }) => <TextField label={t('address.line1')} {...textField(field)} />}
        />
        <Controller
          control={form.control}
          name="line2"
          render={({ field }) => (
            <TextField label={t('address.line2')} {...textField(field, { optional: true })} />
          )}
        />
        <Controller
          control={form.control}
          name="postalCode"
          render={({ field }) => <TextField label={t('address.postalCode')} {...textField(field)} code />}
        />
        <Controller
          control={form.control}
          name="city"
          render={({ field }) => <TextField label={t('address.city')} {...textField(field)} />}
        />
        <Controller
          control={form.control}
          name="isDefault"
          render={({ field }) => (
            <ChipGroup
              label={t('address.isDefault')}
              options={[{ id: 'default', label: t('address.isDefault') }]}
              value={field.value ? ['default'] : []}
              onChange={(value) => {
                field.onChange(value.includes('default'));
              }}
            />
          )}
        />
      </div>
      {postalValid ? null : (
        <Banner tone="warn">
          {t('address.postalFormat', {
            example: postalExamples[countryCode.toUpperCase()] ?? '',
          })}
        </Banner>
      )}
      <div className="flex justify-end gap-2">
        <Button onPress={onClose}>{t('common.cancel')}</Button>
        {/* Le format du code postal dépend du pays choisi (RG-TRS-009) : le schéma du geste ne le dit pas. */}
        <Button
          type="submit"
          variant="primary"
          isDisabled={!postalValid || !form.formState.isValid || gesture.sending}
        >
          {t('common.save')}
        </Button>
      </div>
    </form>
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
  const form = useGestureForm(anonymizeEndCustomer, { partyId: party.id, reason: '' });
  const submit = form.handleSubmit((input) => gesture.run(anonymizeEndCustomer, input));
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
            <form
              className="grid grid-cols-(--cairn-line-columns) items-end gap-3"
              onSubmit={(event) => void submit(event)}
            >
              <Controller
                control={form.control}
                name="reason"
                render={({ field }) => <TextField label={t('endCustomer.reason')} {...textField(field)} />}
              />
              <Button
                onPress={() => {
                  setAnonymizing(false);
                }}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" variant="primary" isDisabled={!form.formState.isValid || gesture.sending}>
                {t('endCustomer.confirm')}
              </Button>
            </form>
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
  readonly leadTimeDays: number;
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
  // Chaque ouverture repart de sa propre saisie, même quand une autre était déjà ouverte.
  const [opening, setOpening] = useState(0);
  const open = (values: ServiceDraft) => {
    setDraft(values);
    setOpening((count) => count + 1);
  };
  return (
    <>
      <RefusalBanner refusal={gesture.refusal} onDismiss={gesture.dismiss} />
      <Panel
        title={t('carrier.services')}
        actions={
          <Button
            onPress={() => {
              open(emptyService);
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
                    open({ ...service, serviceId: service.id });
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
          <ServiceForm
            key={opening}
            carrierId={party.id}
            draft={draft}
            gesture={gesture}
            onClose={() => {
              setDraft(undefined);
            }}
          />
        )}
      </Panel>
    </>
  );
}

/** La saisie d'un service : un formulaire du geste `saveCarrierService`. */
function ServiceForm({
  carrierId,
  draft,
  gesture,
  onClose,
}: {
  carrierId: string;
  draft: ServiceDraft;
  gesture: Gesture;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const form = useGestureForm(saveCarrierService, { ...draft, carrierId });
  const submit = form.handleSubmit((input) =>
    gesture.run(saveCarrierService, input).then((saved) => {
      if (saved !== undefined) onClose();
    }),
  );
  const numeric = (key: keyof ServiceDraft & `max${string}`, label: string) => (
    <Controller
      control={form.control}
      name={key}
      render={({ field }) => <NumberField label={label} {...valueField(field)} minValue={1} />}
    />
  );
  return (
    <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
      <div className="grid grid-cols-3 gap-4">
        <Controller
          control={form.control}
          name="code"
          render={({ field }) => <TextField label={t('carrier.serviceCode')} {...textField(field)} code />}
        />
        <Controller
          control={form.control}
          name="name"
          render={({ field }) => <TextField label={t('carrier.serviceName')} {...textField(field)} />}
        />
        <Controller
          control={form.control}
          name="direction"
          render={({ field }) => (
            <Select
              label={t('carrier.direction')}
              placeholder={t('expectedReceipt.choose')}
              options={directions.map((option) => ({
                id: option,
                label: t(`carrier.directions.${option}`),
              }))}
              value={field.value}
              onChange={(value) => {
                field.onChange(directions.find((option) => option === value) ?? 'outbound');
              }}
            />
          )}
        />
        {numeric('maxWeightGrams', t('carrier.maxWeightGrams'))}
        {numeric('maxLengthMm', t('carrier.maxLengthMm'))}
        {numeric('maxWidthMm', t('carrier.maxWidthMm'))}
        {numeric('maxHeightMm', t('carrier.maxHeightMm'))}
        {numeric('maxDimensionSumMm', t('carrier.maxDimensionSumMm'))}
        {numeric('maxInsuredValueCents', t('carrier.maxInsuredValueCents'))}
        <Controller
          control={form.control}
          name="label"
          render={({ field }) => (
            <Select
              label={t('carrier.label')}
              placeholder={t('expectedReceipt.choose')}
              options={labelKinds.map((option) => ({ id: option, label: t(`carrier.labels.${option}`) }))}
              value={field.value}
              onChange={(value) => {
                field.onChange(labelKinds.find((option) => option === value) ?? 'carrier');
              }}
            />
          )}
        />
        <Controller
          control={form.control}
          name="leadTimeDays"
          render={({ field }) => <NumberField label={t('carrier.leadTimeDays')} {...valueField(field)} />}
        />
        <Controller
          control={form.control}
          name="acceptsDangerousGoods"
          render={({ field }) => (
            <ChipGroup
              label={t('carrier.dangerousGoods')}
              options={[{ id: 'adr', label: t('carrier.dangerousGoods') }]}
              value={field.value ? ['adr'] : []}
              onChange={(value) => {
                field.onChange(value.includes('adr'));
              }}
            />
          )}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button onPress={onClose}>{t('common.cancel')}</Button>
        <Button type="submit" variant="primary" isDisabled={!form.formState.isValid || gesture.sending}>
          {t('common.save')}
        </Button>
      </div>
    </form>
  );
}

const PROVIDER = 'provider';

/** Comptes d'un transporteur, du prestataire ou d'un donneur d'ordre (RG-TRS-030). */
function AccountsPanel({ party }: { party: PartyDetail }) {
  const { t } = useTranslation();
  const gesture = useGesture();
  const principals = useQuery(contractQuery(listPrincipals, {}));
  const form = useGestureForm(saveCarrierAccount, {
    accountId: null,
    carrierId: party.id,
    principalId: null,
    accountNumber: '',
    contractReference: null,
  });
  const submit = form.handleSubmit((input) =>
    gesture.run(saveCarrierAccount, input).then((saved) => {
      if (saved !== undefined) {
        form.setValue('accountNumber', '', { shouldValidate: true });
        form.setValue('contractReference', null, { shouldValidate: true });
      }
    }),
  );
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
        <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
          <div className="grid grid-cols-3 gap-4">
            <Controller
              control={form.control}
              name="accountNumber"
              render={({ field }) => (
                <TextField label={t('carrier.accountNumber')} {...textField(field)} code />
              )}
            />
            <Controller
              control={form.control}
              name="contractReference"
              render={({ field }) => (
                <TextField label={t('carrier.contractReference')} {...textField(field, { optional: true })} />
              )}
            />
            <Controller
              control={form.control}
              name="principalId"
              render={({ field }) => (
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
                  value={field.value ?? PROVIDER}
                  onChange={(value) => {
                    field.onChange(value === null || value === PROVIDER ? null : value);
                  }}
                />
              )}
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="primary" isDisabled={!form.formState.isValid || gesture.sending}>
              {t('carrier.addAccount')}
            </Button>
          </div>
        </form>
      </Panel>
    </>
  );
}
