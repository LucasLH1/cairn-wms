import { randomUUID } from 'node:crypto';
import { permissionCatalog } from '@cairn/contrat';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { openApplicationDatabase } from '../../test-support/database.js';
import {
  createCatalog,
  createSite,
  createUser,
  gesture,
  query,
  testApp,
  type TestUser,
} from '../../test-support/fixtures.js';

// Règles d'administration du module 0.1. Un seul administrateur des rôles dans ce fichier : c'est lui
// qu'éprouve RG-ORG-024. Aucun autre fichier de test ne donne la permission administerRoles.
const db = openApplicationDatabase();
const { app, cookieSecret } = testApp(db);
afterAll(async () => {
  await db.destroy();
});

let siteId = '';
let administrator: TestUser;
const refusal = async (name: string, payload: object) =>
  (await gesture(app, administrator, name, payload)).json<{
    outcome: string;
    reason?: string;
    details?: object;
  }>();
const accepted = async <Result>(name: string, payload: object) => {
  const response = (await gesture(app, administrator, name, payload)).json<{
    outcome: string;
    result: Result;
  }>();
  expect(response.outcome).toBe('accepted');
  return response.result;
};

beforeAll(async () => {
  siteId = await createSite(db);
  administrator = await createUser(db, app, cookieSecret, {
    permissions: [...permissionCatalog.settings],
    sites: [{ id: siteId, execution: true }],
  });
});

const address = {
  line1: '1 rue de l’Exemple',
  line2: null,
  postalCode: '00000',
  city: 'Ville fictive',
  countryCode: 'FR',
};
const code = () => `T${randomUUID().slice(0, 6).toUpperCase()}`;

describe('sites (RG-ORG-002, 009 ; parcours « Créer un site »)', () => {
  it("ne s'active qu'avec une adresse et une zone, et dit ce qui manque", async () => {
    const { siteId: created } = await accepted<{ siteId: string }>('saveSite', {
      siteId: null,
      code: code(),
      name: 'Site B',
      timeZone: 'Europe/Paris',
      address,
    });
    const detail = await query(app, administrator, 'getSite', { siteId: created });
    expect(detail.json()).toMatchObject({ site: { active: false, missingForActivation: ['zone'] } });
    expect(await refusal('setSiteActive', { siteId: created, active: true })).toMatchObject({
      reason: 'activationIncomplete',
    });
    await accepted('saveZone', {
      zoneId: null,
      siteId: created,
      code: 'RES',
      name: 'Réserve',
      purpose: 'storage',
      cohabitation: 'shared',
      principalId: null,
    });
    await accepted('setSiteActive', { siteId: created, active: true });
  });

  it('refuse de désactiver un site qui porte un flux en cours, en disant lequel (RG-ORG-009)', async () => {
    const catalog = await createCatalog(db);
    const manager = await createUser(db, app, cookieSecret, {
      permissions: ['createExpectedReceipt'],
      sites: [{ id: siteId, execution: true }],
    });
    await gesture(app, manager, 'createExpectedReceipt', {
      principalId: catalog.own.principalId,
      siteId,
      supplierId: catalog.own.supplierId,
      expectedArrivalDate: '2026-10-01',
      lines: [{ itemId: catalog.own.itemIds[0], quantity: 1 }],
    });
    const siteRefusal = await refusal('setSiteActive', { siteId, active: false });
    expect(siteRefusal.reason).toBe('activityRemaining');
    expect(siteRefusal.details).toHaveProperty('expectedReceipts');
    expect(
      await refusal('setPrincipalActive', { principalId: catalog.own.principalId, active: false }),
    ).toMatchObject({
      reason: 'activityRemaining',
    });
  });

  it('refuse une zone mono-donneur d’ordre sans réservataire (RG-ORG-011)', async () => {
    expect(
      await refusal('saveZone', {
        zoneId: null,
        siteId,
        code: code(),
        name: 'Zone réservée',
        purpose: 'storage',
        cohabitation: 'single',
        principalId: null,
      }),
    ).toMatchObject({ reason: 'principalRequired' });
  });

  it('ajoute les jours fériés du modèle national sans doublon (RG-ORG-032)', async () => {
    const holidays = (await query(app, administrator, 'listPublicHolidays', { year: 2027 })).json<{
      holidays: { day: string; label: string }[];
    }>().holidays;
    const closures = holidays.map((holiday) => ({ ...holiday, kind: 'publicHoliday' }));
    expect(await accepted<{ added: number }>('addSiteClosures', { siteId, closures })).toEqual({ added: 11 });
    expect(await accepted<{ added: number }>('addSiteClosures', { siteId, closures })).toEqual({ added: 0 });
  });
});

