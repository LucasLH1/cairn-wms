import { useHasPermission } from '../../shell/site.js';
import { Tabs } from '@cairn/ui';
import { useTranslation } from 'react-i18next';
import { PartyListPanel } from '../parties/PartyListPanel.js';
import { HandlingUnitTypesTab, MovementReasonsTab } from '../stock/StockSettings.js';
import { NumberingTab } from './NumberingTab.js';
import { ProviderTab } from './ProviderTab.js';
import { SitesTab } from './SitesTab.js';
import { WorkstationsTab } from './WorkstationsTab.js';

/**
 * Paramétrage (0.1 § 4) : sites et leur plan, numérotation, prestataire, motifs de mouvement et types
 * de support (0.4 § 4), postes.
 */
export function SettingsScreen() {
  const { t } = useTranslation();
  const sites = useHasPermission('administerSites');
  const numbering = useHasPermission('administerNumbering');
  const provider = useHasPermission('administerProvider');
  const workstations = useHasPermission('declareWorkstation');
  const providerParties = useHasPermission('administerProviderParties');
  const stockSettings = useHasPermission('administerStockSettings');
  return (
    <Tabs
      label={t('administration.settings')}
      tabs={[
        ...(sites ? [{ id: 'sites', label: t('administration.sites'), content: <SitesTab /> }] : []),
        ...(numbering
          ? [{ id: 'numbering', label: t('administration.numbering'), content: <NumberingTab /> }]
          : []),
        ...(providerParties
          ? [
              {
                id: 'carriers',
                label: t('party.carriers'),
                content: (
                  <PartyListPanel family="carrier" principalId={null} title={t('party.carriers')} canCreate />
                ),
              },
              {
                id: 'subcontractors',
                label: t('party.subcontractors'),
                content: (
                  <PartyListPanel
                    family="subcontractor"
                    principalId={null}
                    title={t('party.subcontractors')}
                    canCreate
                  />
                ),
              },
            ]
          : []),
        ...(provider
          ? [{ id: 'provider', label: t('administration.provider'), content: <ProviderTab /> }]
          : []),
        // Paramétrage du stock propre au prestataire (0.4 § 4).
        ...(stockSettings
          ? [
              { id: 'reasons', label: t('stockSettings.reasons'), content: <MovementReasonsTab /> },
              {
                id: 'handlingUnitTypes',
                label: t('stockSettings.handlingUnitTypes'),
                content: <HandlingUnitTypesTab />,
              },
            ]
          : []),
        ...(workstations
          ? [{ id: 'workstations', label: t('administration.workstations'), content: <WorkstationsTab /> }]
          : []),
      ]}
    />
  );
}
