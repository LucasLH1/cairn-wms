/**
 * Icônes au trait de la navigation, tirées de la maquette du lot 1 (README du lot 1, décisions du
 * 2026-09-30, point 2) : carré de 20 unités, trait de 1,6 à la couleur du texte, bouts arrondis. Celles
 * des entrées absentes de la maquette sont dessinées dans le même style.
 */
function LineIcon({ path }: { readonly path: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className="size-nav-icon shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

/** Réceptions : la flèche qui entre dans le bac (maquette). */
export function ReceiptIcon() {
  return <LineIcon path="M10 3v8m0 0 3.2-3.2M10 11 6.8 7.8M3.5 12.5v3a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-3" />;
}

/** Références : le carton, repris de l'entrée « Stock » de la maquette. */
export function ItemIcon() {
  return (
    <LineIcon path="M3.5 6.6 10 3.3l6.5 3.3v6.8L10 16.7l-6.5-3.3V6.6ZM3.5 6.6 10 10m0 0 6.5-3.4M10 10v6.7" />
  );
}

/** Tiers : une fiche de contact, dessinée dans le style de la maquette. */
export function PartyIcon() {
  return (
    <LineIcon path="M3.5 4.5h13a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1ZM7.5 10a1.7 1.7 0 1 0 0-3.4 1.7 1.7 0 0 0 0 3.4ZM5 13.3c.4-1.2 1.3-1.8 2.5-1.8s2.1.6 2.5 1.8M12.5 8h2.5M12.5 11h2.5" />
  );
}

/** Paramétrage : la roue dentée (maquette). */
export function SettingsIcon() {
  return (
    <LineIcon path="M10 12.4a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8Zm6.2-1.2v-2.4l-1.8-.4a4.8 4.8 0 0 0-.6-1.4l1-1.5-1.7-1.7-1.5 1a4.8 4.8 0 0 0-1.4-.6L9.8 2.2H8.2l-.4 1.8a4.8 4.8 0 0 0-1.4.6l-1.5-1-1.7 1.7 1 1.5a4.8 4.8 0 0 0-.6 1.4l-1.8.4v2.4l1.8.4c.14.5.34.96.6 1.4l-1 1.5 1.7 1.7 1.5-1c.44.26.9.46 1.4.6l.4 1.8h1.6l.4-1.8c.5-.14.96-.34 1.4-.6l1.5 1 1.7-1.7-1-1.5c.26-.44.46-.9.6-1.4l1.8-.4Z" />
  );
}

/** Utilisateurs et équipes : deux personnes (maquette). */
export function UserIcon() {
  return (
    <LineIcon path="M7.5 9.2a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8ZM13.5 9.6a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM3 16v-.8A3.2 3.2 0 0 1 6.2 12h2.6a3.2 3.2 0 0 1 3.2 3.2v.8M13 12h.8a3.2 3.2 0 0 1 3.2 3.2v.8" />
  );
}

/** Donneurs d'ordre : l'immeuble (maquette). */
export function PrincipalIcon() {
  return (
    <LineIcon path="M4 16.5V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v11.5M12 8.5h3a1 1 0 0 1 1 1v7M2.5 16.5h15M6.5 7h2M6.5 10h2M6.5 13h2" />
  );
}
