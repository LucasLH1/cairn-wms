import { listRoles, listTeams, listUsers, type RoleRow } from '@cairn/contrat';
import { Button, DataTable, Panel, StatusBadge, Tabs } from '@cairn/ui';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import type { z } from 'zod';
import { contractQuery } from '../../contract/query.js';
import { useHasPermission } from '../../shell/site.js';
import { RouteLink } from '../../shell/RouteLink.js';

type UserRow = z.infer<typeof listUsers.output>['users'][number];
type TeamRow = z.infer<typeof listTeams.output>['teams'][number];

/** Utilisateurs et équipes (0.1 § 4, § 6) : utilisateurs, rôles, équipes. */
export function UsersAndTeamsScreen() {
  const { t } = useTranslation();
  const administerUsers = useHasPermission('administerUsers');
  const administerExecution = useHasPermission('administerExecutionSites');
  const users = administerUsers || administerExecution;
  const roles = useHasPermission('administerRoles');
  const teams = useHasPermission('administerTeams');
  return (
    <Tabs
      label={t('administration.usersAndTeams')}
      tabs={[
        ...(users ? [{ id: 'users', label: t('administration.users'), content: <UsersTab /> }] : []),
        ...(roles ? [{ id: 'roles', label: t('administration.roles'), content: <RolesTab /> }] : []),
        ...(teams ? [{ id: 'teams', label: t('administration.teams'), content: <TeamsTab /> }] : []),
      ]}
    />
  );
}

function ActiveBadge({ active }: { active: boolean }) {
  const { t } = useTranslation();
  return (
    <StatusBadge tone={active ? 'ok' : 'mute'}>
      {active ? t('common.active') : t('common.inactive')}
    </StatusBadge>
  );
}

function UsersTab() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data } = useQuery(contractQuery(listUsers, {}));
  return (
    <Panel
      title={t('user.list')}
      actions={
        <Button
          variant="primary"
          onPress={() => void navigate({ to: '/administration/users/$userId', params: { userId: 'new' } })}
        >
          {t('user.create')}
        </Button>
      }
    >
      <DataTable<UserRow>
        label={t('user.list')}
        rows={data?.users ?? []}
        rowKey={(row) => row.id}
        empty={null}
        columns={[
          {
            id: 'name',
            header: t('user.displayName'),
            size: 'text',
            cell: (row) => (
              <RouteLink to="/administration/users/$userId" params={{ userId: row.id }}>
                {row.displayName}
              </RouteLink>
            ),
          },
          {
            id: 'login',
            header: t('user.loginName'),
            size: 'text',
            code: true,
            cell: (row) => row.loginName,
          },
          { id: 'roles', header: t('user.roles'), size: 'text', cell: (row) => row.roles.join(', ') || '—' },
          { id: 'sites', header: t('user.sites'), size: 'code', cell: (row) => row.sites.join(', ') || '—' },
          { id: 'team', header: t('user.team'), size: 'text', cell: (row) => row.team ?? '—' },
          {
            id: 'state',
            header: t('user.state'),
            size: 'status',
            cell: (row) => <ActiveBadge active={row.active} />,
          },
        ]}
      />
    </Panel>
  );
}

function RolesTab() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data } = useQuery(contractQuery(listRoles, {}));
  return (
    <Panel
      title={t('role.list')}
      actions={
        <Button
          variant="primary"
          onPress={() => void navigate({ to: '/administration/roles/$roleId', params: { roleId: 'new' } })}
        >
          {t('role.create')}
        </Button>
      }
    >
      <DataTable<RoleRow>
        label={t('role.list')}
        rows={data?.roles ?? []}
        rowKey={(row) => row.id}
        empty={null}
        columns={[
          {
            id: 'name',
            header: t('role.name'),
            size: 'text',
            cell: (row) => (
              <RouteLink to="/administration/roles/$roleId" params={{ roleId: row.id }}>
                {row.name}
              </RouteLink>
            ),
          },
          {
            id: 'nature',
            header: t('role.nature'),
            size: 'status',
            cell: (row) => t(`role.natures.${row.nature}`),
          },
          {
            id: 'template',
            header: t('role.template'),
            size: 'number',
            cell: (row) => (row.template ? t('common.yes') : '—'),
          },
          {
            id: 'holders',
            header: t('role.holders'),
            size: 'number',
            numeric: true,
            cell: (row) => row.holderCount,
          },
          {
            id: 'permissions',
            header: t('role.permissions'),
            size: 'number',
            numeric: true,
            cell: (row) => row.permissions.length,
          },
        ]}
      />
    </Panel>
  );
}

function TeamsTab() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data } = useQuery(contractQuery(listTeams, {}));
  return (
    <Panel
      title={t('team.list')}
      actions={
        <Button
          variant="primary"
          onPress={() => void navigate({ to: '/administration/teams/$teamId', params: { teamId: 'new' } })}
        >
          {t('team.create')}
        </Button>
      }
    >
      <DataTable<TeamRow>
        label={t('team.list')}
        rows={data?.teams ?? []}
        rowKey={(row) => row.id}
        empty={null}
        columns={[
          {
            id: 'name',
            header: t('team.name'),
            size: 'text',
            cell: (row) => (
              <RouteLink to="/administration/teams/$teamId" params={{ teamId: row.id }}>
                {row.name}
              </RouteLink>
            ),
          },
          { id: 'site', header: t('team.site'), size: 'text', cell: (row) => row.siteName },
          {
            id: 'lead',
            header: t('team.lead'),
            size: 'text',
            // Une équipe sans encadrant est une anomalie signalée, qui ne bloque rien (RG-SUR-013).
            cell: (row) => row.leadName ?? <StatusBadge tone="warn">{t('team.noLead')}</StatusBadge>,
          },
          {
            id: 'members',
            header: t('team.members'),
            size: 'number',
            numeric: true,
            cell: (row) => row.memberCount,
          },
          {
            id: 'state',
            header: t('team.state'),
            size: 'status',
            cell: (row) => <ActiveBadge active={row.active} />,
          },
        ]}
      />
    </Panel>
  );
}
