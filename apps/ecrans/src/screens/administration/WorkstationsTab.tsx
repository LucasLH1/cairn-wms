import { declareWorkstation, listWorkstations, revokeWorkstation } from '@cairn/contrat';
import { Button, DataTable, Panel, Select, StatusBadge, TextField } from '@cairn/ui';
import { useQuery } from '@tanstack/react-query';
import { Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { z } from 'zod';
import { textField, useGestureForm } from '../../contract/form.js';
import { contractQuery } from '../../contract/query.js';
import { RefusalBanner } from '../../contract/RefusalBanner.js';
import { currentSessionQuery } from '../../contract/session.js';
import { useGesture } from '../../contract/useGesture.js';

type WorkstationRow = z.infer<typeof listWorkstations.output>['workstations'][number];

/**
 * Postes (fiche 0027, règle 4) : déclarer le navigateur d'où l'on agit, qui reçoit alors le cookie de
 * poste ; révoquer un poste, dont le cookie ne vaut plus rien aussitôt.
 */
export function WorkstationsTab() {
  const { t } = useTranslation();
  const { data } = useQuery(contractQuery(listWorkstations, {}));
  const { data: session } = useQuery(currentSessionQuery);
  const gesture = useGesture();
  const form = useGestureForm(declareWorkstation, { name: '', siteId: '' });
  // Aucun site choisi vaut '' dans le formulaire : le schéma du geste le refuse.
  // Le poste déclaré, le nom se vide pour le suivant ; le site reste choisi.
  const submit = form.handleSubmit(async (input) => {
    const declared = await gesture.run(declareWorkstation, input);
    if (declared !== undefined) form.resetField('name');
  });
  const executionSites = (session?.sites ?? []).filter((site) => site.execution);
  return (
    <>
      <RefusalBanner refusal={gesture.refusal} onDismiss={gesture.dismiss} />
      <Panel
        title={t('workstationAdmin.declareTitle')}
        meta={
          session?.workstation === null || session === undefined || session === null
            ? t('workstationAdmin.undeclared')
            : t('workstationAdmin.current', { name: session.workstation.name })
        }
      >
        <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
          <div className="grid grid-cols-2 gap-4">
            <Controller
              control={form.control}
              name="name"
              render={({ field }) => <TextField label={t('workstationAdmin.name')} {...textField(field)} />}
            />
            <Controller
              control={form.control}
              name="siteId"
              render={({ field }) => (
                <Select
                  label={t('workstationAdmin.site')}
                  placeholder={t('expectedReceipt.choose')}
                  options={executionSites.map((site) => ({ id: site.id, label: site.name }))}
                  value={field.value === '' ? null : field.value}
                  onChange={(value) => {
                    field.onChange(value ?? '');
                  }}
                />
              )}
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="primary" isDisabled={!form.formState.isValid || gesture.sending}>
              {t('workstationAdmin.declare')}
            </Button>
          </div>
        </form>
      </Panel>
      <Panel title={t('workstationAdmin.list')}>
        <DataTable<WorkstationRow>
          label={t('workstationAdmin.list')}
          rows={data?.workstations ?? []}
          rowKey={(row) => row.id}
          empty={null}
          columns={[
            { id: 'name', header: t('workstationAdmin.name'), size: 'text', cell: (row) => row.name },
            { id: 'site', header: t('workstationAdmin.site'), size: 'text', cell: (row) => row.siteName },
            {
              id: 'state',
              header: t('workstationAdmin.state'),
              size: 'status',
              cell: (row) =>
                row.revoked ? (
                  <StatusBadge tone="bad">{t('workstationAdmin.revoked')}</StatusBadge>
                ) : (
                  <Button onPress={() => void gesture.run(revokeWorkstation, { workstationId: row.id })}>
                    {t('workstationAdmin.revoke')}
                  </Button>
                ),
            },
          ]}
        />
      </Panel>
    </>
  );
}
