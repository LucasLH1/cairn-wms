import { permissionCatalog } from '@cairn/contrat';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readObjectHistory } from '../../socle/trace-event/index.js';
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

// Module 0.2 — référentiel produit. Un gestionnaire du référentiel, un réceptionnaire qui ne crée que
// des brouillons à la volée.
const db = openApplicationDatabase();
const { app, cookieSecret } = testApp(db);
afterAll(async () => {
  await db.destroy();
});

let principalId = '';
let otherPrincipalId = '';
let otherItemId = '';
let manager: TestUser;
let receiver: TestUser;
let administrator: TestUser;

beforeAll(async () => {
  const siteId = await createSite(db);
  const catalog = await createCatalog(db);
  principalId = catalog.own.principalId;
  otherPrincipalId = catalog.other.principalId;
  otherItemId = catalog.other.itemIds[0] ?? '';
  const sites = [{ id: siteId, execution: true }];
  manager = await createUser(db, app, cookieSecret, { permissions: [...permissionCatalog.catalog], sites });
  receiver = await createUser(db, app, cookieSecret, { permissions: ['createDraftItem'], sites });
  administrator = await createUser(db, app, cookieSecret, { permissions: ['administerPrincipals'], sites });
});

interface Outcome<Result = Record<string, never>> {
  readonly outcome: string;
  readonly reason?: string;
  readonly details?: Record<string, string | number | boolean>;
  readonly result: Result;
}
const run = async <Result = Record<string, never>>(
  user: TestUser,
  name: string,
  payload: object,
): Promise<Outcome<Result>> => (await gesture(app, user, name, payload)).json<Outcome<Result>>();

let sequence = 0;
const newItem = async (overrides: object = {}) => {
  sequence += 1;
  const saved = await run<{ itemId: string }>(manager, 'saveItem', {
    itemId: null,
    principalId,
    code: `R-${String(sequence)}`,
    shortLabel: `Référence ${String(sequence)}`,
    longLabel: null,
    familyId: null,
    trackingMode: 'quantity',
    serialBatchTracking: false,
    tracksExpiryDate: false,
    tracksManufacturingDate: false,
    adr: null,
    isKit: false,
    ...overrides,
  });
  expect(saved.outcome).toBe('accepted');
  return saved.result.itemId;
};

interface Detail {
  readonly state: string;
  readonly activationMissing: string[];
  readonly declaredValueHistory: { valueCents: number | null; currency: string | null }[];
  readonly kitComponents: { code: string; quantity: number }[];
  readonly replacements: { code: string; state: string }[];
  readonly customValues: Record<string, unknown>;
}
const detail = async (itemId: string) =>
  (await query(app, manager, 'getItem', { itemId })).json<{ item: Detail }>().item;

const completeLevel = {
  name: 'Unité',
  unitsOfLowerLevel: null,
  grossWeightGrams: 120,
  lengthMm: 100,
  widthMm: 50,
  heightMm: 20,
};

