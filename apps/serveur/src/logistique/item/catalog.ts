import {
  addItemBarcode,
  barcodeNatureSchema,
  changeItemState,
  createDraftItem,
  findItemsByBarcode,
  getItem,
  isCompletePackagingLevel,
  itemStateSchema,
  saveItem,
  saveItemCustomValues,
  saveItemPackaging,
  searchItems,
  setItemBarcodeActive,
  setItemComposition,
  setItemDeclaredValue,
  setItemReplacements,
  trackingModeSchema,
  type ActivationRequirement,
  type CustomValue,
  type ItemState,
  type PackagingLevel,
} from '@cairn/contrat';
import { sql, type Kysely } from 'kysely';
import { z } from 'zod';
import type { DatabaseTransaction, DB } from '../../socle/database/index.js';
import { defineGestureHandler, GestureRefusal } from '../../socle/gesture/index.js';
import { defineQueryHandler, QueryRefusal } from '../../socle/query/index.js';
import { signalChange } from '../../socle/signal/index.js';
import { defineTraceEventType } from '../../socle/trace-event/index.js';
import { canSeePrincipal, visiblePrincipalIds } from '../organization/index.js';
import { customValueProblem } from './custom-field.js';

export const ITEM = 'Item';

/** Stock d'une référence, en unité de base, et les sites où il se trouve. */
export interface ItemStock {
  readonly quantity: number;
  readonly sites: readonly string[];
}

/** Ce que le stock (0.4) dit d'une référence : ce qu'elle immobilise, et si elle a déjà bougé. */
export interface ItemActivity {
  readonly stockOfItems: (
    db: Kysely<DB>,
    itemIds: readonly string[],
  ) => Promise<ReadonlyMap<string, ItemStock>>;
  readonly hasStockMovement: (db: Kysely<DB>, itemId: string) => Promise<boolean>;
}

export const itemSavedEvent = defineTraceEventType(
  'itemSaved',
  z.object({
    principalId: z.string(),
    code: z.string(),
    trackingMode: z.string(),
    created: z.boolean(),
    draftOnTheFly: z.boolean(),
  }),
);
export const itemPackagingSavedEvent = defineTraceEventType(
  'itemPackagingSaved',
  z.object({ levels: z.int(), baseUnitsOfTopLevel: z.int() }),
);
export const itemBarcodeEvent = defineTraceEventType(
  'itemBarcodeChanged',
  z.object({ code: z.string(), nature: z.string(), active: z.boolean() }),
);
export const itemCustomValuesEvent = defineTraceEventType(
  'itemCustomValuesSaved',
  z.object({ customFieldIds: z.array(z.string()) }),
);
export const itemCompositionEvent = defineTraceEventType(
  'itemCompositionSet',
  z.object({ kind: z.string(), components: z.int() }),
);
export const itemReplacementsEvent = defineTraceEventType(
  'itemReplacementsSet',
  z.object({ replacingItemIds: z.array(z.string()) }),
);
// Ancienne et nouvelle valeur : un arbitrage passé reste explicable (RG-REF-050, RG-SUR-125).
export const itemDeclaredValueEvent = defineTraceEventType(
  'itemDeclaredValueSet',
  z.object({
    previousCents: z.int().nullable(),
    valueCents: z.int().nullable(),
    currency: z.string().nullable(),
  }),
);
export const itemStateEvent = defineTraceEventType(
  'itemStateChanged',
  z.object({ previous: z.string(), state: z.string(), stockQuantity: z.int() }),
);

interface ItemHead {
  readonly id: string;
  readonly principalId: string;
  readonly code: string;
  readonly trackingMode: z.infer<typeof trackingModeSchema>;
  readonly isKit: boolean;
  readonly state: ItemState;
  readonly version: number;
}

async function itemOf(db: Kysely<DB>, itemId: string): Promise<ItemHead | undefined> {
  const item = await db
    .selectFrom('logistics.item')
    .select(['id', 'principalId', 'code', 'trackingMode', 'isKit', 'state', 'version'])
    .where('id', '=', itemId)
    .executeTakeFirst();
  if (item === undefined) return undefined;
  return {
    ...item,
    trackingMode: trackingModeSchema.parse(item.trackingMode),
    state: itemStateSchema.parse(item.state),
  };
}

/** La référence, si l'auteur voit son donneur d'ordre (RG-ORG-017) ; sinon un refus. */
async function visibleItem(db: Kysely<DB>, userId: string, itemId: string): Promise<ItemHead> {
  const item = await itemOf(db, itemId);
  if (item === undefined || !(await canSeePrincipal(db, userId, item.principalId)))
    throw new GestureRefusal('unknownItem');
  return item;
}

