import {
  Button,
  ListBox,
  ListBoxItem,
  Popover,
  Select as AriaSelect,
  SelectValue,
  type Key,
} from 'react-aria-components';
import { focusRing } from './focus.js';

export interface ContextOption {
  readonly id: string;
  /** Code court, en chasse fixe dans une pastille (« MD »). */
  readonly code: string;
  readonly label: string;
}

export interface ContextSelectProps {
  /** Libellé accessible : la maquette n'affiche que la valeur choisie. */
  readonly label: string;
  readonly placeholder: string;
  readonly options: readonly ContextOption[];
  readonly value: string | null;
  readonly onChange: (value: string) => void;
}

function Choice({ option }: { readonly option: ContextOption }) {
  return (
    <span className="flex items-center gap-2-25">
      <span className="rounded-tag bg-context-code px-1-75 py-0-5 font-mono text-tag text-accent">
        {option.code}
      </span>
      <span className="whitespace-nowrap">{option.label}</span>
    </span>
  );
}

/**
 * Sélecteur du contexte de travail de la barre du haut (maquette, « MD Maison Démo ▾ ») : le code en
 * pastille à chasse fixe, puis le nom. Il porte le donneur d'ordre et le site du contexte.
 */
export function ContextSelect({ label, placeholder, options, value, onChange }: ContextSelectProps) {
  const chosen = options.find((option) => option.id === value);
  return (
    <AriaSelect
      aria-label={label}
      placeholder={placeholder}
      value={value}
      onChange={(key: Key | null) => {
        if (key !== null) onChange(String(key));
      }}
    >
      <Button
        className={`${focusRing} flex cursor-pointer items-center gap-2-25 rounded-field border border-border-strong bg-field px-3-25 py-2 text-secondary text-text`}
      >
        <SelectValue className="data-placeholder:text-text-3">
          {({ defaultChildren }) => (chosen === undefined ? defaultChildren : <Choice option={chosen} />)}
        </SelectValue>
        <span aria-hidden="true" className="text-text-3">
          ▾
        </span>
      </Button>
      <Popover className="min-w-(--trigger-width) rounded-banner border border-border-strong bg-surface-raised p-2 shadow-menu backdrop-blur-raised">
        <ListBox className="grid gap-0-5 outline-none" items={options}>
          {(option) => (
            <ListBoxItem
              id={option.id}
              textValue={`${option.code} ${option.label}`}
              className="cursor-pointer rounded-control px-2-5 py-2-25 text-body text-text outline-none data-focused:bg-row-hover data-selected:bg-ok-bg data-selected:text-accent-text"
            >
              <Choice option={option} />
            </ListBoxItem>
          )}
        </ListBox>
      </Popover>
    </AriaSelect>
  );
}
