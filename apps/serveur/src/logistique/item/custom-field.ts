import {
  customFieldTypeSchema,
  listCustomFields,
  listItemFamilies,
  removeCustomField,
  saveCustomField,
  saveItemFamily,
  setPrincipalCurrency,
  type CustomValue,
} from '@cairn/contrat';
import { sql } from 'kysely';
import { z } from 'zod';
import { defineGestureHandler, GestureRefusal } from '../../socle/gesture/index.js';
import type { JsonValue } from '../../socle/database/index.js';
import { defineQueryHandler, QueryRefusal } from '../../socle/query/index.js';
import { signalChange } from '../../socle/signal/index.js';
import { defineTraceEventType } from '../../socle/trace-event/index.js';
import { canSeePrincipal, PRINCIPAL } from '../organization/index.js';

export const ITEM_FAMILY = 'ItemFamily';
export const CUSTOM_FIELD = 'CustomField';

const listValuesSchema = z.array(z.string());

/** Pourquoi une valeur ne convient pas au type de son champ, ou `undefined` (RG-REF-034). */
export function customValueProblem(
  field: { readonly fieldType: string; readonly listValues: JsonValue },
  value: CustomValue,
): 'type' | 'list' | undefined {
  switch (customFieldTypeSchema.parse(field.fieldType)) {
    case 'text':
      return typeof value === 'string' ? undefined : 'type';
    case 'number':
      return typeof value === 'number' && Number.isFinite(value) ? undefined : 'type';
    case 'boolean':
      return typeof value === 'boolean' ? undefined : 'type';
    case 'date':
      return typeof value === 'string' && z.iso.date().safeParse(value).success ? undefined : 'type';
    case 'list':
      if (typeof value !== 'string') return 'type';
      return listValuesSchema.parse(field.listValues).includes(value) ? undefined : 'list';
  }
}

export const itemFamilySavedEvent = defineTraceEventType(
  'itemFamilySaved',
  z.object({
    principalId: z.string(),
    code: z.string(),
    parentId: z.string().nullable(),
    active: z.boolean(),
  }),
);
export const customFieldSavedEvent = defineTraceEventType(
  'customFieldSaved',
  z.object({
    principalId: z.string(),
    fieldType: z.string(),
    required: z.boolean(),
    active: z.boolean(),
  }),
);
export const customFieldRemovedEvent = defineTraceEventType(
  'customFieldRemoved',
  z.object({ removal: z.string(), itemCount: z.int() }),
);
export const principalCurrencyEvent = defineTraceEventType(
  'principalCurrencySet',
  z.object({ previous: z.string().nullable(), currency: z.string().nullable() }),
);

export const listItemFamiliesHandler = defineQueryHandler({
  definition: listItemFamilies,
  permissions: ['manageItems', 'createDraftItem'],
  async execute({ db, userId, input }) {
    if (!(await canSeePrincipal(db, userId, input.principalId))) throw new QueryRefusal('outOfScope');
    const families = await db
      .selectFrom('logistics.itemFamily as family')
      .select([
        'family.id',
        'family.parentId',
        'family.code',
        'family.name',
        'family.active',
        sql<number>`(select count(*)::int from logistics.item item where item.family_id = family.id)`.as(
          'itemCount',
        ),
      ])
      .where('family.principalId', '=', input.principalId)
      .orderBy('family.code')
      .execute();
    return { families };
  },
});

export const listCustomFieldsHandler = defineQueryHandler({
  definition: listCustomFields,
  permissions: ['manageItems', 'manageCustomFields', 'createDraftItem'],
  async execute({ db, userId, input }) {
    if (!(await canSeePrincipal(db, userId, input.principalId))) throw new QueryRefusal('outOfScope');
    const [principal, fields] = await Promise.all([
      db
        .selectFrom('logistics.principal')
        .select('currency')
        .where('id', '=', input.principalId)
        .executeTakeFirst(),
      db
        .selectFrom('logistics.customField as field')
        .select([
          'field.id',
          'field.label',
          'field.fieldType',
          'field.listValues',
          'field.required',
          'field.active',
          sql<number>`(select count(*)::int from logistics.item_custom_value value
            where value.custom_field_id = field.id)`.as('itemCount'),
        ])
        .where('field.principalId', '=', input.principalId)
        .orderBy('field.rank')
        .orderBy('field.label')
        .execute(),
    ]);
    if (principal === undefined) throw new QueryRefusal('outOfScope');
    return {
      currency: principal.currency,
      fields: fields.map((field) => ({
        ...field,
        fieldType: customFieldTypeSchema.parse(field.fieldType),
        listValues: listValuesSchema.parse(field.listValues),
      })),
    };
  },
});

