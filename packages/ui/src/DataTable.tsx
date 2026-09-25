import {
  createColumnHelper,
  tableFeatures,
  useTable,
  type ColumnDef,
  type RowData,
} from '@tanstack/react-table';
import type { ReactNode } from 'react';

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

/**
 * Tableau dense de la maquette, sur TanStack Table (fiche 0011) : une grille par ligne, en-tête en
 * sur-titre, séparateurs, nombres à droite en chasse fixe. Rôles ARIA de tableau, pour les lecteurs
 * d'écran comme pour les tests.
 */
export function DataTable<Row extends RowData>({ label, columns, rows, rowKey, empty }: DataTableProps<Row>) {
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

  return (
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
      <div role="rowgroup">
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
}
