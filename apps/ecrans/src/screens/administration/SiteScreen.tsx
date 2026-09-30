import {
  addSiteClosures,
  getSite,
  listPrincipalsForAdministration,
  listPublicHolidays,
  removeSiteClosure,
  saveSite,
  saveSiteCalendar,
  saveZone,
  setSiteActive,
  setZoneActive,
  zonePurposeSchema,
  type SiteDetail,
  type Zone,
} from '@cairn/contrat';
import {
  Banner,
  Button,
  DataTable,
  DateField,
  Panel,
  Select,
  StatusBadge,
  TextField,
  TimeField,
} from '@cairn/ui';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useState } from 'react';
import { Controller, useFieldArray } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { textField, useGestureForm, valueField } from '../../contract/form.js';
import { contractQuery } from '../../contract/query.js';
import { RefusalBanner } from '../../contract/RefusalBanner.js';
import { useGesture } from '../../contract/useGesture.js';
import { formatDate } from '../format.js';

const NEW = 'new';
const weekdays = [1, 2, 3, 4, 5, 6, 7] as const;
const weekdayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const weekdayKey = (weekday: (typeof weekdays)[number]) => weekdayKeys[weekday - 1] ?? 'monday';

/**
 * La fiche se saisit champ par champ ; le geste reçoit un code et un pays en capitales, un complément
 * d'adresse vide comme absent. Le schéma du geste valide ce qui en résulte, comme le serveur le recevra.
 */
const siteForm = {
  input: z
    .object({
      siteId: z.string().nullable(),
      code: z.string(),
      name: z.string(),
      timeZone: z.string(),
      line1: z.string(),
      line2: z.string(),
      postalCode: z.string(),
      city: z.string(),
      countryCode: z.string(),
    })
    .transform(
      ({ line1, line2, postalCode, city, countryCode, ...values }): z.input<typeof saveSite.input> => ({
        siteId: values.siteId,
        code: values.code.trim().toUpperCase(),
        name: values.name,
        timeZone: values.timeZone,
        address: {
          line1,
          line2: line2.trim() === '' ? null : line2,
          postalCode,
          city,
          countryCode: countryCode.toUpperCase(),
        },
      }),
    )
    .pipe(saveSite.input),
};

/** Le code de zone se saisit en minuscules comme en capitales ; le geste le reçoit en capitales. */
const zoneForm = {
  input: saveZone.input
    .extend({ code: z.string() })
    .transform((values) => ({ ...values, code: values.code.trim().toUpperCase() }))
    .pipe(saveZone.input),
};

/**
 * Fiche site (0.1, parcours « Créer un site ») : code, libellé, adresse ; calendrier ; jours fériés et
 * fermetures ; zones ; activation, qui dit ce qui manque au lieu de refuser.
 */
export function SiteScreen() {
  const { siteId } = useParams({ from: '/shell/administration/sites/$siteId' });
  const { data } = useQuery({ ...contractQuery(getSite, { siteId }), enabled: siteId !== NEW });
  if (siteId === NEW) return <SiteForm site={undefined} />;
  if (data === undefined) return null;
  return (
    <>
      <SiteForm site={data.site} />
      <ActivationPanel site={data.site} />
      <CalendarPanel key={JSON.stringify(data.site.openingRanges)} site={data.site} />
      <ClosuresPanel site={data.site} />
      <ZonesPanel site={data.site} />
    </>
  );
}

function SiteForm({ site }: { site: SiteDetail | undefined }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const gesture = useGesture();
  const form = useGestureForm(siteForm, {
    siteId: site?.id ?? null,
    code: site?.code ?? '',
    name: site?.name ?? '',
    timeZone: site?.timeZone ?? 'Europe/Paris',
    line1: site?.address?.line1 ?? '',
    line2: site?.address?.line2 ?? '',
    postalCode: site?.address?.postalCode ?? '',
    city: site?.address?.city ?? '',
    countryCode: site?.address?.countryCode ?? 'FR',
  });

  const submit = form.handleSubmit(async (input) => {
    const result = await gesture.run(saveSite, input);
    if (result !== undefined && site === undefined) {
      await navigate({ to: '/administration/sites/$siteId', params: { siteId: result.siteId } });
    }
  });

  return (
    <>
      <RefusalBanner refusal={gesture.refusal} onDismiss={gesture.dismiss} />
      <Panel
        title={site === undefined ? t('site.newTitle') : t('site.title', { code: site.code })}
        meta={site === undefined || site.codeEditable ? undefined : t('site.codeLocked')}
      >
        <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
          <div className="grid grid-cols-3 gap-4">
            <Controller
              control={form.control}
              name="code"
              render={({ field }) => (
                <TextField
                  label={t('site.code')}
                  {...textField(field)}
                  isDisabled={site?.codeEditable === false}
                  code
                />
              )}
            />
            <Controller
              control={form.control}
              name="name"
              render={({ field }) => <TextField label={t('site.name')} {...textField(field)} />}
            />
            <Controller
              control={form.control}
              name="timeZone"
              render={({ field }) => <TextField label={t('site.timeZone')} {...textField(field)} code />}
            />
            <Controller
              control={form.control}
              name="line1"
              render={({ field }) => <TextField label={t('site.addressLine1')} {...textField(field)} />}
            />
            <Controller
              control={form.control}
              name="line2"
              render={({ field }) => <TextField label={t('site.addressLine2')} {...textField(field)} />}
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
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="primary" isDisabled={!form.formState.isValid || gesture.sending}>
              {site === undefined ? t('site.create') : t('common.save')}
            </Button>
          </div>
        </form>
      </Panel>
    </>
  );
}

