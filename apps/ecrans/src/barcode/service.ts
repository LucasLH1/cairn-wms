import { createContext, useContext, useEffect, useRef } from 'react';
import { BarcodeDetector } from './detector.js';

export type BarcodeHandler = (code: string) => void;

/**
 * Le seul service de lecture de code-barres de l'application (fiche 0025, règle 3). Il écoute le
 * clavier du document ; une lecture va à l'écran actif s'il attend une réponse — le dernier à s'être
 * déclaré —, sinon à l'ouverture de l'objet lu. Une lecture faite dans un champ de saisie ordinaire
 * reste à ce champ : seul un champ marqué `data-barcode` la laisse au service.
 */
export class BarcodeService {
  readonly #detector = new BarcodeDetector();
  readonly #handlers: BarcodeHandler[] = [];

  constructor(private readonly openObject: BarcodeHandler) {}

  readonly #onKeyDown = (event: KeyboardEvent): void => {
    const code = this.#detector.key(event.key, event.timeStamp);
    if (code === undefined) return;
    const target = event.target;
    const editable =
      target instanceof HTMLElement &&
      (target.isContentEditable || target.matches('input, textarea, select')) &&
      !target.hasAttribute('data-barcode');
    if (editable) return;
    event.preventDefault();
    (this.#handlers.at(-1) ?? this.openObject)(code);
  };

  start(): () => void {
    document.addEventListener('keydown', this.#onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', this.#onKeyDown, true);
    };
  }

  /** Déclare l'écran actif comme destinataire des lectures ; rend la fonction qui le retire. */
  attend(handler: BarcodeHandler): () => void {
    this.#handlers.push(handler);
    return () => {
      const index = this.#handlers.lastIndexOf(handler);
      if (index !== -1) this.#handlers.splice(index, 1);
    };
  }
}

export const BarcodeServiceContext = createContext<BarcodeService | undefined>(undefined);

/** Un écran qui attend une lecture la reçoit tant qu'il est affiché. */
export function useBarcode(handler: BarcodeHandler): void {
  const service = useContext(BarcodeServiceContext);
  const latest = useRef(handler);
  useEffect(() => {
    latest.current = handler;
  });
  useEffect(
    () =>
      service?.attend((code) => {
        latest.current(code);
      }),
    [service],
  );
}
