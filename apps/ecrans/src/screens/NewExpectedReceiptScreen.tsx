import { createExpectedReceipt, listItems, listPrincipals, listSuppliers } from '@cairn/contrat';
import { fr } from '@cairn/libelles';
import { Banner, Button, DateField, NumberField, Panel, Select } from '@cairn/ui';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NoResponseError, sendGesture } from '../contract/client.js';
import { contractQuery } from '../contract/query.js';
import { refusalLabelKey, type RefusalLabelKey } from '../contract/refusal.js';
import { useWorkingSite } from '../shell/site.js';

interface DraftLine {
  readonly key: number;
  readonly itemId: string | null;
  readonly quantity: number | null;
}

/**
 * Saisie manuelle d'un attendu (RG-REC-010) : donneur d'ordre, fournisseur, date d'arrivée prévue,
 * lignes. La spécification décrit l'import et la surveillance, pas la saisie : cet écran n'assemble
 * que les champs que l'attendu porte (RG-REC-007 à 009) et les composants de la maquette.
 */
export function NewExpectedReceiptScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const site = useWorkingSite();
  const [principalId, setPrincipalId] = useState<string | null>(null);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [expectedArrivalDate, setExpectedArrivalDate] = useState<string | null>(null);
  const [lines, setLines] = useState<readonly DraftLine[]>([{ key: 0, itemId: null, quantity: null }]);
  const [nextKey, setNextKey] = useState(1);
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

  const complete =
    site !== undefined &&
    principalId !== null &&
    supplierId !== null &&
    expectedArrivalDate !== null &&
    lines.every((line) => line.itemId !== null && line.quantity !== null && line.quantity > 0);

  const update = (key: number, change: Partial<DraftLine>) => {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...change } : line)));
  };

  const save = async () => {
    if (!complete) return;
    setSending(true);
    setRefusal(undefined);
    try {
      const outcome = await sendGesture(createExpectedReceipt, {
        principalId,
        siteId: site.id,
        supplierId,
        expectedArrivalDate,
        lines: lines.flatMap((line) =>
          line.itemId === null || line.quantity === null
            ? []
            : [{ itemId: line.itemId, quantity: line.quantity }],
        ),
      });
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
  };

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
          <Select
            label={t('expectedReceipt.principal')}
            placeholder={t('expectedReceipt.choose')}
            options={(principals.data?.principals ?? []).map((principal) => ({
              id: principal.id,
              label: principal.name,
            }))}
            value={principalId}
            onChange={(value) => {
              setPrincipalId(value);
              setSupplierId(null);
              setLines([{ key: nextKey, itemId: null, quantity: null }]);
              setNextKey(nextKey + 1);
            }}
          />
          <Select
            label={t('expectedReceipt.supplier')}
            placeholder={t('expectedReceipt.choose')}
            options={(suppliers.data?.suppliers ?? []).map((supplier) => ({
              id: supplier.id,
              label: supplier.name,
            }))}
            value={supplierId}
            onChange={setSupplierId}
            isDisabled={principalId === null}
          />
          <DateField
            label={t('expectedReceipt.expectedArrivalDate')}
            value={expectedArrivalDate}
            onChange={setExpectedArrivalDate}
          />
        </div>
      </Panel>
      <Panel
        title={t('expectedReceipt.lines')}
        actions={
          <Button
            isDisabled={principalId === null}
            onPress={() => {
              setLines([...lines, { key: nextKey, itemId: null, quantity: null }]);
              setNextKey(nextKey + 1);
            }}
          >
            {t('expectedReceipt.addLine')}
          </Button>
        }
      >
        {lines.map((line, index) => (
          <div key={line.key} className="grid grid-cols-(--cairn-line-columns) items-end gap-3">
            <Select
              label={`${t('expectedReceipt.item')} ${String(index + 1)}`}
              placeholder={t('expectedReceipt.choose')}
              options={itemOptions}
              value={line.itemId}
              onChange={(itemId) => {
                update(line.key, { itemId });
              }}
              isDisabled={principalId === null}
            />
            <NumberField
              label={`${t('expectedReceipt.quantity')} ${String(index + 1)}`}
              value={line.quantity}
              minValue={1}
              onChange={(quantity) => {
                update(line.key, { quantity });
              }}
            />
            <Button
              isDisabled={lines.length === 1}
              onPress={() => {
                setLines(lines.filter((other) => other.key !== line.key));
              }}
            >
              {t('expectedReceipt.removeLine')}
            </Button>
          </div>
        ))}
        <div className="flex justify-end">
          <Button variant="primary" isDisabled={!complete || sending} onPress={() => void save()}>
            {t('expectedReceipt.save')}
          </Button>
        </div>
      </Panel>
    </>
  );
}