function ActivationPanel({ site }: { site: SiteDetail }) {
  const { t } = useTranslation();
  const gesture = useGesture();
  const missing = site.missingForActivation.map((item) =>
    item === 'address' ? t('site.missingAddress') : t('site.missingZone'),
  );
  return (
    <>
      <RefusalBanner refusal={gesture.refusal} onDismiss={gesture.dismiss} />
      <Panel
        title={t('site.activation')}
        actions={
          site.active ? (
            <Button onPress={() => void gesture.run(setSiteActive, { siteId: site.id, active: false })}>
              {t('common.deactivate')}
            </Button>
          ) : (
            <Button
              variant="primary"
              isDisabled={missing.length > 0}
              onPress={() => void gesture.run(setSiteActive, { siteId: site.id, active: true })}
            >
              {t('common.activate')}
            </Button>
          )
        }
      >
        <div className="flex items-center gap-3">
          <StatusBadge tone={site.active ? 'ok' : 'mute'}>
            {site.active ? t('common.active') : t('common.inactive')}
          </StatusBadge>
          {site.active ? null : (
            <span>
              {missing.length > 0 ? t('site.missing', { missing: missing.join(', ') }) : t('site.ready')}
            </span>
          )}
        </div>
      </Panel>
    </>
  );
}

function CalendarPanel({ site }: { site: SiteDetail }) {
  const { t } = useTranslation();
  const gesture = useGesture();
  // Le panneau repart des plages enregistrées quand elles changent : sa clé les suit.
  const form = useGestureForm(saveSiteCalendar, { siteId: site.id, openingRanges: [...site.openingRanges] });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'openingRanges' });
  const submit = form.handleSubmit((input) => gesture.run(saveSiteCalendar, input));
  return (
    <>
      <RefusalBanner refusal={gesture.refusal} onDismiss={gesture.dismiss} />
      <Panel title={t('site.calendar')} meta={fields.length === 0 ? t('site.calendarEmpty') : undefined}>
        <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
          {weekdays.map((weekday) => {
            const day = fields
              .map((range, index) => ({ range, index }))
              .filter(({ range }) => range.weekday === weekday);
            return (
              <div key={weekday} className="grid grid-cols-(--cairn-calendar-columns) items-end gap-3">
                <span className="pb-2-5">{t(`weekday.${weekdayKey(weekday)}`)}</span>
                <div className="grid gap-2">
                  {day.length === 0 ? <span className="pb-2-5">{t('site.closed')}</span> : null}
                  {day.map(({ range, index }) => (
                    <div key={range.id} className="flex items-end gap-3">
                      <Controller
                        control={form.control}
                        name={`openingRanges.${index}.opensAt`}
                        render={({ field }) => (
                          <TimeField
                            label={`${t('site.opensAt')} ${t(`weekday.${weekdayKey(weekday)}`)}`}
                            hideLabel
                            value={field.value}
                            onChange={(opensAt) => {
                              if (opensAt !== null) field.onChange(opensAt);
                            }}
                          />
                        )}
                      />
                      <Controller
                        control={form.control}
                        name={`openingRanges.${index}.closesAt`}
                        render={({ field }) => (
                          <TimeField
                            label={`${t('site.closesAt')} ${t(`weekday.${weekdayKey(weekday)}`)}`}
                            hideLabel
                            value={field.value}
                            onChange={(closesAt) => {
                              if (closesAt !== null) field.onChange(closesAt);
                            }}
                          />
                        )}
                      />
                      <Button
                        onPress={() => {
                          remove(index);
                        }}
                      >
                        {t('common.remove')}
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  onPress={() => {
                    append({ weekday, opensAt: '08:00', closesAt: '17:00' });
                  }}
                >
                  {t('site.addRange')}
                </Button>
              </div>
            );
          })}
          <div className="flex justify-end">
            <Button type="submit" variant="primary" isDisabled={!form.formState.isValid || gesture.sending}>
              {t('common.save')}
            </Button>
          </div>
        </form>
      </Panel>
    </>
  );
}

function ClosuresPanel({ site }: { site: SiteDetail }) {
  const { t, i18n } = useTranslation();
  const gesture = useGesture();
  const year = new Date().getFullYear();
  const holidays = useQuery(contractQuery(listPublicHolidays, { year }));
  // Une fermeture exceptionnelle à la fois ; sans jour choisi, le jour vaut '' et le schéma le refuse.
  const form = useGestureForm(addSiteClosures, {
    siteId: site.id,
    closures: [{ day: '', label: '', kind: 'exceptional' }],
  });
  // Le formulaire se vide une fois le geste rendu, qu'il soit enregistré ou refusé.
  const submit = form.handleSubmit(async (input) => {
    await gesture.run(addSiteClosures, input);
    form.reset();
  });
  return (
    <>
      <RefusalBanner refusal={gesture.refusal} onDismiss={gesture.dismiss} />
      <Panel
        title={t('site.closures')}
        actions={
          <Button
            isDisabled={holidays.data === undefined || gesture.sending}
            onPress={() =>
              void gesture.run(addSiteClosures, {
                siteId: site.id,
                closures: (holidays.data?.holidays ?? []).map((holiday) => ({
                  ...holiday,
                  kind: 'publicHoliday' as const,
                })),
              })
            }
          >
            {t('site.addPublicHolidays', { year: String(year) })}
          </Button>
        }
      >
        <DataTable<SiteDetail['closures'][number]>
          label={t('site.closures')}
          rows={site.closures}
          rowKey={(closure) => closure.day}
          empty={t('site.noClosure')}
          columns={[
            {
              id: 'day',
              header: t('site.day'),
              size: 'date',
              cell: (closure) => formatDate(closure.day, i18n.language),
            },
            { id: 'label', header: t('site.label'), size: 'text', cell: (closure) => closure.label },
            {
              id: 'kind',
              header: t('site.kind'),
              size: 'status',
              cell: (closure) => t(`site.kinds.${closure.kind}`),
            },
            {
              id: 'remove',
              header: '',
              size: 'status',
              cell: (closure) => (
                <Button
                  onPress={() => void gesture.run(removeSiteClosure, { siteId: site.id, day: closure.day })}
                >
                  {t('common.remove')}
                </Button>
              ),
            },
          ]}
        />
        <form
          className="grid grid-cols-(--cairn-line-columns) items-end gap-3"
          onSubmit={(event) => void submit(event)}
        >
          <Controller
            control={form.control}
            name="closures.0.label"
            render={({ field }) => <TextField label={t('site.label')} {...textField(field)} />}
          />
          <Controller
            control={form.control}
            name="closures.0.day"
            render={({ field }) => (
              <DateField
                label={t('site.day')}
                value={field.value === '' ? null : field.value}
                onChange={(day) => {
                  field.onChange(day ?? '');
                }}
              />
            )}
          />
          <Button type="submit" isDisabled={!form.formState.isValid || gesture.sending}>
            {t('site.addClosure')}
          </Button>
        </form>
      </Panel>
    </>
  );
}

const emptyZone = {
  zoneId: null,
  code: '',
  name: '',
  purpose: 'storage',
  cohabitation: 'shared',
  principalId: null,
} as const;

function ZonesPanel({ site }: { site: SiteDetail }) {
  const { t } = useTranslation();
  const gesture = useGesture();
  const principals = useQuery(contractQuery(listPrincipalsForAdministration, {}));
  // La saisie d'une zone s'ouvre sur une zone vide ou sur celle qu'on choisit dans la liste.
  const [editing, setEditing] = useState(false);
  const form = useGestureForm(zoneForm, { ...emptyZone, siteId: site.id });
  const cohabitation = form.watch('cohabitation');
  const principalId = form.watch('principalId');
  const edit = (zone: z.input<typeof zoneForm.input>) => {
    form.reset(zone);
    setEditing(true);
  };
  const submit = form.handleSubmit(async (input) => {
    const result = await gesture.run(saveZone, input);
    if (result !== undefined) setEditing(false);
  });
  const principalName = (id: string | null) =>
    principals.data?.principals.find((principal) => principal.id === id)?.name;
  return (
    <>
      <RefusalBanner refusal={gesture.refusal} onDismiss={gesture.dismiss} />
      <Panel
        title={t('site.zones')}
        actions={
          <Button
            onPress={() => {
              edit({ ...emptyZone, siteId: site.id });
            }}
          >
            {t('site.addZone')}
          </Button>
        }
      >
        <DataTable<Zone>
          label={t('site.zones')}
          rows={site.zones}
          rowKey={(zone) => zone.id}
          empty={t('site.noZone')}
          columns={[
            {
              id: 'code',
              header: t('site.code'),
              size: 'code',
              code: true,
              // Un code n'est un lien que s'il ouvre une fiche ; l'action est en fin de ligne (point 11).
              cell: (zone) => zone.code,
            },
            { id: 'name', header: t('site.name'), size: 'text', cell: (zone) => zone.name },
            {
              id: 'purpose',
              header: t('site.purpose'),
              size: 'status',
              cell: (zone) => t(`zonePurpose.${zone.purpose}`),
            },
            {
              id: 'cohabitation',
              header: t('site.cohabitation'),
              size: 'text',
              cell: (zone) =>
                zone.cohabitation === 'single'
                  ? `${t('cohabitation.single')} · ${principalName(zone.principalId) ?? ''}`
                  : t('cohabitation.shared'),
            },
            {
              id: 'state',
              header: t('site.state'),
              size: 'status',
              cell: (zone) => (
                <StatusBadge tone={zone.active ? 'ok' : 'mute'}>
                  {zone.active ? t('common.active') : t('common.inactive')}
                </StatusBadge>
              ),
            },
            {
              id: 'actions',
              header: '',
              size: 'text',
              cell: (zone) => (
                <div className="flex gap-2">
                  <Button
                    onPress={() => {
                      edit({
                        zoneId: zone.id,
                        siteId: site.id,
                        code: zone.code,
                        name: zone.name,
                        purpose: zone.purpose,
                        cohabitation: zone.cohabitation,
                        principalId: zone.principalId,
                      });
                    }}
                  >
                    {t('common.edit')}
                  </Button>
                  <Button
                    onPress={() => void gesture.run(setZoneActive, { zoneId: zone.id, active: !zone.active })}
                  >
                    {zone.active ? t('common.deactivate') : t('common.activate')}
                  </Button>
                </div>
              ),
            },
          ]}
        />
        {editing ? (
          <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
            <div className="grid grid-cols-3 gap-4">
              <Controller
                control={form.control}
                name="code"
                render={({ field }) => <TextField label={t('site.code')} {...textField(field)} code />}
              />
              <Controller
                control={form.control}
                name="name"
                render={({ field }) => <TextField label={t('site.name')} {...textField(field)} />}
              />
              <Controller
                control={form.control}
                name="purpose"
                render={({ field }) => (
                  <Select
                    label={t('site.purpose')}
                    placeholder={t('expectedReceipt.choose')}
                    options={zonePurposeSchema.options.map((purpose) => ({
                      id: purpose,
                      label: t(`zonePurpose.${purpose}`),
                    }))}
                    value={field.value}
                    onChange={(value) => {
                      const purpose = zonePurposeSchema.safeParse(value);
                      if (purpose.success) field.onChange(purpose.data);
                    }}
                  />
                )}
              />
              <Controller
                control={form.control}
                name="cohabitation"
                render={({ field }) => (
                  <Select
                    label={t('site.cohabitation')}
                    placeholder={t('expectedReceipt.choose')}
                    options={[
                      { id: 'shared', label: t('cohabitation.shared') },
                      { id: 'single', label: t('cohabitation.single') },
                    ]}
                    value={field.value}
                    onChange={(value) => {
                      field.onChange(value === 'single' ? 'single' : 'shared');
                    }}
                  />
                )}
              />
              {/* Le choix « mono-donneur d'ordre » fait apparaître le réservataire ; il est masqué sinon. */}
              {cohabitation === 'single' ? (
                <Controller
                  control={form.control}
                  name="principalId"
                  render={({ field }) => (
                    <Select
                      label={t('site.reservedFor')}
                      placeholder={t('expectedReceipt.choose')}
                      options={(principals.data?.principals ?? []).map((principal) => ({
                        id: principal.id,
                        label: principal.name,
                      }))}
                      {...valueField(field)}
                    />
                  )}
                />
              ) : null}
            </div>
            {cohabitation === 'single' && principalId === null ? (
              <Banner tone="warn">{t('refusal.principalRequired')}</Banner>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button
                onPress={() => {
                  setEditing(false);
                }}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" variant="primary" isDisabled={!form.formState.isValid || gesture.sending}>
                {t('common.save')}
              </Button>
            </div>
          </form>
        ) : null}
      </Panel>
    </>
  );
}
