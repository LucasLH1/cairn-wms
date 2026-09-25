import { Input, Label, NumberField as AriaNumberField } from 'react-aria-components';
import { focusRing } from './focus.js';

export interface NumberFieldProps {
  readonly label: string;
  readonly value: number | null;
  readonly onChange: (value: number | null) => void;
  readonly minValue?: number;
  readonly hideLabel?: boolean;
}

/**
 * Champ de quantité : entier seulement (fiche 0017, règle 5), chiffres en chasse fixe, comme les
 * quantités de la maquette. La valeur suit la frappe, pas seulement la sortie du champ.
 */
export function NumberField({ label, value, onChange, minValue = 0, hideLabel = false }: NumberFieldProps) {
  return (
    <AriaNumberField
      className="grid gap-1-5"
      value={value ?? Number.NaN}
      onChange={(next) => {
        onChange(Number.isNaN(next) ? null : next);
      }}
      minValue={minValue}
      formatOptions={{ maximumFractionDigits: 0, useGrouping: false }}
      {...(hideLabel ? { 'aria-label': label } : {})}
    >
      {hideLabel ? null : (
        <Label className="text-small font-semibold tracking-label text-text-3 uppercase">{label}</Label>
      )}
      <Input
        className={`${focusRing} rounded-control border border-border-strong bg-well px-3 py-2-5 text-right font-mono text-body text-text`}
        // Un entier saisi compte dès la frappe : le bouton qui l'attend s'active sans quitter le champ.
        onInput={(event) => {
          const text = event.currentTarget.value.trim();
          if (/^\d+$/u.test(text)) onChange(Number(text));
          else if (text === '') onChange(null);
        }}
      />
    </AriaNumberField>
  );
}
