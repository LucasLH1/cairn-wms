import {
  itemStock,
  search,
  searchItems,
  type StockCell,
  type StockMovement,
  type StockUnit,
} from '@cairn/contrat';
import { Banner, Button, DataTable, Panel, Select, StatusBadge, Tabs, TextField } from '@cairn/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { contractQuery } from '../../contract/query.js';
import { useWorkingPrincipal } from '../../shell/principal.js';
import { useHasPermission, useWorkingSite } from '../../shell/site.js';
import { useChangeSignal } from '../../signals/useChangeSignal.js';
import { HoldPanel } from './HoldPanel.js';
import { HoldsTab } from './HoldsTab.js';
import { SnapshotsTab } from './SnapshotsTab.js';
import {
  AdjustPanel,
  CorrectPanel,
  QualityChangePanel,
  ReleasePanel,
  type StockNotice,
} from './StockPanels.js';
import { MovementsTable, StockUnitsTable } from './stockTables.js';

/**
 * Stock (0.4 § 6) : la consultation par référence, ouverte à tous les rôles ; les blocages en cours du
 * site ; ses photos quotidiennes.
 */
export function StockScreen() {
  const { t } = useTranslation();
  return (
    <Tabs
      label={t('navigation.stock')}
      tabs={[
        { id: 'consultation', label: t('stock.consultationTab'), content: <ConsultationTab /> },
        { id: 'holds', label: t('stock.holdsTab'), content: <HoldsTab /> },
        { id: 'snapshots', label: t('stock.snapshotsTab'), content: <SnapshotsTab /> },
      ]}
    />
  );
}

function ConsultationTab() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { itemId } = useSearch({ from: '/shell/stock' });
  const site = useWorkingSite();
  // La référence consultée est dans l'adresse : la fiche référence y conduit, un rechargement la garde.
  const choose = (chosen: string) => {
    void navigate({ to: '/stock', search: { itemId: chosen }, replace: true });
  };
  return (
    <>
      <ItemPicker itemId={itemId} onChoose={choose} />
      {site === undefined ? (
        <Banner tone="info">{t('stock.noSite')}</Banner>
      ) : itemId === '' ? (
        <Banner tone="info">{t('stock.pickItem')}</Banner>
      ) : (
        <ItemStock key={`${itemId}-${site.id}`} itemId={itemId} siteId={site.id} />
      )}
    </>
  );
}

/**
 * Le choix de la référence consultée. Qui consulte le référentiel la choisit dans la liste du donneur
 * d'ordre du contexte de travail ; les autres rôles la désignent par un de ses codes, que la recherche
 * unique identifie (0.4 § 6, « Consulter le stock », étape 1).
 */
function ItemPicker({ itemId, onChoose }: { itemId: string; onChoose: (itemId: string) => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const principal = useWorkingPrincipal();
  const manageItems = useHasPermission('manageItems');
  const draftItems = useHasPermission('createDraftItem');
  // La liste des références est celle du référentiel, ouverte à ses seuls rôles.
  const canList = manageItems || draftItems;
  const canMove = useHasPermission('moveStock');
  const [text, setText] = useState('');
  const [unknown, setUnknown] = useState<string>();
  const { data } = useQuery({
    ...contractQuery(searchItems, {
      principalId: principal?.id ?? '',
      familyId: null,
      state: null,
      trackingMode: null,
      search: null,
      draftsOnly: false,
    }),
    enabled: canList && principal !== undefined,
  });
  const find = async () => {
    const typed = text.trim();
    if (typed === '') return;
    const { results } = await queryClient.query(contractQuery(search, { text: typed }));
    const match = results.find((result) => result.type === 'item' && result.exact && !result.outOfScope);
    setUnknown(match === undefined ? typed : undefined);
    if (match !== undefined) onChoose(match.id);
  };
  return (
    <Panel
      title={t('stock.item')}
      actions={
        canMove ? (
          <Button onPress={() => void navigate({ to: '/stock/move', search: { handlingUnitId: '' } })}>
            {t('stock.move')}
          </Button>
        ) : undefined
      }
    >
      {canList ? (
        <div className="grid grid-cols-2 gap-4">
          <Select
            label={t('stock.item')}
            placeholder={t('stock.chooseItem')}
            options={(data?.items ?? []).map((item) => ({
              id: item.id,
              label: `${item.code} · ${item.shortLabel}`,
            }))}
            value={itemId === '' ? null : itemId}
            onChange={(value) => {
              if (value !== null) onChoose(value);
            }}
          />
        </div>
      ) : (
        <form
          className="grid grid-cols-(--cairn-line-columns) items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void find();
          }}
        >
          <TextField label={t('stock.itemCode')} value={text} onChange={setText} code />
          <span />
          <Button type="submit" isDisabled={text.trim() === ''}>
            {t('stock.find')}
          </Button>
        </form>
      )}
      {unknown === undefined ? null : <Banner tone="bad">{t('stock.itemUnknown', { text: unknown })}</Banner>}
    </Panel>
  );
}

