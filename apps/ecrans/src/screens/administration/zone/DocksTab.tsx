import { saveDock, setDockActive, type ZoneLayout } from '@cairn/contrat';
import { Button, DataTable, Panel, StatusBadge, TextField } from '@cairn/ui';
import { Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { textField, useGestureForm } from '../../../contract/form.js';
import { RefusalBanner } from '../../../contract/RefusalBanner.js';
import { useGesture } from '../../../contract/useGesture.js';

type Dock = ZoneLayout['docks'][number];

/** Le code du quai se saisit en minuscules comme en capitales ; le geste le reçoit en capitales. */
const dockForm = {
  input: saveDock.input
    .extend({ code: z.string() })
    .transform((values) => ({ ...values, code: values.code.trim().toUpperCase() }))
    .pipe(saveDock.input),
};

/**
 * Quais d'une zone de réception ou d'expédition (RG-EMP-046) : ils portent l'occupation par un
 * véhicule, leurs emplacements portent le stock. Un quai se désactive, pas avec un véhicule à quai.
 */
export function DocksTab({ zone }: { zone: ZoneLayout }) {
  const { t } = useTranslation();
  const gesture = useGesture();
  const form = useGestureForm(dockForm, { dockId: null, zoneId: zone.id, code: '' });
  const submit = form.handleSubmit(async (input) => {
    if ((await gesture.run(saveDock, input)) !== undefined) form.reset();
  });
  return (
    <>
      <RefusalBanner refusal={gesture.refusal} onDismiss={gesture.dismiss} />
      <Panel title={t('zone.docks')}>
        <DataTable<Dock>
          label={t('zone.docks')}
          rows={zone.docks}
          rowKey={(dock) => dock.id}
          empty={t('zone.noDock')}
          columns={[
            { id: 'code', header: t('zone.dockCode'), size: 'code', code: true, cell: (dock) => dock.code },
            {
              id: 'locations',
              header: t('zone.dockLocations'),
              size: 'number',
              numeric: true,
              cell: (dock) => dock.locationCount,
            },
            {
              id: 'state',
              header: t('site.state'),
              size: 'status',
              cell: (dock) => (
                <StatusBadge tone={dock.active ? 'ok' : 'mute'}>
                  {dock.active ? t('common.active') : t('common.inactive')}
                </StatusBadge>
              ),
            },
            {
              id: 'actions',
              header: '',
              size: 'text',
              cell: (dock) => (
                <Button
                  onPress={() => void gesture.run(setDockActive, { dockId: dock.id, active: !dock.active })}
                >
                  {dock.active ? t('common.deactivate') : t('common.activate')}
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
            name="code"
            render={({ field }) => <TextField label={t('zone.dockCode')} {...textField(field)} code />}
          />
          <span />
          <Button type="submit" isDisabled={!form.formState.isValid || gesture.sending}>
            {t('zone.addDock')}
          </Button>
        </form>
      </Panel>
    </>
  );
}
