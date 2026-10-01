import {
  completeStockMove,
  getHandlingUnit,
  search,
  startStockMove,
  stockAt,
  type StockUnit,
} from '@cairn/contrat';
import { Banner, Button, ChipGroup, DataTable, NumberField, Panel, Select, TextField } from '@cairn/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearch } from '@tanstack/react-router';
import { useState } from 'react';
import { Controller, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { useBarcode } from '../../barcode/service.js';
import { useGestureForm } from '../../contract/form.js';
import { contractQuery } from '../../contract/query.js';
import { RefusalBanner } from '../../contract/RefusalBanner.js';
import { useGesture } from '../../contract/useGesture.js';
import { StockUnitsTable } from './stockTables.js';

/** Un emplacement ou un support, désigné par son code : l'origine ou la destination d'un déplacement. */
interface Place {
  readonly kind: 'location' | 'handlingUnit';
  readonly id: string;
  readonly code: string;
}

/** Le déplacement pris, en attente de son dépôt. */
interface Taken {
  readonly moveId: string;
  readonly origin: Place;
}

const WHOLE = 'whole';
const LINES = 'lines';

/**
 * Déplacer du stock (0.4 § 6, « Magasinier — Transférer du stock ») : scan de l'origine, emplacement ou
 * support ; sélection de ce qui part, tout le support ou des lignes avec leurs quantités ; scan de la
 * destination, où s'appliquent les contrôles d'emplacement et de cohabitation. Le stock pris est « en
 * cours de mouvement » jusqu'au dépôt (RG-STK-018). Un refus au dépôt laisse scanner une autre
 * destination ; un dépôt réussi ramène au scan de l'origine, sans étape intermédiaire. Une lecture faite
 * sur cet écran répond à la question posée (RG-SUR-060).
 */
export function MoveScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { handlingUnitId } = useSearch({ from: '/shell/stock/move' });
  // Venu de la fiche d'un support, le déplacement part de lui.
  const [origin, setOrigin] = useState<Place | undefined>(() =>
    handlingUnitId === '' ? undefined : { kind: 'handlingUnit', id: handlingUnitId, code: '' },
  );
  const [taken, setTaken] = useState<Taken>();
  const [dropped, setDropped] = useState<number>();
  const [unknown, setUnknown] = useState<string>();
  const drop = useGesture();
  const { data: presetSupport } = useQuery({
    ...contractQuery(getHandlingUnit, { handlingUnitId: origin?.id ?? '' }),
    enabled: origin?.kind === 'handlingUnit' && origin.code === '',
  });
  const originCode = (place: Place) =>
    place.code === '' ? (presetSupport?.handlingUnit.code ?? '') : place.code;

  /** Le code lu ou saisi, identifié par la recherche unique : un emplacement ou un support du périmètre. */
  const resolve = async (text: string): Promise<Place | undefined> => {
    const { results } = await queryClient.query(contractQuery(search, { text }));
    const match = results.find(
      (result) =>
        result.exact && !result.outOfScope && (result.type === 'location' || result.type === 'handlingUnit'),
    );
    if (match === undefined || (match.type !== 'location' && match.type !== 'handlingUnit')) return undefined;
    return { kind: match.type, id: match.id, code: match.code ?? text };
  };

  const answer = async (code: string) => {
    const text = code.trim();
    if (text === '') return;
    setDropped(undefined);
    const place = await resolve(text);
    setUnknown(place === undefined ? text : undefined);
    if (place === undefined) return;
    if (taken === undefined) {
      setOrigin(place);
      return;
    }
    const result = await drop.run(completeStockMove, {
      moveId: taken.moveId,
      destination:
        place.kind === 'location'
          ? { kind: 'location', locationId: place.id }
          : { kind: 'handlingUnit', handlingUnitId: place.id },
    });
    if (result === undefined) return;
    setDropped(result.movements);
    setTaken(undefined);
    setOrigin(undefined);
  };
  useBarcode((code) => void answer(code));

  return (
    <>
      {dropped === undefined ? null : <Banner tone="ok">{t('stockMove.done', { count: dropped })}</Banner>}
      {unknown === undefined ? null : (
        <Banner tone="bad">{t('stockMove.notFound', { text: unknown })}</Banner>
      )}
      <RefusalBanner refusal={drop.refusal} onDismiss={drop.dismiss} />
      {taken !== undefined ? (
        <Panel title={t('stockMove.destinationTitle')} meta={originCode(taken.origin)}>
          <span>{t('stockMove.destinationHint', { origin: originCode(taken.origin) })}</span>
          <CodeForm action={t('stockMove.drop')} sending={drop.sending} onSubmit={answer} />
        </Panel>
      ) : origin === undefined ? (
        <Panel title={t('stockMove.originTitle')}>
          <span>{t('stockMove.originHint')}</span>
          <CodeForm action={t('stockMove.validate')} sending={false} onSubmit={answer} />
        </Panel>
      ) : (
        <SelectionPanel
          key={`${origin.kind}-${origin.id}`}
          origin={origin}
          originCode={originCode(origin)}
          onTaken={(moveId) => {
            setTaken({ moveId, origin });
          }}
          onChangeOrigin={() => {
            setOrigin(undefined);
          }}
        />
      )}
    </>
  );
}

