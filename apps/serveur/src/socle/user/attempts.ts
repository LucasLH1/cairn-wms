/**
 * Tentatives de connexion limitées (fiche 0027, règle 1) : au-delà de cinq échecs en quinze minutes
 * pour un même identifiant, l'ouverture est refusée jusqu'à ce que la fenêtre passe. Tenu en mémoire
 * du processus : rien n'est conservé sur l'activité des utilisateurs (RG-TRA-015).
 */
const MAXIMUM_FAILURES = 5;
const WINDOW_MILLISECONDS = 15 * 60 * 1000;

export class LoginAttempts {
  readonly #failures = new Map<string, number[]>();

  constructor(private readonly now: () => number = Date.now) {}

  #recent(loginName: string): number[] {
    const key = loginName.toLowerCase();
    const threshold = this.now() - WINDOW_MILLISECONDS;
    const recent = (this.#failures.get(key) ?? []).filter((time) => time > threshold);
    if (recent.length === 0) this.#failures.delete(key);
    else this.#failures.set(key, recent);
    return recent;
  }

  isBlocked(loginName: string): boolean {
    return this.#recent(loginName).length >= MAXIMUM_FAILURES;
  }

  recordFailure(loginName: string): void {
    this.#failures.set(loginName.toLowerCase(), [...this.#recent(loginName), this.now()]);
  }

  clear(loginName: string): void {
    this.#failures.delete(loginName.toLowerCase());
  }
}
