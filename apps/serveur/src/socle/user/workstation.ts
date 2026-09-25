import { createHmac, timingSafeEqual } from 'node:crypto';
import { sql } from 'kysely';
import { declareWorkstation } from '@cairn/contrat';
import type { Database } from '../database/index.js';
import { defineGestureHandler, GestureRefusal } from '../gesture/index.js';
import { defineTraceEventType } from '../trace-event/index.js';
import { z } from 'zod';
import { serializeCookie, WORKSTATION_COOKIE } from './cookie.js';

/** Durée du cookie de poste : le plafond des navigateurs, renouvelé à chaque ouverture de session. */
export const WORKSTATION_COOKIE_SECONDS = 400 * 24 * 60 * 60;

/**
 * Le cookie de poste porte l'identifiant du poste, signé : le même geste rejoué pose le même cookie,
 * sans qu'aucun secret ne soit gardé dans la réponse enregistrée.
 */
const sign = (secret: string, workstationId: string): string =>
  createHmac('sha256', secret).update(`workstation:${workstationId}`).digest('base64url');

export function workstationCookieValue(secret: string, workstationId: string): string {
  return `${workstationId}.${sign(secret, workstationId)}`;
}

export function workstationCookie(secret: string, workstationId: string): string {
  return serializeCookie(
    WORKSTATION_COOKIE,
    workstationCookieValue(secret, workstationId),
    WORKSTATION_COOKIE_SECONDS,
  );
}

export interface DeclaredWorkstation {
  readonly id: string;
  readonly name: string;
}

/** Le poste d'un cookie, s'il est bien signé et que le poste n'est pas révoqué. */
export async function resolveWorkstation(
  db: Database,
  secret: string,
  cookie: string | undefined,
): Promise<DeclaredWorkstation | undefined> {
  const [workstationId, signature] = cookie?.split('.') ?? [];
  if (workstationId === undefined || signature === undefined || !z.uuid().safeParse(workstationId).success) {
    return undefined;
  }
  const expected = Buffer.from(sign(secret, workstationId));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return undefined;
  }
  return db
    .selectFrom('foundation.workstation')
    .select(['id', 'name'])
    .where('id', '=', workstationId)
    .where('revoked', '=', false)
    .executeTakeFirst();
}

export const workstationDeclaredEvent = defineTraceEventType(
  'workstationDeclared',
  z.object({ name: z.string(), siteId: z.string() }),
);

/** Geste de déclaration d'un poste (fiche 0027, règle 4). */
export function declareWorkstationHandler(secret: string) {
  return defineGestureHandler({
    definition: declareWorkstation,
    allowUndeclaredWorkstation: true,
    scope: (input) => Promise.resolve({ siteId: input.siteId }),
    async execute({ transaction, input, appendEvent }) {
      const site = await transaction
        .selectFrom('foundation.site')
        .select('id')
        .where('id', '=', input.siteId)
        .executeTakeFirst();
      if (site === undefined) {
        throw new GestureRefusal('unknownSite');
      }
      const created = await transaction
        .insertInto('foundation.workstation')
        .values({ name: input.name, siteId: input.siteId })
        .onConflict((conflict) => conflict.expression(sql`lower(name)`).doNothing())
        .returning('id')
        .executeTakeFirst();
      if (created === undefined) {
        throw new GestureRefusal('workstationNameTaken', { name: input.name });
      }
      await appendEvent({
        eventType: workstationDeclaredEvent,
        data: { name: input.name, siteId: input.siteId },
        objects: [
          { type: 'Workstation', id: created.id },
          { type: 'Site', id: input.siteId },
        ],
      });
      return { workstationId: created.id };
    },
    respond(reply, result) {
      void reply.header('set-cookie', workstationCookie(secret, result.workstationId));
    },
  });
}