/** Une famille ne descend pas d'elle-même : l'arborescence reste un arbre. */
export const saveItemFamilyHandler = defineGestureHandler({
  definition: saveItemFamily,
  async execute({ transaction, author, input, appendEvent }) {
    if (!(await canSeePrincipal(transaction, author.userId, input.principalId)))
      throw new GestureRefusal('unknownPrincipal');
    const ofPrincipal = async (familyId: string) =>
      transaction
        .selectFrom('logistics.itemFamily')
        .select(['id', 'parentId'])
        .where('id', '=', familyId)
        .where('principalId', '=', input.principalId)
        .executeTakeFirst();
    if (input.familyId !== null && (await ofPrincipal(input.familyId)) === undefined)
      throw new GestureRefusal('unknownFamily');
    let ancestor = input.parentId;
    const seen = new Set<string>();
    while (ancestor !== null) {
      if (ancestor === input.familyId || seen.has(ancestor)) throw new GestureRefusal('familyCycle');
      seen.add(ancestor);
      const parent = await ofPrincipal(ancestor);
      if (parent === undefined) throw new GestureRefusal('unknownFamily');
      ancestor = parent.parentId;
    }
    const taken = await transaction
      .selectFrom('logistics.itemFamily')
      .select('id')
      .where('principalId', '=', input.principalId)
      .where('code', '=', input.code)
      .$if(input.familyId !== null, (query) => query.where('id', '<>', input.familyId ?? ''))
      .executeTakeFirst();
    if (taken !== undefined) throw new GestureRefusal('codeTaken');
    const values = { parentId: input.parentId, code: input.code, name: input.name, active: input.active };
    let familyId = input.familyId;
    if (familyId === null)
      familyId = (
        await transaction
          .insertInto('logistics.itemFamily')
          .values({ ...values, principalId: input.principalId })
          .returning('id')
          .executeTakeFirstOrThrow()
      ).id;
    else
      await transaction.updateTable('logistics.itemFamily').set(values).where('id', '=', familyId).execute();
    await appendEvent({
      eventType: itemFamilySavedEvent,
      data: {
        principalId: input.principalId,
        code: input.code,
        parentId: input.parentId,
        active: input.active,
      },
      objects: [{ type: ITEM_FAMILY, id: familyId }],
    });
    await signalChange(transaction, { objectType: ITEM_FAMILY, objectId: familyId, version: 1 });
    return { familyId };
  },
});

async function valuesOf(
  transaction: Parameters<typeof canSeePrincipal>[0],
  customFieldId: string,
): Promise<number> {
  const { count } = await transaction
    .selectFrom('logistics.itemCustomValue')
    .select(sql<number>`count(*)::int`.as('count'))
    .where('customFieldId', '=', customFieldId)
    .executeTakeFirstOrThrow();
  return count;
}