describe('identité et états (RG-REF-001 à 006, 040)', () => {
  it('fait naître une référence en brouillon, et refuse un code déjà employé chez le même donneur d’ordre', async () => {
    const itemId = await newItem({ code: 'DOUBLON' });
    expect((await detail(itemId)).state).toBe('draft');
    const twice = await run(manager, 'saveItem', {
      itemId: null,
      principalId,
      code: 'DOUBLON',
      shortLabel: 'Autre',
      longLabel: null,
      familyId: null,
      trackingMode: 'quantity',
      serialBatchTracking: false,
      tracksExpiryDate: false,
      tracksManufacturingDate: false,
      adr: null,
      isKit: false,
    });
    expect(twice.reason).toBe('codeTaken');
    // Deux donneurs d'ordre emploient le même code sans conflit (RG-REF-002).
    const elsewhere = await run(manager, 'saveItem', {
      itemId: null,
      principalId: otherPrincipalId,
      code: 'DOUBLON',
      shortLabel: 'Autre',
      longLabel: null,
      familyId: null,
      trackingMode: 'quantity',
      serialBatchTracking: false,
      tracksExpiryDate: false,
      tracksManufacturingDate: false,
      adr: null,
      isKit: false,
    });
    expect(elsewhere.outcome).toBe('accepted');
  });

  it('fige le donneur d’ordre (RG-REF-001) et réserve le suivi par lot à la série (RG-REF-012)', async () => {
    const itemId = await newItem();
    const moved = await run(manager, 'saveItem', {
      itemId,
      principalId: otherPrincipalId,
      code: 'X',
      shortLabel: 'X',
      longLabel: null,
      familyId: null,
      trackingMode: 'quantity',
      serialBatchTracking: false,
      tracksExpiryDate: false,
      tracksManufacturingDate: false,
      adr: null,
      isKit: false,
    });
    expect(moved.reason).toBe('principalLocked');
    const batchOnQuantity = await run(manager, 'saveItem', {
      itemId: null,
      principalId,
      code: 'LOT-Q',
      shortLabel: 'X',
      longLabel: null,
      familyId: null,
      trackingMode: 'quantity',
      serialBatchTracking: true,
      tracksExpiryDate: false,
      tracksManufacturingDate: false,
      adr: null,
      isKit: false,
    });
    expect(batchOnQuantity.reason).toBe('batchTrackingSerialOnly');
    await newItem({ trackingMode: 'serial', serialBatchTracking: true });
  });

  it('n’active un brouillon qu’avec un conditionnement complet, un identifiant et ses champs obligatoires (RG-REF-040)', async () => {
    const field = await run<{ customFieldId: string }>(manager, 'saveCustomField', {
      customFieldId: null,
      principalId,
      label: `Couleur ${String(Date.now())}`,
      fieldType: 'list',
      listValues: ['Noir', 'Blanc'],
      required: true,
      active: true,
    });
    expect(field.outcome).toBe('accepted');
    const itemId = await newItem();
    expect((await detail(itemId)).activationMissing).toEqual([
      'requiredCustomFields',
      'completePackaging',
      'barcode',
    ]);
    const refused = await run(manager, 'changeItemState', { itemId, state: 'active' });
    expect(refused.reason).toBe('itemActivationIncomplete');
    expect(refused.details?.['missing']).toBe('requiredCustomFields,completePackaging,barcode');

    // Un niveau sans caractéristiques ne compte pas pour complet (RG-REF-020).
    await run(manager, 'saveItemPackaging', {
      itemId,
      levels: [{ ...completeLevel, grossWeightGrams: null }],
    });
    expect((await detail(itemId)).activationMissing).toContain('completePackaging');
    expect((await run(manager, 'saveItemPackaging', { itemId, levels: [completeLevel] })).outcome).toBe(
      'accepted',
    );
    const badValue = await run(manager, 'saveItemCustomValues', {
      itemId,
      values: [{ customFieldId: field.result.customFieldId, value: 'Rouge' }],
    });
    expect(badValue.reason).toBe('invalidCustomValue');
    await run(manager, 'saveItemCustomValues', {
      itemId,
      values: [{ customFieldId: field.result.customFieldId, value: 'Noir' }],
    });
    await run(manager, 'addItemBarcode', {
      itemId,
      code: `EAN-${itemId}`,
      nature: 'gtin',
      packagingRank: null,
    });
    expect((await detail(itemId)).activationMissing).toEqual([]);
    expect((await run(manager, 'changeItemState', { itemId, state: 'active' })).outcome).toBe('accepted');
    // Un brouillon ne revient pas : l'état brouillon ne s'obtient qu'à la création (RG-REF-005).
    expect((await run(manager, 'changeItemState', { itemId, state: 'obsolete' })).outcome).toBe('accepted');
    expect((await detail(itemId)).state).toBe('obsolete');
    // Le champ reste obligatoire pour les autres essais : on le retire, il n'est que désactivé.
    const removed = await run<{ removal: string; itemCount: number }>(manager, 'removeCustomField', {
      customFieldId: field.result.customFieldId,
    });
    expect(removed.result).toEqual({ removal: 'deactivated', itemCount: 1 });
    // Sa valeur reste lisible (RG-REF-037).
    expect((await detail(itemId)).customValues[field.result.customFieldId]).toBe('Noir');
  });

  it('supprime un champ que rien ne renseigne (RG-REF-037)', async () => {
    const field = await run<{ customFieldId: string }>(manager, 'saveCustomField', {
      customFieldId: null,
      principalId,
      label: `Gamme ${String(Date.now())}`,
      fieldType: 'text',
      listValues: [],
      required: false,
      active: true,
    });
    const removed = await run<{ removal: string }>(manager, 'removeCustomField', {
      customFieldId: field.result.customFieldId,
    });
    expect(removed.result.removal).toBe('deleted');
  });
});

