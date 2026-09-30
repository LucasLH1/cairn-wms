import { Input, SearchField as AriaSearchField } from 'react-aria-components';

export interface SearchFieldProps {
  /** Libellé accessible : la maquette n'affiche que l'exemple dans le champ. */
  readonly label: string;
  readonly placeholder: string;
  readonly onSubmit: (text: string) => void;
}

/**
 * Champ de recherche de la barre du haut de la maquette : loupe, saisie en chasse fixe, 360 px. Une
 * lecture de code-barres y est reçue comme une frappe suivie de Entrée.
 */
export function SearchField({ label, placeholder, onSubmit }: SearchFieldProps) {
  return (
    <AriaSearchField
      aria-label={label}
      onSubmit={(text) => {
        if (text.trim() !== '') onSubmit(text.trim());
      }}
      className="flex w-narrow max-w-full items-center gap-2-25 rounded-field border border-border-strong bg-field px-3 py-1-75 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent"
    >
      <svg viewBox="0 0 20 20" className="size-3-75 shrink-0 text-text-3" fill="none" aria-hidden="true">
        <path
          d="M9 15.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13ZM17.5 17.5l-4-4"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
      <Input
        placeholder={placeholder}
        className="min-w-0 flex-1 border-0 bg-transparent font-mono text-secondary text-text outline-none placeholder:text-text-4"
      />
    </AriaSearchField>
  );
}
