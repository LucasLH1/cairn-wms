import type { AvailabilityStatus, MovementNature, StockMovement, StockUnit } from '@cairn/contrat';
import { Button, DataTable, StatusBadge, type DataColumn, type StatusTone } from '@cairn/ui';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { RouteLink } from '../../shell/RouteLink.js';
import { formatDateTime } from '../format.js';

const NONE = '—';

/** Tonalité du statut de disponibilité (RG-STK-015) : libre, réservée, bloquée, en cours de mouvement. */
const statusTones: Readonly<Record<AvailabilityStatus, StatusTone>> = {
  free: 'ok',
  reserved: 'info',
  blocked: 'bad',
  moving: 'warn',
};

export function AvailabilityBadge({ status }: { status: AvailabilityStatus }) {
  const { t } = useTranslation();
  return <StatusBadge tone={statusTones[status]}>{t(`availabilityStatus.${status}`)}</StatusBadge>;
}

/** Les natures qu'un mouvement inverse corrige (RG-STK-023) ; les autres naissent d'un flux. */
const correctableNatures: readonly MovementNature[] = ['move', 'qualityChange', 'quantityAdjustment'];

export const isCorrectable = (movement: StockMovement) =>
  correctableNatures.includes(movement.nature) &&
  movement.correctedBy === null &&
  movement.correctsMovementId === null;

/**
 * Unités de stock : emplacement, quantité, état qualité, statut de disponibilité, lot, numéro de série,
 * support, entrée en stock. Le numéro de série ouvre la fiche de l'objet par la recherche, qui le
 * retrouve exactement (RG-SUR-060) ; le support ouvre sa fiche.
 */
export function StockUnitsTable({
  label,
  units,
  showItem = false,
  actions,
}: {
  label: string;
  units: readonly StockUnit[];
  showItem?: boolean;
  actions?: ((unit: StockUnit) => ReactNode) | undefined;
}) {
  const { t, i18n } = useTranslation();
  const columns: DataColumn<StockUnit>[] = [
    ...(showItem
      ? [
          {
            id: 'item',
            header: t('stock.item'),
            size: 'text' as const,
            cell: (unit: StockUnit) => `${unit.principalCode} · ${unit.itemCode} · ${unit.itemLabel}`,
          },
        ]
      : []),
    { id: 'address', header: t('stock.address'), size: 'code', code: true, cell: (unit) => unit.address },
    {
      id: 'quantity',
      header: t('stock.quantity'),
      size: 'number',
      numeric: true,
      cell: (unit) => unit.quantity,
    },
    { id: 'quality', header: t('stock.quality'), size: 'date', cell: (unit) => unit.qualityLabel },
    {
      id: 'status',
      header: t('stock.status'),
      size: 'status',
      cell: (unit) => <AvailabilityBadge status={unit.status} />,
    },
    {
      // Lot et numéro de série dans une même colonne : le tableau tient dans la largeur, actions
      // comprises. Un objet sérialisé suivi par lot montre les deux.
      id: 'batchOrSerial',
      header: t('stock.batchOrSerial'),
      size: 'date',
      code: true,
      cell: (unit) => (
        <div className="grid">
          {unit.serialNumber !== null && unit.serializedUnitId !== null ? (
            <RouteLink
              to="/stock/serials/$serializedUnitId"
              params={{ serializedUnitId: unit.serializedUnitId }}
            >
              {unit.serialNumber}
            </RouteLink>
          ) : null}
          {unit.batchNumber ?? (unit.serialNumber === null ? NONE : null)}
        </div>
      ),
    },
    {
      id: 'handlingUnit',
      header: t('stock.handlingUnit'),
      size: 'code',
      code: true,
      cell: (unit) =>
        unit.handlingUnitId === null ? (
          NONE
        ) : (
          <RouteLink to="/stock/supports/$handlingUnitId" params={{ handlingUnitId: unit.handlingUnitId }}>
            {unit.handlingUnitCode ?? NONE}
          </RouteLink>
        ),
    },
    {
      id: 'enteredAt',
      header: t('stock.enteredAt'),
      size: 'date',
      cell: (unit) => formatDateTime(unit.enteredAt, i18n.language),
    },
    ...(actions === undefined
      ? []
      : [{ id: 'actions', header: '', size: 'text' as const, cell: (unit: StockUnit) => actions(unit) }]),
  ];
  return (
    <DataTable<StockUnit>
      label={label}
      rows={units}
      rowKey={(unit) => unit.id}
      empty={t('stock.noUnit')}
      columns={columns}
    />
  );
}

/**
 * Mouvements de stock, le plus récent d'abord : nature, quantité signée quand elle change le stock,
 * origine et destination, états qualité, motif, commentaire, auteur. Un mouvement corrigé le dit
 * (RG-STK-024).
 */
export function MovementsTable({
  label,
  movements,
  empty,
  onCorrect,
}: {
  label: string;
  movements: readonly StockMovement[];
  empty: string;
  onCorrect?: ((movement: StockMovement) => void) | undefined;
}) {
  const { t, i18n } = useTranslation();
  const pair = (from: string | null, to: string | null) =>
    from === null && to === null
      ? NONE
      : from === to
        ? (from ?? NONE)
        : t('stock.fromTo', { from: from ?? NONE, to: to ?? NONE });
  const signed = (movement: StockMovement) =>
    movement.direction === 0
      ? String(movement.quantity)
      : `${movement.direction > 0 ? '+' : '−'}${String(movement.quantity)}`;
  return (
    <DataTable<StockMovement>
      label={label}
      rows={movements}
      rowKey={(movement) => movement.id}
      empty={empty}
      columns={[
        {
          id: 'occurredAt',
          header: t('stock.occurredAt'),
          size: 'date',
          cell: (movement) => formatDateTime(movement.occurredAt, i18n.language),
        },
        {
          id: 'nature',
          header: t('stock.nature'),
          size: 'date',
          cell: (movement) => t(`reasonNature.${movement.nature}`),
        },
        { id: 'quantity', header: t('stock.quantity'), size: 'number', numeric: true, cell: signed },
        {
          id: 'address',
          header: t('stock.address'),
          size: 'date',
          code: true,
          cell: (movement) => pair(movement.fromAddress, movement.toAddress),
        },
        {
          id: 'quality',
          header: t('stock.quality'),
          size: 'date',
          cell: (movement) => pair(movement.fromQuality, movement.toQuality),
        },
        {
          // Le motif et son commentaire ensemble : le tableau tient dans la largeur.
          id: 'reason',
          header: t('stock.reason'),
          size: 'text',
          cell: (movement) => (
            <div className="grid">
              {movement.reason ?? NONE}
              {movement.comment === null ? null : <span>{movement.comment}</span>}
            </div>
          ),
        },
        {
          id: 'author',
          header: t('stock.author'),
          size: 'code',
          cell: (movement) => movement.author ?? NONE,
        },
        {
          id: 'correction',
          header: t('stock.correction'),
          size: 'code',
          cell: (movement) =>
            movement.correctedBy === null ? null : (
              <StatusBadge tone="mute">{t('stock.corrected')}</StatusBadge>
            ),
        },
        ...(onCorrect === undefined
          ? []
          : [
              {
                id: 'actions',
                header: '',
                size: 'code' as const,
                cell: (movement: StockMovement) =>
                  isCorrectable(movement) ? (
                    <Button
                      onPress={() => {
                        onCorrect(movement);
                      }}
                    >
                      {t('stock.correct')}
                    </Button>
                  ) : null,
              },
            ]),
      ]}
    />
  );
}
