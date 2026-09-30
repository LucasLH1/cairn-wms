import { Link, type LinkProps } from 'react-aria-components';
import { focusRing } from './focus.js';

export type TextLinkProps = Omit<LinkProps, 'className' | 'style'>;

/**
 * Lien dans le texte ou dans une cellule de tableau : couleur de l'accent, comme les codes cliquables
 * de la maquette. Les écrans l'emploient par le lien typé du routeur (`createLink`), jamais seul.
 */
export function TextLink(props: TextLinkProps) {
  return <Link {...props} className={`${focusRing} cursor-pointer text-accent hover:underline`} />;
}
