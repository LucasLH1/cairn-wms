import { createExpectedReceipt, listItems, listPrincipals, listSuppliers } from '@cairn/contrat';
import { fr } from '@cairn/libelles';
import { Banner, Button, DateField, NumberField, Panel, Select } from '@cairn/ui';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Controller, useFieldArray, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { NoResponseError, sendGesture } from '../contract/client.js';
import { useGestureForm } from '../contract/form.js';
import { contractQuery } from '../contract/query.js';
import { refusalLabelKey, type RefusalLabelKey } from '../contract/refusal.js';
import { useWorkingSite } from '../shell/site.js';

/*
 * Un choix pas encore fait vaut '' et une quantité pas encore saisie NaN, comme le champ numérique
 * vide : le schéma du geste refuse l'un et l'autre, le bouton attend.
 */
const blankLine = () => ({ itemId: '', quantity: Number.NaN });
const chosen = (value: string) => (value === '' ? null : value);

/**
 * Saisie manuelle d'un attendu (RG-REC-010) : donneur d'ordre, fournisseur, date d'arrivée prévue,
 * lignes. La spécification décrit l'import et la surveillance, pas la saisie : cet écran n'assemble
 * que les champs que l'attendu porte (RG-REC-007 à 009) et les composants de la maquette.
 */
export function NewExpectedReceiptScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const site = useWorkingSite();
  const form = useGestureForm(createExpectedReceipt, {
    principalId: '',
    siteId: site?.id ?? '',
    supplierId: '',
    expectedArrivalDate: '',
    lines: [blankLine()],
  });
  const lines = useFieldArray({ control: form.control, name: 'lines' });
  const principalId = chosen(useWatch({ control: form.control, name: 'principalId' }));
  // Le site de l'attendu est le site de travail, qui peut changer pendant la saisie.
  useEffect(() => {
    form.setValue('siteId', site?.id ?? '', { shouldValidate: true });
  }, [form, site]);
  const [refusal, setRefusal] = useState<RefusalLabelKey | 'failure.noResponse' | undefined>();
  const [sending, setSending] = useState(false);

  const principals = useQuery(contractQuery(listPrincipals, {}));
  const suppliers = useQuery({
    ...contractQuery(listSuppliers, { principalId: principalId ?? '' }),
    enabled: principalId !== null,
  });
  const items = useQuery({
    ...contractQuery(listItems, { principalId: principalId ?? '' }),
    enabled: principalId !== null,
  });

  const save = form.handleSubmit(async (input) => {
    setSending(true);
    setRefusal(undefined);
    try {
      const outcome = await sendGesture(createExpectedReceipt, input);
      if (outcome.outcome === 'refused') {
        setRefusal(refusalLabelKey(outcome.reason, fr.refusal));
        return;
      }
      await navigate({
        to: '/expected-receipts/$expectedReceiptId',
        params: { expectedReceiptId: outcome.result.expectedReceiptId },
      });
    } catch (error) {
      if (error instanceof NoResponseError) setRefusal('failure.noResponse');
      else throw error;
    } finally {
      setSending(false);
    }
  });

  const itemOptions = (items.data?.items ?? []).map((item) => ({
    id: item.id,
    label: `${item.code} — ${item.shortLabel}`,
  }));

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
          {t(refusal)}
        </Banner>
      )}
      <Panel title={t('expectedReceipt.newTitle')} meta={site?.name}>
        <div className="grid grid-cols-3 gap-4">
          <Controller
            control={form.control}
            name="principalId"
            render={({ field }) => (
              <Select
                label={t('expectedReceipt.principal')}
                placeholder={t('expectedReceipt.choose')}
                options={(principals.data?.principals ?? []).map((principal) => ({
                  id: principal.id,
                  label: principal.name,
                }))}
                value={chosen(field.value)}
                onChange={(value) => {
                  // Fournisseurs et références sont ceux du donneur d'ordre : un autre choix les efface.
                  field.onChange(value ?? '');
                  form.setValue('supplierId', '', { shouldValidate: true });
                  lines.replace([blankLine()]);
                }}
              />
            )}
          />
          <Controller
            control={form.control}
            name="supplierId"
            render={({ field }) => (
              <Select
                label={t('expectedReceipt.supplier')}
                placeholder={t('expectedReceipt.choose')}
                options={(suppliers.data?.suppliers ?? []).map((supplier) => ({
                  id: supplier.id,
                  label: supplier.name,
                }))}
                value={chosen(field.value)}
                onChange={(value) => {
                  field.onChange(value ?? '');
                }}
                isDisabled={principalId === null}
              />
            )}
          />
          <Controller
            control={form.control}
            name="expectedArrivalDate"
            render={({ field }) => (
              <DateField
                label={t('expectedReceipt.expectedArrivalDate')}
                value={chosen(field.value)}
                onChange={(value) => {
                  field.onChange(value ?? '');
                }}
              />
            )}
          />
        </div>
      </Panel>
      <Panel
        title={t('expectedReceipt.lines')}
        actions={
          <Button
            isDisabled={principalId === null}
            onPress={() => {
              lines.append(blankLine());
            }}
          >
            {t('expectedReceipt.addLine')}
          </Button>
        }
      >
        {lines.fields.map((line, index) => (
          <div key={line.id} className="grid grid-cols-(--cairn-line-columns) items-end gap-3">
            <Controller
              control={form.control}
              name={`lines.${index}.itemId`}
              render={({ field }) => (
                <Select
                  label={`${t('expectedReceipt.item')} ${String(index + 1)}`}
                  placeholder={t('expectedReceipt.choose')}
                  options={itemOptions}
                  value={chosen(field.value)}
                  onChange={(itemId) => {
                    field.onChange(itemId ?? '');
                  }}
                  isDisabled={principalId === null}
                />
              )}
            />
            <Controller
              control={form.control}
              name={`lines.${index}.quantity`}
              render={({ field }) => (
                <NumberField
                  label={`${t('expectedReceipt.quantity')} ${String(index + 1)}`}
                  value={Number.isNaN(field.value) ? null : field.value}
                  minValue={1}
                  onChange={(quantity) => {
                    field.onChange(quantity ?? Number.NaN);
                  }}
                />
              )}
            />
            <Button
              isDisabled={lines.fields.length === 1}
              onPress={() => {
                lines.remove(index);
              }}
            >
              {t('expectedReceipt.removeLine')}
            </Button>
          </div>
        ))}
        <div className="flex justify-end">
          {/* Deux panneaux, un seul geste : le bouton envoie le formulaire sans l'envelopper. */}
          <Button
            variant="primary"
            isDisabled={!form.formState.isValid || sending}
            onPress={() => void save()}
          >
            {t('expectedReceipt.save')}
          </Button>
        </div>
      </Panel>
    </>
  );
}
