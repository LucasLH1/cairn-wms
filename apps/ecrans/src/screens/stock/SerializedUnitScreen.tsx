import { getSerializedUnit } from '@cairn/contrat';
import { Card, CardGrid, Panel, StatusBadge } from '@cairn/ui';
import { useQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { contractQuery } from '../../contract/query.js';
import { RouteLink } from '../../shell/RouteLink.js';
import { useHasPermission } from '../../shell/site.js';
import { formatDate } from '../format.js';
import { AvailabilityBadge, MovementsTable } from './stockTables.js';

/** La date du jour du poste, au format des dates du contrat. */
function today(): string {
  const now = new Date();
  return [now.getFullYear(), now.getMonth() + 1, now.getDate()]
    .map((part, index) => String(part).padStart(index === 0 ? 4 : 2, '0'))
    .join('-');
}

/**
 * Fiche d'un objet sérialisé (0.2 § 6 ; 0.4 § 6, « Résultat par objet sérialisé ») : sa référence, sa
 * garantie, le compteur de ses passages en stock affiché en évidence, où il est — ou qu'il n'est pas
 * en stock —, et son historique complet, tous passages confondus (RG-REF-016, 017, 043).
 */
export function SerializedUnitScreen() {
  const { t, i18n } = useTranslation();
  const { serializedUnitId } = useParams({ from: '/shell/stock/serials/$serializedUnitId' });
  const { data } = useQuery(contractQuery(getSerializedUnit, { serializedUnitId }));
  // La fiche référence ne s'ouvre qu'à qui consulte le référentiel, comme depuis la recherche.
  const canOpenItem = useHasPermission('manageItems');
  const canOpenDraft = useHasPermission('createDraftItem');
  const serial = data?.serializedUnit;
  if (serial === undefined) return null;
  const warranty =
    serial.warrantyEndDate === null
      ? { tone: 'mute' as const, label: t('serializedUnit.warrantyUnknown') }
      : serial.warrantyEndDate >= today()
        ? { tone: 'ok' as const, label: t('serializedUnit.warrantyValid') }
        : { tone: 'bad' as const, label: t('serializedUnit.warrantyExpired') };
  const unit = serial.stockUnit;
  return (
    <>
      <Panel
        title={t('serializedUnit.title', { serial: serial.serialNumber, label: serial.itemLabel })}
        meta={t('serializedUnit.meta', { principal: serial.principalCode })}
        actions={<StatusBadge tone={warranty.tone}>{warranty.label}</StatusBadge>}
      >
        <div className="flex flex-wrap items-center gap-4">
          {canOpenItem || canOpenDraft ? (
            <RouteLink to="/items/$itemId" params={{ itemId: serial.itemId }}>
              {t('serializedUnit.item', { code: serial.itemCode })}
            </RouteLink>
          ) : (
            <span>{t('serializedUnit.item', { code: serial.itemCode })}</span>
          )}
          {serial.warrantyEndDate === null ? null : (
            <span>
              {`${t('serializedUnit.warranty')} · ${t('serializedUnit.warrantyUntil', {
                date: formatDate(serial.warrantyEndDate, i18n.language),
              })}`}
            </span>
          )}
        </div>
      </Panel>
      <CardGrid label={serial.serialNumber}>
        <Card
          title={t('serializedUnit.passages')}
          figure={{ label: serial.serialNumber, value: String(serial.passages) }}
        />
        <Card
          title={t('serializedUnit.location')}
          highlighted={unit !== null}
          badge={unit === null ? undefined : <AvailabilityBadge status={unit.status} />}
          lines={
            unit === null
              ? [t('serializedUnit.noStock')]
              : [
                  unit.address,
                  unit.handlingUnitCode === null
                    ? unit.qualityLabel
                    : `${unit.qualityLabel} · ${t('handlingUnit.title', { code: unit.handlingUnitCode })}`,
                ]
          }
        />
      </CardGrid>
      <Panel title={t('serializedUnit.history')} meta={serial.serialNumber}>
        <MovementsTable
          label={t('serializedUnit.history')}
          movements={serial.movements}
          empty={t('serializedUnit.noMovement')}
        />
      </Panel>
    </>
  );
}
