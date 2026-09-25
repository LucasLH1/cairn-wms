import { sql } from 'kysely';
import type { z } from 'zod';
import type { Database, DatabaseTransaction, JsonObject } from '../database/index.js';

/** Données propres à un type d'événement : un objet JSON, validé par son schéma (fiche 0022, règle 3). */
export type TraceEventData = JsonObject;

/** Un type d'événement du catalogue fermé et le schéma de ses données. */
export interface TraceEventType<TData extends TraceEventData> {
  readonly type: string;
  readonly data: z.ZodType<TData>;
}

export function defineTraceEventType<TData extends TraceEventData>(
  type: string,
  data: z.ZodType<TData>,
): TraceEventType<TData> {
  return { type, data };
}

/** Objet concerné par un événement, désigné par son terme du glossaire et son identifiant. */
export interface TraceObject {
  readonly type: string;
  readonly id: string;
}

/** Auteur d'un événement : un utilisateur, ou une origine externe avec son horodatage d'origine. */
export type TraceAuthor = { readonly userId: string } | { readonly origin: string; readonly originAt?: Date };

/** Explication de décision (`DecisionTrace`) : règle, version et critères retenus. */
export interface DecisionTrace {
  readonly rule: string;
  readonly version: number;
  readonly criteria: TraceEventData;
}

export interface NewTraceEvent<TData extends TraceEventData> {
  readonly eventType: TraceEventType<TData>;
  readonly data: TData;
  readonly author: TraceAuthor;
  readonly objects: readonly [TraceObject, ...TraceObject[]];
  readonly workstationId?: string;
  readonly gestureId?: string;
  readonly decisionTrace?: DecisionTrace;
}

export interface RecordedTraceEvent {
  readonly id: string;
  readonly occurredAt: Date;
}

/**
 * Ajoute un événement au journal. Ne s'appelle que dans la transaction du geste qui le produit : l'état
 * et le journal sont cohérents par construction (fiche 0022, RG-EXI-011).
 */
export async function appendTraceEvent<TData extends TraceEventData>(
  transaction: DatabaseTransaction,
  event: NewTraceEvent<TData>,
): Promise<RecordedTraceEvent> {
  const data = event.eventType.data.parse(event.data);
  const recorded = await transaction
    .insertInto('foundation.traceEvent')
    .values({
      type: event.eventType.type,
      data,
      authorUserId: 'userId' in event.author ? event.author.userId : null,
      origin: 'origin' in event.author ? event.author.origin : null,
      originAt: 'origin' in event.author ? (event.author.originAt ?? null) : null,
      workstationId: event.workstationId ?? null,
      gestureId: event.gestureId ?? null,
      decisionTrace: event.decisionTrace === undefined ? null : { ...event.decisionTrace },
    })
    // L'horodatage revient aussi en texte : une date JavaScript perd les microsecondes que la
    // table de liaison doit reprendre à l'identique pour sa clé étrangère.
    .returning(['id', 'occurredAt', sql<string>`occurred_at::text`.as('exactOccurredAt')])
    .executeTakeFirstOrThrow();
  await transaction
    .insertInto('foundation.traceEventObject')
    .values(
      event.objects.map((object) => ({
        eventId: recorded.id,
        occurredAt: recorded.exactOccurredAt,
        objectType: object.type,
        objectId: object.id,
      })),
    )
    .execute();
  return { id: recorded.id, occurredAt: recorded.occurredAt };
}

export interface TraceHistoryEntry {
  readonly id: string;
  readonly type: string;
  readonly occurredAt: Date;
  readonly authorUserId: string | null;
  readonly origin: string | null;
  readonly workstationId: string | null;
  readonly gestureId: string | null;
  readonly data: unknown;
}

/** Historique d'un objet, du plus récent au plus ancien, en une requête (RG-EXI-016). */
export async function readObjectHistory(
  db: Database,
  object: TraceObject,
  limit = 100,
): Promise<readonly TraceHistoryEntry[]> {
  return db
    .selectFrom('foundation.traceEventObject as link')
    .innerJoin('foundation.traceEvent as event', (join) =>
      join.onRef('event.id', '=', 'link.eventId').onRef('event.occurredAt', '=', 'link.occurredAt'),
    )
    .where('link.objectType', '=', object.type)
    .where('link.objectId', '=', object.id)
    .orderBy('link.occurredAt', 'desc')
    .orderBy('event.id', 'desc')
    .limit(limit)
    .select([
      'event.id',
      'event.type',
      'event.occurredAt',
      'event.authorUserId',
      'event.origin',
      'event.workstationId',
      'event.gestureId',
      'event.data',
    ])
    .execute();
}
