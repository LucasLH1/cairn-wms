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
  type OpeningRange,
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
import { useTranslation } from 'react-i18next';
import { contractQuery } from '../../contract/query.js';
import { RefusalBanner } from '../../contract/RefusalBanner.js';
import { useGesture } from '../../contract/useGesture.js';
import { formatDate } from '../format.js';

const NEW = 'new';
const weekdays = [1, 2, 3, 4, 5, 6, 7] as const;
const weekdayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const weekdayKey = (weekday: (typeof weekdays)[number]) => weekdayKeys[weekday - 1] ?? 'monday';

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
  const [code, setCode] = useState(site?.code ?? '');
  const [name, setName] = useState(site?.name ?? '');
  const [timeZone, setTimeZone] = useState(site?.timeZone ?? 'Europe/Paris');
  const [line1, setLine1] = useState(site?.address?.line1 ?? '');
  const [line2, setLine2] = useState(site?.address?.line2 ?? '');
  const [postalCode, setPostalCode] = useState(site?.address?.postalCode ?? '');
  const [city, setCity] = useState(site?.address?.city ?? '');
  const [countryCode, setCountryCode] = useState(site?.address?.countryCode ?? 'FR');
  const complete = [code, name, timeZone, line1, postalCode, city, countryCode].every(
    (value) => value.trim() !== '',
  );

  const save = async () => {
    const result = await gesture.run(saveSite, {
      siteId: site?.id ?? null,
      code: code.trim().toUpperCase(),
      name,
      timeZone,
      address: {
        line1,
        line2: line2.trim() === '' ? null : line2,
        postalCode,
        city,
        countryCode: countryCode.toUpperCase(),
      },
    });
    if (result !== undefined && site === undefined) {
      await navigate({ to: '/administration/sites/$siteId', params: { siteId: result.siteId } });
    }
  };

  return (
    <>
      <RefusalBanner refusal={gesture.refusal} onDismiss={gesture.dismiss} />
      <Panel
        title={site === undefined ? t('site.newTitle') : t('site.title', { code: site.code })}
        meta={site === undefined || site.codeEditable ? undefined : t('site.codeLocked')}
      >
        <div className="grid grid-cols-3 gap-4">
          <TextField
            label={t('site.code')}
            value={code}
            onChange={setCode}
            isDisabled={site?.codeEditable === false}
            code
          />
          <TextField label={t('site.name')} value={name} onChange={setName} />
          <TextField label={t('site.timeZone')} value={timeZone} onChange={setTimeZone} code />
          <TextField label={t('site.addressLine1')} value={line1} onChange={setLine1} />
          <TextField label={t('site.addressLine2')} value={line2} onChange={setLine2} />
          <TextField label={t('site.postalCode')} value={postalCode} onChange={setPostalCode} />
          <TextField label={t('site.city')} value={city} onChange={setCity} />
          <TextField label={t('site.countryCode')} value={countryCode} onChange={setCountryCode} code />
        </div>
        <div className="flex justify-end">
          <Button variant="primary" isDisabled={!complete || gesture.sending} onPress={() => void save()}>
            {site === undefined ? t('site.create') : t('common.save')}
          </Button>
        </div>
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
  const [ranges, setRanges] = useState<readonly OpeningRange[]>(site.openingRanges);
  const replace = (index: number, change: Partial<OpeningRange>) => {
    setRanges(ranges.map((range, position) => (position === index ? { ...range, ...change } : range)));
  };
  return (
    <>
      <RefusalBanner refusal={gesture.refusal} onDismiss={gesture.dismiss} />
      <Panel title={t('site.calendar')} meta={ranges.length === 0 ? t('site.calendarEmpty') : undefined}>
        {weekdays.map((weekday) => {
          const day = ranges
            .map((range, index) => ({ range, index }))
            .filter(({ range }) => range.weekday === weekday);
          return (
            <div key={weekday} className="grid grid-cols-(--cairn-calendar-columns) items-end gap-3">
              <span className="pb-2-5">{t(`weekday.${weekdayKey(weekday)}`)}</span>
              <div className="grid gap-2">
                {day.length === 0 ? <span className="pb-2-5">{t('site.closed')}</span> : null}
                {day.map(({ range, index }) => (
                  <div key={index} className="flex items-end gap-3">
                    <TimeField
                      label={`${t('site.opensAt')} ${t(`weekday.${weekdayKey(weekday)}`)}`}
                      hideLabel
                      value={range.opensAt}
                      onChange={(opensAt) => {
                        if (opensAt !== null) replace(index, { opensAt });
                      }}
                    />
                    <TimeField
                      label={`${t('site.closesAt')} ${t(`weekday.${weekdayKey(weekday)}`)}`}
                      hideLabel
                      value={range.closesAt}
                      onChange={(closesAt) => {
                        if (closesAt !== null) replace(index, { closesAt });
                      }}
                    />
                    <Button
                      onPress={() => {
                        setRanges(ranges.filter((_, position) => position !== index));
                      }}
                    >
                      {t('common.remove')}
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                onPress={() => {
                  setRanges([...ranges, { weekday, opensAt: '08:00', closesAt: '17:00' }]);
                }}
              >
                {t('site.addRange')}
              </Button>
            </div>
          );
        })}
        <div className="flex justify-end">
          <Button
            variant="primary"
            isDisabled={gesture.sending}
            onPress={() =>
              void gesture.run(saveSiteCalendar, { siteId: site.id, openingRanges: [...ranges] })
            }
          >
            {t('common.save')}
          </Button>
        </div>
      </Panel>
    </>
  );
}

function ClosuresPanel({ site }: { site: SiteDetail }) {
  const { t, i18n } = useTranslation();
  const gesture = useGesture();
  const year = new Date().getFullYear();
  const holidays = useQuery(contractQuery(listPublicHolidays, { year }));
  const [day, setDay] = useState<string | null>(null);
  const [label, setLabel] = useState('');
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
        <div className="grid grid-cols-(--cairn-line-columns) items-end gap-3">
          <TextField label={t('site.label')} value={label} onChange={setLabel} />
          <DateField label={t('site.day')} value={day} onChange={setDay} />
          <Button
            isDisabled={day === null || label.trim() === '' || gesture.sending}
            onPress={() =>
              void gesture
                .run(addSiteClosures, {
                  siteId: site.id,
                  closures: [{ day: day ?? '', label, kind: 'exceptional' }],
                })
                .then(() => {
                  setLabel('');
                  setDay(null);
                })
            }
          >
            {t('site.addClosure')}
          </Button>
        </div>
      </Panel>
    </>
  );
}

interface ZoneDraft {
  readonly zoneId: string | null;
  readonly code: string;
  readonly name: string;
  readonly purpose: Zone['purpose'];
  readonly cohabitation: Zone['cohabitation'];
  readonly principalId: string | null;
}

const emptyZone: ZoneDraft = {
  zoneId: null,
  code: '',
  name: '',
  purpose: 'storage',
  cohabitation: 'shared',
  principalId: null,
};

function ZonesPanel({ site }: { site: SiteDetail }) {
  const { t } = useTranslation();
  const gesture = useGesture();
  const principals = useQuery(contractQuery(listPrincipalsForAdministration, {}));
  const [draft, setDraft] = useState<ZoneDraft | undefined>();
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
              setDraft(emptyZone);
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
              cell: (zone) => (
                <Button
                  onPress={() => {
                    setDraft({
                      zoneId: zone.id,
                      code: zone.code,
                      name: zone.name,
                      purpose: zone.purpose,
                      cohabitation: zone.cohabitation,
                      principalId: zone.principalId,
                    });
                  }}
                >
                  {zone.code}
                </Button>
              ),
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
                <Button
                  onPress={() => void gesture.run(setZoneActive, { zoneId: zone.id, active: !zone.active })}
                >
                  {zone.active ? t('common.deactivate') : t('common.activate')}
                </Button>
              ),
            },
          ]}
        />
        {draft === undefined ? null : (
          <>
            <div className="grid grid-cols-3 gap-4">
              <TextField
                label={t('site.code')}
                value={draft.code}
                onChange={(code) => {
                  setDraft({ ...draft, code });
                }}
                code
              />
              <TextField
                label={t('site.name')}
                value={draft.name}
                onChange={(name) => {
                  setDraft({ ...draft, name });
                }}
              />
              <Select
                label={t('site.purpose')}
                placeholder={t('expectedReceipt.choose')}
                options={zonePurposeSchema.options.map((purpose) => ({
                  id: purpose,
                  label: t(`zonePurpose.${purpose}`),
                }))}
                value={draft.purpose}
                onChange={(value) => {
                  const purpose = zonePurposeSchema.safeParse(value);
                  if (purpose.success) setDraft({ ...draft, purpose: purpose.data });
                }}
              />
              <Select
                label={t('site.cohabitation')}
                placeholder={t('expectedReceipt.choose')}
                options={[
                  { id: 'shared', label: t('cohabitation.shared') },
                  { id: 'single', label: t('cohabitation.single') },
                ]}
                value={draft.cohabitation}
                onChange={(value) => {
                  setDraft({ ...draft, cohabitation: value === 'single' ? 'single' : 'shared' });
                }}
              />
              {/* Le choix « mono-donneur d'ordre » fait apparaître le réservataire ; il est masqué sinon. */}
              {draft.cohabitation === 'single' ? (
                <Select
                  label={t('site.reservedFor')}
                  placeholder={t('expectedReceipt.choose')}
                  options={(principals.data?.principals ?? []).map((principal) => ({
                    id: principal.id,
                    label: principal.name,
                  }))}
                  value={draft.principalId}
                  onChange={(principalId) => {
                    setDraft({ ...draft, principalId });
                  }}
                />
              ) : null}
            </div>
            {draft.cohabitation === 'single' && draft.principalId === null ? (
              <Banner tone="warn">{t('refusal.principalRequired')}</Banner>
            ) : null}
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
                isDisabled={draft.code.trim() === '' || draft.name.trim() === '' || gesture.sending}
                onPress={() =>
                  void gesture
                    .run(saveZone, { ...draft, code: draft.code.trim().toUpperCase(), siteId: site.id })
                    .then((result) => {
                      if (result !== undefined) setDraft(undefined);
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
