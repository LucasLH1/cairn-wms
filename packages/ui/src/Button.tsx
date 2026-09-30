import { Button as AriaButton, type ButtonProps as AriaButtonProps } from 'react-aria-components';
import { focusRing } from './focus.js';

/** Variantes de bouton de la maquette : principal, secondaire, main (fiche 0011). */
export type ButtonVariant = 'primary' | 'secondary' | 'hand';

const variantClasses: Readonly<Record<ButtonVariant, string>> = {
  primary: 'bg-accent text-on-accent border-accent font-semibold',
  secondary: 'bg-control text-text border-border-control font-medium',
  hand: 'bg-hand-bg text-hand-fg border-hand-bd font-semibold',
};

export interface ButtonProps extends Omit<AriaButtonProps, 'className' | 'style'> {
  readonly variant?: ButtonVariant;
}

/**
 * Bouton de la maquette, taille standard. Désactivé, il se distingue au premier coup d’œil : fond
 * transparent, bord en tirets, texte estompé (décision du 2026-09-30, README du lot 1, point 13).
 */
export function Button({ variant = 'secondary', ...props }: ButtonProps) {
  return (
    <AriaButton
      {...props}
      className={`${variantClasses[variant]} ${focusRing} cursor-pointer rounded-control border px-3-75 py-2-25 text-secondary data-disabled:cursor-not-allowed data-disabled:border-dashed data-disabled:border-border-disabled data-disabled:bg-transparent data-disabled:font-medium data-disabled:text-text-4`}
    />
  );
}