/** Une référence modifiée change de version : les écrans ouverts se rafraîchissent (fiche 0026). */
async function touch(transaction: DatabaseTransaction, itemId: string): Promise<void> {
  const { version } = await transaction
    .updateTable('logistics.item')
    .set((eb) => ({ version: eb('version', '+', 1) }))
    .where('id', '=', itemId)
    .returning('version')
    .executeTakeFirstOrThrow();
  await signalChange(transaction, { objectType: ITEM, objectId: itemId, version });
}

async function packagingOf(db: Kysely<DB>, itemId: string): Promise<PackagingLevel[]> {
  return db
    .selectFrom('logistics.packagingLevel')
    .select(['name', 'unitsOfLowerLevel', 'grossWeightGrams', 'lengthMm', 'widthMm', 'heightMm'])
    .where('itemId', '=', itemId)
    .orderBy('rank')
    .execute();
}

/**
 * Ce qui manque à une référence pour être active (RG-REF-040) : les champs obligatoires renseignés, au
 * moins un niveau de conditionnement complet, au moins un identifiant scannable actif.
 */
async function activationMissing(db: Kysely<DB>, item: ItemHead): Promise<ActivationRequirement[]> {
  const [levels, barcode, unfilled] = await Promise.all([
    packagingOf(db, item.id),
    db
      .selectFrom('logistics.itemBarcode')
      .select('code')
      .where('itemId', '=', item.id)
      .where('active', '=', true)
      .executeTakeFirst(),
    db
      .selectFrom('logistics.customField as field')
      .select('field.id')
      .where('field.principalId', '=', item.principalId)
      .where('field.required', '=', true)
      .where('field.active', '=', true)
      .where((eb) =>
        eb.not(
          eb.exists(
            eb
              .selectFrom('logistics.itemCustomValue as value')
              .select('value.itemId')
              .whereRef('value.customFieldId', '=', 'field.id')
              .where('value.itemId', '=', item.id),
          ),
        ),
      )
      .executeTakeFirst(),
  ]);
  const missing: ActivationRequirement[] = [];
  if (unfilled !== undefined) missing.push('requiredCustomFields');
  if (!levels.some(isCompletePackagingLevel)) missing.push('completePackaging');
  if (barcode === undefined) missing.push('barcode');
  return missing;
}

/** Références d'un même donneur d'ordre, ou le refus qui nomme l'écart (RG-REF-026, 031). */
async function sameprincipalItems(
  db: Kysely<DB>,
  principalId: string,
  itemIds: readonly string[],
): Promise<void> {
  if (itemIds.length === 0) return;
  const found = await db
    .selectFrom('logistics.item')
    .select('id')
    .where('id', 'in', itemIds)
    .where('principalId', '=', principalId)
    .execute();
  if (found.length !== new Set(itemIds).size) throw new GestureRefusal('componentOtherPrincipal');
}

/**
 * Le cycle qu'ajouterait cette composition de kit, en codes de référence, ou `undefined` (RG-REF-027) :
 * un composant qui contient, directement ou non, le kit lui-même.
 */
async function kitCycle(
  db: Kysely<DB>,
  kitItemId: string,
  componentIds: readonly string[],
): Promise<string[] | undefined> {
  if (componentIds.length === 0) return undefined;
  const row = await sql<{ path: string[] }>`
    with recursive reach (item_id, path) as (
      select component.id, array[kit.code, component.code]
      from logistics.item component, logistics.item kit
      where component.id = any(${sql.val(componentIds)}::uuid[]) and kit.id = ${kitItemId}
      union all
      select link.component_item_id, reach.path || inner_item.code
      from reach
      join logistics.kit_component link on link.kit_item_id = reach.item_id
      join logistics.item inner_item on inner_item.id = link.component_item_id
      where reach.item_id <> ${kitItemId} and cardinality(reach.path) < 50
    )
    select path from reach where item_id = ${kitItemId} limit 1
  `.execute(db);
  return row.rows[0]?.path;
}

const cents = (value: string | null): number | null => (value === null ? null : Number(value));