/** Le code d'un emplacement ou d'un support, saisi à la main quand il n'est pas lu. */
function CodeForm({
  action,
  sending,
  onSubmit,
}: {
  action: string;
  sending: boolean;
  onSubmit: (code: string) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  return (
    <form
      className="grid grid-cols-(--cairn-line-columns) items-end gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit(text).then(() => {
          setText('');
        });
      }}
    >
      <TextField label={t('stockMove.code')} value={text} onChange={setText} code />
      <span />
      <Button type="submit" variant="primary" isDisabled={text.trim() === '' || sending}>
        {action}
      </Button>
    </form>
  );
}

/**
 * La sélection se saisit ligne par ligne ; le geste reçoit le support entier, ou les lignes retenues
 * avec leur quantité. Le schéma du geste valide ce qui en résulte, comme le serveur le recevra.
 */
function selectionForm(origin: Place) {
  return {
    input: z
      .object({
        mode: z.string(),
        selected: z.array(z.string()),
        lines: z.array(z.object({ stockUnitId: z.string(), quantity: z.number().nullable() })),
      })
      .transform(({ mode, selected, lines }): z.input<typeof startStockMove.input> =>
        mode === WHOLE && origin.kind === 'handlingUnit'
          ? { source: { kind: 'handlingUnit', handlingUnitId: origin.id } }
          : {
              source: {
                kind: 'stock',
                lines: lines
                  .filter((line) => selected.includes(line.stockUnitId))
                  .map((line) => ({ stockUnitId: line.stockUnitId, quantity: line.quantity ?? 0 })),
              },
            },
      )
      .pipe(startStockMove.input),
  };
}

const lineLabel = (unit: StockUnit) =>
  [unit.itemCode, unit.qualityLabel, unit.batchNumber, unit.serialNumber, String(unit.quantity)]
    .filter((part) => part !== null)
    .join(' · ');

function SelectionPanel({
  origin,
  originCode,
  onTaken,
  onChangeOrigin,
}: {
  origin: Place;
  originCode: string;
  onTaken: (moveId: string) => void;
  onChangeOrigin: () => void;
}) {
  const { data } = useQuery(
    contractQuery(
      stockAt,
      origin.kind === 'location'
        ? { kind: 'location', locationId: origin.id }
        : { kind: 'handlingUnit', handlingUnitId: origin.id },
    ),
  );
  if (data === undefined) return null;
  return (
    <SelectionForm
      origin={origin}
      originCode={originCode}
      // Ce qui est déjà en cours de mouvement n'accepte aucune autre opération (RG-STK-018).
      units={data.stockUnits.filter((unit) => unit.status !== 'moving')}
      onTaken={onTaken}
      onChangeOrigin={onChangeOrigin}
    />
  );
}

