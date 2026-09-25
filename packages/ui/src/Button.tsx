import { Button as AriaButton, type ButtonProps as AriaButtonProps } from 'react-aria-components';

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

export function Button({ variant = 'secondary', ...props }: ButtonProps) {
  return (
    <AriaButton
      {...props}
      className={`${variantClasses[variant]} rounded-control px-4 py-2-5 text-secondary cursor-pointer border disabled:cursor-not-allowed disabled:bg-field disabled:text-text-4 disabled:border-border-strong`}
    />
  );
}
