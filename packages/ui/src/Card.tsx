import type { ReactNode } from 'react';

export interface CardProps {
  readonly title: string;
  readonly badge?: ReactNode;
  /** Carte « occupée » de la maquette : fond et bord de l'accent. */
  readonly highlighted?: boolean;
  readonly lines?: readonly ReactNode[];
  /** Le « grand chiffre » de la maquette : un libellé, une valeur en chasse fixe. */
  readonly figure?: { readonly label: string; readonly value: string };
  readonly actions?: ReactNode;
}

/** Carte de la maquette (quais, vague, transporteur…), dans une grille de cartes. */
export function Card({ title, badge, highlighted = false, lines = [], figure, actions }: CardProps) {
  return (
    <article
      aria-label={title}
      className={`grid content-start gap-1-5 rounded-panel border px-5 py-4-5 backdrop-blur-panel ${
        highlighted ? 'border-occupied-bd bg-occupied-bg' : 'border-border bg-surface'
      }`}
    >
      <header className="flex items-center justify-between gap-3">
        <h2 className="m-0 text-heading font-semibold">{title}</h2>
        {badge}
      </header>
      {lines.map((line, index) => (
        <p
          key={index}
          className={`m-0 ${index === 0 ? 'text-body text-text' : 'text-secondary text-text-secondary'}`}
        >
          {line}
        </p>
      ))}
      {figure === undefined ? null : (
        <div className="grid">
          <span className="text-secondary text-text-3">{figure.label}</span>
          <span className="font-mono text-figure text-ok-fg">{figure.value}</span>
        </div>
      )}
      {actions === undefined ? null : <div className="mt-1-5 flex gap-2">{actions}</div>}
    </article>
  );
}

export interface CardGridProps {
  readonly label: string;
  readonly children: ReactNode;
}

/** Grille des cartes : autant de colonnes que la largeur en permet. */
export function CardGrid({ label, children }: CardGridProps) {
  return (
    <section aria-label={label} className="grid grid-cols-(--cairn-card-columns) gap-3-5">
      {children}
    </section>
  );
}
