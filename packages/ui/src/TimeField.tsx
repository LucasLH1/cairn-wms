import { parseTime } from '@internationalized/date';
import { DateInput, DateSegment, Label, TimeField as AriaTimeField } from 'react-aria-components';
import { focusRing } from './focus.js';

export interface TimeFieldProps {
  readonly label: string;
  /** Heure locale `HH:MM`. */
  readonly value: string | null;
  readonly onChange: (value: string | null) => void;
  readonly hideLabel?: boolean;
}

/** Heure locale saisie par segments, en vingt-quatre heures, dans la forme des champs de la maquette. */
export function TimeField({ label, value, onChange, hideLabel = false }: TimeFieldProps) {
  return (
    <AriaTimeField
      className="grid gap-1-5"
      value={value === null ? null : parseTime(value)}
      hourCycle={24}
      shouldForceLeadingZeros
      onChange={(next) => {
        onChange(next === null ? null : next.toString().slice(0, 5));
      }}
      {...(hideLabel ? { 'aria-label': label } : {})}
    >
      {hideLabel ? null : (
        <Label className="text-small font-semibold tracking-label text-text-3 uppercase">{label}</Label>
      )}
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
    </AriaTimeField>
  );
}
