import { getProvider, saveProvider } from '@cairn/contrat';
import { Button, Panel, TextField } from '@cairn/ui';
import { useQuery } from '@tanstack/react-query';
import { Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { textField, useGestureForm } from '../../contract/form.js';
import { contractQuery } from '../../contract/query.js';
import { RefusalBanner } from '../../contract/RefusalBanner.js';
import { useGesture } from '../../contract/useGesture.js';

/** Le prestataire : le contexte de l'instance, son nom (RG-ORG-001). */
export function ProviderTab() {
  const { data } = useQuery(contractQuery(getProvider, {}));
  if (data === undefined) return null;
  return <ProviderForm key={data.name ?? ''} current={data.name} />;
}

function ProviderForm({ current }: { current: string | null }) {
  const { t } = useTranslation();
  const gesture = useGesture();
  const form = useGestureForm(saveProvider, { name: current ?? '' });
  const submit = form.handleSubmit((input) => gesture.run(saveProvider, input));
  return (
    <>
      <RefusalBanner refusal={gesture.refusal} onDismiss={gesture.dismiss} />
      <Panel title={t('provider.title')} meta={current === null ? t('provider.unnamed') : undefined}>
        <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
          <div className="grid grid-cols-2 gap-4">
            <Controller
              control={form.control}
              name="name"
              render={({ field }) => <TextField label={t('provider.name')} {...textField(field)} />}
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="primary" isDisabled={!form.formState.isValid || gesture.sending}>
              {t('common.save')}
            </Button>
          </div>
        </form>
      </Panel>
    </>
  );
}
