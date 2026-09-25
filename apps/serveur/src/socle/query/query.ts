import {
  APPLICATION_HEADER,
  APPLICATION_HEADER_VALUE,
  QUERY_INPUT_PARAMETER,
  queryPath,
  type QueryDefinition,
} from '@cairn/contrat';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { Database } from '../database/index.js';

/** Définition de consultation quelconque, pour un registre qui en tient plusieurs. */
type AnyQueryDefinition = QueryDefinition<string, z.ZodType, z.ZodType>;

/** Ce que le traitement d'une consultation reçoit. */
export interface QueryContext<Input> {
  readonly db: Database;
  readonly userId: string;
  readonly input: Input;
}

export interface QueryHandler<Definition extends AnyQueryDefinition> {
  readonly definition: Definition;
  /** Méthode, donc bivariante : un registre de consultations hétérogènes les accepte toutes. */
  execute(context: QueryContext<z.infer<Definition['input']>>): Promise<z.infer<Definition['output']>>;
}

export function defineQueryHandler<Definition extends AnyQueryDefinition>(
  handler: QueryHandler<Definition>,
): QueryHandler<Definition> {
  return handler;
}

/**
 * Refus d'une consultation. Un objet hors du périmètre et un objet inexistant se refusent de même :
 * la réponse ne dit pas ce qu'on ne peut pas voir (RG-EXI-050).
 */
export class QueryRefusal extends Error {
  constructor(readonly reason: 'outOfScope' | 'invalidInput') {
    super(`query refused: ${reason}`);
    this.name = 'QueryRefusal';
  }
}

export interface QueriesOptions {
  readonly db: Database;
  /** L'utilisateur de la session, ou `null`. */
  readonly resolveUser: (request: FastifyRequest) => Promise<string | null>;
  readonly handlers: readonly QueryHandler<AnyQueryDefinition>[];
}

const inputQuerySchema = z.object({ [QUERY_INPUT_PARAMETER]: z.string().optional() });

function parseInput(request: FastifyRequest): unknown {
  const raw = inputQuerySchema.safeParse(request.query);
  const text = raw.success ? raw.data[QUERY_INPUT_PARAMETER] : undefined;
  if (text === undefined) return {};
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/** Une route `GET` par consultation du contrat : lecture sans effet, avec la session (fiche 0019). */
export function registerQueries(app: FastifyInstance, options: QueriesOptions): void {
  for (const handler of options.handlers) {
    const definition: AnyQueryDefinition = handler.definition;
    app.get(queryPath(definition.name), async (request, reply) => {
      const refused = (status: number, reason: string) =>
        reply.code(status).send({ outcome: 'refused', reason });
      if (request.headers[APPLICATION_HEADER] !== APPLICATION_HEADER_VALUE) {
        return refused(401, 'notAuthenticated');
      }
      const userId = await options.resolveUser(request);
      if (userId === null) {
        return refused(401, 'notAuthenticated');
      }
      const input = definition.input.safeParse(parseInput(request));
      if (!input.success) {
        return refused(400, 'invalidInput');
      }
      try {
        const result: unknown = await handler.execute({ db: options.db, userId, input: input.data });
        return await reply.send(definition.output.parse(result));
      } catch (error) {
        if (error instanceof QueryRefusal) {
          return refused(error.reason === 'outOfScope' ? 403 : 400, error.reason);
        }
        throw error;
      }
    });
  }
}
