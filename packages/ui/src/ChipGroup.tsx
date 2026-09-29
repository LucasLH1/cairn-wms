import { CheckboxButton, CheckboxField, CheckboxGroup, Label } from 'react-aria-components';
import { focusRing } from './focus.js';

export interface ChipOption {
  readonly id: string;
  readonly label: string;
  readonly isDisabled?: boolean;
}

export interface ChipGroupProps {
  readonly label: string;
  readonly options: readonly ChipOption[];
  readonly value: readonly string[];
  readonly onChange: (value: string[]) => void;
  readonly isDisabled?: boolean;
}

/**
 * Choix multiple en puces, sur le modèle des puces de filtre de la maquette : choisie, la puce prend
 * l'accent ; sinon elle reste sur fond de champ. Chaque puce est une case à cocher pour l'accessibilité.
 */
export function ChipGroup({ label, options, value, onChange, isDisabled = false }: ChipGroupProps) {
  return (
    <CheckboxGroup className="grid gap-1-5" value={[...value]} onChange={onChange} isDisabled={isDisabled}>
      <Label className="text-small font-semibold tracking-label text-text-3 uppercase">{label}</Label>
      <div className="flex flex-wrap gap-1-75">
        {options.map((option) => (
          <CheckboxField key={option.id} value={option.id} isDisabled={option.isDisabled ?? false}>
            <CheckboxButton
              className={`${focusRing} inline-block cursor-pointer rounded-chip border border-border-disabled bg-field px-3 py-1-75 text-secondary font-medium whitespace-nowrap text-text-2 data-disabled:cursor-not-allowed data-disabled:text-text-4 data-selected:border-ok-bd data-selected:bg-chip-active-bg data-selected:text-accent-text`}
            >
              {option.label}
            </CheckboxButton>
          </CheckboxField>
        ))}
      </div>
    </CheckboxGroup>
  );
}