function SelectionForm({
  origin,
  originCode,
  units,
  onTaken,
  onChangeOrigin,
}: {
  origin: Place;
  originCode: string;
  units: readonly StockUnit[];
  onTaken: (moveId: string) => void;
  onChangeOrigin: () => void;
}) {
  const { t } = useTranslation();
  const gesture = useGesture();
  const [definition] = useState(() => selectionForm(origin));
  const form = useGestureForm(definition, {
    mode: origin.kind === 'handlingUnit' ? WHOLE : LINES,
    selected: [],
    // Par défaut, une ligne part en entier.
    lines: units.map((unit) => ({ stockUnitId: unit.id, quantity: unit.quantity })),
  });
  const mode = useWatch({ control: form.control, name: 'mode' });
  const selected = useWatch({ control: form.control, name: 'selected' });
  const submit = form.handleSubmit(async (input) => {
    const result = await gesture.run(startStockMove, input);
    if (result !== undefined) onTaken(result.moveId);
  });
  const whole = mode === WHOLE && origin.kind === 'handlingUnit';
  const chosen = units.filter((unit) => selected.includes(unit.id));
  return (
    <>
      <RefusalBanner refusal={gesture.refusal} onDismiss={gesture.dismiss} />
      <Panel
        title={t('stockMove.whatTitle', { origin: originCode })}
        actions={<Button onPress={onChangeOrigin}>{t('stockMove.changeOrigin')}</Button>}
      >
        <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
          {origin.kind === 'handlingUnit' ? (
            <div className="grid grid-cols-2 gap-4">
              <Controller
                control={form.control}
                name="mode"
                render={({ field }) => (
                  <Select
                    label={t('stockMove.mode')}
                    placeholder={t('stock.choose')}
                    options={[
                      { id: WHOLE, label: t('stockMove.wholeSupport') },
                      { id: LINES, label: t('stockMove.someLines') },
                    ]}
                    value={field.value}
                    onChange={(value) => {
                      field.onChange(value ?? WHOLE);
                    }}
                  />
                )}
              />
            </div>
          ) : null}
          {units.length === 0 && !whole ? <Banner tone="info">{t('stockMove.empty')}</Banner> : null}
          {whole ? (
            <StockUnitsTable label={t('stockMove.mode')} units={units} showItem />
          ) : units.length === 0 ? null : (
            <>
              <Controller
                control={form.control}
                name="selected"
                render={({ field }) => (
                  <ChipGroup
                    label={t('stockMove.chooseLines')}
                    options={units.map((unit) => ({
                      id: unit.id,
                      label: lineLabel(unit),
                    }))}
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              <DataTable<StockUnit>
                label={t('stockMove.chooseLines')}
                rows={chosen}
                rowKey={(unit) => unit.id}
                empty={null}
                columns={[
                  {
                    id: 'item',
                    header: t('stock.item'),
                    size: 'code',
                    code: true,
                    cell: (unit) => unit.itemCode,
                  },
                  {
                    id: 'address',
                    header: t('stock.address'),
                    size: 'code',
                    code: true,
                    cell: (unit) => unit.address,
                  },
                  {
                    id: 'quality',
                    header: t('stock.quality'),
                    size: 'text',
                    cell: (unit) => unit.qualityLabel,
                  },
                  {
                    id: 'available',
                    header: t('stock.quantity'),
                    size: 'number',
                    numeric: true,
                    cell: (unit) => unit.quantity,
                  },
                  {
                    id: 'taken',
                    header: t('stockMove.take'),
                    size: 'date',
                    cell: (unit) => {
                      const index = units.indexOf(unit);
                      return (
                        <Controller
                          control={form.control}
                          name={`lines.${index}.quantity`}
                          render={({ field }) => (
                            <NumberField
                              label={t('stockMove.lineQuantity', { line: lineLabel(unit) })}
                              hideLabel
                              minValue={1}
                              value={field.value}
                              onChange={field.onChange}
                            />
                          )}
                        />
                      );
                    },
                  },
                ]}
              />
            </>
          )}
          <div className="flex justify-end">
            <Button type="submit" variant="primary" isDisabled={!form.formState.isValid || gesture.sending}>
              {t('stockMove.take')}
            </Button>
          </div>
        </form>
      </Panel>
    </>
  );
}
