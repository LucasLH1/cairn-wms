import { randomUUID } from 'node:crypto';
import {
  APPLICATION_HEADER,
  APPLICATION_HEADER_VALUE,
  defineQuery,
  QUERY_INPUT_PARAMETER,
  queryPath,
} from '@cairn/contrat';
import Fastify from 'fastify';
import { afterAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { openApplicationDatabase } from '../../test-support/database.js';
import { readObjectHistory } from '../trace-event/index.js';
import { defineQueryHandler, QueryRefusal, registerQueries } from './index.js';

const db = openApplicationDatabase();
afterAll(async () => {
  await db.destroy();
});

const readTestSubject = defineQuery({
  name: 'readTestSubject',
  input: z.object({ subjectId: z.uuid(), visible: z.boolean() }),
  output: z.object({ subjectId: z.uuid() }),
});

const app = Fastify();
registerQueries(app, {
  db,
  resolveUser: (request) => {
    const user = request.headers['x-test-user'];
    return Promise.resolve(typeof user === 'string' ? user : null);
  },
  handlers: [
    defineQueryHandler({
      definition: readTestSubject,
      execute: ({ input }) => {
        if (!input.visible) {
          throw new QueryRefusal('outOfScope', [{ type: 'TestSubject', id: input.subjectId }]);
        }
        return Promise.resolve({ subjectId: input.subjectId });
      },
    }),
  ],
});

const read = (user: string, input: object) =>
  app.inject({
    method: 'GET',
    url: `${queryPath('readTestSubject')}?${QUERY_INPUT_PARAMETER}=${encodeURIComponent(JSON.stringify(input))}`,
    headers: { [APPLICATION_HEADER]: APPLICATION_HEADER_VALUE, 'x-test-user': user },
  });

describe('consultation refusée pour cause de périmètre', () => {
  it("produit un événement attribué à l'utilisateur, qui désigne l'objet visé (RG-SUR-065, RG-TRA-005)", async () => {
    const user = randomUUID();
    const subjectId = randomUUID();
    const response = await read(user, { subjectId, visible: false });
    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ outcome: 'refused', reason: 'outOfScope' });
    const [event] = await readObjectHistory(db, { type: 'User', id: user });
    expect(event).toMatchObject({
      type: 'queryRefused',
      authorUserId: user,
      workstationId: null,
      gestureId: null,
      data: { query: 'readTestSubject', reason: 'outOfScope' },
    });
    expect((await readObjectHistory(db, { type: 'TestSubject', id: subjectId }))[0]?.id).toBe(event?.id);
  });

  it("n'en produit aucun quand la consultation est servie", async () => {
    const user = randomUUID();
    const response = await read(user, { subjectId: randomUUID(), visible: true });
    expect(response.statusCode).toBe(200);
    expect(await readObjectHistory(db, { type: 'User', id: user })).toEqual([]);
  });
});
