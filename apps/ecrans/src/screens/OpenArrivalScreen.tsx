import { listCarriers, listDocks, openInboundArrival } from '@cairn/contrat';
import { fr } from '@cairn/libelles';
import { Banner, Button, Panel, Select, TextField } from '@cairn/ui';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useState } from 'react';
import { Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { NoResponseError, sendGesture } from '../contract/client.js';
import { textField, useGestureForm } from '../contract/form.js';
import { contractQuery } from '../contract/query.js';
import {
  refusalLabelKey,
  refusalValues,
  type RefusalDetails,
  type RefusalLabelKey,
} from '../contract/refusal.js';
import { useWorkingSite } from '../shell/site.js';

const NO_CARRIER = 'none';

/**
 * Ouverture d'un arrivage (1.1, parcours « Ouvrir un arrivage ») : identification du véhicule,
 * transporteur facultatif (RG-REC-001). L'heure d'arrivée est celle de la validation.
 */
export function OpenArrivalScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const site = useWorkingSite();
  const { dockId } = useParams({ from: '/shell/docks/$dockId/arrival' });
  const docks = useQuery({
    ...contractQuery(listDocks, { siteId: site?.id ?? '' }),
    enabled: site !== undefined,
  });
  const carriers = useQuery(contractQuery(listCarriers, {}));
  const dock = docks.data?.docks.find((candidate) => candidate.id === dockId);
  const form = useGestureForm(openInboundArrival, { dockId, vehicleIdentification: '', carrierId: null });
  const [refusal, setRefusal] = useState<
    { key: RefusalLabelKey | 'failure.noResponse'; details: RefusalDetails } | undefined
  >();
  const [sending, setSending] = useState(false);

  const submit = form.handleSubmit(async (input) => {
    setSending(true);
    setRefusal(undefined);
    try {
      const outcome = await sendGesture(openInboundArrival, input);
      if (outcome.outcome === 'refused') {
        setRefusal({ key: refusalLabelKey(outcome.reason, fr.refusal), details: outcome.details });
        return;
      }
      await navigate({ to: '/receptions' });
    } catch (error) {
      if (error instanceof NoResponseError) setRefusal({ key: 'failure.noResponse', details: undefined });
      else throw error;
    } finally {
      setSending(false);
    }
  });

  return (
    <>
      {refusal === undefined ? null : (
        <Banner
          tone="bad"
          dismissLabel={t('shell.dismiss')}
          onDismiss={() => {
            setRefusal(undefined);
          }}
        >
          {t(refusal.key, refusalValues(refusal.details))}
        </Banner>
      )}
      <Panel title={t('arrival.title', { code: dock?.code ?? '' })} meta={site?.name}>
        <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
          <div className="grid grid-cols-2 gap-4">
            <Controller
              control={form.control}
              name="vehicleIdentification"
              render={({ field }) => (
                <TextField label={t('arrival.vehicle')} {...textField(field)} autoFocus code />
              )}
            />
            <Controller
              control={form.control}
              name="carrierId"
              render={({ field }) => (
                <Select
                  label={t('arrival.carrier')}
                  placeholder={t('arrival.noCarrier')}
                  options={[
                    { id: NO_CARRIER, label: t('arrival.noCarrier') },
                    ...(carriers.data?.carriers ?? []).map((carrier) => ({
                      id: carrier.id,
                      label: carrier.name,
                    })),
                  ]}
                  value={field.value ?? NO_CARRIER}
                  onChange={(value) => {
                    // « Sans transporteur » se choisit, et vaut l'absence de transporteur (RG-REC-001).
                    field.onChange(value === NO_CARRIER ? null : value);
                  }}
                />
              )}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button onPress={() => void navigate({ to: '/receptions' })}>{t('arrival.cancel')}</Button>
            <Button type="submit" variant="primary" isDisabled={!form.formState.isValid || sending}>
              {t('arrival.submit')}
            </Button>
          </div>
        </form>
      </Panel>
    </>
  );
}
