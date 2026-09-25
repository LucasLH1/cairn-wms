/**
 * Distingue une lecture de code-barres d'une frappe (fiche 0025, règle 3). Un lecteur de code-barres
 * émet ses caractères en rafale et termine par Entrée ; une personne frappe plus lentement.
 *
 * Seuils provisoires, à mesurer sur les lecteurs réels (« Non prouvé » de la fiche 0025) : au moins
 * quatre caractères, pas plus de 50 ms entre deux touches.
 */
export const MINIMUM_LENGTH = 4;
export const MAXIMUM_INTERVAL_MS = 50;

export class BarcodeDetector {
  #buffer = '';
  #last = Number.NEGATIVE_INFINITY;

  /** Reçoit une touche et son heure ; rend le code lu quand une rafale se termine par Entrée. */
  key(key: string, at: number): string | undefined {
    const interval = at - this.#last;
    this.#last = at;
    if (key === 'Enter') {
      const code = this.#buffer;
      this.#buffer = '';
      return code.length >= MINIMUM_LENGTH && interval <= MAXIMUM_INTERVAL_MS ? code : undefined;
    }
    if (key.length !== 1) {
      this.#buffer = '';
      return undefined;
    }
    this.#buffer = interval <= MAXIMUM_INTERVAL_MS ? this.#buffer + key : key;
    return undefined;
  }
}
