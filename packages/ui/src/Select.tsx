import {
  Button,
  Label,
  ListBox,
  ListBoxItem,
  Popover,
  Select as AriaSelect,
  SelectValue,
  type Key,
} from 'react-aria-components';
import { focusRing } from './focus.js';

export interface SelectOption {
  readonly id: string;
  readonly label: string;
}

export interface SelectProps {
  readonly label: string;
  readonly placeholder: string;
  readonly options: readonly SelectOption[];
  readonly value: string | null;
  readonly onChange: (value: string | null) => void;
  readonly isDisabled?: boolean;
  /** Libellé accessible seul, sans sur-titre visible : pour une cellule de tableau. */
  readonly hideLabel?: boolean;
}

/**
 * Liste déroulante de la maquette : sur-titre en capitales, champ sur fond de puits ; le menu reprend
 * celui du sélecteur de donneur d'ordre, option retenue en tonalité `ok`.
 */
export function Select({
  label,
  placeholder,
  options,
  value,
  onChange,
  isDisabled = false,
  hideLabel = false,
}: SelectProps) {
  return (
    <AriaSelect
      className="grid gap-1-5"
      placeholder={placeholder}
      value={value}
      onChange={(key: Key | null) => {
        onChange(key === null ? null : String(key));
      }}
      isDisabled={isDisabled}
      {...(hideLabel ? { 'aria-label': label } : {})}
    >
      {hideLabel ? null : (
        <Label className="text-small font-semibold tracking-label text-text-3 uppercase">{label}</Label>
      )}
      <Button
        className={`${focusRing} flex items-center justify-between gap-2 rounded-control border border-border-strong bg-well px-3 py-2-5 text-left text-body text-text data-disabled:text-text-4`}
      >
        <SelectValue className="data-placeholder:text-text-3" />
        <span aria-hidden="true" className="text-text-3">
          ▾
        </span>
      </Button>
      <Popover className="min-w-(--trigger-width) rounded-banner border border-border-strong bg-surface-raised p-2 shadow-menu backdrop-blur-raised">
        <ListBox className="grid gap-0-5 outline-none">
          {options.map((option) => (
            <ListBoxItem
              key={option.id}
              id={option.id}
              textValue={option.label}
              className="cursor-pointer rounded-control px-2-5 py-2-25 text-body text-text outline-none data-focused:bg-row-hover data-selected:bg-ok-bg data-selected:text-accent-text"
            >
              {option.label}
            </ListBoxItem>
          ))}
        </ListBox>
      </Popover>
    </AriaSelect>
  );
}
