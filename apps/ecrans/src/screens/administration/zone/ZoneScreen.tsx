import { getZoneLayout, listZoneLocations, type ZoneLayout } from '@cairn/contrat';
import { Panel, StatusBadge, Tabs } from '@cairn/ui';
import { useQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { contractQuery } from '../../../contract/query.js';
import { RouteLink } from '../../../shell/RouteLink.js';
import { useChangeSignal } from '../../../signals/useChangeSignal.js';
import { DocksTab } from './DocksTab.js';
import { GeneratorTab } from './GeneratorTab.js';
import { LocationsTab } from './LocationsTab.js';
import { PatternTab } from './PatternTab.js';

/**
 * Fiche zone (0.3 § 6) : masque d'adressage et sens de circulation, quais, générateur de plan,
 * emplacements. Un onglet par vue, chaque panneau enregistre son seul geste (README du lot 1, points
 * 10 et 12).
 */
export function ZoneScreen() {
  const { t } = useTranslation();
  const { zoneId } = useParams({ from: '/shell/administration/zones/$zoneId' });
  const layoutQuery = contractQuery(getZoneLayout, { zoneId });
  const locationsQuery = contractQuery(listZoneLocations, { zoneId });
  const layout = useQuery(layoutQuery);
  const locations = useQuery(locationsQuery);
  useChangeSignal('Zone', zoneId, layoutQuery.queryKey);
  useChangeSignal('Zone', zoneId, locationsQuery.queryKey);
  if (layout.data === undefined) return null;
  const zone = layout.data.zone;
  const docked = zone.purpose === 'receiving' || zone.purpose === 'shipping';
  return (
    <>
      <ZoneHeader zone={zone} />
      <Tabs
        label={t('zone.views')}
        tabs={[
          {
            id: 'pattern',
            label: t('zone.patternTab'),
            content: (
              <PatternTab
                key={JSON.stringify([
                  zone.addressPattern,
                  zone.addressSeparator,
                  zone.traversal,
                  zone.pickMode,
                ])}
                zone={zone}
              />
            ),
          },
          ...(docked ? [{ id: 'docks', label: t('zone.docksTab'), content: <DocksTab zone={zone} /> }] : []),
          {
            id: 'generator',
            label: t('zone.generatorTab'),
            content: <GeneratorTab key={JSON.stringify(zone.addressPattern)} zone={zone} />,
          },
          {
            id: 'locations',
            label: t('zone.locationsTab'),
            content: <LocationsTab zone={zone} locations={locations.data?.locations ?? []} />,
          },
        ]}
      />
    </>
  );
}

function ZoneHeader({ zone }: { zone: ZoneLayout }) {
  const { t } = useTranslation();
  return (
    <Panel
      title={`${zone.code} · ${zone.name}`}
      meta={t('zone.meta', { site: zone.siteCode, purpose: t(`zonePurpose.${zone.purpose}`) })}
      actions={
        <StatusBadge tone={zone.active ? 'ok' : 'mute'}>
          {zone.active ? t('common.active') : t('common.inactive')}
        </StatusBadge>
      }
    >
      <div className="flex items-center gap-4">
        <span>{t('zone.locationCount', { count: zone.locationCount })}</span>
        <RouteLink to="/administration/sites/$siteId" params={{ siteId: zone.siteId }}>
          {t('zone.siteLink', { code: zone.siteCode })}
        </RouteLink>
      </div>
    </Panel>
  );
}
