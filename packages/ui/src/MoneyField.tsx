import { Input, Label, NumberField as AriaNumberField } from 'react-aria-components';
import { focusRing } from './focus.js';

export interface MoneyFieldProps {
  readonly label: string;
  /** Code ISO 4217 de la devise. */
  readonly currency: string;
  /** Le montant en centimes — plus exactement en plus petite unité de la devise (fiche 0017, règle 5). */
  readonly value: number | null;
  readonly onChange: (value: number | null) => void;
}

/** Nombre de décimales de la devise : deux pour l'euro, aucune pour le yen. */
function minorDigits(currency: string): number {
  return (
    new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 0
  );
}

/**
 * Montant saisi dans sa devise, avec ses décimales, conservé en centimes (décision du 2026-09-30,
 * README du lot 1, point 9). Comme la quantité, il compte dès la frappe.
 */
export function MoneyField({ label, currency, value, onChange }: MoneyFieldProps) {
  const digits = minorDigits(currency);
  const unit = 10 ** digits;
  return (
    <AriaNumberField
      className="grid min-w-0 gap-1-5"
      value={value === null ? Number.NaN : value / unit}
      onChange={(next) => {
        onChange(Number.isNaN(next) ? null : Math.round(next * unit));
      }}
      minValue={0}
      formatOptions={{ style: 'currency', currency }}
    >
      <Label className="text-small font-semibold tracking-label text-text-3 uppercase">{label}</Label>
      <Input
        className={`${focusRing} w-full min-w-0 rounded-control border border-border-strong bg-well px-3 py-2-5 text-right font-mono text-body text-text`}
        onInput={(event) => {
          // Chiffres, et au plus autant de décimales que la devise en compte, séparées par une virgule
          // ou un point ; le symbole et les espaces de la mise en forme sont ignorés.
          const text = event.currentTarget.value.replace(/[^\d.,]/gu, '');
          if (text === '') {
            onChange(null);
            return;
          }
          const match = /^(\d+)(?:[.,](\d*))?$/u.exec(text);
          const whole = match?.[1];
          const fraction = match?.[2] ?? '';
          if (whole === undefined || fraction.length > digits) return;
          onChange(Number(whole) * unit + Number(fraction.padEnd(digits, '0') || '0'));
        }}
      />
    </AriaNumberField>
  );
}
