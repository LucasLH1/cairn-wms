import { changeSignalSchema, subscriptionSchema, type ChangeSignal, type Subscription } from '@cairn/contrat';
import { sql } from 'kysely';
import pg from 'pg';
import type { ConnectionSettings, DatabaseTransaction } from '../database/index.js';

/** Canal des notifications de la base qui portent les signaux de changement. */
const CHANNEL = 'cairn_change';

/**
 * Émet un signal de changement dans la transaction d'un geste. PostgreSQL ne délivre une notification
 * qu'à la validation : un geste refusé ou annulé ne signale rien (fiche 0026, règle 1).
 */
export async function signalChange(transaction: DatabaseTransaction, signal: ChangeSignal): Promise<void> {
  const payload = JSON.stringify(changeSignalSchema.parse(signal));
  await sql`select pg_notify(${CHANNEL}, ${payload})`.execute(transaction);
}

export type SignalListener = (signal: ChangeSignal) => void;

/** Vrai si le signal concerne un abonnement : l'objet précis, ou tout son type. */
export function matches(subscription: Subscription['subscribe'], signal: ChangeSignal): boolean {
  return subscription.some(
    (entry) =>
      entry.objectType === signal.objectType &&
      (entry.objectId === undefined || entry.objectId === signal.objectId),
  );
}

export function parseSubscription(message: string): Subscription['subscribe'] | undefined {
  try {
    const parsed = subscriptionSchema.safeParse(JSON.parse(message));
    return parsed.success ? parsed.data.subscribe : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Relais des notifications de la base vers les connexions du rôle « gestes ». Une connexion dédiée
 * écoute le canal ; perdue, elle se rétablit, et les écrans relisent à leur reconnexion (règle 3).
 */
export class SignalRelay {
  readonly #listeners = new Set<SignalListener>();
  #client: pg.Client | undefined;
  #stopped = false;
  #retry: NodeJS.Timeout | undefined;

  constructor(private readonly settings: ConnectionSettings) {}

  async start(): Promise<void> {
    this.#stopped = false;
    const client = new pg.Client({ ...this.settings, application_name: 'cairn-signals' });
    client.on('notification', (message) => {
      if (message.channel !== CHANNEL || message.payload === undefined) return;
      const signal = changeSignalSchema.safeParse(JSON.parse(message.payload));
      if (!signal.success) return;
      for (const listener of this.#listeners) listener(signal.data);
    });
    client.on('error', () => {
      this.#reconnect();
    });
    await client.connect();
    await client.query(`listen ${CHANNEL}`);
    this.#client = client;
  }

  #reconnect(): void {
    const client = this.#client;
    this.#client = undefined;
    void client?.end().catch(() => undefined);
    if (this.#stopped || this.#retry !== undefined) return;
    this.#retry = setTimeout(() => {
      this.#retry = undefined;
      this.start().catch(() => {
        this.#reconnect();
      });
    }, 1000);
  }

  get listening(): boolean {
    return this.#client !== undefined;
  }

  listen(listener: SignalListener): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  async stop(): Promise<void> {
    this.#stopped = true;
    clearTimeout(this.#retry);
    const client = this.#client;
    this.#client = undefined;
    await client?.end();
  }
}
