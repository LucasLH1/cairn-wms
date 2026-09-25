import type { ReactNode } from 'react';

/** Six variantes de pastille d'état de la maquette (fiche 0011). */
export type StatusTone = 'ok' | 'warn' | 'bad' | 'info' | 'hand' | 'mute';

const toneClasses: Readonly<Record<StatusTone, string>> = {
  ok: 'bg-ok-bg text-ok-fg',
  warn: 'bg-warn-bg text-warn-fg',
  bad: 'bg-bad-bg text-bad-fg',
  info: 'bg-info-bg text-info-fg',
  hand: 'bg-hand-bg text-hand-fg',
  mute: 'bg-mute-bg text-mute-fg',
};

export interface StatusBadgeProps {
  readonly tone: StatusTone;
  readonly children: ReactNode;
}

export function StatusBadge({ tone, children }: StatusBadgeProps) {
  return (
    <span className={`${toneClasses[tone]} inline-block rounded-badge px-2 py-0-5 text-small font-medium`}>
      {children}
    </span>
  );
}
