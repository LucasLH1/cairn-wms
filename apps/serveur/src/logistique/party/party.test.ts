import { randomUUID } from 'node:crypto';
import { permissionCatalog } from '@cairn/contrat';
import { sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runDueJobs } from '../../socle/job/index.js';
import { readObjectHistory } from '../../socle/trace-event/index.js';
import { applicationConnection, openApplicationDatabase } from '../../test-support/database.js';
import {
  createCatalog,
  createSite,
  createUser,
  gesture,
  query,
  testApp,
  type TestUser,
} from '../../test-support/fixtures.js';
import { anonymizeDueEndCustomersJob } from './index.js';

// Module 0.5 — tiers. Un gestionnaire des tiers d'un donneur d'ordre, un administrateur des tiers du
// prestataire, chacun avec ses seules permissions.
const db = openApplicationDatabase();
const { app, cookieSecret } = testApp(db);
afterAll(async () => {
  await db.destroy();
});

let principalId = '';
let manager: TestUser;
let providerAdmin: TestUser;

beforeAll(async () => {
  const siteId = await createSite(db);
  principalId = (await createCatalog(db)).own.principalId;
  manager = await createUser(db, app, cookieSecret, {
    permissions: [...permissionCatalog.partners],
    sites: [{ id: siteId, execution: true }],
  });
  providerAdmin = await createUser(db, app, cookieSecret, {
    permissions: ['administerProviderParties'],
    sites: [{ id: siteId, execution: true }],
  });
});

interface Outcome {
  readonly outcome: string;
  readonly reason?: string;
}
const run = async (user: TestUser, name: string, payload: object): Promise<Outcome> =>
  (await gesture(app, user, name, payload)).json<Outcome>();

const endCustomer = async (overrides: object = {}) =>
  (
    await gesture(app, manager, 'saveParty', {
      partyId: null,
      family: 'endCustomer',
      principalId,
      code: null,
      name: 'Client fictif',
      email: null,
      phone: null,
      subcontractingNature: null,
      issuesDestructionCertificate: false,
      ...overrides,
    })
  ).json<Outcome & { result: { partyId: string; code: string } }>();

describe('tiers et permissions (RG-TRS-001 à 006, 0.5 § 4)', () => {
  it('génère la clé d’un client final créé sans clé, et le marque à compléter (RG-TRS-012)', async () => {
    const created = await endCustomer();
    expect(created.outcome).toBe('accepted');
    expect(created.result.code).toMatch(/^CF-.+-\d{6}$/u);
    const detail = (await query(app, manager, 'getParty', { partyId: created.result.partyId })).json<{
      party: { toComplete: boolean };
    }>();
    expect(detail.party.toComplete).toBe(true);
  });

  it('réserve les transporteurs à leur administration, les clients finaux à leur gestion', async () => {
    const carrier = {
      partyId: null,
      family: 'carrier',
      principalId: null,
      code: `T${randomUUID().slice(0, 6)}`,
      name: 'Transporteur fictif',
      email: null,
      phone: null,
      subcontractingNature: null,
      issuesDestructionCertificate: false,
    };
    expect((await run(manager, 'saveParty', carrier)).reason).toBe('permissionDenied');
    expect((await run(providerAdmin, 'saveParty', carrier)).outcome).toBe('accepted');
    const customer = await run(providerAdmin, 'saveParty', {
      ...carrier,
      family: 'endCustomer',
      principalId,
      code: null,
    });
    expect(customer.reason).toBe('permissionDenied');
  });

  it("refuse un fournisseur sans donneur d'ordre, un transporteur avec (RG-TRS-002, 003)", async () => {
    const base = {
      partyId: null,
      code: 'X1',
      name: 'X',
      email: null,
      phone: null,
      subcontractingNature: null,
      issuesDestructionCertificate: false,
    };
    expect((await run(manager, 'saveParty', { ...base, family: 'supplier', principalId: null })).reason).toBe(
      'principalMismatch',
    );
    expect((await run(providerAdmin, 'saveParty', { ...base, family: 'carrier', principalId })).reason).toBe(
      'principalMismatch',
    );
  });
});

describe('adresses (RG-TRS-007 à 009)', () => {
  const address = (partyId: string, overrides: object = {}) =>
    run(manager, 'saveAddress', {
      addressId: null,
      partyId,
      usage: 'delivery',
      isDefault: true,
      recipient: null,
      line1: '3 rue Fictive',
      line2: null,
      postalCode: '75001',
      city: 'Ville fictive',
      countryCode: 'FR',
      ...overrides,
    });

  it('refuse un code postal hors du format du pays', async () => {
    const { result } = await endCustomer();
    expect((await address(result.partyId, { postalCode: '7500' })).reason).toBe('postalCodeFormat');
    expect((await address(result.partyId, { postalCode: '1012 AB', countryCode: 'NL' })).outcome).toBe(
      'accepted',
    );
  });

  it('garde une seule adresse par défaut par usage, et complète la fiche (RG-TRS-008)', async () => {
    const { result } = await endCustomer();
    await address(result.partyId);
    await address(result.partyId, { line1: '4 rue Fictive' });
    const detail = (await query(app, manager, 'getParty', { partyId: result.partyId })).json<{
      party: { toComplete: boolean; addresses: { isDefault: boolean; line1: string }[] };
    }>();
    expect(detail.party.addresses.filter((row) => row.isDefault).map((row) => row.line1)).toEqual([
      '4 rue Fictive',
    ]);
    expect(detail.party.toComplete).toBe(false);
  });
});