describe('identifiants scannables (RG-REF-007 à 010, 022)', () => {
  it('refuse un code déjà attribué en nommant sa référence, et retrouve la référence par un code désactivé', async () => {
    const holder = await newItem({ code: 'PORTEUR' });
    await run(manager, 'saveItemPackaging', {
      itemId: holder,
      levels: [completeLevel, { ...completeLevel, name: 'Carton', unitsOfLowerLevel: 12 }],
    });
    expect(
      (
        await run(manager, 'addItemBarcode', {
          itemId: holder,
          code: '3000000000017',
          nature: 'gtin',
          packagingRank: 1,
        })
      ).outcome,
    ).toBe('accepted');
    const other = await newItem();
    const taken = await run(manager, 'addItemBarcode', {
      itemId: other,
      code: '3000000000017',
      nature: 'supplier',
      packagingRank: null,
    });
    expect(taken.reason).toBe('barcodeTaken');
    expect(taken.details?.['item']).toBe('PORTEUR');
    // Un niveau qui porte un identifiant ne disparaît pas sous lui.
    const removedLevel = await run(manager, 'saveItemPackaging', { itemId: holder, levels: [completeLevel] });
    expect(removedLevel.reason).toBe('barcodeOnRemovedLevel');

    await run(manager, 'setItemBarcodeActive', { itemId: holder, code: '3000000000017', active: false });
    const found = (
      await query(app, manager, 'findItemsByBarcode', { code: '3000000000017', principalId: null })
    ).json<{ matches: { itemCode: string; barcodeActive: boolean; packagingRank: number | null }[] }>();
    expect(found.matches).toEqual([
      expect.objectContaining({ itemCode: 'PORTEUR', barcodeActive: false, packagingRank: 1 }),
    ]);
  });

  it('rend chaque donneur d’ordre qui emploie un même code, sans deviner (0.2 § 5)', async () => {
    const own = await newItem();
    await run(manager, 'addItemBarcode', {
      itemId: own,
      code: 'PARTAGE-1',
      nature: 'free',
      packagingRank: null,
    });
    await run(manager, 'addItemBarcode', {
      itemId: otherItemId,
      code: 'PARTAGE-1',
      nature: 'free',
      packagingRank: null,
    });
    const found = (
      await query(app, manager, 'findItemsByBarcode', { code: 'PARTAGE-1', principalId: null })
    ).json<{ matches: { principalId: string }[] }>();
    expect(found.matches.map((match) => match.principalId).sort()).toEqual(
      [principalId, otherPrincipalId].sort(),
    );
  });
});

describe('création à la volée (RG-REF-038)', () => {
  it('crée un brouillon dont le code lu est l’identifiant scannable, avec la seule permission du réceptionnaire', async () => {
    const created = await run<{ itemId: string }>(receiver, 'createDraftItem', {
      principalId,
      code: 'SCAN-INCONNU-1',
      shortLabel: 'Inconnu scanné',
      trackingMode: 'serial',
    });
    expect(created.outcome).toBe('accepted');
    const item = (await query(app, receiver, 'getItem', { itemId: created.result.itemId })).json<{
      item: { state: string; barcodes: { code: string; nature: string }[] };
    }>().item;
    expect(item.state).toBe('draft');
    expect(item.barcodes).toEqual([expect.objectContaining({ code: 'SCAN-INCONNU-1', nature: 'free' })]);
    // Le réceptionnaire ne compose pas la fiche : c'est le geste du gestionnaire (RG-SUR-127).
    const edit = await run(receiver, 'saveItemPackaging', {
      itemId: created.result.itemId,
      levels: [completeLevel],
    });
    expect(edit.reason).toBe('permissionDenied');
    const drafts = (
      await query(app, manager, 'searchItems', {
        principalId,
        familyId: null,
        state: null,
        trackingMode: null,
        search: null,
        draftsOnly: true,
      })
    ).json<{ items: { code: string; state: string }[] }>();
    expect(drafts.items.every((row) => row.state === 'draft')).toBe(true);
    expect(drafts.items.map((row) => row.code)).toContain('SCAN-INCONNU-1');
  });
});

