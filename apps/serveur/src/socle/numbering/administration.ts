import {
  listNumberingSchemes,
  numberingProblems,
  numberingSegmentsSchema,
  saveNumberingScheme,
} from '@cairn/contrat';
import { z } from 'zod';
import { defineGestureHandler, GestureRefusal } from '../gesture/index.js';
import { defineQueryHandler } from '../query/index.js';
import { defineTraceEventType } from '../trace-event/index.js';

/** Schémas de numérotation par type d'objet (RG-ORG-025). */
export const listNumberingSchemesHandler = defineQueryHandler({
  definition: listNumberingSchemes,
  permissions: ['administerNumbering'],
  async execute({ db }) {
    const rows = await db
      .selectFrom('foundation.numberingScheme')
      .select(['objectType', 'segments'])
      .orderBy('objectType')
      .execute();
    return {
      schemes: rows.map((row) => ({
        objectType: row.objectType,
        segments: numberingSegmentsSchema.parse(row.segments),
      })),
    };
  },
});

export const numberingSchemeSavedEvent = defineTraceEventType(
  'numberingSchemeSaved',
  z.object({
    objectType: z.string(),
    segments: z.array(z.record(z.string(), z.union([z.string(), z.number()]))),
  }),
);

/**
 * Compose le schéma d'un type d'objet (RG-ORG-026). Refusé s'il ne garantit pas l'unicité, en nommant
 * ce qui manque (RG-ORG-027) ; il ne vaut que pour les objets créés ensuite (RG-ORG-029).
 */
export const saveNumberingSchemeHandler = defineGestureHandler({
  definition: saveNumberingScheme,
  async execute({ transaction, input, appendEvent }) {
    const schemes = await transaction
      .selectFrom('foundation.numberingScheme')
      .select(['objectType', 'segments'])
      .execute();
    if (!schemes.some((scheme) => scheme.objectType === input.objectType))
      throw new GestureRefusal('unknownObjectType');
    const others = schemes
      .filter((scheme) => scheme.objectType !== input.objectType)
      .map((scheme) => numberingSegmentsSchema.parse(scheme.segments)[0])
      .flatMap((segment) => (segment?.kind === 'literal' ? [segment.value] : []));
    const problems = numberingProblems(input.segments, others);
    if (problems.length > 0) throw new GestureRefusal('numberingNotUnique', { problem: problems.join(',') });
    await transaction
      .updateTable('foundation.numberingScheme')
      .set({ segments: JSON.stringify(input.segments) })
      .where('objectType', '=', input.objectType)
      .execute();
    await appendEvent({
      eventType: numberingSchemeSavedEvent,
      data: { objectType: input.objectType, segments: input.segments },
      objects: [{ type: 'NumberingScheme', id: input.objectType }],
    });
    return {};
  },
});
