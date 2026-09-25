import { randomBytes, randomUUID } from 'node:crypto';
import {
  APPLICATION_HEADER,
  APPLICATION_HEADER_VALUE,
  changeSignalSchema,
  SESSION_PATH,
  SIGNALS_PATH,
  type ChangeSignal,
} from '@cairn/contrat';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';
import { applicationConnection, openApplicationDatabase } from '../../test-support/database.js';
import { hashPassword } from '../user/index.js';
import { SignalRelay, signalChange, UNAUTHENTICATED_CLOSE } from './index.js';

const db = openApplicationDatabase();
const relay = new SignalRelay(applicationConnection());
const access = { cookieSecret: randomBytes(32).toString('base64url'), sessionIdleMinutes: 60 };
const app = buildApp({ version: 'test', healthChecks: {}, services: { db, access, relay } });
let base = '';
let cookie = '';

beforeAll(async () => {
  await relay.start();
  const address = await app.listen({ host: '127.0.0.1', port: 0 });
  base = address.replace(/^http/u, 'ws');
  const loginName = `signal-${randomUUID()}`;
  await db
    .insertInto('foundation.user')
    .values({ loginName, displayName: 'Signal', passwordHash: await hashPassword('mot-de-passe-fictif') })
    .execute();
  const login = await app.inject({
    method: 'POST',
    url: SESSION_PATH,
    headers: { [APPLICATION_HEADER]: APPLICATION_HEADER_VALUE },
    payload: { loginName, password: 'mot-de-passe-fictif' },
  });
  const header = login.headers['set-cookie'];
  cookie = (Array.isArray(header) ? header[0] : header)?.split(';')[0] ?? '';
});

afterAll(async () => {
  await app.close();
  await relay.stop();
  await db.destroy();
});

/** Ouvre le canal, s'abonne, et recueille les signaux reçus. */
async function connect(subscribe: { objectType: string; objectId?: string }[], withSession = true) {
  const received: ChangeSignal[] = [];
  const socket = new WebSocket(`${base}${SIGNALS_PATH}`, { headers: withSession ? { cookie } : {} });
  const closed = new Promise<number>((resolve) => {
    socket.addEventListener('close', (event) => {
      resolve(event.code);
    });
  });
  socket.addEventListener('message', (event) => {
    received.push(changeSignalSchema.parse(JSON.parse(String(event.data))));
  });
  await new Promise((resolve) => {
    socket.addEventListener('open', resolve);
  });
  socket.send(JSON.stringify({ subscribe }));
  // Laisse au serveur le temps d'appliquer l'abonnement.
  await new Promise((resolve) => setTimeout(resolve, 100));
  return { socket, received, closed };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 300));

async function commit(signal: ChangeSignal): Promise<void> {
  await db.transaction().execute((transaction) => signalChange(transaction, signal));
}

describe('canal temps réel (fiche 0026)', () => {
  it('ferme une connexion sans session', async () => {
    const { closed } = await connect([], false);
    expect(await closed).toBe(UNAUTHENTICATED_CLOSE);
  });

  it("ne relaie que les signaux des objets suivis, et rien d'autre que type, identifiant, version", async () => {
    const followed = randomUUID();
    const { socket, received } = await connect([{ objectType: 'TestSubject', objectId: followed }]);
    await commit({ objectType: 'TestSubject', objectId: followed, version: 2 });
    await commit({ objectType: 'TestSubject', objectId: randomUUID(), version: 1 });
    await commit({ objectType: 'OtherSubject', objectId: followed, version: 1 });
    await settle();
    expect(received).toEqual([{ objectType: 'TestSubject', objectId: followed, version: 2 }]);
    socket.close();
  });

  it('relaie tout un type pour une liste affichée', async () => {
    const type = `List${randomUUID().slice(0, 8)}`;
    const { socket, received } = await connect([{ objectType: type }]);
    await commit({ objectType: type, objectId: 'a', version: 1 });
    await commit({ objectType: type, objectId: 'b', version: 1 });
    await settle();
    expect(received.map((signal) => signal.objectId)).toEqual(['a', 'b']);
    socket.close();
  });

  it('ne signale rien pour une transaction annulée (règle 1)', async () => {
    const objectId = randomUUID();
    const { socket, received } = await connect([{ objectType: 'TestSubject', objectId }]);
    await expect(
      db.transaction().execute(async (transaction) => {
        await signalChange(transaction, { objectType: 'TestSubject', objectId, version: 1 });
        throw new Error('geste refusé');
      }),
    ).rejects.toThrow('geste refusé');
    await settle();
    expect(received).toEqual([]);
    socket.close();
  });
});