describe('kits, nomenclatures, équivalences (RG-REF-024 à 033)', () => {
  it('refuse un kit qui se contient, en montrant le cycle (RG-REF-027)', async () => {
    const outer = await newItem({ code: 'KIT-EXT', isKit: true });
    const inner = await newItem({ code: 'KIT-INT', isKit: true });
    const part = await newItem({ code: 'PIECE' });
    expect(
      (
        await run(manager, 'setItemComposition', {
          itemId: outer,
          kind: 'kit',
          components: [{ itemId: inner, quantity: 2 }],
        })
      ).outcome,
    ).toBe('accepted');
    const cycle = await run(manager, 'setItemComposition', {
      itemId: inner,
      kind: 'kit',
      components: [
        { itemId: part, quantity: 3 },
        { itemId: outer, quantity: 1 },
      ],
    });
    expect(cycle.reason).toBe('kitCycle');
    expect(cycle.details?.['cycle']).toBe('KIT-INT → KIT-EXT → KIT-INT');
    expect((await detail(outer)).kitComponents).toEqual([
      expect.objectContaining({ code: 'KIT-INT', quantity: 2 }),
    ]);
  });

  it('refuse un composant d’un autre donneur d’ordre (RG-REF-026) et une nomenclature sur un kit (RG-REF-030)', async () => {
    const kit = await newItem({ isKit: true });
    const foreign = await run(manager, 'setItemComposition', {
      itemId: kit,
      kind: 'kit',
      components: [{ itemId: otherItemId, quantity: 1 }],
    });
    expect(foreign.reason).toBe('componentOtherPrincipal');
    const part = await newItem();
    const bom = await run(manager, 'setItemComposition', {
      itemId: kit,
      kind: 'repairBom',
      components: [{ itemId: part, quantity: 1 }],
    });
    expect(bom.reason).toBe('kitWithRepairBom');
    const notKit = await newItem();
    expect(
      (
        await run(manager, 'setItemComposition', {
          itemId: notKit,
          kind: 'kit',
          components: [{ itemId: part, quantity: 1 }],
        })
      ).reason,
    ).toBe('notAKit');
  });

  it('déclare une équivalence orientée, qui signale une remplaçante obsolète (RG-REF-032, 0.2 § 5)', async () => {
    const replaced = await newItem();
    const replacing = await newItem({ code: 'REMPLACANTE' });
    await run(manager, 'setItemReplacements', { itemId: replaced, replacingItemIds: [replacing] });
    expect((await detail(replaced)).replacements).toEqual([
      expect.objectContaining({ code: 'REMPLACANTE', state: 'draft' }),
    ]);
    // L'équivalence ne vaut que dans un sens.
    expect((await detail(replacing)).replacements).toEqual([]);
  });
});

describe('valeur déclarée (RG-REF-047 à 051)', () => {
  it('exige la devise du donneur d’ordre, puis garde chaque valeur et sa date', async () => {
    const itemId = await newItem();
    await run(administrator, 'setPrincipalCurrency', { principalId, currency: null });
    expect((await run(manager, 'setItemDeclaredValue', { itemId, valueCents: 1999 })).reason).toBe(
      'currencyMissing',
    );
    expect((await run(administrator, 'setPrincipalCurrency', { principalId, currency: 'EUR' })).outcome).toBe(
      'accepted',
    );
    await run(manager, 'setItemDeclaredValue', { itemId, valueCents: 1999 });
    await run(manager, 'setItemDeclaredValue', { itemId, valueCents: 2499 });
    const history = (await detail(itemId)).declaredValueHistory;
    expect(history.map((entry) => entry.valueCents)).toEqual([2499, 1999]);
    expect(history[0]?.currency).toBe('EUR');
    const events = await readObjectHistory(db, { type: 'Item', id: itemId });
    expect(events.map((event) => event.type)).toContain('itemDeclaredValueSet');
  });
});

describe('familles (RG-REF-004)', () => {
  it('range une famille sous une autre, sans cycle', async () => {
    const parent = await run<{ familyId: string }>(manager, 'saveItemFamily', {
      familyId: null,
      principalId,
      parentId: null,
      code: 'AUDIO',
      name: 'Audio',
      active: true,
    });
    const child = await run<{ familyId: string }>(manager, 'saveItemFamily', {
      familyId: null,
      principalId,
      parentId: parent.result.familyId,
      code: 'CASQUES',
      name: 'Casques',
      active: true,
    });
    const cycle = await run(manager, 'saveItemFamily', {
      familyId: parent.result.familyId,
      principalId,
      parentId: child.result.familyId,
      code: 'AUDIO',
      name: 'Audio',
      active: true,
    });
    expect(cycle.reason).toBe('familyCycle');
    // Une famille d'un autre donneur d'ordre ne classe pas cette référence.
    const foreign = await run(manager, 'saveItem', {
      itemId: null,
      principalId: otherPrincipalId,
      code: 'FAM-X',
      shortLabel: 'X',
      longLabel: null,
      familyId: child.result.familyId,
      trackingMode: 'quantity',
      serialBatchTracking: false,
      tracksExpiryDate: false,
      tracksManufacturingDate: false,
      adr: null,
      isKit: false,
    });
    expect(foreign.reason).toBe('unknownFamily');
  });
});
