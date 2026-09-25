import { openSessionInputSchema, type OpenSessionInput } from '@cairn/contrat';
import { fr } from '@cairn/libelles';
import { Banner, Brand, Button, Panel, TextField } from '@cairn/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { refusalLabelKey, type RefusalLabelKey } from '../contract/refusal.js';
import { currentSessionQuery, openSession } from '../contract/session.js';

/**
 * Ouverture de session (fiche 0027). La maquette n'a pas d'écran de connexion : celui-ci n'assemble
 * que ses composants — panneau, champs, bouton principal, bandeau de refus. Écart signalé (#59).
 */
export function SessionScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [refusal, setRefusal] = useState<RefusalLabelKey | 'failure.noResponse' | undefined>();
  const form = useForm<OpenSessionInput>({
    resolver: zodResolver(openSessionInputSchema),
    mode: 'onChange',
    defaultValues: { loginName: '', password: '' },
  });

  const submit = form.handleSubmit(async (input) => {
    setRefusal(undefined);
    try {
      const outcome = await openSession(input);
      if (outcome.outcome === 'refused') {
        setRefusal(refusalLabelKey(outcome.reason, fr.refusal));
        return;
      }
      queryClient.setQueryData(currentSessionQuery.queryKey, outcome.session);
      await navigate({ to: '/' });
    } catch {
      setRefusal('failure.noResponse');
    }
  });

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="grid w-full max-w-narrow gap-4">
        <Brand productName={t('application.name')} />
        {refusal === undefined ? null : (
          <Banner
            tone="bad"
            dismissLabel={t('shell.dismiss')}
            onDismiss={() => {
              setRefusal(undefined);
            }}
          >
            {t(refusal)}
          </Banner>
        )}
        <Panel title={t('session.title')}>
          <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
            <Controller
              control={form.control}
              name="loginName"
              render={({ field }) => (
                <TextField
                  label={t('session.loginName')}
                  name={field.name}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  autoComplete="username"
                  autoFocus
                />
              )}
            />
            <Controller
              control={form.control}
              name="password"
              render={({ field }) => (
                <TextField
                  label={t('session.password')}
                  type="password"
                  name={field.name}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  autoComplete="current-password"
                />
              )}
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                variant="primary"
                isDisabled={!form.formState.isValid || form.formState.isSubmitting}
              >
                {t('session.open')}
              </Button>
            </div>
          </form>
        </Panel>
      </div>
    </div>
  );
}
