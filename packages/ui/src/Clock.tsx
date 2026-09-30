export interface ClockProps {
  /** L'heure affichée, déjà mise en forme (« 10:30 »). */
  readonly time: string;
  /** Ce qu'est cette heure, lu par les technologies d'assistance (« Heure locale du site »). */
  readonly label: string;
}

/** Heure de la barre du haut (maquette) : un petit cadre, en chasse fixe, à l'extrême droite. */
export function Clock({ time, label }: ClockProps) {
  return (
    <div className="rounded-field border border-border-strong bg-field px-3 py-2 font-mono text-secondary whitespace-nowrap text-text">
      <span className="sr-only">{label}</span>
      {time}
    </div>
  );
}