describe('donneurs d’ordre (RG-ORG-007, 017)', () => {
  it('ne désactive jamais le donneur d’ordre interne', async () => {
    const internal = await db
      .selectFrom('logistics.principal')
      .select('id')
      .where('internal', '=', true)
      .executeTakeFirstOrThrow();
    expect(await refusal('setPrincipalActive', { principalId: internal.id, active: false })).toMatchObject({
      reason: 'internalPrincipal',
    });
  });

  it('ne montre à un utilisateur restreint que ses donneurs d’ordre, et refuse les autres à la saisie', async () => {
    const catalog = await createCatalog(db);
    const restricted = await createUser(db, app, cookieSecret, {
      permissions: ['createExpectedReceipt'],
      sites: [{ id: siteId, execution: true }],
    });
    await accepted('setPrincipalRestrictions', {
      userId: restricted.id,
      principalIds: [catalog.own.principalId],
    });
    const visible = (await query(app, restricted, 'listPrincipals', {})).json<{
      principals: { id: string }[];
    }>().principals;
    expect(visible.map((principal) => principal.id)).toEqual([catalog.own.principalId]);
    const other = await gesture(app, restricted, 'createExpectedReceipt', {
      principalId: catalog.other.principalId,
      siteId,
      supplierId: catalog.other.supplierId,
      expectedArrivalDate: '2026-10-01',
      lines: [{ itemId: catalog.other.itemIds[0], quantity: 1 }],
    });
    expect(other.json()).toMatchObject({ reason: 'unknownPrincipal' });
  });
});

describe('utilisateurs, rôles, équipes (RG-ORG-021, 024 ; RG-SUR-009, 014, 017, 128)', () => {
  const newUser = (overrides: object = {}) =>
    accepted<{ userId: string }>('saveUser', {
      userId: null,
      displayName: 'Opérateur fictif',
      loginName: `op-${randomUUID()}`,
      email: null,
      password: 'mot-de-passe-fictif',
      roleIds: [],
      siteIds: [siteId],
      teamId: null,
      reportsToUserId: null,
      ...overrides,
    });

  it('refuse un rattachement hiérarchique qui ferait un cycle (RG-SUR-017)', async () => {
    const { userId: top } = await newUser();
    const { userId: below } = await newUser({ reportsToUserId: top });
    const detail = (await query(app, administrator, 'getUser', { userId: top })).json<{
      user: Record<string, unknown>;
    }>().user;
    expect(
      await refusal('saveUser', { ...detail, userId: top, password: null, reportsToUserId: below }),
    ).toMatchObject({ reason: 'hierarchyCycle' });
  });

  it('refuse une équipe d’un autre site, et ne désactive pas une équipe qui a des membres (RG-SUR-009, 014)', async () => {
    const elsewhere = await createSite(db);
    // L'administrateur n'agit pas sur l'autre site : l'équipe y est posée directement.
    const { id: foreign } = await db
      .insertInto('foundation.team')
      .values({ siteId: elsewhere, name: `Équipe ${randomUUID()}` })
      .returning('id')
      .executeTakeFirstOrThrow();
    expect(
      await refusal('saveUser', {
        userId: null,
        displayName: 'X',
        loginName: `x-${randomUUID()}`,
        email: null,
        password: 'mot-de-passe-fictif',
        roleIds: [],
        siteIds: [siteId],
        teamId: foreign,
        reportsToUserId: null,
      }),
    ).toMatchObject({ reason: 'teamOutsideSites' });
    const { teamId } = await accepted<{ teamId: string }>('saveTeam', {
      teamId: null,
      siteId,
      name: `Équipe ${randomUUID()}`,
      leadUserId: null,
    });
    await newUser({ teamId });
    expect(await refusal('setTeamActive', { teamId, active: false })).toMatchObject({
      reason: 'teamHasMembers',
    });
  });

  it("borne les sites d'exécution aux sites de rattachement, et nul ne modifie les siens (RG-SUR-026, 128)", async () => {
    const { userId } = await newUser();
    const elsewhere = await createSite(db);
    expect(await refusal('setExecutionSites', { userId, siteIds: [elsewhere] })).toMatchObject({
      reason: 'executionOutsideSites',
    });
    await accepted('setExecutionSites', { userId, siteIds: [siteId] });
    expect(await refusal('setExecutionSites', { userId: administrator.id, siteIds: [] })).toMatchObject({
      reason: 'ownExecutionSites',
    });
  });

  it('garde toujours un administrateur des rôles actif (RG-ORG-024)', async () => {
    const roles = (await query(app, administrator, 'listRoles', {})).json<{
      roles: { id: string; name: string; permissions: string[]; holderCount: number }[];
    }>().roles;
    const own = roles.find((role) => role.permissions.includes('administerRoles') && role.holderCount > 0);
    expect(own).toBeDefined();
    expect(
      await refusal('saveRole', {
        roleId: own?.id,
        name: own?.name,
        nature: 'operational',
        permissions: own?.permissions.filter((permission) => permission !== 'administerRoles'),
      }),
    ).toMatchObject({ reason: 'lastRoleAdministrator' });
    expect(await refusal('setUserActive', { userId: administrator.id, active: false })).toMatchObject({
      reason: 'lastRoleAdministrator',
    });
  });

  it('réserve les consultations d’administration à leur permission', async () => {
    const operator = await createUser(db, app, cookieSecret, {
      permissions: [],
      sites: [{ id: siteId, execution: true }],
    });
    expect((await query(app, operator, 'listUsers', {})).statusCode).toBe(403);
  });
});

describe('numérotation (RG-ORG-027)', () => {
  it("refuse une composition qui ne garantit pas l'unicité, en disant pourquoi", async () => {
    expect(
      await refusal('saveNumberingScheme', {
        objectType: 'ExpectedReceipt',
        segments: [{ kind: 'site' }, { kind: 'counter', width: 4 }],
      }),
    ).toMatchObject({ reason: 'numberingNotUnique', details: { problem: 'leadingLiteralRequired' } });
  });
});