export const saveCustomFieldHandler = defineGestureHandler({
  definition: saveCustomField,
  async execute({ transaction, author, input, appendEvent }) {
    if (!(await canSeePrincipal(transaction, author.userId, input.principalId)))
      throw new GestureRefusal('unknownPrincipal');
    const listValues = input.fieldType === 'list' ? [...new Set(input.listValues)] : [];
    if (input.fieldType === 'list' && listValues.length === 0) throw new GestureRefusal('listValuesRequired');
    if (input.customFieldId !== null) {
      const existing = await transaction
        .selectFrom('logistics.customField')
        .select('fieldType')
        .where('id', '=', input.customFieldId)
        .where('principalId', '=', input.principalId)
        .executeTakeFirst();
      if (existing === undefined) throw new GestureRefusal('unknownCustomField');
      // Les valeurs déjà saisies restent lisibles : le type d'un champ renseigné ne change plus.
      if (existing.fieldType !== input.fieldType && (await valuesOf(transaction, input.customFieldId)) > 0)
        throw new GestureRefusal('fieldTypeLocked');
    }
    const taken = await transaction
      .selectFrom('logistics.customField')
      .select('id')
      .where('principalId', '=', input.principalId)
      .where(sql`lower(label)`, '=', input.label.toLowerCase())
      .$if(input.customFieldId !== null, (query) => query.where('id', '<>', input.customFieldId ?? ''))
      .executeTakeFirst();
    if (taken !== undefined) throw new GestureRefusal('nameTaken');
    const values = {
      label: input.label,
      fieldType: input.fieldType,
      listValues: JSON.stringify(listValues),
      required: input.required,
      active: input.active,
    };
    let customFieldId = input.customFieldId;
    if (customFieldId === null) {
      const { rank } = await transaction
        .selectFrom('logistics.customField')
        .select(sql<number>`coalesce(max(rank), -1)::int + 1`.as('rank'))
        .where('principalId', '=', input.principalId)
        .executeTakeFirstOrThrow();
      customFieldId = (
        await transaction
          .insertInto('logistics.customField')
          .values({ ...values, principalId: input.principalId, rank })
          .returning('id')
          .executeTakeFirstOrThrow()
      ).id;
    } else {
      await transaction
        .updateTable('logistics.customField')
        .set(values)
        .where('id', '=', customFieldId)
        .execute();
    }
    await appendEvent({
      eventType: customFieldSavedEvent,
      data: {
        principalId: input.principalId,
        fieldType: input.fieldType,
        required: input.required,
        active: input.active,
      },
      objects: [{ type: CUSTOM_FIELD, id: customFieldId }],
    });
    await signalChange(transaction, { objectType: CUSTOM_FIELD, objectId: customFieldId, version: 1 });
    return { customFieldId };
  },
});

/** Un champ renseigné se désactive seulement, avec le nombre de références concernées (RG-REF-037). */
export const removeCustomFieldHandler = defineGestureHandler({
  definition: removeCustomField,
  async execute({ transaction, author, input, appendEvent }) {
    const field = await transaction
      .selectFrom('logistics.customField')
      .select(['id', 'principalId'])
      .where('id', '=', input.customFieldId)
      .executeTakeFirst();
    if (field === undefined || !(await canSeePrincipal(transaction, author.userId, field.principalId)))
      throw new GestureRefusal('unknownCustomField');
    const itemCount = await valuesOf(transaction, field.id);
    const removal = itemCount === 0 ? ('deleted' as const) : ('deactivated' as const);
    if (removal === 'deleted')
      await transaction.deleteFrom('logistics.customField').where('id', '=', field.id).execute();
    else
      await transaction
        .updateTable('logistics.customField')
        .set({ active: false })
        .where('id', '=', field.id)
        .execute();
    await appendEvent({
      eventType: customFieldRemovedEvent,
      data: { removal, itemCount },
      objects: [{ type: CUSTOM_FIELD, id: field.id }],
    });
    await signalChange(transaction, { objectType: CUSTOM_FIELD, objectId: field.id, version: 1 });
    return { removal, itemCount };
  },
});

/** Devise unique du donneur d'ordre (RG-REF-049) ; l'ancienne reste dans l'événement (RG-SUR-125). */
export const setPrincipalCurrencyHandler = defineGestureHandler({
  definition: setPrincipalCurrency,
  async execute({ transaction, input, appendEvent }) {
    const principal = await transaction
      .selectFrom('logistics.principal')
      .select('currency')
      .where('id', '=', input.principalId)
      .executeTakeFirst();
    if (principal === undefined) throw new GestureRefusal('unknownPrincipal');
    await transaction
      .updateTable('logistics.principal')
      .set({ currency: input.currency })
      .where('id', '=', input.principalId)
      .execute();
    await appendEvent({
      eventType: principalCurrencyEvent,
      data: { previous: principal.currency, currency: input.currency },
      objects: [{ type: PRINCIPAL, id: input.principalId }],
    });
    await signalChange(transaction, { objectType: PRINCIPAL, objectId: input.principalId, version: 1 });
    return {};
  },
});
