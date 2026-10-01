import { getHandlingUnit } from '@cairn/contrat';
import { Button, Panel, StatusBadge } from '@cairn/ui';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { contractQuery } from '../../contract/query.js';
import { RouteLink } from '../../shell/RouteLink.js';
import { useHasPermission } from '../../shell/site.js';
import { useChangeSignal } from '../../signals/useChangeSignal.js';
import { StockUnitsTable } from './stockTables.js';

/**
 * Fiche d'un support (0.4 § 6, « Résultat par support ») : son type, sa localisation, son caractère
 * consigné et son propriétaire, les supports qu'il porte, son contenu. Il se déplace d'un seul geste
 * avec tout ce qu'il porte (RG-STK-048).
 */
export function HandlingUnitScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { handlingUnitId } = useParams({ from: '/shell/stock/supports/$handlingUnitId' });
  const query = contractQuery(getHandlingUnit, { handlingUnitId });
  const { data } = useQuery(query);
  useChangeSignal('HandlingUnit', handlingUnitId, query.queryKey);
  const canMove = useHasPermission('moveStock');
  const support = data?.handlingUnit;
  if (support === undefined) return null;
  const title = t('handlingUnit.title', { code: support.code });
  return (
    <>
      <Panel
        title={title}
        meta={t('handlingUnit.meta', { type: support.typeLabel, site: support.siteCode })}
        actions={
          <>
            {support.returnable ? (
              <StatusBadge tone="info">{t('handlingUnit.returnable')}</StatusBadge>
            ) : null}
            {support.active ? null : <StatusBadge tone="mute">{t('common.inactive')}</StatusBadge>}
            {canMove && support.active ? (
              <Button
                onPress={() => void navigate({ to: '/stock/move', search: { handlingUnitId: support.id } })}
              >
                {t('handlingUnit.move')}
              </Button>
            ) : null}
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-4">
          <span>
            {support.address === null
              ? t('handlingUnit.noLocation')
              : t('handlingUnit.location', { address: support.address })}
          </span>
          {support.parentCode === null ? null : (
            <span>{t('handlingUnit.parent', { code: support.parentCode })}</span>
          )}
          {support.returnable ? (
            <span>
              {support.ownerName === null
                ? t('handlingUnit.noOwner')
                : t('handlingUnit.owner', { name: support.ownerName })}
            </span>
          ) : null}
        </div>
        {support.children.length === 0 ? null : (
          <div className="flex flex-wrap items-center gap-3">
            <span>{t('handlingUnit.children')}</span>
            {support.children.map((child) => (
              <RouteLink
                key={child.id}
                to="/stock/supports/$handlingUnitId"
                params={{ handlingUnitId: child.id }}
              >
                {child.code}
              </RouteLink>
            ))}
          </div>
        )}
      </Panel>
      <Panel title={t('handlingUnit.content')} meta={title}>
        {support.stockUnits.length === 0 ? (
          <span>{t('handlingUnit.empty')}</span>
        ) : (
          <StockUnitsTable label={t('handlingUnit.content')} units={support.stockUnits} showItem />
        )}
      </Panel>
    </>
  );
}
