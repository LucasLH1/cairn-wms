import { declareWorkstation, listWorkstations, revokeWorkstation } from '@cairn/contrat';
import { Button, DataTable, Panel, Select, StatusBadge, TextField } from '@cairn/ui';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { z } from 'zod';
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
  const [name, setName] = useState('');
  const [siteId, setSiteId] = useState<string | null>(null);
  const gesture = useGesture();
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
        <div className="grid grid-cols-2 gap-4">
          <TextField label={t('workstationAdmin.name')} value={name} onChange={setName} />
          <Select
            label={t('workstationAdmin.site')}
            placeholder={t('expectedReceipt.choose')}
            options={executionSites.map((site) => ({ id: site.id, label: site.name }))}
            value={siteId}
            onChange={setSiteId}
          />
        </div>
        <div className="flex justify-end">
          <Button
            variant="primary"
            isDisabled={name.trim() === '' || siteId === null || gesture.sending}
            onPress={() =>
              void gesture.run(declareWorkstation, { name, siteId: siteId ?? '' }).then(() => {
                setName('');
              })
            }
          >
            {t('workstationAdmin.declare')}
          </Button>
        </div>
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
