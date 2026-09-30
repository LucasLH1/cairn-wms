import {
  createColumnHelper,
  tableFeatures,
  useTable,
  type ColumnDef,
  type RowData,
} from '@tanstack/react-table';
import { use, useRef, type ReactNode } from 'react';
import { Button } from './Button.js';
import { exportFileName, toCsv } from './csv.js';
import { DataTableExportContext } from './DataTableExport.js';

/**
 * Largeurs de colonne relevées dans la maquette : l'écran nomme une largeur, jamais une valeur.
 * Code 100 px, nombre 90 px, date 120 px, état 150 px ; le texte prend la place qui reste.
 */
export type ColumnSize = 'code' | 'number' | 'date' | 'status' | 'text';
const sizes: Readonly<Record<ColumnSize, string>> = {
  code: 'var(--cairn-column-code)',
  number: 'var(--cairn-column-number)',
  date: 'var(--cairn-column-date)',
  status: 'var(--cairn-column-status)',
  text: 'minmax(var(--cairn-column-text-min), 1.5fr)',
};

export interface DataColumn<Row> {
  readonly id: string;
  readonly header: string;
  readonly size: ColumnSize;
  /** Les nombres s'alignent à droite, en police à chasse fixe (maquette, § tableaux denses). */
  readonly numeric?: boolean;
  /** Codes et identifiants : police à chasse fixe. */
  readonly code?: boolean;
  readonly cell: (row: Row) => ReactNode;
}

export interface DataTableProps<Row extends RowData> {
  readonly label: string;
  readonly columns: readonly DataColumn<Row>[];
  readonly rows: readonly Row[];
  readonly rowKey: (row: Row) => string;
  /** Affiché à la place des lignes quand il n'y en a aucune. */
  readonly empty: ReactNode;
}

const features = tableFeatures({});

/** Le texte d'une cellule tel que l'utilisateur le lit, espaces et retours à la ligne réduits. */
const shownText = (cell: Element | undefined) =>
  cell instanceof HTMLElement ? cell.innerText.replace(/\s+/gu, ' ').trim() : '';

/** Remet le fichier au navigateur, par une adresse d'objet temporaire aussitôt libérée. */
function download(content: string, fileName: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  // Libérée après le départ du téléchargement, que certains navigateurs ne lancent qu'au tour suivant.
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}

/**
 * Tableau dense de la maquette, sur TanStack Table (fiche 0011) : une grille par ligne, en-tête en
 * sur-titre, séparateurs, nombres à droite en chasse fixe. Rôles ARIA de tableau, pour les lecteurs
 * d'écran comme pour les tests.
 */
export function DataTable<Row extends RowData>({ label, columns, rows, rowKey, empty }: DataTableProps<Row>) {
  const exporter = use(DataTableExportContext);
  const body = useRef<HTMLDivElement>(null);
  const helper = createColumnHelper<typeof features, Row>();
  const definitions: ColumnDef<typeof features, Row>[] = columns.map((column) =>
    helper.display({
      id: column.id,
      header: column.header,
      cell: (context) => column.cell(context.row.original),
    }),
  );
  const table = useTable({ features, columns: definitions, data: [...rows], getRowId: rowKey });
  const template = { gridTemplateColumns: columns.map((column) => sizes[column.size]).join(' ') };
  const byId = new Map(columns.map((column) => [column.id, column]));
  // L'en-tête ne prend que l'alignement de sa colonne ; la cellule en prend aussi la police.
  const headerClass = (id: string) => (byId.get(id)?.numeric === true ? 'justify-self-end' : '');
  const cellClass = (id: string) => {
    const column = byId.get(id);
    if (column?.numeric === true) return 'justify-self-end font-mono text-secondary';
    return column?.code === true ? 'font-mono' : '';
  };

  /**
   * Export de la liste telle qu'affichée (RG-SUR-101, fiche 0033) : les colonnes titrées — une colonne
   * d'actions n'a pas de titre et reste hors du fichier —, puis chaque ligne rendue, dans son ordre, avec
   * le texte que l'utilisateur lit dans ses cellules.
   */
  function exportList(active: NonNullable<typeof exporter>): void {
    const titled = columns.flatMap((column, index) => (column.header.trim() === '' ? [] : [index]));
    // Les lignes sont les enfants du groupe de lignes, les cellules ceux de chaque ligne, dans l'ordre
    // des colonnes.
    const rendered = [...(body.current?.children ?? [])];
    const lines = [
      titled.map((index) => columns[index]?.header ?? ''),
      ...rendered.map((row) => titled.map((index) => shownText(row.children[index]))),
    ];
    download(toCsv(lines), exportFileName(label, new Date()));
    active.onExport({ label, rows: rendered.length });
  }

  const grid = (
    <div role="table" aria-label={label} className="overflow-x-auto px-5 pb-2">
      <div role="rowgroup">
        {table.getHeaderGroups().map((group) => (
          <div
            role="row"
            key={group.id}
            style={template}
            className="grid gap-3 border-b border-divider pt-3 pb-2-5 text-label font-semibold tracking-label text-text-3 uppercase"
          >
            {group.headers.map((header) => (
              <div role="columnheader" key={header.id} className={headerClass(header.column.id)}>
                {byId.get(header.column.id)?.header}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div role="rowgroup" ref={body}>
        {rows.length === 0 ? (
          <div className="px-0 py-5-5 text-text-2">{empty}</div>
        ) : (
          table.getRowModel().rows.map((row) => (
            <div
              role="row"
              key={row.id}
              style={template}
              className="grid items-center gap-3 border-b border-line py-3 text-body"
            >
              {row.getAllCells().map((cell) => (
                <div role="cell" key={cell.id} className={cellClass(cell.column.id)}>
                  <table.FlexRender cell={cell} />
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );

  if (exporter === null || rows.length === 0) return grid;
  return (
    // min-w-0 : dans la grille du panneau, un tableau large défile au lieu d'élargir le panneau.
    <div className="min-w-0">
      <div className="flex justify-end px-5 pt-3">
        <Button
          onPress={() => {
            exportList(exporter);
          }}
        >
          {exporter.label}
        </Button>
      </div>
      {grid}
    </div>
  );
}
