import {
  getPrincipal,
  listPrincipalsForAdministration,
  savePrincipal,
  setEndCustomerRetention,
  setPrincipalCurrency,
  setPrincipalActive,
} from '@cairn/contrat';
import { Button, DataTable, NumberField, Panel, StatusBadge, TextField } from '@cairn/ui';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import { Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { textField, useGestureForm, valueField } from '../../contract/form.js';
import { contractQuery } from '../../contract/query.js';
import { RefusalBanner } from '../../contract/RefusalBanner.js';
import { useGesture } from '../../contract/useGesture.js';
import { RouteLink } from '../../shell/RouteLink.js';

const NEW = 'new';
type PrincipalRow = z.infer<typeof listPrincipalsForAdministration.output>['principals'][number];
type PrincipalDetail = z.infer<typeof getPrincipal.output>['principal'];

const optional = (value: string) => (value.trim() === '' ? null : value.trim());

/**
 * La fiche se saisit champ par champ ; le geste reçoit un code en capitales et une adresse entière ou
 * aucune. Le schéma du geste valide ce qui en résulte, comme le serveur le recevra.
 */
const principalForm = {
  input: z
    .object({
      principalId: z.string().nullable(),
      code: z.string(),
      name: z.string(),
      group: z.string(),
      line1: z.string(),
      postalCode: z.string(),
      city: z.string(),
      countryCode: z.string(),
      email: z.string(),
      phone: z.string(),
    })
    .transform(
      ({ line1, postalCode, city, countryCode, ...values }): z.input<typeof savePrincipal.input> => ({
        principalId: values.principalId,
        code: values.code.trim().toUpperCase(),
        name: values.name,
        group: optional(values.group),
        address: [line1, postalCode, city].every((value) => value.trim() !== '')
          ? { line1, line2: null, postalCode, city, countryCode: countryCode.toUpperCase() }
          : null,
        email: optional(values.email),
        phone: optional(values.phone),
      }),
    )
    .pipe(savePrincipal.input),
};

/** La devise se saisit en minuscules comme en capitales ; vide, elle s'efface (RG-REF-049). */
const currencyForm = {
  input: z
    .object({ principalId: z.string(), currency: z.string() })
    .transform(({ principalId, currency }) => ({
      principalId,
      currency: optional(currency)?.toUpperCase() ?? null,
    }))
    .pipe(setPrincipalCurrency.input),
};

/** Donneurs d'ordre (RG-ORG-005 à 009) : le porteur principal du paramétrage. */
export function PrincipalsScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data } = useQuery(contractQuery(listPrincipalsForAdministration, {}));
  return (
    <Panel
      title={t('principalAdmin.list')}
      actions={
        <Button
          variant="primary"
          onPress={() =>
            void navigate({ to: '/administration/principals/$principalId', params: { principalId: NEW } })
          }
        >
          {t('principalAdmin.create')}
        </Button>
      }
    >
      <DataTable<PrincipalRow>
        label={t('principalAdmin.list')}
        rows={data?.principals ?? []}
        rowKey={(row) => row.id}
        empty={null}
        columns={[
          {
            id: 'code',
            header: t('principalAdmin.code'),
            size: 'code',
            code: true,
            cell: (row) => (
              <RouteLink to="/administration/principals/$principalId" params={{ principalId: row.id }}>
                {row.code}
              </RouteLink>
            ),
          },
          { id: 'name', header: t('principalAdmin.name'), size: 'text', cell: (row) => row.name },
          { id: 'group', header: t('principalAdmin.group'), size: 'text', cell: (row) => row.group ?? '—' },
          {
            id: 'internal',
            header: t('principalAdmin.internal'),
            size: 'number',
            cell: (row) =>
              row.internal ? <StatusBadge tone="info">{t('principalAdmin.internal')}</StatusBadge> : '—',
          },
          {
            id: 'state',
            header: t('principalAdmin.state'),
            size: 'status',
            cell: (row) => (
              <StatusBadge tone={row.active ? 'ok' : 'mute'}>
                {row.active ? t('common.active') : t('common.inactive')}
              </StatusBadge>
            ),
          },
        ]}
      />
    </Panel>
  );
}

/** Fiche donneur d'ordre : libellé, code, groupe, coordonnées, activation (0.1 § 4). */
export function PrincipalScreen() {
  const { principalId } = useParams({ from: '/shell/administration/principals/$principalId' });
  const { data } = useQuery({
    ...contractQuery(getPrincipal, { principalId }),
    enabled: principalId !== NEW,
  });
  if (principalId !== NEW && data === undefined) return null;
  return (
    <>
      <PrincipalForm key={principalId} principal={data?.principal} />
      {data === undefined || data.principal.internal ? null : (
        <RetentionPanel principalId={data.principal.id} />
      )}
      {data === undefined ? null : (
        <CurrencyPanel
          key={data.principal.currency ?? ''}
          principalId={data.principal.id}
          current={data.principal.currency}
        />
      )}
    </>
  );
}

