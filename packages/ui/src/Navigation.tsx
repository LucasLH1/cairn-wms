import type { ReactNode } from 'react';
import { Link } from 'react-aria-components';
import { focusRing } from './focus.js';

export interface NavigationGroupProps {
  readonly title: string;
  readonly children: ReactNode;
}

/** Groupe de la navigation latérale : titre en capitales (« Bureau », « Administration »). */
export function NavigationGroup({ title, children }: NavigationGroupProps) {
  return (
    <div className="grid gap-0-5 pt-2-5 pb-1-5">
      <span className="px-4-5 pb-2 text-label font-semibold tracking-group text-text-4 uppercase">
        {title}
      </span>
      {children}
    </div>
  );
}

export interface NavigationItemProps {
  readonly href: string;
  readonly isCurrent: boolean;
  /** Icône au trait (`icons.tsx`), à gauche du libellé. */
  readonly icon?: ReactNode;
  /**
   * Travail en attente derrière l'entrée : un compteur à droite, et seulement s'il est positif
   * (README du lot 1, décisions du 2026-09-30, point 2).
   */
  readonly count?: number;
  /** Ce que compte le compteur, lu par les technologies d'assistance (« 1 arrivage en cours »). */
  readonly countLabel?: string;
  readonly children: ReactNode;
}

/**
 * Élément de navigation de la maquette : icône, libellé, compteur éventuel ; barre d'accent à gauche
 * et icône à l'accent quand il est courant.
 */
export function NavigationItem({ href, isCurrent, icon, count, countLabel, children }: NavigationItemProps) {
  return (
    <Link
      href={href}
      aria-current={isCurrent ? 'page' : undefined}
      className={`${focusRing} flex items-center gap-3 border-l-3 px-4-5 py-2-5 text-body transition-colors ${
        isCurrent
          ? 'border-accent bg-nav-active font-semibold text-text-strong'
          : 'border-transparent font-medium text-text-secondary hover:bg-nav-hover hover:text-text-strong'
      }`}
    >
      {icon === undefined ? null : (
        <span className={`flex shrink-0 ${isCurrent ? 'text-accent' : 'text-nav-icon'}`}>{icon}</span>
      )}
      <span>{children}</span>
      {count === undefined || count <= 0 ? null : (
        <span
          className={`ml-auto rounded-badge px-2 py-0-5 text-label font-semibold whitespace-nowrap ${
            isCurrent ? 'bg-count-current-bg text-accent-text' : 'bg-count-bg text-text-secondary'
          }`}
        >
          <span aria-hidden={countLabel === undefined ? undefined : true}>{count}</span>
          {countLabel === undefined ? null : <span className="sr-only">{countLabel}</span>}
        </span>
      )}
    </Link>
  );
}
