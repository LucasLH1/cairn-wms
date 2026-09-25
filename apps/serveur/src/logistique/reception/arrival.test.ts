import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readObjectHistory } from '../../socle/trace-event/index.js';
import { openApplicationDatabase } from '../../test-support/database.js';
import {
  createCatalog,
  createDock,
  createSite,
  createUser,
  gesture,
  query,
  testApp,
  type TestUser,
} from '../../test-support/fixtures.js';

const db = openApplicationDatabase();
const { app, cookieSecret } = testApp(db);
afterAll(async () => {
  await db.destroy();
});

let siteId = '';
let chief: TestUser;
let dockOf: (siteId: string) => Promise<{ dockId: string; carrierId: string }>;

beforeAll(async () => {
  siteId = await createSite(db);
  chief = await createUser(db, app, cookieSecret, {
    permissions: ['openInboundArrival'],
    sites: [{ id: siteId, execution: true }],
  });
  dockOf = (site) => createDock(db, site);
});

const open = (dockId: string, carrierId: string | null) =>
  gesture(app, chief, 'openInboundArrival', { dockId, vehicleIdentification: 'AB-123-CD', carrierId });

describe("ouverture d'un arrivage (RG-REC-001, RG-EMP-046)", () => {
  it("occupe le quai : véhicule, transporteur, heure d'arrivée, et qui l'a ouvert", async () => {
    const { dockId, carrierId } = await dockOf(siteId);
    const before = Date.now();
    const opened = await open(dockId, carrierId);
    expect(opened.statusCode).toBe(200);
    const { inboundArrivalId } = opened.json<{ result: { inboundArrivalId: string } }>().result;

    const docks = await query(app, chief, 'listDocks', { siteId });
    const dock = docks
      .json<{ docks: { id: string; arrival: Record<string, unknown> | null }[] }>()
      .docks.find((candidate) => candidate.id === dockId);
    expect(dock?.arrival).toMatchObject({
      id: inboundArrivalId,
      vehicleIdentification: 'AB-123-CD',
      carrier: { id: carrierId },
      openedBy: 'Utilisateur de test',
    });
    expect(Date.parse(String(dock?.arrival?.['arrivedAt']))).toBeGreaterThanOrEqual(before - 1000);

    const [event] = await readObjectHistory(db, { type: 'InboundArrival', id: inboundArrivalId });
    expect(event?.type).toBe('inboundArrivalOpened');
    expect(JSON.stringify(event?.data)).not.toContain('AB-123-CD');
  });

  it('refuse un second véhicule sur un quai occupé, même au même instant', async () => {
    const { dockId } = await dockOf(siteId);
    const [first, second] = await Promise.all([open(dockId, null), open(dockId, null)]);
    const outcomes = [first, second].map((response) => response.json<{ outcome: string; reason?: string }>());
    expect(outcomes.filter((outcome) => outcome.outcome === 'accepted')).toHaveLength(1);
    expect(outcomes.find((outcome) => outcome.outcome === 'refused')?.reason).toBe('dockOccupied');
    const third = await open(dockId, null);
    expect(third.json()).toMatchObject({ reason: 'dockOccupied' });
  });

  it("refuse un transporteur qui n'en est pas un (RG-TRS-001)", async () => {
    const { dockId } = await dockOf(siteId);
    const catalog = await createCatalog(db);
    expect((await open(dockId, catalog.own.supplierId)).json()).toMatchObject({ reason: 'unknownCarrier' });
  });

  it("refuse un quai hors du périmètre d'exécution", async () => {
    const elsewhere = await createSite(db);
    const { dockId } = await dockOf(elsewhere);
    expect((await open(dockId, null)).json()).toMatchObject({ reason: 'outOfScope' });
  });
});
