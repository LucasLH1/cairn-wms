import { listSites, listTeams, listUsers, saveTeam, setTeamActive } from '@cairn/contrat';
import { Button, Panel, Select, StatusBadge, TextField } from '@cairn/ui';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import { Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { z } from 'zod';
import { textField, useGestureForm } from '../../contract/form.js';
import { contractQuery } from '../../contract/query.js';
import { RefusalBanner } from '../../contract/RefusalBanner.js';
import { useGesture } from '../../contract/useGesture.js';

const NO_ONE = 'none';
type TeamRow = z.infer<typeof listTeams.output>['teams'][number];

/** Fiche équipe (RG-SUR-008 à 014) : site, nom, encadrant ; désactivation une fois les membres replacés. */
export function TeamScreen() {
  const { teamId } = useParams({ from: '/shell/administration/teams/$teamId' });
  const { data } = useQuery(contractQuery(listTeams, {}));
  if (data === undefined) return null;
  return <TeamForm key={teamId} team={data.teams.find((team) => team.id === teamId)} />;
}

function TeamForm({ team }: { team: TeamRow | undefined }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const gesture = useGesture();
  const sites = useQuery(contractQuery(listSites, {}));
  const users = useQuery(contractQuery(listUsers, {}));
  // Aucun site choisi vaut '' dans le formulaire : le schéma du geste le refuse.
  const form = useGestureForm(saveTeam, {
    teamId: team?.id ?? null,
    siteId: team?.siteId ?? '',
    name: team?.name ?? '',
    leadUserId: team?.leadUserId ?? null,
  });
  const siteId = form.watch('siteId');
  const siteCode = sites.data?.sites.find((site) => site.id === siteId)?.code;

  const submit = form.handleSubmit(async (input) => {
    const saved = await gesture.run(saveTeam, input);
    if (saved !== undefined && team === undefined) {
      await navigate({ to: '/administration/teams/$teamId', params: { teamId: saved.teamId } });
    }
  });

  return (
    <>
      <RefusalBanner refusal={gesture.refusal} onDismiss={gesture.dismiss} />
      <Panel
        title={team === undefined ? t('team.newTitle') : team.name}
        meta={team === undefined ? undefined : `${t('team.members')} : ${String(team.memberCount)}`}
        actions={
          team === undefined ? undefined : (
            <>
              <StatusBadge tone={team.active ? 'ok' : 'mute'}>
                {team.active ? t('common.active') : t('common.inactive')}
              </StatusBadge>
              <Button
                onPress={() => void gesture.run(setTeamActive, { teamId: team.id, active: !team.active })}
              >
                {team.active ? t('common.deactivate') : t('common.activate')}
              </Button>
            </>
          )
        }
      >
        <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
          <div className="grid grid-cols-3 gap-4">
            <Controller
              control={form.control}
              name="siteId"
              render={({ field }) => (
                <Select
                  label={t('team.site')}
                  placeholder={t('expectedReceipt.choose')}
                  options={(sites.data?.sites ?? []).map((site) => ({
                    id: site.id,
                    label: `${site.code} · ${site.name}`,
                  }))}
                  value={field.value === '' ? null : field.value}
                  onChange={(value) => {
                    field.onChange(value ?? '');
                  }}
                  isDisabled={team !== undefined}
                />
              )}
            />
            <Controller
              control={form.control}
              name="name"
              render={({ field }) => <TextField label={t('team.name')} {...textField(field)} />}
            />
            <Controller
              control={form.control}
              name="leadUserId"
              render={({ field }) => (
                <Select
                  label={t('team.lead')}
                  placeholder={t('team.noLead')}
                  options={[
                    { id: NO_ONE, label: t('team.noLead') },
                    ...(users.data?.users ?? [])
                      .filter(
                        (user) => user.active && siteCode !== undefined && user.sites.includes(siteCode),
                      )
                      .map((user) => ({ id: user.id, label: user.displayName })),
                  ]}
                  value={field.value ?? NO_ONE}
                  onChange={(value) => {
                    field.onChange(value === NO_ONE ? null : value);
                  }}
                />
              )}
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="primary" isDisabled={!form.formState.isValid || gesture.sending}>
              {team === undefined ? t('team.create') : t('common.save')}
            </Button>
          </div>
        </form>
      </Panel>
    </>
  );
}
