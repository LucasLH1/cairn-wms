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
  readonly children: ReactNode;
}

/** Élément de navigation de la maquette : barre d'accent à gauche quand il est courant. */
export function NavigationItem({ href, isCurrent, children }: NavigationItemProps) {
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
      {children}
    </Link>
  );
}
