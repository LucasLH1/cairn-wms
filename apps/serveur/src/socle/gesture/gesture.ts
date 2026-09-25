import {
  APPLICATION_HEADER,
  APPLICATION_HEADER_VALUE,
  GESTURE_ID_HEADER,
  gestureIdSchema,
  gesturePath,
  type GestureDefinition,
  type Permission,
} from '@cairn/contrat';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { sql } from 'kysely';
import { z } from 'zod';
import type { Database, DatabaseTransaction } from '../database/index.js';
import {
  appendTraceEvent,
  defineTraceEventType,
  type NewTraceEvent,
  type RecordedTraceEvent,
  type TraceEventData,
  type TraceObject,
} from '../trace-event/index.js';
import { GestureRefusal, refusalStatus, type RefusalDetails } from './refusal.js';

/** Qui émet le geste, et depuis quel poste (fiche 0027, règle 4). */
export interface GestureAuthor {
  readonly userId: string;
  readonly workstationId: string;
}

/** Périmètre d'exécution que le geste engage : le site où il agit (RG-SUR-026 à 028). */
export interface GestureScope {
  readonly siteId?: string;
}

/**
 * Identité et droits, fournis par le module des utilisateurs, sessions et postes. Le greffon ne
 * présuppose rien de leur tenue.
 */
export interface GestureRights {
  /** L'utilisateur de la session et le poste du navigateur, s'ils sont connus. */
  resolveAuthor(
    request: FastifyRequest,
  ): Promise<{ readonly userId: string | null; readonly workstationId: string | null }>;
  /** Refus si l'auteur n'a pas la permission, ou agit hors de son périmètre d'exécution. */
  authorize(
    transaction: DatabaseTransaction,
    author: GestureAuthor,
    permission: Permission | null,
    scope: GestureScope,
  ): Promise<'permissionDenied' | 'outOfScope' | undefined>;
}

/** Ce que le traitement d'un geste reçoit : sa transaction, son auteur, son entrée validée. */
export interface GestureContext<Input> {
  readonly transaction: DatabaseTransaction;
  readonly author: GestureAuthor;
  readonly gestureId: string;
  readonly input: Input;
  /** Ajoute un événement au journal, attribué à l'auteur, au poste et au geste. */
  readonly appendEvent: <TData extends TraceEventData>(
    event: Omit<NewTraceEvent<TData>, 'author' | 'workstationId' | 'gestureId'>,
  ) => Promise<RecordedTraceEvent>;
}

/** Définition de geste quelconque, pour les registres qui en manipulent plusieurs. */
type AnyGestureDefinition = GestureDefinition<string, z.ZodType, z.ZodType, string>;

export interface GestureHandler<Definition extends AnyGestureDefinition> {
  readonly definition: Definition;
  /** Le périmètre engagé, lu au besoin dans la base ; par défaut, aucun site. */
  scope?(input: z.infer<Definition['input']>, transaction: DatabaseTransaction): Promise<GestureScope>;
  execute(context: GestureContext<z.infer<Definition['input']>>): Promise<z.infer<Definition['output']>>;
}

export function defineGestureHandler<Definition extends AnyGestureDefinition>(
  handler: GestureHandler<Definition>,
): GestureHandler<Definition> {
  return handler;
}

/** Événement produit par tout refus enregistré (RG-EXI-014, RG-ORG-022). */
export const gestureRefusedEvent = defineTraceEventType(
  'gestureRefused',
  z.object({
    gesture: z.string(),
    reason: z.string(),
    permission: z.string().optional(),
  }),
);

interface StoredResponse {
  readonly status: number;
  readonly body: unknown;
}

const storedGestureSchema = z.object({
  authorUserId: z.string().nullable(),
  name: z.string(),
  outcome: z.enum(['accepted', 'refused']),
  response: z.object({ reason: z.string().optional() }).loose(),
});

const uniqueViolationSchema = z.object({ code: z.literal('23505') });

export interface GesturesOptions {
  readonly db: Database;
  readonly rights: GestureRights;
  /** Registre hétérogène : les méthodes d'un traitement sont bivariantes, chaque geste y entre. */
  readonly handlers: readonly GestureHandler<AnyGestureDefinition>[];
}

/**
 * Déclare une route `POST` par geste et leur applique les règles de la fiche 0019 : identifiant de
 * geste enregistré sous contrainte d'unicité, rejeu qui rend le premier résultat, droits et périmètre
 * contrôlés avant tout effet, refus typé qui produit un événement, une transaction par geste.
 */
