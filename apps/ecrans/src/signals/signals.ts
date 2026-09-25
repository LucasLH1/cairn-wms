import { changeSignalSchema, SIGNALS_PATH, type ChangeSignal, type Subscription } from '@cairn/contrat';

type Entry = Subscription['subscribe'][number];
type Listener = (signal: ChangeSignal) => void;

const RECONNECT_DELAYS_MS = [500, 1000, 2000, 5000];

/**
 * Canal temps réel des écrans (fiche 0026). Tient une connexion, envoie l'union des abonnements des
 * écrans affichés, remet chaque signal à ceux qui l'attendent. À chaque reconnexion, `onReconnect`
 * fait relire tout ce qui est affiché : aucun changement n'est perdu pendant une coupure (règle 3).
 */
export class SignalChannel {
  readonly #subscriptions = new Map<number, { entry: Entry; listener: Listener }>();
  #next = 0;
  #socket: WebSocket | undefined;
  #attempt = 0;
  #closed = false;
  #connectedOnce = false;

  constructor(private readonly onReconnect: () => void) {}

  open(): void {
    this.#closed = false;
    if (this.#socket !== undefined) return;
    const url = new URL(SIGNALS_PATH, window.location.href);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(url);
    socket.addEventListener('open', () => {
      this.#attempt = 0;
      this.#send();
      if (this.#connectedOnce) this.onReconnect();
      this.#connectedOnce = true;
    });
    socket.addEventListener('message', (event) => {
      const parsed = changeSignalSchema.safeParse(JSON.parse(String(event.data)));
      if (!parsed.success) return;
      for (const { entry, listener } of this.#subscriptions.values()) {
        if (
          entry.objectType === parsed.data.objectType &&
          (entry.objectId ?? parsed.data.objectId) === parsed.data.objectId
        ) {
          listener(parsed.data);
        }
      }
    });
    socket.addEventListener('close', () => {
      // Une connexion remplacée entre-temps ne relance rien : seule la connexion courante compte.
      if (this.#socket !== socket) return;
      this.#socket = undefined;
      if (this.#closed) return;
      const delay = RECONNECT_DELAYS_MS[Math.min(this.#attempt, RECONNECT_DELAYS_MS.length - 1)];
      this.#attempt += 1;
      setTimeout(() => {
        if (!this.#closed) this.open();
      }, delay);
    });
    this.#socket = socket;
  }

  close(): void {
    this.#closed = true;
    const socket = this.#socket;
    this.#socket = undefined;
    socket?.close();
  }

  /** S'abonne à un objet, ou à tout un type ; rend la fonction qui désabonne. */
  subscribe(entry: Entry, listener: Listener): () => void {
    const id = this.#next;
    this.#next += 1;
    this.#subscriptions.set(id, { entry, listener });
    this.#send();
    return () => {
      this.#subscriptions.delete(id);
      this.#send();
    };
  }

  #send(): void {
    if (this.#socket?.readyState !== WebSocket.OPEN) return;
    const subscribe = [...this.#subscriptions.values()].map(({ entry }) => entry);
    this.#socket.send(JSON.stringify({ subscribe }));
  }
}
