import { randomUUID } from 'node:crypto';
import {
  APPLICATION_HEADER,
  APPLICATION_HEADER_VALUE,
  GESTURE_ID_HEADER,
  defineGesture,
  gesturePath,
} from '@cairn/contrat';
import Fastify from 'fastify';
import { afterAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { openApplicationDatabase } from '../../test-support/database.js';
import { defineTraceEventType, readObjectHistory } from '../trace-event/index.js';
import { defineGestureHandler, GestureRefusal, registerGestures, type GestureRights } from './index.js';

const db = openApplicationDatabase();
afterAll(async () => {
  await db.destroy();
});

const factRecorded = defineTraceEventType('testFactRecorded', z.object({ quantity: z.int() }));

const recordFact = defineGesture({
  name: 'recordTestFact',
  input: z.object({ subjectId: z.uuid(), quantity: z.int().positive() }),
  output: z.object({ eventId: z.string() }),
  permission: 'declareWorkstation',
  refusalReasons: ['quantityTooHigh'],
});

let executions = 0;

const recordFactHandler = defineGestureHandler({
  definition: recordFact,
  scope: () => Promise.resolve({ siteId: 'site-a' }),
  async execute({ input, appendEvent }) {
    executions += 1;
    const event = await appendEvent({
      eventType: factRecorded,
      data: { quantity: input.quantity },
      objects: [{ type: 'TestSubject', id: input.subjectId }],
    });
    // L'effet est écrit avant le refus : le refus doit l'annuler.
    if (input.quantity > 10) {
      throw new GestureRefusal('quantityTooHigh', { maximum: 10 });
    }
    return { eventId: event.id };
  },
});

/** Droits de test : l'identité vient d'en-têtes, les permissions d'une liste. */
const allowedUsers = new Set<string>();
const rights: GestureRights = {
  resolveAuthor: (request) => {
    const user = request.headers['x-test-user'];
    const workstation = request.headers['x-test-workstation'];
    return Promise.resolve({
      userId: typeof user === 'string' ? user : null,
      workstationId: typeof workstation === 'string' ? workstation : null,
    });
  },
  authorize: (_transaction, author, _permission, scope) =>
    Promise.resolve(
      !allowedUsers.has(author.userId)
        ? 'permissionDenied'
        : scope.siteId === 'site-a'
          ? undefined
          : 'outOfScope',
    ),
};

const app = Fastify();
registerGestures(app, { db, rights, handlers: [recordFactHandler] });

function newUser(allowed = true): string {
  const id = randomUUID();
  if (allowed) {
    allowedUsers.add(id);
  }
  return id;
}

function send(options: {
  user?: string;
  workstation?: string | null;
  gestureId?: string | null;
  application?: boolean;
  body: Record<string, unknown>;
}) {
  const headers: Record<string, string> = {};
  if (options.application !== false) headers[APPLICATION_HEADER] = APPLICATION_HEADER_VALUE;
  if (options.gestureId !== null) headers[GESTURE_ID_HEADER] = options.gestureId ?? randomUUID();
  if (options.user !== undefined) headers['x-test-user'] = options.user;
  if (options.workstation !== null) headers['x-test-workstation'] = options.workstation ?? randomUUID();
  return app.inject({
    method: 'POST',
    url: gesturePath('recordTestFact'),
    headers,
    payload: options.body,
  });
}

const history = (type: string, id: string) => readObjectHistory(db, { type, id });

describe('geste enregistré (fiche 0019)', () => {
  it('rend son résultat, et journalise son effet avec auteur, poste et geste', async () => {
    const user = newUser();
    const workstation = randomUUID();
    const gestureId = randomUUID();
    const subjectId = randomUUID();
    const response = await send({ user, workstation, gestureId, body: { subjectId, quantity: 3 } });
    expect(response.statusCode).toBe(200);
    const [event] = await history('TestSubject', subjectId);
    expect(response.json()).toEqual({ outcome: 'accepted', result: { eventId: event?.id } });
    expect(event).toMatchObject({ authorUserId: user, workstationId: workstation, gestureId });
  });

  it('reçu une seconde fois, rend le premier résultat sans rien réenregistrer (RG-EXI-007)', async () => {
    const user = newUser();
    const gestureId = randomUUID();
    const subjectId = randomUUID();
    const first = await send({ user, gestureId, body: { subjectId, quantity: 2 } });
    const before = executions;
    const again = await send({ user, gestureId, body: { subjectId, quantity: 2 } });
    // Le traitement n'est pas rejoué : aucun effet de bord, pas même annulé ensuite.
    expect(executions).toBe(before);
    expect(again.statusCode).toBe(200);
    expect(again.json()).toEqual(first.json());
    expect(await history('TestSubject', subjectId)).toHaveLength(1);
  });

  it("reçu deux fois au même instant, n'est enregistré qu'une fois", async () => {
    const user = newUser();
    const gestureId = randomUUID();
    const subjectId = randomUUID();
    const responses = await Promise.all(
      [1, 2, 3].map(() => send({ user, gestureId, body: { subjectId, quantity: 1 } })),
    );
    // Même contenu ; l'ordre des clés d'une réponse rejouée suit le stockage jsonb.
    const [first, ...others] = responses.map((response) => response.json<unknown>());
    for (const other of others) expect(other).toEqual(first);
    expect(responses.map((response) => response.statusCode)).toEqual([200, 200, 200]);
    expect(await history('TestSubject', subjectId)).toHaveLength(1);
  });

  it("ne rend jamais le résultat d'un geste à un autre utilisateur", async () => {
    const gestureId = randomUUID();
    await send({ user: newUser(), gestureId, body: { subjectId: randomUUID(), quantity: 1 } });
    const response = await send({
      user: newUser(),
      gestureId,
      body: { subjectId: randomUUID(), quantity: 1 },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ outcome: 'refused', reason: 'invalidInput' });
  });
});

describe('refus typés (fiche 0019, règles 3 et 4)', () => {
  it("refuse sans l'en-tête de l'application, et n'enregistre rien", async () => {
    const user = newUser();
    const response = await send({ user, application: false, body: { subjectId: randomUUID(), quantity: 1 } });
    expect(response.statusCode).toBe(401);
    expect(await history('User', user)).toEqual([]);
  });

  it('refuse sans identifiant de geste', async () => {
    const response = await send({ user: newUser(), gestureId: null, body: {} });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ outcome: 'refused', reason: 'invalidInput' });
  });

  it('refuse sans session', async () => {
    const response = await send({ body: { subjectId: randomUUID(), quantity: 1 } });
    expect(response.json()).toEqual({ outcome: 'refused', reason: 'notAuthenticated' });
  });

  it('refuse depuis un poste non déclaré, et trace le refus', async () => {
    const user = newUser();
    const response = await send({ user, workstation: null, body: { subjectId: randomUUID(), quantity: 1 } });
    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ outcome: 'refused', reason: 'undeclaredWorkstation' });
    const [event] = await history('User', user);
    expect(event).toMatchObject({ type: 'gestureRefused', data: { reason: 'undeclaredWorkstation' } });
  });

  it('refuse une entrée hors schéma, et trace le refus', async () => {
    const user = newUser();
    const response = await send({ user, body: { subjectId: 'pas-un-uuid', quantity: 1 } });
    expect(response.statusCode).toBe(400);
    expect((await history('User', user))[0]?.data).toEqual({
      gesture: 'recordTestFact',
      reason: 'invalidInput',
    });
  });

  it('contrôle la permission avant tout effet, et trace la permission manquante (RG-ORG-022)', async () => {
    const user = newUser(false);
    const before = executions;
    const response = await send({ user, body: { subjectId: randomUUID(), quantity: 1 } });
    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ outcome: 'refused', reason: 'permissionDenied' });
    expect(executions).toBe(before);
    expect((await history('User', user))[0]?.data).toEqual({
      gesture: 'recordTestFact',
      reason: 'permissionDenied',
      permission: 'declareWorkstation',
    });
  });

  it('annule les effets du geste refusé par son traitement, et rejoue le refus (RG-EXI-011)', async () => {
    const user = newUser();
    const gestureId = randomUUID();
    const subjectId = randomUUID();
    const response = await send({ user, gestureId, body: { subjectId, quantity: 11 } });
    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      outcome: 'refused',
      reason: 'quantityTooHigh',
      details: { maximum: 10 },
    });
    expect(await history('TestSubject', subjectId)).toEqual([]);
    expect(await history('User', user)).toHaveLength(1);

    const again = await send({ user, gestureId, body: { subjectId, quantity: 11 } });
    expect(again.statusCode).toBe(409);
    expect(again.json()).toEqual(response.json());
    expect(await history('User', user)).toHaveLength(1);
  });
});
