import {
  getPrincipal,
  listPrincipalsForAdministration,
  savePrincipal,
  setPrincipalActive,
} from '@cairn/contrat';
import { Button, DataTable, Panel, StatusBadge, TextField } from '@cairn/ui';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { z } from 'zod';
import { contractQuery } from '../../contract/query.js';
import { RefusalBanner } from '../../contract/RefusalBanner.js';
import { useGesture } from '../../contract/useGesture.js';

const NEW = 'new';
type PrincipalRow = z.infer<typeof listPrincipalsForAdministration.output>['principals'][number];
type PrincipalDetail = z.infer<typeof getPrincipal.output>['principal'];

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
              <Link to="/administration/principals/$principalId" params={{ principalId: row.id }}>
                {row.code}
              </Link>
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
  return <PrincipalForm key={principalId} principal={data?.principal} />;
}

function PrincipalForm({ principal }: { principal: PrincipalDetail | undefined }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const gesture = useGesture();
  const [code, setCode] = useState(principal?.code ?? '');
  const [name, setName] = useState(principal?.name ?? '');
  const [group, setGroup] = useState(principal?.group ?? '');
  const [line1, setLine1] = useState(principal?.address?.line1 ?? '');
  const [postalCode, setPostalCode] = useState(principal?.address?.postalCode ?? '');
  const [city, setCity] = useState(principal?.address?.city ?? '');
  const [countryCode, setCountryCode] = useState(principal?.address?.countryCode ?? 'FR');
  const [email, setEmail] = useState(principal?.email ?? '');
  const [phone, setPhone] = useState(principal?.phone ?? '');
  const hasAddress = [line1, postalCode, city].every((value) => value.trim() !== '');
  const optional = (value: string) => (value.trim() === '' ? null : value.trim());

  const save = async () => {
    const saved = await gesture.run(savePrincipal, {
      principalId: principal?.id ?? null,
      code: code.trim().toUpperCase(),
      name,
      group: optional(group),
      address: hasAddress
        ? { line1, line2: null, postalCode, city, countryCode: countryCode.toUpperCase() }
        : null,
      email: optional(email),
      phone: optional(phone),
    });
    if (saved !== undefined && principal === undefined) {
      await navigate({
        to: '/administration/principals/$principalId',
        params: { principalId: saved.principalId },
      });
    }
  };

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
        <div className="grid grid-cols-3 gap-4">
          <TextField label={t('principalAdmin.code')} value={code} onChange={setCode} code />
          <TextField label={t('principalAdmin.name')} value={name} onChange={setName} />
          <TextField label={t('principalAdmin.group')} value={group} onChange={setGroup} />
          <TextField label={t('site.addressLine1')} value={line1} onChange={setLine1} />
          <TextField label={t('site.postalCode')} value={postalCode} onChange={setPostalCode} />
          <TextField label={t('site.city')} value={city} onChange={setCity} />
          <TextField label={t('site.countryCode')} value={countryCode} onChange={setCountryCode} code />
          <TextField label={t('principalAdmin.email')} value={email} onChange={setEmail} type="email" />
          <TextField label={t('principalAdmin.phone')} value={phone} onChange={setPhone} type="tel" />
        </div>
        <div className="flex justify-end">
          <Button
            variant="primary"
            isDisabled={code.trim() === '' || name.trim() === '' || gesture.sending}
            onPress={() => void save()}
          >
            {principal === undefined ? t('principalAdmin.create') : t('common.save')}
          </Button>
        </div>
      </Panel>
    </>
  );
}
