import { randomBytes, randomUUID } from 'node:crypto';
import { APPLICATION_HEADER, APPLICATION_HEADER_VALUE, SESSION_PATH } from '@cairn/contrat';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';
import { applicationConnection, openApplicationDatabase } from '../../test-support/database.js';
import { createSite } from '../../test-support/fixtures.js';
import { SignalRelay } from '../signal/index.js';
import { hashPassword, WORKSTATION_COOKIE } from './index.js';

// Confort de développement : le compte d'administration local reçoit d'office un poste déclaré, sur
// localhost, et seulement si le .env le demande. Le produit n'en est pas touché.
const db = openApplicationDatabase();
afterAll(async () => {
  await db.destroy();
});

const password = 'mot-de-passe-fictif';
const adminLogin = `local-${randomUUID()}`;
const otherLogin = `other-${randomUUID()}`;
let workstationId = '';
let revokedId = '';

beforeAll(async () => {
  const siteId = await createSite(db);
  const hash = await hashPassword(password);
  for (const loginName of [adminLogin, otherLogin]) {
    await db
      .insertInto('foundation.user')
      .values({ loginName, displayName: 'Test', passwordHash: hash })
      .execute();
  }
  workstationId = (
    await db
      .insertInto('foundation.workstation')
      .values({ name: `Poste ${randomUUID()}`, siteId })
      .returning('id')
      .executeTakeFirstOrThrow()
  ).id;
  revokedId = (
    await db
      .insertInto('foundation.workstation')
      .values({ name: `Poste ${randomUUID()}`, siteId, revoked: true })
      .returning('id')
      .executeTakeFirstOrThrow()
  ).id;
});

function appWith(auto: { loginName: string; workstationId: string } | undefined) {
  return buildApp({
    version: 'test',
    healthChecks: {},
    services: {
      db,
      relay: new SignalRelay(applicationConnection()),
      access: {
        cookieSecret: randomBytes(32).toString('base64url'),
        sessionIdleMinutes: 60,
        ...(auto === undefined ? {} : { devAutoWorkstation: auto }),
      },
    },
  });
}

async function workstationCookieAfterLogin(
  auto: { loginName: string; workstationId: string } | undefined,
  loginName: string,
  host = 'localhost:5173',
): Promise<boolean> {
  const response = await appWith(auto).inject({
    method: 'POST',
    url: SESSION_PATH,
    headers: { [APPLICATION_HEADER]: APPLICATION_HEADER_VALUE, host },
    payload: { loginName, password },
  });
  const header = response.headers['set-cookie'];
  return (Array.isArray(header) ? header : [header]).some((cookie) =>
    cookie?.startsWith(`${WORKSTATION_COOKIE}=`),
  );
}

describe('poste attribué d’office en développement', () => {
  it('ne fait rien sans la variable du .env', async () => {
    expect(await workstationCookieAfterLogin(undefined, adminLogin)).toBe(false);
  });

  it('attribue le poste au seul compte déclaré, sur localhost', async () => {
    const auto = { loginName: adminLogin, workstationId };
    expect(await workstationCookieAfterLogin(auto, adminLogin)).toBe(true);
    expect(await workstationCookieAfterLogin(auto, otherLogin)).toBe(false);
    expect(await workstationCookieAfterLogin(auto, adminLogin, 'cairn.example')).toBe(false);
  });

  it("n'attribue jamais un poste révoqué", async () => {
    expect(
      await workstationCookieAfterLogin({ loginName: adminLogin, workstationId: revokedId }, adminLogin),
    ).toBe(false);
  });
});
