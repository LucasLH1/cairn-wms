import { createContext } from 'react';

/** Ce que l'application apprend d'un export : la liste, par le nom de son tableau, et ses lignes. */
export interface ExportedList {
  readonly label: string;
  readonly rows: number;
}

export interface DataTableExport {
  /** Libellé du bouton d'export, tiré des libellés par l'application. */
  readonly label: string;
  /** Appelé une fois le fichier remis au navigateur : l'application trace l'export (RG-SUR-102). */
  readonly onExport: (list: ExportedList) => void;
}

/**
 * L'export des listes, fourni une fois par l'application : tout `DataTable` placé dessous porte un
 * bouton d'export, sans rien écrire dans les écrans (RG-SUR-101, fiche 0033). Sans lui, aucun bouton.
 */
export const DataTableExportContext = createContext<DataTableExport | null>(null);