export function registerGestures(app: FastifyInstance, options: GesturesOptions): void {
  const { db, rights } = options;

  async function storedResponse(
    gestureId: string,
    userId: string,
  ): Promise<StoredResponse | 'foreign' | undefined> {
    const row = await db
      .selectFrom('foundation.gesture')
      .select(['authorUserId', 'name', 'outcome', 'response'])
      .where('id', '=', gestureId)
      .executeTakeFirst();
    if (row === undefined) {
      return undefined;
    }
    const stored = storedGestureSchema.parse(row);
    if (stored.authorUserId !== userId) {
      return 'foreign';
    }
    const status = stored.outcome === 'accepted' ? 200 : refusalStatus(stored.response.reason ?? '');
    return { status, body: stored.response };
  }

  function send(reply: FastifyReply, response: StoredResponse): FastifyReply {
    return reply.code(response.status).send(response.body);
  }

  function refusalBody(reason: string, details: RefusalDetails | undefined) {
    return details === undefined
      ? { outcome: 'refused' as const, reason }
      : { outcome: 'refused' as const, reason, details };
  }

  /** Enregistre un refus et son événement, dans une transaction à part : les effets sont annulés. */
  async function recordRefusal(
    name: string,
    gestureId: string,
    userId: string,
    workstationId: string | null,
    refusal: GestureRefusal,
    permission: Permission | null,
  ): Promise<StoredResponse> {
    const body = refusalBody(refusal.reason, refusal.details);
    const objects: [TraceObject, ...TraceObject[]] = [{ type: 'User', id: userId }, ...refusal.objects];
    try {
      await db.transaction().execute(async (transaction) => {
        await transaction
          .insertInto('foundation.gesture')
          .values({
            id: gestureId,
            name,
            authorUserId: userId,
            workstationId,
            outcome: 'refused',
            response: sql`${JSON.stringify(body)}::jsonb`,
          })
          .execute();
        await appendTraceEvent(transaction, {
          eventType: gestureRefusedEvent,
          data:
            refusal.reason === 'permissionDenied' && permission !== null
              ? { gesture: name, reason: refusal.reason, permission }
              : { gesture: name, reason: refusal.reason },
          author: { userId },
          objects,
          gestureId,
          ...(workstationId === null ? {} : { workstationId }),
        });
      });
    } catch (error) {
      if (uniqueViolationSchema.safeParse(error).success) {
        return replayed(gestureId, userId);
      }
      throw error;
    }
    return { status: refusalStatus(refusal.reason), body };
  }

  async function replayed(gestureId: string, userId: string): Promise<StoredResponse> {
    const stored = await storedResponse(gestureId, userId);
    if (stored === undefined || stored === 'foreign') {
      throw new Error(`gesture ${gestureId} vanished after a unique violation`);
    }
    return stored;
  }

  for (const handler of options.handlers) {
    const definition: AnyGestureDefinition = handler.definition;

    app.post(gesturePath(definition.name), async (request, reply) => {
      const unrecorded = (reason: 'invalidInput' | 'notAuthenticated') =>
        send(reply, { status: refusalStatus(reason), body: refusalBody(reason, undefined) });

      // Contre les requêtes forgées : l'en-tête de l'application, en plus du cookie (fiche 0027, règle 2).
      if (request.headers[APPLICATION_HEADER] !== APPLICATION_HEADER_VALUE) {
        return unrecorded('notAuthenticated');
      }
      const gestureId = gestureIdSchema.safeParse(request.headers[GESTURE_ID_HEADER]);
      if (!gestureId.success) {
        return unrecorded('invalidInput');
      }
      const { userId, workstationId } = await rights.resolveAuthor(request);
      if (userId === null) {
        return unrecorded('notAuthenticated');
      }

      // Un geste déjà reçu rend son premier résultat, sans rien réenregistrer (RG-EXI-007).
      const stored = await storedResponse(gestureId.data, userId);
      if (stored === 'foreign') {
        return unrecorded('invalidInput');
      }
      if (stored !== undefined) {
        return send(reply, stored);
      }

      const refuse = async (refusal: GestureRefusal) =>
        send(
          reply,
          await recordRefusal(
            definition.name,
            gestureId.data,
            userId,
            workstationId,
            refusal,
            definition.permission,
          ),
        );

      if (workstationId === null) {
        return refuse(new GestureRefusal('undeclaredWorkstation'));
      }
      const input = definition.input.safeParse(request.body);
      if (!input.success) {
        return refuse(new GestureRefusal('invalidInput'));
      }
      const author: GestureAuthor = { userId, workstationId };

      try {
        const body = await db.transaction().execute(async (transaction) => {
          const scope = handler.scope === undefined ? {} : await handler.scope(input.data, transaction);
          const denied = await rights.authorize(transaction, author, definition.permission, scope);
          if (denied !== undefined) {
            throw new GestureRefusal(denied);
          }
          const result: unknown = await handler.execute({
            transaction,
            author,
            gestureId: gestureId.data,
            input: input.data,
            appendEvent: (event) =>
              appendTraceEvent(transaction, {
                ...event,
                author: { userId },
                workstationId,
                gestureId: gestureId.data,
              }),
          });
          const accepted = { outcome: 'accepted' as const, result: definition.output.parse(result) };
          await transaction
            .insertInto('foundation.gesture')
            .values({
              id: gestureId.data,
              name: definition.name,
              authorUserId: userId,
              workstationId,
              outcome: 'accepted',
              response: sql`${JSON.stringify(accepted)}::jsonb`,
            })
            .execute();
          return accepted;
        });
        return await reply.code(200).send(body);
      } catch (error) {
        if (error instanceof GestureRefusal) {
          return refuse(error);
        }
        // Le même geste, reçu deux fois en même temps : le second attend le premier, puis le rend.
        if (uniqueViolationSchema.safeParse(error).success) {
          return send(reply, await replayed(gestureId.data, userId));
        }
        throw error;
      }
    });
  }
}
