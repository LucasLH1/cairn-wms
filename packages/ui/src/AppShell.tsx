import type { ReactNode } from 'react';

/** Pictogramme de la marque, tiré de la maquette : trois traits sur le dégradé de l'accent. */
export function BrandMark() {
  return (
    <span className="grid size-logo shrink-0 place-items-center rounded-logo bg-linear-145 from-accent to-accent-2 text-on-accent shadow-logo">
      <svg viewBox="0 0 360 360" className="size-logo" aria-hidden="true">
        <path
          d="M90 280h180M120 230h120M150 180h60"
          stroke="currentColor"
          strokeWidth="28"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

export interface BrandProps {
  readonly productName: string;
  /** Sous le nom : prestataire et site, quand ils sont connus. */
  readonly context?: ReactNode;
}

/** Marque de la maquette : pictogramme, nom du produit, contexte en dessous. */
export function Brand({ productName, context }: BrandProps) {
  return (
    <div className="flex items-center gap-2-75">
      <BrandMark />
      <div className="grid">
        <span className="text-brand font-semibold">{productName}</span>
        {context === undefined ? null : <span className="text-small text-text-3">{context}</span>}
      </div>
    </div>
  );
}

export interface AppShellProps {
  readonly productName: string;
  /** Sous la marque : prestataire et site, quand ils sont connus. */
  readonly context?: ReactNode;
  readonly navigation?: ReactNode;
  /** Pied de la barre latérale : l'utilisateur, son poste, et une action. */
  readonly user: string;
  readonly workstation: string;
  readonly footerAction?: ReactNode;
  readonly breadcrumb: ReactNode;
  readonly title: string;
  /** Barre du haut, à droite. */
  readonly tools?: ReactNode;
  readonly children: ReactNode;
}

/**
 * Ossature de la maquette : navigation latérale fixe de 252 px, barre du haut collante avec fil
 * d'Ariane et titre, puis le contenu, blocs empilés à 16 px.
 */
export function AppShell({
  productName,
  context,
  navigation,
  user,
  workstation,
  footerAction,
  breadcrumb,
  title,
  tools,
  children,
}: AppShellProps) {
  return (
    <div className="grid min-h-screen grid-cols-(--cairn-shell-columns)">
      <aside className="sticky top-0 flex h-screen flex-col border-r border-border-frame bg-nav">
        <div className="border-b border-border-frame px-4-5 py-4-5">
          <Brand productName={productName} context={context} />
        </div>
        <nav className="flex flex-1 flex-col gap-0-5 overflow-y-auto pt-2-5 pb-4">{navigation}</nav>
        <div className="grid gap-1 border-t border-border-frame px-4-5 pt-3-5 pb-4 text-secondary">
          <span className="font-medium text-text">{user}</span>
          <span className="text-text-3">{workstation}</span>
          {footerAction === undefined ? null : <div className="mt-2">{footerAction}</div>}
        </div>
      </aside>
      <main className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-10 flex flex-wrap items-center gap-3-5 border-b border-border-frame bg-topbar px-7 py-3-5 backdrop-blur-raised">
          <div>
            <div className="text-small text-text-3">{breadcrumb}</div>
            <h1 className="m-0 mt-0-5 text-title font-semibold tracking-title">{title}</h1>
          </div>
          {tools === undefined ? null : <div className="ml-auto flex items-center gap-2-5">{tools}</div>}
        </header>
        <section className="grid flex-1 content-start gap-4 px-7 pt-5-5 pb-7-5">{children}</section>
      </main>
    </div>
  );
}
