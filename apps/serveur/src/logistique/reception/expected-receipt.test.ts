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
import { readObjectHistory } from '../../socle/trace-event/index.js';

const db = openApplicationDatabase();
const { app, cookieSecret } = testApp(db);
afterAll(async () => {
  await db.destroy();
});

let siteId = '';
let otherSiteId = '';
let catalog: Awaited<ReturnType<typeof createCatalog>>;
let manager: TestUser;

beforeAll(async () => {
  siteId = await createSite(db);
  otherSiteId = await createSite(db);
  catalog = await createCatalog(db);
  manager = await createUser(db, app, cookieSecret, {
    permissions: ['createExpectedReceipt'],
    sites: [
      { id: siteId, execution: true },
      { id: otherSiteId, execution: false },
    ],
  });
});

const expected = (overrides: Record<string, unknown> = {}) => ({
  principalId: catalog.own.principalId,
  siteId,
  supplierId: catalog.own.supplierId,
  expectedArrivalDate: '2026-09-25',
  lines: [
    { itemId: catalog.own.itemIds[0], quantity: 100 },
    { itemId: catalog.own.itemIds[1], quantity: 40 },
  ],
  ...overrides,
});

describe("saisie d'un attendu (RG-REC-007 à 010, 014)", () => {
  it("ouvre l'attendu, numéroté, daté, son solde égal à la quantité attendue, parmi les ouverts du site", async () => {
    const created = await gesture(app, manager, 'createExpectedReceipt', expected());
    expect(created.statusCode).toBe(200);
    const { expectedReceiptId, number } = created.json<{
      result: { expectedReceiptId: string; number: string };
    }>().result;
    expect(number).toMatch(/^AT-\d{4,}$/u);

    const detail = await query(app, manager, 'getExpectedReceipt', { expectedReceiptId });
    expect(detail.json()).toMatchObject({
      expectedReceipt: {
        number,
        state: 'open',
        expectedArrivalDate: '2026-09-25',
        lines: [
          { lineNumber: 1, expectedQuantity: 100, servedQuantity: 0, remainingQuantity: 100 },
          { lineNumber: 2, expectedQuantity: 40, servedQuantity: 0, remainingQuantity: 40 },
        ],
      },
    });
    const open = await query(app, manager, 'listOpenExpectedReceipts', { siteId });
    expect(
      open.json<{ expectedReceipts: { id: string; lineCount: number }[] }>().expectedReceipts,
    ).toContainEqual(expect.objectContaining({ id: expectedReceiptId, lineCount: 2 }));
    const [event] = await readObjectHistory(db, { type: 'ExpectedReceipt', id: expectedReceiptId });
    expect(event).toMatchObject({ type: 'expectedReceiptCreated', authorUserId: manager.id });
  });

  it('numérote à la suite, sans jamais réattribuer (RG-ORG-028)', async () => {
    const numbers = [];
    for (let index = 0; index < 2; index += 1) {
      const created = await gesture(app, manager, 'createExpectedReceipt', expected());
      numbers.push(created.json<{ result: { number: string } }>().result.number);
    }
    const [first, second] = numbers.map((number) => Number(number.slice(3)));
    expect(second).toBe((first ?? 0) + 1);
  });

  const refusedWith = async (overrides: Record<string, unknown>) =>
    (await gesture(app, manager, 'createExpectedReceipt', expected(overrides))).json<{ reason: string }>()
      .reason;
  const line = (itemId: string | undefined) => ({ itemId, quantity: 1 });

  it('refuse une référence en double', async () => {
    const own = catalog.own.itemIds[0];
    expect(await refusedWith({ lines: [line(own), line(own)] })).toBe('duplicateItem');
  });

  it("refuse une référence d'un autre donneur d'ordre, ou obsolète (RG-REF-001, 006)", async () => {
    expect(await refusedWith({ lines: [line(catalog.other.itemIds[0])] })).toBe('unknownItem');
    expect(await refusedWith({ lines: [line(catalog.own.itemIds[2])] })).toBe('unknownItem');
  });

  it("refuse le fournisseur d'un autre donneur d'ordre (RG-TRS-002)", async () => {
    expect(await refusedWith({ supplierId: catalog.other.supplierId })).toBe('unknownSupplier');
  });

  it("refuse hors du périmètre d'exécution, et sans la permission", async () => {
    const elsewhere = await gesture(app, manager, 'createExpectedReceipt', expected({ siteId: otherSiteId }));
    expect(elsewhere.json()).toMatchObject({ reason: 'outOfScope' });
    const operator = await createUser(db, app, cookieSecret, {
      permissions: [],
      sites: [{ id: siteId, execution: true }],
    });
    const denied = await gesture(app, operator, 'createExpectedReceipt', expected());
    expect(denied.json()).toMatchObject({ reason: 'permissionDenied' });
  });

  it("ne montre pas les attendus d'un site hors de la visibilité (RG-EXI-050)", async () => {
    const stranger = await createUser(db, app, cookieSecret, { permissions: [], sites: [] });
    const list = await query(app, stranger, 'listOpenExpectedReceipts', { siteId });
    expect(list.statusCode).toBe(403);
    const created = await gesture(app, manager, 'createExpectedReceipt', expected());
    const { expectedReceiptId } = created.json<{ result: { expectedReceiptId: string } }>().result;
    const detail = await query(app, stranger, 'getExpectedReceipt', { expectedReceiptId });
    expect(detail.json()).toEqual({ outcome: 'refused', reason: 'outOfScope' });
  });
});
