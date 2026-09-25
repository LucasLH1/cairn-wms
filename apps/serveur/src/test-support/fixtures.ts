import { randomBytes, randomUUID } from 'node:crypto';
import {
  APPLICATION_HEADER,
  APPLICATION_HEADER_VALUE,
  GESTURE_ID_HEADER,
  gesturePath,
  QUERY_INPUT_PARAMETER,
  queryPath,
  SESSION_PATH,
  type Permission,
} from '@cairn/contrat';
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { buildApp } from '../app.js';
import type { Database } from '../socle/database/index.js';
import { SignalRelay } from '../socle/signal/index.js';
import { hashPassword, workstationCookieValue, WORKSTATION_COOKIE } from '../socle/user/index.js';
import { applicationConnection } from './database.js';

/** Valeurs fictives, propres aux tests. */
export const TEST_PASSWORD = 'mot-de-passe-fictif';
let passwordHash: Promise<string> | undefined;

/** Une application complète sur la base des tests, avec un secret de cookie tiré au lancement. */
export function testApp(db: Database): { app: FastifyInstance; cookieSecret: string } {
  const cookieSecret = randomBytes(32).toString('base64url');
  const relay = new SignalRelay(applicationConnection());
  const app = buildApp({
    version: 'test',
    healthChecks: {},
    services: { db, access: { cookieSecret, sessionIdleMinutes: 60 }, relay },
  });
  return { app, cookieSecret };
}

export async function createSite(db: Database): Promise<string> {
  const site = await db
    .insertInto('foundation.site')
    .values({ code: `S-${randomUUID().slice(0, 8)}`, name: 'Site de test', timeZone: 'Europe/Paris' })
    .returning('id')
    .executeTakeFirstOrThrow();
  const workstation = await db
    .insertInto('foundation.workstation')
    .values({ name: `Poste ${randomUUID()}`, siteId: site.id })
    .returning('id')
    .executeTakeFirstOrThrow();
  workstations.set(site.id, workstation.id);
  return site.id;
}
const workstations = new Map<string, string>();

export interface TestUser {
  readonly id: string;
  /** En-têtes d'un navigateur connecté, sur un poste déclaré du site. */
  readonly headers: Record<string, string>;
}

/** Un utilisateur, ses permissions, ses sites (`execution` : il y agit), et sa session ouverte. */
export async function createUser(
  db: Database,
  app: FastifyInstance,
  cookieSecret: string,
  options: { permissions: readonly Permission[]; sites: readonly { id: string; execution: boolean }[] },
): Promise<TestUser> {
  passwordHash ??= hashPassword(TEST_PASSWORD);
  const loginName = `u-${randomUUID()}`;
  const user = await db
    .insertInto('foundation.user')
    .values({ loginName, displayName: 'Utilisateur de test', passwordHash: await passwordHash })
    .returning('id')
    .executeTakeFirstOrThrow();
  if (options.permissions.length > 0) {
    const role = await db
      .insertInto('foundation.role')
      .values({ name: `Rôle ${randomUUID()}`, nature: 'operational' })
      .returning('id')
      .executeTakeFirstOrThrow();
    await db
      .insertInto('foundation.rolePermission')
      .values(options.permissions.map((permission) => ({ roleId: role.id, permission })))
      .execute();
    await db.insertInto('foundation.userRole').values({ userId: user.id, roleId: role.id }).execute();
  }
  if (options.sites.length > 0) {
    await db
      .insertInto('foundation.userSite')
      .values(options.sites.map((site) => ({ userId: user.id, siteId: site.id, execution: site.execution })))
      .execute();
  }
  const login = await app.inject({
    method: 'POST',
    url: SESSION_PATH,
    headers: { [APPLICATION_HEADER]: APPLICATION_HEADER_VALUE },
    payload: { loginName, password: TEST_PASSWORD },
  });
  const header = login.headers['set-cookie'];
  const session = (Array.isArray(header) ? header[0] : header)?.split(';')[0] ?? '';
  const workstationId = workstations.get(options.sites[0]?.id ?? '');
  const workstation =
    workstationId === undefined
      ? ''
      : `; ${WORKSTATION_COOKIE}=${workstationCookieValue(cookieSecret, workstationId)}`;
  return {
    id: user.id,
    headers: { [APPLICATION_HEADER]: APPLICATION_HEADER_VALUE, cookie: `${session}${workstation}` },
  };
}

export function gesture(
  app: FastifyInstance,
  user: TestUser,
  name: string,
  payload: object,
): Promise<LightMyRequestResponse> {
  return app.inject({
    method: 'POST',
    url: gesturePath(name),
    headers: { ...user.headers, [GESTURE_ID_HEADER]: randomUUID() },
    payload,
  });
}

export function query(
  app: FastifyInstance,
  user: TestUser,
  name: string,
  input: object,
): Promise<LightMyRequestResponse> {
  const parameter = encodeURIComponent(JSON.stringify(input));
  return app.inject({
    method: 'GET',
    url: `${queryPath(name)}?${QUERY_INPUT_PARAMETER}=${parameter}`,
    headers: user.headers,
  });
}

/** Un donneur d'ordre, son fournisseur, deux références ; un autre donneur d'ordre et les siens. */
export async function createCatalog(db: Database) {
  const create = async () => {
    const suffix = randomUUID().slice(0, 8);
    const principal = await db
      .insertInto('logistics.principal')
      .values({ code: `P-${suffix}`, name: `Donneur ${suffix}` })
      .returning('id')
      .executeTakeFirstOrThrow();
    const supplier = await db
      .insertInto('logistics.party')
      .values({ family: 'supplier', principalId: principal.id, code: 'F', name: 'Fournisseur' })
      .returning('id')
      .executeTakeFirstOrThrow();
    const items = await db
      .insertInto('logistics.item')
      .values(
        ['A', 'B', 'C'].map((code) => ({
          principalId: principal.id,
          code,
          shortLabel: `Référence ${code}`,
          trackingMode: 'quantity',
          state: code === 'C' ? 'obsolete' : 'active',
        })),
      )
      .returning('id')
      .execute();
    return { principalId: principal.id, supplierId: supplier.id, itemIds: items.map((item) => item.id) };
  };
  return { own: await create(), other: await create() };
}
