import { listAnonymizationSchedule, listEndCustomerDuplicates } from '@cairn/contrat';
import { Button, DataTable, Panel, Tabs } from '@cairn/ui';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import type { z } from 'zod';
import { contractQuery } from '../../contract/query.js';
import { useWorkingPrincipal } from '../../shell/principal.js';
import { useHasPermission } from '../../shell/site.js';
import { PartyListPanel } from './PartyListPanel.js';

type Pair = z.infer<typeof listEndCustomerDuplicates.output>['pairs'][number];
type ScheduleRow = z.infer<typeof listAnonymizationSchedule.output>['principals'][number];

/**
 * Tiers d'un donneur d'ordre (0.5) : ses fournisseurs, ses clients finaux, leurs doublons potentiels ;
 * les échéances d'anonymisation de tous les donneurs d'ordre visibles. Le donneur d'ordre est celui du
 * contexte de travail, choisi dans la barre du haut (README du lot 1, décisions du 2026-09-30, point 1).
 */
export function PartiesScreen() {
  const { t } = useTranslation();
  const principalId = useWorkingPrincipal()?.id ?? null;
  const canManage = useHasPermission('managePrincipalParties');
  return (
    <>
      {principalId === null ? null : (
        <Tabs
          label={t('party.menu')}
          tabs={[
            {
              id: 'endCustomers',
              label: t('party.endCustomers'),
              content: (
                <PartyListPanel
                  key={`c${principalId}`}
                  family="endCustomer"
                  principalId={principalId}
                  title={t('party.endCustomers')}
                  canCreate={canManage}
                />
              ),
            },
            {
              id: 'suppliers',
              label: t('party.suppliers'),
              content: (
                <PartyListPanel
                  key={`s${principalId}`}
                  family="supplier"
                  principalId={principalId}
                  title={t('party.suppliers')}
                  canCreate={canManage}
                />
              ),
            },
            {
              id: 'duplicates',
              label: t('party.duplicates'),
              content: <Duplicates principalId={principalId} />,
            },
            { id: 'schedule', label: t('party.schedule'), content: <Schedule /> },
          ]}
        />
      )}
    </>
  );
}

/** Doublons potentiels : signalés, jamais fusionnés d'office (RG-TRS-015). */
function Duplicates({ principalId }: { principalId: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data } = useQuery(contractQuery(listEndCustomerDuplicates, { principalId }));
  return (
    <Panel title={t('party.duplicates')}>
      <DataTable<Pair>
        label={t('party.duplicates')}
        rows={data?.pairs ?? []}
        rowKey={(pair) => `${pair.first.id}-${pair.second.id}`}
        empty={t('party.none')}
        columns={[
          {
            id: 'first',
            header: t('endCustomer.kept'),
            size: 'text',
            cell: (pair) => `${pair.first.code} · ${pair.first.name}`,
          },
          {
            id: 'second',
            header: t('endCustomer.other'),
            size: 'text',
            cell: (pair) => `${pair.second.code} · ${pair.second.name}`,
          },
          {
            id: 'reason',
            header: t('endCustomer.takeFrom'),
            size: 'status',
            cell: (pair) => t(`endCustomer.reasons.${pair.reason}`),
          },
          {
            id: 'compare',
            header: '',
            size: 'status',
            cell: (pair) => (
              <Button
                onPress={() =>
                  void navigate({
                    to: '/parties/$partyId/merge',
                    params: { partyId: pair.first.id },
                    search: { other: pair.second.id },
                  })
                }
              >
                {t('endCustomer.compare')}
              </Button>
            ),
          },
        ]}
      />
    </Panel>
  );
}

/** Échéances d'anonymisation par donneur d'ordre (0.5, parcours « Suivre les échéances »). */
function Schedule() {
  const { t } = useTranslation();
  const { data } = useQuery(contractQuery(listAnonymizationSchedule, {}));
  return (
    <Panel title={t('party.schedule')}>
      <DataTable<ScheduleRow>
        label={t('party.schedule')}
        rows={data?.principals ?? []}
        rowKey={(row) => row.principalId}
        empty={t('party.none')}
        columns={[
          { id: 'principal', header: t('party.principal'), size: 'text', cell: (row) => row.principalName },
          {
            id: 'retention',
            header: t('schedule.retention'),
            size: 'date',
            cell: (row) => row.retentionMonths ?? t('schedule.missing'),
          },
          {
            id: 'due',
            header: t('schedule.dueSoon'),
            size: 'number',
            numeric: true,
            cell: (row) => row.dueSoon,
          },
          {
            id: 'postponed',
            header: t('schedule.postponed'),
            size: 'number',
            numeric: true,
            cell: (row) => row.postponed,
          },
          {
            id: 'done',
            header: t('schedule.anonymized'),
            size: 'number',
            numeric: true,
            cell: (row) => row.anonymizedInPeriod,
          },
        ]}
      />
    </Panel>
  );
}
