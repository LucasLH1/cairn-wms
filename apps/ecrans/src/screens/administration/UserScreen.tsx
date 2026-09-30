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
import { Controller, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { textField, useGestureForm, valueField } from '../../contract/form.js';
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

  const form = useGestureForm(saveUser, {
    userId: user?.id ?? null,
    displayName: user?.displayName ?? '',
    loginName: user?.loginName ?? '',
    email: user?.email ?? null,
    password: null,
    roleIds: user?.roleIds ?? [],
    siteIds: user?.siteIds ?? [],
    teamId: user?.teamId ?? null,
    reportsToUserId: user?.reportsToUserId ?? null,
  });
  const [siteIds, roleIds, password] = useWatch({
    control: form.control,
    name: ['siteIds', 'roleIds', 'password'],
  });
  // Sites d'exécution et restrictions sont d'autres gestes, envoyés après l'utilisateur, une fois son
  // identifiant connu : ils ne sont pas champs du formulaire de `saveUser`.
  const [executionSiteIds, setExecutionSiteIds] = useState<readonly string[]>(user?.executionSiteIds ?? []);
  const [restricted, setRestricted] = useState<readonly string[] | undefined>();
  const principalRestrictions = restricted ?? restrictions.data?.principalIds ?? [];
  const isSelf = user !== undefined && user.id === session?.user.id;

  const siteTeams = (teams.data?.teams ?? []).filter((team) => team.active && siteIds.includes(team.siteId));
  const selectedRoles = (roles.data?.roles ?? []).filter((role) => roleIds.includes(role.id));

  const submit = form.handleSubmit(async (input) => {
    const saved = await gesture.run(saveUser, {
      ...input,
      teamId:
        input.teamId !== null && siteTeams.some((team) => team.id === input.teamId) ? input.teamId : null,
    });
    if (saved === undefined) return;
    if (canSetExecution && !isSelf) {
      await gesture.run(setExecutionSites, {
        userId: saved.userId,
        siteIds: executionSiteIds.filter((siteId) => input.siteIds.includes(siteId)),
      });
    }
    if (restricted !== undefined) {
      await gesture.run(setPrincipalRestrictions, { userId: saved.userId, principalIds: [...restricted] });
    }
    form.setValue('password', null, { shouldValidate: true });
    if (user === undefined)
      await navigate({ to: '/administration/users/$userId', params: { userId: saved.userId } });
  });

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
        <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
          <div className="grid grid-cols-2 gap-4">
            <Controller
              control={form.control}
              name="displayName"
              render={({ field }) => <TextField label={t('user.displayName')} {...textField(field)} />}
            />
            <Controller
              control={form.control}
              name="loginName"
              render={({ field }) => (
                <TextField label={t('user.loginName')} {...textField(field)} autoComplete="off" />
              )}
            />
            <Controller
              control={form.control}
              name="email"
              render={({ field }) => (
                <TextField
                  label={t('user.email')}
                  {...textField(field, { optional: true, compact: true })}
                  type="email"
                  autoComplete="off"
                />
              )}
            />
            <Controller
              control={form.control}
              name="password"
              render={({ field }) => (
                <TextField
                  label={t('user.password')}
                  {...textField(field, { optional: true })}
                  type="password"
                  autoComplete="new-password"
                />
              )}
            />
          </div>
          <span>{t('user.passwordHint')}</span>
          <Controller
            control={form.control}
            name="siteIds"
            render={({ field }) => (
              <ChipGroup
                label={t('user.sites')}
                options={(sites.data?.sites ?? []).map((site) => ({
                  id: site.id,
                  label: `${site.code} · ${site.name}`,
                }))}
                {...valueField(field)}
              />
            )}
          />
          <Controller
            control={form.control}
            name="roleIds"
            render={({ field }) => (
              <ChipGroup
                label={t('user.roles')}
                options={(roles.data?.roles ?? []).map((role) => ({
                  id: role.id,
                  label: `${role.name} · ${t(`role.natures.${role.nature}`)}`,
                }))}
                {...valueField(field)}
              />
            )}
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
            <Controller
              control={form.control}
              name="teamId"
              render={({ field }) => (
                <Select
                  label={t('user.team')}
                  placeholder={t('common.none')}
                  options={[
                    { id: NO_ONE, label: t('common.none') },
                    ...siteTeams.map((team) => ({ id: team.id, label: `${team.name} · ${team.siteName}` })),
                  ]}
                  value={field.value ?? NO_ONE}
                  onChange={(value) => {
                    field.onChange(value === NO_ONE ? null : value);
                  }}
                />
              )}
            />
            <Controller
              control={form.control}
              name="reportsToUserId"
              render={({ field }) => (
                <Select
                  label={t('user.reportsTo')}
                  placeholder={t('common.none')}
                  options={[
                    { id: NO_ONE, label: t('common.none') },
                    ...(users.data?.users ?? [])
                      .filter((other) => other.id !== user?.id)
                      .map((other) => ({ id: other.id, label: other.displayName })),
                  ]}
                  value={field.value ?? NO_ONE}
                  onChange={(value) => {
                    field.onChange(value === NO_ONE ? null : value);
                  }}
                />
              )}
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
            {/* À la création, le mot de passe est obligatoire ; le schéma, commun aux deux cas, l'accepte absent. */}
            <Button
              type="submit"
              variant="primary"
              isDisabled={
                !form.formState.isValid || (user === undefined && password === null) || gesture.sending
              }
            >
              {user === undefined ? t('user.create') : t('common.save')}
            </Button>
          </div>
        </form>
      </Panel>
    </>
  );
}