function PrincipalForm({ principal }: { principal: PrincipalDetail | undefined }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const gesture = useGesture();
  const form = useGestureForm(principalForm, {
    principalId: principal?.id ?? null,
    code: principal?.code ?? '',
    name: principal?.name ?? '',
    group: principal?.group ?? '',
    line1: principal?.address?.line1 ?? '',
    postalCode: principal?.address?.postalCode ?? '',
    city: principal?.address?.city ?? '',
    countryCode: principal?.address?.countryCode ?? 'FR',
    email: principal?.email ?? '',
    phone: principal?.phone ?? '',
  });

  const submit = form.handleSubmit(async (input) => {
    const saved = await gesture.run(savePrincipal, input);
    if (saved !== undefined && principal === undefined) {
      await navigate({
        to: '/administration/principals/$principalId',
        params: { principalId: saved.principalId },
      });
    }
  });

  return (
    <>
      <RefusalBanner refusal={gesture.refusal} onDismiss={gesture.dismiss} />
      <Panel
        title={principal === undefined ? t('principalAdmin.newTitle') : principal.name}
        actions={
          principal === undefined || principal.internal ? undefined : (
            <>
              <StatusBadge tone={principal.active ? 'ok' : 'mute'}>
                {principal.active ? t('common.active') : t('common.inactive')}
              </StatusBadge>
              <Button
                onPress={() =>
                  void gesture.run(setPrincipalActive, {
                    principalId: principal.id,
                    active: !principal.active,
                  })
                }
              >
                {principal.active ? t('common.deactivate') : t('common.activate')}
              </Button>
            </>
          )
        }
      >
        <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
          <div className="grid grid-cols-3 gap-4">
            <Controller
              control={form.control}
              name="code"
              render={({ field }) => (
                <TextField label={t('principalAdmin.code')} {...textField(field)} code />
              )}
            />
            <Controller
              control={form.control}
              name="name"
              render={({ field }) => <TextField label={t('principalAdmin.name')} {...textField(field)} />}
            />
            <Controller
              control={form.control}
              name="group"
              render={({ field }) => <TextField label={t('principalAdmin.group')} {...textField(field)} />}
            />
            <Controller
              control={form.control}
              name="line1"
              render={({ field }) => <TextField label={t('site.addressLine1')} {...textField(field)} />}
            />
            <Controller
              control={form.control}
              name="postalCode"
              render={({ field }) => <TextField label={t('site.postalCode')} {...textField(field)} />}
            />
            <Controller
              control={form.control}
              name="city"
              render={({ field }) => <TextField label={t('site.city')} {...textField(field)} />}
            />
            <Controller
              control={form.control}
              name="countryCode"
              render={({ field }) => <TextField label={t('site.countryCode')} {...textField(field)} code />}
            />
            <Controller
              control={form.control}
              name="email"
              render={({ field }) => (
                <TextField
                  label={t('principalAdmin.email')}
                  {...textField(field, { compact: true })}
                  type="email"
                />
              )}
            />
            <Controller
              control={form.control}
              name="phone"
              render={({ field }) => (
                <TextField label={t('principalAdmin.phone')} {...textField(field)} type="tel" />
              )}
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="primary" isDisabled={!form.formState.isValid || gesture.sending}>
              {principal === undefined ? t('principalAdmin.create') : t('common.save')}
            </Button>
          </div>
        </form>
      </Panel>
    </>
  );
}

/** Devise unique du donneur d'ordre, dans laquelle s'expriment ses valeurs déclarées (RG-REF-049). */
function CurrencyPanel({ principalId, current }: { principalId: string; current: string | null }) {
  const { t } = useTranslation();
  const gesture = useGesture();
  const form = useGestureForm(currencyForm, { principalId, currency: current ?? '' });
  const submit = form.handleSubmit((input) => gesture.run(setPrincipalCurrency, input));
  return (
    <>
      <RefusalBanner refusal={gesture.refusal} onDismiss={gesture.dismiss} />
      <Panel title={t('principalAdmin.currencyTitle')} meta={t('principalAdmin.currencyHint')}>
        <form
          className="grid grid-cols-(--cairn-line-columns) items-end gap-3"
          onSubmit={(event) => void submit(event)}
        >
          <Controller
            control={form.control}
            name="currency"
            render={({ field }) => (
              <TextField label={t('principalAdmin.currency')} {...textField(field)} code />
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

/** Durée de conservation des données identifiantes des clients finaux (RG-TRS-017). */
function RetentionPanel({ principalId }: { principalId: string }) {
  const { t } = useTranslation();
  const gesture = useGesture();
  const form = useGestureForm(setEndCustomerRetention, { principalId, months: null });
  const submit = form.handleSubmit((input) => gesture.run(setEndCustomerRetention, input));
  return (
    <>
      <RefusalBanner refusal={gesture.refusal} onDismiss={gesture.dismiss} />
      <Panel title={t('retention.title')} meta={t('retention.hint')}>
        <form
          className="grid grid-cols-(--cairn-line-columns) items-end gap-3"
          onSubmit={(event) => void submit(event)}
        >
          <Controller
            control={form.control}
            name="months"
            render={({ field }) => (
              <NumberField label={t('retention.months')} minValue={1} {...valueField(field)} />
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