/** Gestes et consultations du module 0.2 sur les références. */
export function itemCatalog(activity: ItemActivity) {
  const searchItemsHandler = defineQueryHandler({
    definition: searchItems,
    permissions: ['manageItems', 'createDraftItem'],
    async execute({ db, userId, input }) {
      if (!(await canSeePrincipal(db, userId, input.principalId))) throw new QueryRefusal('outOfScope');
      const search = input.search?.trim().toLowerCase() ?? '';
      const state = input.draftsOnly ? 'draft' : input.state;
      const rows = await db
        .selectFrom('logistics.item as item')
        .leftJoin('logistics.itemFamily as family', 'family.id', 'item.familyId')
        .select([
          'item.id',
          'item.code',
          'item.shortLabel',
          'family.name as familyName',
          'item.trackingMode',
          'item.serialBatchTracking',
          'item.state',
          'item.createdAt',
          // Les conditions de RG-REF-040, celles que `activationMissing` vérifie une à une.
          sql<boolean>`exists (select 1 from logistics.packaging_level level where level.item_id = item.id
              and level.gross_weight_grams is not null and level.length_mm is not null
              and level.width_mm is not null and level.height_mm is not null)
            and exists (select 1 from logistics.item_barcode barcode where barcode.item_id = item.id
              and barcode.active)
            and not exists (select 1 from logistics.custom_field field
              where field.principal_id = item.principal_id and field.required and field.active
              and not exists (select 1 from logistics.item_custom_value value
                where value.item_id = item.id and value.custom_field_id = field.id))`.as('activable'),
        ])
        .where('item.principalId', '=', input.principalId)
        .$if(state !== null, (query) => query.where('item.state', '=', state ?? ''))
        .$if(input.trackingMode !== null, (query) =>
          query.where('item.trackingMode', '=', input.trackingMode ?? ''),
        )
        .$if(input.familyId !== null, (query) => query.where('item.familyId', '=', input.familyId ?? ''))
        .$if(search !== '', (query) =>
          query.where((eb) =>
            eb.or([
              eb(sql`lower(item.code)`, 'like', `%${search}%`),
              eb(sql`lower(item.short_label)`, 'like', `%${search}%`),
              eb.exists(
                eb
                  .selectFrom('logistics.itemBarcode as barcode')
                  .select('barcode.code')
                  .whereRef('barcode.itemId', '=', 'item.id')
                  .where(sql`lower(barcode.code)`, '=', search),
              ),
            ]),
          ),
        )
        // Les brouillons, du plus ancien au plus récent (RG-REF-041) ; le reste, par code.
        .$if(input.draftsOnly, (query) => query.orderBy('item.createdAt'))
        .orderBy('item.code')
        .limit(500)
        .execute();
      const stock = await activity.stockOfItems(
        db,
        rows.map((row) => row.id),
      );
      return {
        items: rows.map((row) => ({
          id: row.id,
          code: row.code,
          shortLabel: row.shortLabel,
          familyName: row.familyName,
          trackingMode: trackingModeSchema.parse(row.trackingMode),
          serialBatchTracking: row.serialBatchTracking,
          state: itemStateSchema.parse(row.state),
          createdAt: row.createdAt.toISOString(),
          stockQuantity: stock.get(row.id)?.quantity ?? 0,
          stockSites: [...(stock.get(row.id)?.sites ?? [])],
          activable: row.activable,
        })),
      };
    },
  });

  const getItemHandler = defineQueryHandler({
    definition: getItem,
    permissions: ['manageItems', 'createDraftItem'],
    async execute({ db, userId, input }) {
      const item = await db
        .selectFrom('logistics.item as item')
        .innerJoin('logistics.principal as principal', 'principal.id', 'item.principalId')
        .selectAll('item')
        .select(['principal.code as principalCode', 'principal.currency'])
        .where('item.id', '=', input.itemId)
        .executeTakeFirst();
      if (item === undefined || !(await canSeePrincipal(db, userId, item.principalId)))
        throw new QueryRefusal('outOfScope');
      const head = await itemOf(db, item.id);
      if (head === undefined) throw new QueryRefusal('outOfScope');
      const kitComponentsOf = db
        .selectFrom('logistics.kitComponent as link')
        .innerJoin('logistics.item as component', 'component.id', 'link.componentItemId')
        .select([
          'component.id as itemId',
          'component.code',
          'component.shortLabel',
          'component.state',
          'link.quantity',
        ])
        .where('link.kitItemId', '=', item.id)
        .orderBy('component.code')
        .execute();
      const repairBomComponentsOf = db
        .selectFrom('logistics.repairBomComponent as link')
        .innerJoin('logistics.item as component', 'component.id', 'link.componentItemId')
        .select([
          'component.id as itemId',
          'component.code',
          'component.shortLabel',
          'component.state',
          'link.quantity',
        ])
        .where('link.itemId', '=', item.id)
        .orderBy('component.code')
        .execute();
      const [
        packagingLevels,
        barcodes,
        values,
        kitComponents,
        repairBomComponents,
        replacements,
        history,
        missing,
        locked,
        stock,
      ] = await Promise.all([
        packagingOf(db, item.id),
        db
          .selectFrom('logistics.itemBarcode')
          .select(['code', 'nature', 'packagingRank', 'active'])
          .where('itemId', '=', item.id)
          .orderBy('code')
          .execute(),
        db
          .selectFrom('logistics.itemCustomValue')
          .select(['customFieldId', 'value'])
          .where('itemId', '=', item.id)
          .execute(),
        kitComponentsOf,
        repairBomComponentsOf,
        db
          .selectFrom('logistics.itemSubstitution as link')
          .innerJoin('logistics.item as replacing', 'replacing.id', 'link.replacingItemId')
          .select(['replacing.id as itemId', 'replacing.code', 'replacing.shortLabel', 'replacing.state'])
          .where('link.replacedItemId', '=', item.id)
          .orderBy('replacing.code')
          .execute(),
        db
          .selectFrom('logistics.itemDeclaredValue')
          .select(['valueCents', 'currency', 'setAt'])
          .where('itemId', '=', item.id)
          .orderBy('setAt', 'desc')
          .orderBy('id', 'desc')
          .execute(),
        activationMissing(db, head),
        activity.hasStockMovement(db, item.id),
        activity.stockOfItems(db, [item.id]),
      ]);
      const state = (value: string) => itemStateSchema.parse(value);
      return {
        item: {
          id: item.id,
          principalId: item.principalId,
          principalCode: item.principalCode,
          currency: item.currency,
          code: item.code,
          shortLabel: item.shortLabel,
          longLabel: item.longLabel,
          familyId: item.familyId,
          trackingMode: head.trackingMode,
          serialBatchTracking: item.serialBatchTracking,
          trackingModeLocked: locked,
          tracksExpiryDate: item.tracksExpiryDate,
          tracksManufacturingDate: item.tracksManufacturingDate,
          adr:
            item.adrClass === null || item.adrUnNumber === null
              ? null
              : {
                  adrClass: item.adrClass,
                  unNumber: item.adrUnNumber,
                  packingGroup:
                    item.adrPackingGroup === null
                      ? null
                      : z.enum(['I', 'II', 'III']).parse(item.adrPackingGroup),
                },
          isKit: item.isKit,
          state: head.state,
          createdAt: item.createdAt.toISOString(),
          version: item.version,
          declaredValueCents: cents(item.declaredValueCents),
          declaredValueHistory: history.map((entry) => ({
            valueCents: cents(entry.valueCents),
            currency: entry.currency,
            setAt: entry.setAt.toISOString(),
          })),
          packagingLevels,
          barcodes: barcodes.map((barcode) => ({
            ...barcode,
            nature: barcodeNatureSchema.parse(barcode.nature),
          })),
          customValues: Object.fromEntries(
            values.map((value) => [
              value.customFieldId,
              z.union([z.string(), z.number(), z.boolean()]).parse(value.value),
            ]),
          ),
          kitComponents: kitComponents.map((component) => ({ ...component, state: state(component.state) })),
          repairBomComponents: repairBomComponents.map((component) => ({
            ...component,
            state: state(component.state),
          })),
          replacements: replacements.map((replacing) => ({ ...replacing, state: state(replacing.state) })),
          activationMissing: missing,
          stockQuantity: stock.get(item.id)?.quantity ?? 0,
        },
      };
    },
  });

  /**
   * Le scan retrouve la référence quel que soit le code lu (RG-REF-008), dans les donneurs d'ordre que
   * l'utilisateur voit ; un code désactivé la retrouve aussi, et le dit (RG-REF-010).
   */
  const findItemsByBarcodeHandler = defineQueryHandler({
    definition: findItemsByBarcode,
    async execute({ db, userId, input }) {
      const visible = await visiblePrincipalIds(db, userId);
      const rows = await db
        .selectFrom('logistics.itemBarcode as barcode')
        .innerJoin('logistics.item as item', 'item.id', 'barcode.itemId')
        .innerJoin('logistics.principal as principal', 'principal.id', 'item.principalId')
        .select([
          'item.id as itemId',
          'item.principalId',
          'principal.code as principalCode',
          'item.code as itemCode',
          'item.shortLabel',
          'item.state',
          'barcode.nature',
          'barcode.packagingRank',
          'barcode.active as barcodeActive',
        ])
        .where('barcode.code', '=', input.code)
        .$if(input.principalId !== null, (query) =>
          query.where('barcode.principalId', '=', input.principalId ?? ''),
        )
        .$if(visible !== null, (query) =>
          visible === null || visible.length === 0
            ? query.where(sql<boolean>`false`)
            : query.where('barcode.principalId', 'in', visible),
        )
        .orderBy('principal.code')
        .execute();
      return {
        matches: rows.map((row) => ({
          ...row,
          state: itemStateSchema.parse(row.state),
          nature: barcodeNatureSchema.parse(row.nature),
        })),
      };
    },
  });

  async function refuseTakenCode(
    transaction: Kysely<DB>,
    principalId: string,
    code: string,
    itemId: string | null,
  ): Promise<void> {
    const taken = await transaction
      .selectFrom('logistics.item')
      .select('id')
      .where('principalId', '=', principalId)
      .where('code', '=', code)
      .$if(itemId !== null, (query) => query.where('id', '<>', itemId ?? ''))
      .executeTakeFirst();
    if (taken !== undefined) throw new GestureRefusal('codeTaken');
  }

  async function refuseTakenBarcode(
    transaction: Kysely<DB>,
    principalId: string,
    code: string,
  ): Promise<void> {
    const holder = await transaction
      .selectFrom('logistics.itemBarcode as barcode')
      .innerJoin('logistics.item as item', 'item.id', 'barcode.itemId')
      .select('item.code')
      .where('barcode.principalId', '=', principalId)
      .where('barcode.code', '=', code)
      .executeTakeFirst();
    // Le refus nomme la référence qui détient le code (RG-REF-009).
    if (holder !== undefined) throw new GestureRefusal('barcodeTaken', { item: holder.code });
  }

  const saveItemHandler = defineGestureHandler({
    definition: saveItem,
    async execute({ transaction, author, input, appendEvent }) {
      if (input.serialBatchTracking && input.trackingMode !== 'serial')
        throw new GestureRefusal('batchTrackingSerialOnly');
      const existing =
        input.itemId === null ? undefined : await visibleItem(transaction, author.userId, input.itemId);
      if (existing === undefined) {
        const principal = await transaction
          .selectFrom('logistics.principal')
          .select('id')
          .where('id', '=', input.principalId)
          .where('active', '=', true)
          .executeTakeFirst();
        if (
          principal === undefined ||
          !(await canSeePrincipal(transaction, author.userId, input.principalId))
        )
          throw new GestureRefusal('unknownPrincipal');
      } else {
        // Le donneur d'ordre est fixé à la création (RG-REF-001).
        if (existing.principalId !== input.principalId) throw new GestureRefusal('principalLocked');
        if (
          existing.trackingMode !== input.trackingMode &&
          (await activity.hasStockMovement(transaction, existing.id))
        )
          throw new GestureRefusal('trackingModeLocked');
        if (input.isKit) {
          const bom = await transaction
            .selectFrom('logistics.repairBomComponent')
            .select('itemId')
            .where('itemId', '=', existing.id)
            .executeTakeFirst();
          if (bom !== undefined) throw new GestureRefusal('kitWithRepairBom');
        }
      }
      if (input.familyId !== null) {
        const family = await transaction
          .selectFrom('logistics.itemFamily')
          .select('id')
          .where('id', '=', input.familyId)
          .where('principalId', '=', input.principalId)
          .executeTakeFirst();
        if (family === undefined) throw new GestureRefusal('unknownFamily');
      }
      await refuseTakenCode(transaction, input.principalId, input.code, input.itemId);
      const values = {
        code: input.code,
        shortLabel: input.shortLabel,
        longLabel: input.longLabel === '' ? null : input.longLabel,
        familyId: input.familyId,
        trackingMode: input.trackingMode,
        serialBatchTracking: input.serialBatchTracking,
        tracksExpiryDate: input.tracksExpiryDate,
        tracksManufacturingDate: input.tracksManufacturingDate,
        adrClass: input.adr?.adrClass ?? null,
        adrUnNumber: input.adr?.unNumber ?? null,
        adrPackingGroup: input.adr?.packingGroup ?? null,
        isKit: input.isKit,
      };
      let itemId = input.itemId;
      if (itemId === null) {
        itemId = (
          await transaction
            .insertInto('logistics.item')
            .values({ ...values, principalId: input.principalId, state: 'draft' })
            .returning('id')
            .executeTakeFirstOrThrow()
        ).id;
      } else {
        await transaction.updateTable('logistics.item').set(values).where('id', '=', itemId).execute();
        // Une référence qui cesse d'être un kit perd sa composition.
        if (!input.isKit)
          await transaction.deleteFrom('logistics.kitComponent').where('kitItemId', '=', itemId).execute();
      }
      await appendEvent({
        eventType: itemSavedEvent,
        data: {
          principalId: input.principalId,
          code: input.code,
          trackingMode: input.trackingMode,
          created: input.itemId === null,
          draftOnTheFly: false,
        },
        objects: [{ type: ITEM, id: itemId }],
      });
      await touch(transaction, itemId);
      return { itemId };
    },
  });

  const createDraftItemHandler = defineGestureHandler({
    definition: createDraftItem,
    async execute({ transaction, author, input, appendEvent }) {
      if (!(await canSeePrincipal(transaction, author.userId, input.principalId)))
        throw new GestureRefusal('unknownPrincipal');
      await refuseTakenCode(transaction, input.principalId, input.code, null);
      await refuseTakenBarcode(transaction, input.principalId, input.code);
      const { id: itemId } = await transaction
        .insertInto('logistics.item')
        .values({
          principalId: input.principalId,
          code: input.code,
          shortLabel: input.shortLabel,
          trackingMode: input.trackingMode,
          state: 'draft',
        })
        .returning('id')
        .executeTakeFirstOrThrow();
      // Nature inconnue au moment du scan : un code libre, que le gestionnaire requalifiera.
      await transaction
        .insertInto('logistics.itemBarcode')
        .values({ principalId: input.principalId, code: input.code, itemId, nature: 'free' })
        .execute();
      await appendEvent({
        eventType: itemSavedEvent,
        data: {
          principalId: input.principalId,
          code: input.code,
          trackingMode: input.trackingMode,
          created: true,
          draftOnTheFly: true,
        },
        objects: [{ type: ITEM, id: itemId }],
      });
      await touch(transaction, itemId);
      return { itemId };
    },
  });

  const saveItemPackagingHandler = defineGestureHandler({
    definition: saveItemPackaging,
    async execute({ transaction, author, input, appendEvent }) {
      const item = await visibleItem(transaction, author.userId, input.itemId);
      // Le niveau de base n'a pas de coefficient ; chaque niveau au-dessus en porte un (RG-REF-018, 019).
      if (input.levels.some((level, rank) => (rank === 0) !== (level.unitsOfLowerLevel === null)))
        throw new GestureRefusal('invalidCoefficient');
      const orphan = await transaction
        .selectFrom('logistics.itemBarcode')
        .select('code')
        .where('itemId', '=', item.id)
        .where('packagingRank', '>=', input.levels.length)
        .executeTakeFirst();
      if (orphan !== undefined) throw new GestureRefusal('barcodeOnRemovedLevel', { name: orphan.code });
      await transaction.deleteFrom('logistics.packagingLevel').where('itemId', '=', item.id).execute();
      await transaction
        .insertInto('logistics.packagingLevel')
        .values(input.levels.map((level, rank) => ({ ...level, itemId: item.id, rank })))
        .execute();
      const top = input.levels.reduce((units, level) => units * (level.unitsOfLowerLevel ?? 1), 1);
      await appendEvent({
        eventType: itemPackagingSavedEvent,
        data: { levels: input.levels.length, baseUnitsOfTopLevel: top },
        objects: [{ type: ITEM, id: item.id }],
      });
      await touch(transaction, item.id);
      return {};
    },
  });

  const addItemBarcodeHandler = defineGestureHandler({
    definition: addItemBarcode,
    async execute({ transaction, author, input, appendEvent }) {
      const item = await visibleItem(transaction, author.userId, input.itemId);
      if (input.packagingRank !== null) {
        const level = await transaction
          .selectFrom('logistics.packagingLevel')
          .select('rank')
          .where('itemId', '=', item.id)
          .where('rank', '=', input.packagingRank)
          .executeTakeFirst();
        if (level === undefined) throw new GestureRefusal('unknownPackagingLevel');
      }
      await refuseTakenBarcode(transaction, item.principalId, input.code);
      await transaction
        .insertInto('logistics.itemBarcode')
        .values({
          principalId: item.principalId,
          code: input.code,
          itemId: item.id,
          nature: input.nature,
          packagingRank: input.packagingRank,
        })
        .execute();
      await appendEvent({
        eventType: itemBarcodeEvent,
        data: { code: input.code, nature: input.nature, active: true },
        objects: [{ type: ITEM, id: item.id }],
      });
      await touch(transaction, item.id);
      return {};
    },
  });

  const setItemBarcodeActiveHandler = defineGestureHandler({
    definition: setItemBarcodeActive,
    async execute({ transaction, author, input, appendEvent }) {
      const item = await visibleItem(transaction, author.userId, input.itemId);
      const barcode = await transaction
        .updateTable('logistics.itemBarcode')
        .set({ active: input.active })
        .where('itemId', '=', item.id)
        .where('code', '=', input.code)
        .returning('nature')
        .executeTakeFirst();
      if (barcode === undefined) throw new GestureRefusal('unknownBarcode');
      await appendEvent({
        eventType: itemBarcodeEvent,
        data: { code: input.code, nature: barcode.nature, active: input.active },
        objects: [{ type: ITEM, id: item.id }],
      });
      await touch(transaction, item.id);
      return {};
    },
  });

  const saveItemCustomValuesHandler = defineGestureHandler({
    definition: saveItemCustomValues,
    async execute({ transaction, author, input, appendEvent }) {
      const item = await visibleItem(transaction, author.userId, input.itemId);
      const ids = input.values.map((entry) => entry.customFieldId);
      const fields =
        ids.length === 0
          ? []
          : await transaction
              .selectFrom('logistics.customField')
              .select(['id', 'fieldType', 'listValues', 'active'])
              .where('principalId', '=', item.principalId)
              .where('id', 'in', ids)
              .execute();
      const byId = new Map(fields.map((field) => [field.id, field]));
      for (const entry of input.values) {
        const field = byId.get(entry.customFieldId);
        if (field === undefined) throw new GestureRefusal('unknownCustomField');
        if (entry.value === null) continue;
        // Un champ désactivé reste lisible, mais ne se renseigne plus (RG-REF-037).
        if (!field.active) throw new GestureRefusal('unknownCustomField');
        if (customValueProblem(field, entry.value) !== undefined)
          throw new GestureRefusal('invalidCustomValue');
      }
      for (const entry of input.values) {
        await transaction
          .deleteFrom('logistics.itemCustomValue')
          .where('itemId', '=', item.id)
          .where('customFieldId', '=', entry.customFieldId)
          .execute();
        if (entry.value !== null && entry.value !== '')
          await transaction
            .insertInto('logistics.itemCustomValue')
            .values({
              itemId: item.id,
              customFieldId: entry.customFieldId,
              value: JSON.stringify(entry.value satisfies CustomValue),
            })
            .execute();
      }
      await appendEvent({
        eventType: itemCustomValuesEvent,
        data: { customFieldIds: ids },
        objects: [{ type: ITEM, id: item.id }],
      });
      await touch(transaction, item.id);
      return {};
    },
  });

  const setItemCompositionHandler = defineGestureHandler({
    definition: setItemComposition,
    async execute({ transaction, author, input, appendEvent }) {
      const item = await visibleItem(transaction, author.userId, input.itemId);
      const componentIds = input.components.map((component) => component.itemId);
      if (componentIds.includes(item.id))
        throw new GestureRefusal('kitCycle', { cycle: `${item.code} → ${item.code}` });
      await sameprincipalItems(transaction, item.principalId, componentIds);
      if (input.kind === 'kit') {
        if (!item.isKit) throw new GestureRefusal('notAKit');
        const cycle = await kitCycle(transaction, item.id, componentIds);
        // Le refus montre le cycle détecté (0.2 § 5).
        if (cycle !== undefined) throw new GestureRefusal('kitCycle', { cycle: cycle.join(' → ') });
        await transaction.deleteFrom('logistics.kitComponent').where('kitItemId', '=', item.id).execute();
        if (input.components.length > 0)
          await transaction
            .insertInto('logistics.kitComponent')
            .values(
              input.components.map((component) => ({
                kitItemId: item.id,
                componentItemId: component.itemId,
                quantity: component.quantity,
              })),
            )
            .execute();
      } else {
        // Un kit ne porte pas de nomenclature de réparation (RG-REF-030).
        if (item.isKit && input.components.length > 0) throw new GestureRefusal('kitWithRepairBom');
        await transaction.deleteFrom('logistics.repairBomComponent').where('itemId', '=', item.id).execute();
        if (input.components.length > 0)
          await transaction
            .insertInto('logistics.repairBomComponent')
            .values(
              input.components.map((component) => ({
                itemId: item.id,
                componentItemId: component.itemId,
                quantity: component.quantity,
              })),
            )
            .execute();
      }
      await appendEvent({
        eventType: itemCompositionEvent,
        data: { kind: input.kind, components: input.components.length },
        objects: [{ type: ITEM, id: item.id }],
      });
      await touch(transaction, item.id);
      return {};
    },
  });

  const setItemReplacementsHandler = defineGestureHandler({
    definition: setItemReplacements,
    async execute({ transaction, author, input, appendEvent }) {
      const item = await visibleItem(transaction, author.userId, input.itemId);
      const replacing = [...new Set(input.replacingItemIds)].filter((id) => id !== item.id);
      await sameprincipalItems(transaction, item.principalId, replacing);
      await transaction
        .deleteFrom('logistics.itemSubstitution')
        .where('replacedItemId', '=', item.id)
        .execute();
      if (replacing.length > 0)
        await transaction
          .insertInto('logistics.itemSubstitution')
          .values(replacing.map((replacingItemId) => ({ replacedItemId: item.id, replacingItemId })))
          .execute();
      await appendEvent({
        eventType: itemReplacementsEvent,
        data: { replacingItemIds: replacing },
        objects: [{ type: ITEM, id: item.id }],
      });
      await touch(transaction, item.id);
      return {};
    },
  });

  const setItemDeclaredValueHandler = defineGestureHandler({
    definition: setItemDeclaredValue,
    async execute({ transaction, author, input, appendEvent }) {
      const item = await visibleItem(transaction, author.userId, input.itemId);
      const current = await transaction
        .selectFrom('logistics.item as item')
        .innerJoin('logistics.principal as principal', 'principal.id', 'item.principalId')
        .select(['item.declaredValueCents', 'principal.currency'])
        .where('item.id', '=', item.id)
        .executeTakeFirstOrThrow();
      // La valeur s'exprime dans la devise du donneur d'ordre : sans devise, pas de valeur (RG-REF-049).
      if (input.valueCents !== null && current.currency === null) throw new GestureRefusal('currencyMissing');
      await transaction
        .updateTable('logistics.item')
        .set({ declaredValueCents: input.valueCents })
        .where('id', '=', item.id)
        .execute();
      await transaction
        .insertInto('logistics.itemDeclaredValue')
        .values({ itemId: item.id, valueCents: input.valueCents, currency: current.currency })
        .execute();
      await appendEvent({
        eventType: itemDeclaredValueEvent,
        data: {
          previousCents: cents(current.declaredValueCents),
          valueCents: input.valueCents,
          currency: current.currency,
        },
        objects: [{ type: ITEM, id: item.id }],
      });
      await touch(transaction, item.id);
      return {};
    },
  });

  const changeItemStateHandler = defineGestureHandler({
    definition: changeItemState,
    async execute({ transaction, author, input, appendEvent }) {
      const item = await visibleItem(transaction, author.userId, input.itemId);
      if (item.state === input.state) throw new GestureRefusal('invalidTransition');
      // Un brouillon ne devient actif qu'avec ce que RG-REF-040 exige, et ne passe pas ailleurs.
      if (item.state === 'draft') {
        if (input.state !== 'active') throw new GestureRefusal('invalidTransition');
        const missing = await activationMissing(transaction, item);
        if (missing.length > 0)
          throw new GestureRefusal('itemActivationIncomplete', { missing: missing.join(',') });
      }
      const stockQuantity = (await activity.stockOfItems(transaction, [item.id])).get(item.id)?.quantity ?? 0;
      await transaction
        .updateTable('logistics.item')
        .set({ state: input.state })
        .where('id', '=', item.id)
        .execute();
      await appendEvent({
        eventType: itemStateEvent,
        data: { previous: item.state, state: input.state, stockQuantity },
        objects: [{ type: ITEM, id: item.id }],
      });
      await touch(transaction, item.id);
      // L'écran avertit quand une référence rendue obsolète reste en stock (0.2 § 5).
      return { stockQuantity };
    },
  });

  return {
    gestures: [
      saveItemHandler,
      createDraftItemHandler,
      saveItemPackagingHandler,
      addItemBarcodeHandler,
      setItemBarcodeActiveHandler,
      saveItemCustomValuesHandler,
      setItemCompositionHandler,
      setItemReplacementsHandler,
      setItemDeclaredValueHandler,
      changeItemStateHandler,
    ],
    queries: [searchItemsHandler, getItemHandler, findItemsByBarcodeHandler],
  };
}
