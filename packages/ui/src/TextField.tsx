import {
  Input,
  Label,
  TextField as AriaTextField,
  type TextFieldProps as AriaTextFieldProps,
} from 'react-aria-components';
import { focusRing } from './focus.js';

export interface TextFieldProps extends Omit<AriaTextFieldProps, 'className' | 'style' | 'children'> {
  readonly label: string;
  /** Champ de code : police à chasse fixe, comme les codes de la maquette. */
  readonly code?: boolean;
}

/**
 * Champ avec libellé, dans la forme du seul champ de formulaire de la maquette : sur-titre en
 * capitales au-dessus, champ sur fond de puits. Pas de message d'erreur sous le champ : comme dans la
 * maquette, un refus s'affiche dans le bandeau.
 */
export function TextField({ label, code = false, ...props }: TextFieldProps) {
  return (
    <AriaTextField {...props} className="grid gap-1-5">
      <Label className="text-small font-semibold tracking-label text-text-3 uppercase">{label}</Label>
      <Input
        className={`${focusRing} ${code ? 'font-mono' : ''} rounded-control border border-border-strong bg-well px-3 py-2-5 text-body text-text`}
      />
    </AriaTextField>
  );
}
