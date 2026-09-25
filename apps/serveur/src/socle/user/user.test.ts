import { randomBytes, randomUUID } from 'node:crypto';
import {
  APPLICATION_HEADER,
  APPLICATION_HEADER_VALUE,
  GESTURE_ID_HEADER,
  gesturePath,
  SESSION_CLOSE_PATH,
  SESSION_PATH,
} from '@cairn/contrat';
import { sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';
import {
  applicationConnection,
  openAdminDatabase,
  openApplicationDatabase,
} from '../../test-support/database.js';
import { SignalRelay } from '../signal/index.js';
import { readObjectHistory } from '../trace-event/index.js';
import { hashPassword, SESSION_COOKIE, verifyPassword, WORKSTATION_COOKIE } from './index.js';

const db = openApplicationDatabase();
const admin = openAdminDatabase();
const access = { cookieSecret: randomBytes(32).toString('base64url'), sessionIdleMinutes: 60 };
const relay = new SignalRelay(applicationConnection());
const app = buildApp({ version: 'test', healthChecks: {}, services: { db, access, relay } });

afterAll(async () => {
  await Promise.all([db.destroy(), admin.destroy()]);
});

// Valeurs fictives, propres à ce test.
const password = 'mot-de-passe-fictif';
const suffix = randomUUID().slice(0, 8);
let siteId = '';
let otherSiteId = '';
const users = { administrator: '', operator: '', inactive: '', throttled: '' };

beforeAll(async () => {
  const hash = await hashPassword(password);
  const createSite = async (code: string) => {
    const site = await db
      .insertInto('foundation.site')
      .values({ code: `${code}-${suffix}`, name: `Site ${code}`, timeZone: 'Europe/Paris' })
      .returning('id')
      .executeTakeFirstOrThrow();
    return site.id;
  };
  siteId = await createSite('A');
  otherSiteId = await createSite('B');
  const role = await db
    .insertInto('foundation.role')
    .values({ name: `Administrateur ${suffix}`, nature: 'administrative' })
    .returning('id')
    .executeTakeFirstOrThrow();
  await db
    .insertInto('foundation.rolePermission')
    .values({ roleId: role.id, permission: 'declareWorkstation' })
    .execute();
  for (const name of ['administrator', 'operator', 'inactive', 'throttled'] as const) {
    const user = await db
      .insertInto('foundation.user')
      .values({
        loginName: `${name}-${suffix}`,
        displayName: name,
        passwordHash: hash,
        active: name !== 'inactive',
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    users[name] = user.id;
    await db.insertInto('foundation.userSite').values({ userId: user.id, siteId, execution: true }).execute();
  }
  await db
    .insertInto('foundation.userRole')
    .values({ userId: users.administrator, roleId: role.id })
    .execute();
  await db
    .insertInto('foundation.userSite')
    .values({ userId: users.administrator, siteId: otherSiteId, execution: false })
    .execute();
});

const applicationHeaders = { [APPLICATION_HEADER]: APPLICATION_HEADER_VALUE };

function cookieFrom(response: { headers: Record<string, unknown> }, name: string): string | undefined {
  const header = response.headers['set-cookie'];
  const all = Array.isArray(header) ? header : [header];
  const found = all.find(
    (cookie): cookie is string => typeof cookie === 'string' && cookie.startsWith(`${name}=`),
  );
  return found;
}

const valueOf = (cookie: string | undefined) => cookie?.split(';')[0];

async function login(user: keyof typeof users, secret = password) {
  return app.inject({
    method: 'POST',
    url: SESSION_PATH,
    headers: applicationHeaders,
    payload: { loginName: `${user}-${suffix}`, password: secret },
  });
}

async function sessionCookie(user: keyof typeof users): Promise<string> {
  const cookie = valueOf(cookieFrom(await login(user), SESSION_COOKIE));
  if (cookie === undefined) throw new Error('no session cookie');
  return cookie;
}

function declare(cookie: string, body: Record<string, unknown>, gestureId = randomUUID()) {
  return app.inject({
    method: 'POST',
    url: gesturePath('declareWorkstation'),
    headers: { ...applicationHeaders, [GESTURE_ID_HEADER]: gestureId, cookie },
    payload: body,
  });
}

describe('mots de passe (fiche 0027, règle 1)', () => {
  it("ne garde qu'une empreinte scrypt, et la vérifie", async () => {
    const hash = await hashPassword('secret-fictif');
    expect(hash).toMatch(/^scrypt\$131072\$8\$1\$/u);
    expect(hash).not.toContain('secret-fictif');
    expect(await verifyPassword('secret-fictif', hash)).toBe(true);
    expect(await verifyPassword('autre', hash)).toBe(false);
  });
});

describe('sessions (fiche 0027, règles 2 et 3)', () => {
  it('ouvre une session par un cookie protégé, et la lit', async () => {
    const response = await login('operator');
    expect(response.statusCode).toBe(200);
    const cookie = cookieFrom(response, SESSION_COOKIE);
    expect(cookie).toMatch(/HttpOnly/u);
    expect(cookie).toMatch(/Secure/u);
    expect(cookie).toMatch(/SameSite=Strict/u);
    const current = await app.inject({
      method: 'GET',
      url: SESSION_PATH,
      headers: { ...applicationHeaders, cookie: valueOf(cookie) },
    });
    expect(current.json()).toEqual({
      user: { id: users.operator, displayName: 'operator' },
      workstation: null,
      sites: [{ id: siteId, code: `A-${suffix}`, name: 'Site A', execution: true }],
      permissions: [],
    });
  });

  it("refuse sans distinguer un mauvais mot de passe d'un identifiant inconnu, ni un utilisateur désactivé", async () => {
    const wrong = await login('operator', 'faux');
    const unknown = await app.inject({
      method: 'POST',
      url: SESSION_PATH,
      headers: applicationHeaders,
      payload: { loginName: `personne-${suffix}`, password },
    });
    const inactive = await login('inactive');
    for (const response of [wrong, unknown, inactive]) {
      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({ outcome: 'refused', reason: 'invalidCredentials' });
    }
  });

  it('limite les tentatives : après cinq échecs, même le bon mot de passe est refusé', async () => {
    const loginName = `throttled-${suffix}`.toUpperCase();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await app.inject({
        method: 'POST',
        url: SESSION_PATH,
        headers: applicationHeaders,
        payload: { loginName, password: 'faux' },
      });
    }
    const blocked = await app.inject({
      method: 'POST',
      url: SESSION_PATH,
      headers: applicationHeaders,
      payload: { loginName, password },
    });
    expect(blocked.statusCode).toBe(429);
    expect(blocked.json()).toEqual({ outcome: 'refused', reason: 'tooManyAttempts' });
  });

  it("exige l'en-tête de l'application", async () => {
    const response = await app.inject({
      method: 'POST',
      url: SESSION_PATH,
      payload: { loginName: `operator-${suffix}`, password },
    });
    expect(response.statusCode).toBe(401);
  });

  it('révoque aussitôt une session fermée, et ne sert pas une session échue', async () => {
    const closed = await sessionCookie('operator');
    await app.inject({
      method: 'POST',
      url: SESSION_CLOSE_PATH,
      headers: { ...applicationHeaders, cookie: closed },
    });
    const expired = await sessionCookie('operator');
    await sql`update foundation.session set expires_at = now() - interval '1 second'
      where user_id = ${users.operator} and not revoked`.execute(admin);
    for (const cookie of [closed, expired]) {
      const response = await app.inject({
        method: 'GET',
        url: SESSION_PATH,
        headers: { ...applicationHeaders, cookie },
      });
      expect(response.statusCode).toBe(401);
    }
  });

  it("ne garde aucune date d'activité de l'utilisateur (RG-TRA-015)", async () => {
    const columns = await sql<{ name: string }>`
      select column_name as name from information_schema.columns
      where table_schema = 'foundation' and table_name in ('session', 'user')
        and data_type like 'timestamp%' and column_name <> 'expires_at'`.execute(db);
    expect(columns.rows).toEqual([]);
  });
});

describe('déclaration de poste (fiche 0027, règle 4)', () => {
  it('associe le navigateur au poste par un cookie durable, rejoué à l’identique', async () => {
    const session = await sessionCookie('administrator');
    const gestureId = randomUUID();
    const body = { name: `Poste Q1 ${suffix}`, siteId };
    const response = await declare(session, body, gestureId);
    expect(response.statusCode).toBe(200);
    const workstation = cookieFrom(response, WORKSTATION_COOKIE);
    expect(workstation).toMatch(/HttpOnly/u);

    const replay = await declare(session, body, gestureId);
    expect(cookieFrom(replay, WORKSTATION_COOKIE)).toBe(workstation);

    const current = await app.inject({
      method: 'GET',
      url: SESSION_PATH,
      headers: { ...applicationHeaders, cookie: `${session}; ${valueOf(workstation) ?? ''}` },
    });
    const { workstationId } = response.json<{ result: { workstationId: string } }>().result;
    expect(current.json()).toMatchObject({ workstation: { id: workstationId, name: body.name } });
    const [event] = await readObjectHistory(db, { type: 'Workstation', id: workstationId });
    expect(event).toMatchObject({
      type: 'workstationDeclared',
      authorUserId: users.administrator,
      workstationId: null,
    });
  });

  it('refuse un nom de poste déjà pris', async () => {
    const session = await sessionCookie('administrator');
    const body = { name: `Poste Q2 ${suffix}`, siteId };
    await declare(session, body);
    const again = await declare(session, { ...body, name: body.name.toUpperCase() });
    expect(again.json()).toEqual({
      outcome: 'refused',
      reason: 'workstationNameTaken',
      details: { name: body.name.toUpperCase() },
    });
  });

  it('refuse sans la permission, et hors du périmètre d’exécution', async () => {
    const operator = await declare(await sessionCookie('operator'), { name: `Poste X ${suffix}`, siteId });
    expect(operator.json()).toEqual({ outcome: 'refused', reason: 'permissionDenied' });
    const elsewhere = await declare(await sessionCookie('administrator'), {
      name: `Poste Y ${suffix}`,
      siteId: otherSiteId,
    });
    expect(elsewhere.json()).toEqual({ outcome: 'refused', reason: 'outOfScope' });
  });

  it('ignore un cookie de poste falsifié : aucun geste ordinaire ne passe', async () => {
    const session = await sessionCookie('administrator');
    // Un poste bien réel, mais une signature qui n'est pas celle de l'instance.
    const declared = await declare(session, { name: `Poste Z ${suffix}`, siteId });
    const { workstationId } = declared.json<{ result: { workstationId: string } }>().result;
    const forged = `${WORKSTATION_COOKIE}=${workstationId}.${randomBytes(32).toString('base64url')}`;
    const current = await app.inject({
      method: 'GET',
      url: SESSION_PATH,
      headers: { ...applicationHeaders, cookie: `${session}; ${forged}` },
    });
    expect(current.json()).toMatchObject({ workstation: null });
  });
});