/** Le geste ouvert depuis une ligne : un panneau à la fois, sous les tableaux. */
type Action =
  | { readonly kind: 'quality' | 'adjust' | 'hold' | 'holdBatch' | 'release'; readonly unit: StockUnit }
  | { readonly kind: 'correct'; readonly movement: StockMovement };

/**
 * Le stock d'une référence sur le site de travail : le tableau croisé état qualité × emplacement, avec
 * pour chaque case les quantités totale, libre, réservée, bloquée et en cours de mouvement, toujours
 * affichées (RG-STK-019) ; ses unités de stock et leurs gestes ; ses mouvements.
 */
function ItemStock({ itemId, siteId }: { itemId: string; siteId: string }) {
  const { t } = useTranslation();
  const query = contractQuery(itemStock, { itemId, siteId });
  const { data } = useQuery(query);
  useChangeSignal('Item', itemId, query.queryKey);
  const canChangeQuality = useHasPermission('changeQualityState');
  const canAdjust = useHasPermission('adjustStockQuantity');
  const canHold = useHasPermission('placeStockHold');
  const canRelease = useHasPermission('releaseStockReservation');
  const canCorrect = useHasPermission('correctStockMovement');
  const [action, setAction] = useState<Action>();
  const [notices, setNotices] = useState<readonly StockNotice[]>([]);
  if (data === undefined) return null;

  const close = () => {
    setAction(undefined);
  };
  const open = (next: Action) => {
    setNotices([]);
    setAction(next);
  };
  const done = (next: StockNotice[]) => {
    setAction(undefined);
    setNotices(next);
  };
  // « Il reste douze manettes » n'est jamais une réponse : le total se lit par état qualité (RG-STK-019).
  const byQuality = new Map<string, number>();
  for (const cell of data.cells)
    byQuality.set(cell.qualityLabel, (byQuality.get(cell.qualityLabel) ?? 0) + cell.total);
  const total = [...byQuality.values()].reduce((sum, quantity) => sum + quantity, 0);
  const detail = [...byQuality.entries()]
    .map(([label, quantity]) => `${String(quantity)} ${label}`)
    .join(', ');
  const title = `${data.itemCode} · ${data.itemLabel}`;
  const unitActions = (unit: StockUnit) => {
    // En cours de mouvement, l'unité n'accepte aucune autre opération (RG-STK-018).
    if (unit.status === 'moving') return null;
    return (
      <div className="flex flex-wrap gap-2">
        {canChangeQuality ? (
          <Button
            onPress={() => {
              open({ kind: 'quality', unit });
            }}
          >
            {t('stock.changeQuality')}
          </Button>
        ) : null}
        {/* Un objet sérialisé a toujours une quantité de un (RG-STK-004). */}
        {canAdjust && unit.serialNumber === null ? (
          <Button
            onPress={() => {
              open({ kind: 'adjust', unit });
            }}
          >
            {t('stock.adjust')}
          </Button>
        ) : null}
        {canHold ? (
          <Button
            onPress={() => {
              open({ kind: 'hold', unit });
            }}
          >
            {t('stock.hold')}
          </Button>
        ) : null}
        {/* Un blocage peut porter sur le lot entier (RG-STK-035), par exemple pour un rappel. */}
        {canHold && unit.batchId !== null ? (
          <Button
            onPress={() => {
              open({ kind: 'holdBatch', unit });
            }}
          >
            {t('stock.holdBatch')}
          </Button>
        ) : null}
        {canRelease && unit.status === 'reserved' ? (
          <Button
            onPress={() => {
              open({ kind: 'release', unit });
            }}
          >
            {t('stock.releaseReservation')}
          </Button>
        ) : null}
      </div>
    );
  };
  const hasActions = canChangeQuality || canAdjust || canHold || canRelease;

  return (
    <>
      {notices.map((notice) => (
        <Banner key={notice.text} tone={notice.tone}>
          {notice.text}
        </Banner>
      ))}
      <Panel
        title={t('stock.crossTable')}
        meta={data.cells.length === 0 ? title : `${title} — ${t('stock.totalByQuality', { total, detail })}`}
      >
        <DataTable<StockCell>
          label={t('stock.crossTable')}
          rows={data.cells}
          rowKey={(cell) => `${cell.qualityStateId}-${cell.locationId}`}
          empty={t('stock.noStock')}
          columns={[
            {
              id: 'quality',
              header: t('stock.quality'),
              size: 'text',
              cell: (cell) => (
                <div className="flex flex-wrap items-center gap-2">
                  <span>{cell.qualityLabel}</span>
                  {cell.pickable ? null : <StatusBadge tone="mute">{t('stock.notPickable')}</StatusBadge>}
                </div>
              ),
            },
            {
              id: 'address',
              header: t('stock.address'),
              size: 'code',
              code: true,
              cell: (cell) => cell.address,
            },
            ...(['total', 'free', 'reserved', 'blocked', 'moving'] as const).map((key) => ({
              id: key,
              header: t(`stock.${key}`),
              size: 'number' as const,
              numeric: true,
              cell: (cell: StockCell) => cell[key],
            })),
          ]}
        />
      </Panel>
      <Panel title={t('stock.units')} meta={title}>
        <StockUnitsTable
          label={t('stock.units')}
          units={data.stockUnits}
          actions={hasActions ? unitActions : undefined}
        />
      </Panel>
      {action?.kind === 'quality' ? (
        <QualityChangePanel
          key={action.unit.id}
          unit={action.unit}
          units={data.stockUnits}
          principalId={data.principalId}
          onClose={close}
          onDone={done}
        />
      ) : null}
      {action?.kind === 'holdBatch' && action.unit.batchId !== null ? (
        <HoldPanel
          key={`batch-${action.unit.batchId}`}
          preset={{
            scope: 'batch',
            targetId: action.unit.batchId,
            label: `${t('hold.scopes.batch')} · ${action.unit.batchNumber ?? ''}`,
          }}
          onClose={close}
        />
      ) : null}
      {action?.kind === 'adjust' ? (
        <AdjustPanel key={action.unit.id} unit={action.unit} onClose={close} onDone={done} />
      ) : null}
      {action?.kind === 'release' ? (
        <ReleasePanel key={action.unit.id} unit={action.unit} onClose={close} onDone={done} />
      ) : null}
      {action?.kind === 'hold' ? (
        <HoldPanel
          key={action.unit.id}
          preset={{
            scope: 'stockUnit',
            targetId: action.unit.id,
            label: `${t('hold.scopes.stockUnit')} · ${action.unit.address} · ${String(action.unit.quantity)} · ${action.unit.qualityLabel}`,
          }}
          onClose={close}
        />
      ) : null}
      <Panel title={t('stock.movements')} meta={title}>
        <MovementsTable
          label={t('stock.movements')}
          movements={data.movements}
          empty={t('stock.noMovement')}
          onCorrect={
            canCorrect
              ? (movement) => {
                  open({ kind: 'correct', movement });
                }
              : undefined
          }
        />
      </Panel>
      {action?.kind === 'correct' ? (
        <CorrectPanel key={action.movement.id} movement={action.movement} onClose={close} onDone={done} />
      ) : null}
    </>
  );
}