describe('fusion et anonymisation (RG-TRS-015 à 024)', () => {
  it('signale les doublons sans les fusionner, puis fusionne sur décision, l’absorbée en lecture seule', async () => {
    const name = `Doublon ${randomUUID()}`;
    const first = (await endCustomer({ name, email: 'doublon@exemple.invalid' })).result.partyId;
    const second = (await endCustomer({ name: name.toUpperCase() })).result.partyId;
    const pairs = (await query(app, manager, 'listEndCustomerDuplicates', { principalId })).json<{
      pairs: { first: { id: string }; second: { id: string } }[];
    }>().pairs;
    expect(
      pairs.some((pair) => [pair.first.id, pair.second.id].sort().join() === [first, second].sort().join()),
    ).toBe(true);

    expect(
      (
        await run(manager, 'mergeEndCustomers', {
          keptPartyId: second,
          absorbedPartyId: first,
          takeFromAbsorbed: ['email'],
        })
      ).outcome,
    ).toBe('accepted');
    const kept = (await query(app, manager, 'getParty', { partyId: second })).json<{
      party: { email: string | null };
    }>();
    expect(kept.party.email).toBe('doublon@exemple.invalid');
    expect(
      (
        await run(manager, 'saveParty', {
          partyId: first,
          family: 'endCustomer',
          principalId,
          code: null,
          name: 'Autre',
          email: null,
          phone: null,
          subcontractingNature: null,
          issuesDestructionCertificate: false,
        })
      ).reason,
    ).toBe('anonymizedParty');
  });

  it('anonymise à la demande, avec motif : identité effacée, événements intacts (RG-TRS-018, 019, 022)', async () => {
    const { result } = await endCustomer({ name: 'Personne fictive', email: 'personne@exemple.invalid' });
    const before = (await readObjectHistory(db, { type: 'Party', id: result.partyId })).length;
    expect(
      (await run(manager, 'anonymizeEndCustomer', { partyId: result.partyId, reason: 'Demande du client' }))
        .outcome,
    ).toBe('accepted');
    const party = await db
      .selectFrom('logistics.party')
      .selectAll()
      .where('id', '=', result.partyId)
      .executeTakeFirstOrThrow();
    expect([party.name, party.email, party.anonymizedAt === null]).toEqual(['', null, false]);
    expect((await readObjectHistory(db, { type: 'Party', id: result.partyId })).length).toBe(before + 1);
    expect(
      (await run(manager, 'anonymizeEndCustomer', { partyId: result.partyId, reason: 'x' })).reason,
    ).toBe('anonymizedParty');
  });

  it('anonymise à échéance les seuls clients dont la durée est échue et sans flux en cours (RG-TRS-017, 024)', async () => {
    const catalog = await createCatalog(db);
    await db
      .updateTable('logistics.principal')
      .set({ endCustomerRetentionMonths: 12 })
      .where('id', '=', catalog.own.principalId)
      .execute();
    const insert = async (lastFlow: string, name: string) =>
      (
        await db
          .insertInto('logistics.party')
          .values({
            family: 'endCustomer',
            principalId: catalog.own.principalId,
            code: `K-${randomUUID()}`,
            name,
            lastFlowAt: sql`${lastFlow}::timestamptz`,
          })
          .returning('id')
          .executeTakeFirstOrThrow()
      ).id;
    const due = await insert('2020-01-01T00:00:00Z', 'Échu');
    const busy = await insert('2020-01-01T00:00:00Z', 'Échu mais occupé');
    const recent = await insert(new Date().toISOString(), 'Récent');
    const job = anonymizeDueEndCustomersJob((_db, partyId) => Promise.resolve(partyId === busy ? 1 : 0));
    await db
      .transaction()
      .execute((transaction) =>
        sql`select graphile_worker.add_job('anonymizeDueEndCustomers', '{}'::json)`.execute(transaction),
      );
    await runDueJobs({ connection: applicationConnection(), db, jobs: [job] });
    const names = await db
      .selectFrom('logistics.party')
      .select(['id', 'name'])
      .where('id', 'in', [due, busy, recent])
      .execute();
    const byId = new Map(names.map((row) => [row.id, row.name]));
    expect([byId.get(due), byId.get(busy), byId.get(recent)]).toEqual(['', 'Échu mais occupé', 'Récent']);
  });
});
