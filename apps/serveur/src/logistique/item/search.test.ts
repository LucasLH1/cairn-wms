import { randomUUID } from 'node:crypto';
import type { SearchResult } from '@cairn/contrat';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { openApplicationDatabase } from '../../test-support/database.js';
import {
  createCatalog,
  createSite,
  createUser,
  query,
  testApp,
  type TestUser,
} from '../../test-support/fixtures.js';

// Recherche (RG-SUR-059 à 064), telle que les références y entrent : un utilisateur restreint à un
// donneur d'ordre, deux donneurs d'ordre qui emploient les mêmes codes.
const db = openApplicationDatabase();
const { app, cookieSecret } = testApp(db);
afterAll(async () => {
  await db.destroy();
});

let own: Awaited<ReturnType<typeof createCatalog>>['own'];
let other: Awaited<ReturnType<typeof createCatalog>>['other'];
let restricted: TestUser;
const barcode = `LECTURE-${randomUUID().slice(0, 8)}`;

beforeAll(async () => {
  const siteId = await createSite(db);
  ({ own, other } = await createCatalog(db));
  restricted = await createUser(db, app, cookieSecret, {
    permissions: ['manageItems'],
    sites: [{ id: siteId, execution: true }],
  });
  await db
    .insertInto('logistics.userPrincipalRestriction')
    .values({ userId: restricted.id, principalId: own.principalId })
    .execute();
  await db
    .insertInto('logistics.itemBarcode')
    .values({
      principalId: own.principalId,
      code: barcode,
      itemId: own.itemIds[0] ?? '',
      nature: 'gtin',
      active: false,
    })
    .execute();
});

const found = async (text: string) =>
  (await query(app, restricted, 'search', { text })).json<{ results: SearchResult[] }>().results;

describe('recherche des références', () => {
  it('retrouve une référence par un identifiant désactivé, et le dit (RG-REF-008, 010)', async () => {
    expect(await found(barcode)).toEqual([
      expect.objectContaining({
        type: 'item',
        id: own.itemIds[0],
        code: 'A',
        exact: true,
        inactiveCode: true,
      }),
    ]);
  });

  it('signale sans son contenu la référence d’un donneur d’ordre hors du périmètre (RG-SUR-064)', async () => {
    const results = (await found('A')).filter((result) => result.exact && result.type === 'item');
    const outside = results.find((result) => result.id === other.itemIds[0]);
    expect(outside).toMatchObject({ outOfScope: true, code: null, label: null });
    expect(results.find((result) => result.id === own.itemIds[0])).toMatchObject({
      outOfScope: false,
      code: 'A',
    });
  });

  it('ne livre rien par fragment hors du périmètre, et ne connaît pas un code inconnu (RG-SUR-063)', async () => {
    const results = await found('Référence');
    expect(results.some((result) => result.id === other.itemIds[1])).toBe(false);
    expect(await found(`INCONNU-${randomUUID()}`)).toEqual([]);
    // Les jokers se cherchent tels quels.
    expect((await found('%')).filter((result) => result.type === 'item')).toEqual([]);
  });
});
