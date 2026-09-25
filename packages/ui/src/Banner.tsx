import type { ReactNode } from 'react';
import { Button as AriaButton } from 'react-aria-components';
import { focusRing } from './focus.js';
import type { StatusTone } from './StatusBadge.js';

const toneClasses: Readonly<Record<StatusTone, { readonly box: string; readonly dot: string }>> = {
  ok: { box: 'bg-ok-bg border-ok-bd text-ok-fg', dot: 'bg-ok-fg' },
  warn: { box: 'bg-warn-bg border-warn-bd text-warn-fg', dot: 'bg-warn-fg' },
  bad: { box: 'bg-bad-bg border-bad-bd text-bad-fg', dot: 'bg-bad-fg' },
  info: { box: 'bg-info-bg border-info-bd text-info-fg', dot: 'bg-info-fg' },
  hand: { box: 'bg-hand-bg border-hand-bd text-hand-fg', dot: 'bg-hand-fg' },
  mute: { box: 'bg-mute-bg border-mute-bd text-mute-fg', dot: 'bg-mute-fg' },
};

export interface BannerProps {
  readonly tone: StatusTone;
  readonly children: ReactNode;
  /** Libellé du bouton qui masque le bandeau ; sans lui, le bandeau ne se masque pas. */
  readonly dismissLabel?: string;
  readonly onDismiss?: () => void;
}

/**
 * Bandeau de la maquette : le message de refus en haut du contenu — `bad` pour un refus, `warn` pour
 * une lecture refusée —, puce, texte « objet : motif », bouton « Masquer ». Seul le message est
 * annoncé aux lecteurs d'écran, pas le bouton.
 */
export function Banner({ tone, children, dismissLabel, onDismiss }: BannerProps) {
  const classes = toneClasses[tone];
  return (
    <div className={`${classes.box} flex items-center gap-3 rounded-banner border px-3-75 py-2-75 text-body`}>
      <span aria-hidden="true" className={`${classes.dot} size-2 shrink-0 rounded-full`} />
      <span role="alert" className="flex-1">
        {children}
      </span>
      {dismissLabel !== undefined && onDismiss !== undefined ? (
        <AriaButton
          onPress={onDismiss}
          className={`${focusRing} cursor-pointer rounded-control border border-mute-bd bg-dismiss px-2-5 py-1 text-small text-text`}
        >
          {dismissLabel}
        </AriaButton>
      ) : null}
    </div>
  );
}
