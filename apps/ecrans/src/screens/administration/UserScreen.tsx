import {
  getPrincipalRestrictions,
  getUser,
  listPrincipalsForAdministration,
  listRoles,
  listSites,
  listTeams,
  listUsers,
  saveUser,
  setExecutionSites,
  setPrincipalRestrictions,
  setUserActive,
  type UserDetail,
} from '@cairn/contrat';
import { Banner, Button, ChipGroup, Disclosure, Panel, Select, StatusBadge, TextField } from '@cairn/ui';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { contractQuery } from '../../contract/query.js';
import { RefusalBanner } from '../../contract/RefusalBanner.js';
import { currentSessionQuery } from '../../contract/session.js';
import { useGesture } from '../../contract/useGesture.js';
import { useHasPermission } from '../../shell/site.js';

const NEW = 'new';
const NO_ONE = 'none';

/** Fiche utilisateur (0.1, parcours « Créer un utilisateur »). */
export function UserScreen() {
  const { userId } = useParams({ from: '/shell/administration/users/$userId' });
  const { data } = useQuery({ ...contractQuery(getUser, { userId }), enabled: userId !== NEW });
  if (userId !== NEW && data === undefined) return null;
  return <UserForm key={userId} user={data?.user} />;
}

function UserForm({ user }: { user: UserDetail | undefined }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const gesture = useGesture();
  const roles = useQuery(contractQuery(listRoles, {}));
  const sites = useQuery(contractQuery(listSites, {}));
  const teams = useQuery(contractQuery(listTeams, {}));
  const users = useQuery(contractQuery(listUsers, {}));
  const principals = useQuery(contractQuery(listPrincipalsForAdministration, {}));
  const restrictions = useQuery({
    ...contractQuery(getPrincipalRestrictions, { userId: user?.id ?? '' }),
    enabled: user !== undefined,
  });
  const { data: session } = useQuery(currentSessionQuery);
  const canSetExecution = useHasPermission('administerExecutionSites');

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [loginName, setLoginName] = useState(user?.loginName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [roleIds, setRoleIds] = useState<readonly string[]>(user?.roleIds ?? []);
  const [siteIds, setSiteIds] = useState<readonly string[]>(user?.siteIds ?? []);
  const [teamId, setTeamId] = useState<string | null>(user?.teamId ?? null);
  const [reportsTo, setReportsTo] = useState<string | null>(user?.reportsToUserId ?? null);
  const [executionSiteIds, setExecutionSiteIds] = useState<readonly string[]>(user?.executionSiteIds ?? []);
  const [restricted, setRestricted] = useState<readonly string[] | undefined>();
  const principalRestrictions = restricted ?? restrictions.data?.principalIds ?? [];
  const isSelf = user !== undefined && user.id === session?.user.id;

  const siteTeams = (teams.data?.teams ?? []).filter((team) => team.active && siteIds.includes(team.siteId));
  const selectedRoles = (roles.data?.roles ?? []).filter((role) => roleIds.includes(role.id));
  const complete =
    displayName.trim() !== '' && loginName.trim() !== '' && (user !== undefined || password.length >= 12);

  const save = async () => {
    const saved = await gesture.run(saveUser, {
      userId: user?.id ?? null,
      displayName,
      loginName,
      email: email.trim() === '' ? null : email.trim(),
      password: password === '' ? null : password,
      roleIds: [...roleIds],
      siteIds: [...siteIds],
      teamId: teamId !== null && siteTeams.some((team) => team.id === teamId) ? teamId : null,
      reportsToUserId: reportsTo,
    });
    if (saved === undefined) return;
    if (canSetExecution && !isSelf) {
      await gesture.run(setExecutionSites, {
        userId: saved.userId,
        siteIds: executionSiteIds.filter((siteId) => siteIds.includes(siteId)),
      });
    }
    if (restricted !== undefined) {
      await gesture.run(setPrincipalRestrictions, { userId: saved.userId, principalIds: [...restricted] });
    }
    setPassword('');
    if (user === undefined)
      await navigate({ to: '/administration/users/$userId', params: { userId: saved.userId } });
  };

  return (
    <>
      <RefusalBanner refusal={gesture.refusal} onDismiss={gesture.dismiss} />
      {user !== undefined && siteIds.length === 0 ? (
        <Banner tone="warn">{t('user.noSiteWarning')}</Banner>
      ) : null}
      <Panel
        title={user === undefined ? t('user.newTitle') : user.displayName}
        meta={user === undefined ? undefined : user.loginName}
        actions={
          user === undefined ? undefined : (
            <>
              <StatusBadge tone={user.active ? 'ok' : 'mute'}>
                {user.active ? t('common.active') : t('common.inactive')}
              </StatusBadge>
              <Button
                onPress={() => void gesture.run(setUserActive, { userId: user.id, active: !user.active })}
              >
                {user.active ? t('common.deactivate') : t('common.activate')}
              </Button>
            </>
          )
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <TextField label={t('user.displayName')} value={displayName} onChange={setDisplayName} />
          <TextField
            label={t('user.loginName')}
            value={loginName}
            onChange={setLoginName}
            autoComplete="off"
          />
          <TextField
            label={t('user.email')}
            value={email}
            onChange={setEmail}
            type="email"
            autoComplete="off"
          />
          <TextField
            label={t('user.password')}
            value={password}
            onChange={setPassword}
            type="password"
            autoComplete="new-password"
          />
        </div>
        <span>{t('user.passwordHint')}</span>
        <ChipGroup
          label={t('user.sites')}
          options={(sites.data?.sites ?? []).map((site) => ({
            id: site.id,
            label: `${site.code} · ${site.name}`,
          }))}
          value={siteIds}
          onChange={setSiteIds}
        />
        <ChipGroup
          label={t('user.roles')}
          options={(roles.data?.roles ?? []).map((role) => ({
            id: role.id,
            label: `${role.name} · ${t(`role.natures.${role.nature}`)}`,
          }))}
          value={roleIds}
          onChange={setRoleIds}
        />
        <div>
          {t('user.effectivePermissions')} :{' '}
          {[
            ...new Set([
              ...(user?.effectivePermissions ?? []),
              ...selectedRoles.flatMap((role) => role.permissions),
            ]),
          ]
            .map((permission) => t(`permission.${permission}`))
            .join(', ') || t('common.none')}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Select
            label={t('user.team')}
            placeholder={t('common.none')}
            options={[
              { id: NO_ONE, label: t('common.none') },
              ...siteTeams.map((team) => ({ id: team.id, label: `${team.name} · ${team.siteName}` })),
            ]}
            value={teamId ?? NO_ONE}
            onChange={(value) => {
              setTeamId(value === NO_ONE ? null : value);
            }}
          />
          <Select
            label={t('user.reportsTo')}
            placeholder={t('common.none')}
            options={[
              { id: NO_ONE, label: t('common.none') },
              ...(users.data?.users ?? [])
                .filter((other) => other.id !== user?.id)
                .map((other) => ({ id: other.id, label: other.displayName })),
            ]}
            value={reportsTo ?? NO_ONE}
            onChange={(value) => {
              setReportsTo(value === NO_ONE ? null : value);
            }}
          />
        </div>
        {canSetExecution ? (
          <>
            <ChipGroup
              label={t('user.executionSites')}
              options={(sites.data?.sites ?? [])
                .filter((site) => siteIds.includes(site.id))
                .map((site) => ({ id: site.id, label: `${site.code} · ${site.name}` }))}
              value={executionSiteIds}
              onChange={setExecutionSiteIds}
              isDisabled={isSelf}
            />
            <span>{isSelf ? t('user.ownExecution') : t('user.executionHint')}</span>
          </>
        ) : null}
        <Disclosure title={t('user.restrictions')}>
          <span>{t('user.restrictionsHint')}</span>
          <ChipGroup
            label={t('user.restrictions')}
            options={(principals.data?.principals ?? []).map((principal) => ({
              id: principal.id,
              label: principal.name,
            }))}
            value={principalRestrictions}
            onChange={setRestricted}
          />
        </Disclosure>
        <div className="flex justify-end">
          <Button variant="primary" isDisabled={!complete || gesture.sending} onPress={() => void save()}>
            {user === undefined ? t('user.create') : t('common.save')}
          </Button>
        </div>
      </Panel>
    </>
  );
}
