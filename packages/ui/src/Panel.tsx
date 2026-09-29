import { useId, type ReactNode } from 'react';

export interface PanelProps {
  readonly title: string;
  /** Précision courte à côté du titre. */
  readonly meta?: ReactNode;
  readonly actions?: ReactNode;
  readonly children: ReactNode;
}

/** Panneau de la maquette : le conteneur de tout écran, en-tête titré, corps libre. */
export function Panel({ title, meta, actions, children }: PanelProps) {
  // Une région nommée par son titre : les lecteurs d'écran la trouvent, les tests aussi.
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      className="overflow-hidden rounded-panel border border-border bg-surface backdrop-blur-panel"
    >
      <header className="flex flex-wrap items-center gap-3 border-b border-divider px-5 py-3-5">
        <h2 id={titleId} className="m-0 text-heading font-semibold">
          {title}
        </h2>
        {meta === undefined ? null : <span className="text-secondary text-text-3">{meta}</span>}
        {actions === undefined ? null : <div className="ml-auto flex items-center gap-2">{actions}</div>}
      </header>
      <div className="grid gap-4 px-5 py-4">{children}</div>
    </section>
  );
}
