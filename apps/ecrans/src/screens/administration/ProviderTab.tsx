import { getProvider, saveProvider } from '@cairn/contrat';
import { Button, Panel, TextField } from '@cairn/ui';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const [name, setName] = useState(current ?? '');
  const gesture = useGesture();
  return (
    <>
      <RefusalBanner refusal={gesture.refusal} onDismiss={gesture.dismiss} />
      <Panel title={t('provider.title')} meta={current === null ? t('provider.unnamed') : undefined}>
        <div className="grid grid-cols-2 gap-4">
          <TextField label={t('provider.name')} value={name} onChange={setName} />
        </div>
        <div className="flex justify-end">
          <Button
            variant="primary"
            isDisabled={name.trim() === '' || gesture.sending}
            onPress={() => void gesture.run(saveProvider, { name })}
          >
            {t('common.save')}
          </Button>
        </div>
      </Panel>
    </>
  );
}
