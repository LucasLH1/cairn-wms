import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { openApplicationDatabase } from '../../test-support/database.js';
import { createSite, createUser, gesture, testApp, type TestUser } from '../../test-support/fixtures.js';
import { readObjectHistory } from '../trace-event/index.js';

// Export d'une liste (RG-SUR-101, 102, fiche 0033) : l'écran écrit le fichier, le geste le trace.
const db = openApplicationDatabase();
const { app, cookieSecret } = testApp(db);
afterAll(async () => {
  await db.destroy();
});

let siteId: string;
let onWorkstation: TestUser;
let withoutWorkstation: TestUser;

beforeAll(async () => {
  siteId = await createSite(db);
  onWorkstation = await createUser(db, app, cookieSecret, {
    permissions: [],
    sites: [{ id: siteId, execution: false }],
  });
  withoutWorkstation = await createUser(db, app, cookieSecret, { permissions: [], sites: [] });
});

describe("export d'une liste", () => {
  it('produit un événement portant son auteur, la liste, ses lignes et le périmètre (RG-SUR-102)', async () => {
    const principalId = randomUUID();
    const response = await gesture(app, onWorkstation, 'recordListExport', {
      list: 'Références',
      rows: 12,
      siteId,
      principalId,
    });
    expect(response.statusCode).toBe(200);
    const [event] = await readObjectHistory(db, { type: 'User', id: onWorkstation.id });
    expect(event).toMatchObject({
      type: 'listExported',
      authorUserId: onWorkstation.id,
      data: { list: 'Références', rows: 12, siteId, principalId },
    });
    expect(event?.workstationId).not.toBeNull();
    // Le site et le donneur d'ordre exportés retrouvent l'export dans leur historique.
    expect((await readObjectHistory(db, { type: 'Principal', id: principalId }))[0]?.id).toBe(event?.id);
  });

  it("s'admet depuis un poste non déclaré : c'est une consultation emportée, pas une opération", async () => {
    const response = await gesture(app, withoutWorkstation, 'recordListExport', {
      list: 'Tiers',
      rows: 0,
      siteId: null,
      principalId: null,
    });
    expect(response.statusCode).toBe(200);
    const [event] = await readObjectHistory(db, { type: 'User', id: withoutWorkstation.id });
    expect(event).toMatchObject({
      type: 'listExported',
      authorUserId: withoutWorkstation.id,
      workstationId: null,
      data: { list: 'Tiers', rows: 0, siteId: null, principalId: null },
    });
  });
});
