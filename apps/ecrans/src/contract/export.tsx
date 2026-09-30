import { recordListExport } from '@cairn/contrat';
import { DataTableExportContext, type DataTableExport } from '@cairn/ui';
import { useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { sendGesture } from './client.js';

/**
 * Rend exportable toute liste affichée par `DataTable` (RG-SUR-101, fiche 0033) : le tableau écrit le
 * fichier, ce fournisseur en envoie la trace avec le périmètre de travail (RG-SUR-102). Fourni une
 * fois, par l'ossature, qui tient le site et le donneur d'ordre de travail.
 */
export function ListExportProvider({
  siteId,
  principalId,
  children,
}: {
  readonly siteId: string | null;
  readonly principalId: string | null;
  readonly children: ReactNode;
}) {
  const { t } = useTranslation();
  const label = t('common.export');
  const value = useMemo<DataTableExport>(
    () => ({
      label,
      onExport: ({ label: list, rows }) => {
        // Le fichier est déjà remis : une trace qui n'aboutit pas ne le reprend pas, elle ne se signale pas.
        sendGesture(recordListExport, {
          list: list.slice(0, 120),
          rows,
          siteId,
          principalId,
        }).catch(() => undefined);
      },
    }),
    [label, siteId, principalId],
  );
  return <DataTableExportContext value={value}>{children}</DataTableExportContext>;
}
