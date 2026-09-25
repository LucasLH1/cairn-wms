import { parseDate } from '@internationalized/date';
import { DateField as AriaDateField, DateInput, DateSegment, Label } from 'react-aria-components';
import { focusRing } from './focus.js';

export interface DateFieldProps {
  readonly label: string;
  /** Date au format ISO, `AAAA-MM-JJ`. */
  readonly value: string | null;
  readonly onChange: (value: string | null) => void;
}

/** Date sans heure, saisie par segments, dans la forme des champs de la maquette. */
export function DateField({ label, value, onChange }: DateFieldProps) {
  return (
    <AriaDateField
      className="grid gap-1-5"
      value={value === null ? null : parseDate(value)}
      onChange={(next) => {
        onChange(next === null ? null : next.toString());
      }}
    >
      <Label className="text-small font-semibold tracking-label text-text-3 uppercase">{label}</Label>
      <DateInput
        className={`${focusRing} flex rounded-control border border-border-strong bg-well px-3 py-2-5 font-mono text-body text-text`}
      >
        {(segment) => (
          <DateSegment
            segment={segment}
            className="rounded-badge px-0-5 outline-none data-focused:bg-selected data-placeholder:text-text-3"
          />
        )}
      </DateInput>
    </AriaDateField>
  );
}
