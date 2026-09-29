import {
  addSiteClosures,
  listPublicHolidays,
  removeSiteClosure,
  saveSiteCalendar,
  type OpeningRange,
} from '@cairn/contrat';
import { z } from 'zod';
import type { Database, DatabaseTransaction } from '../database/index.js';
import { defineGestureHandler, GestureRefusal } from '../gesture/index.js';
import { defineQueryHandler } from '../query/index.js';
import { signalChange } from '../signal/index.js';
import { defineTraceEventType } from '../trace-event/index.js';
import type { SiteCalendar } from './calendar.js';
import { frenchPublicHolidays } from './holidays.js';

export const SITE = 'Site';

async function requireSite(transaction: DatabaseTransaction, siteId: string): Promise<void> {
  const site = await transaction
    .selectFrom('foundation.site')
    .select('id')
    .where('id', '=', siteId)
    .executeTakeFirst();
  if (site === undefined) throw new GestureRefusal('unknownSite');
}

const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
};

/** Deux plages d'un même jour ne se chevauchent pas, et chacune ouvre avant de fermer. */
function rangesAreValid(ranges: readonly OpeningRange[]): boolean {
  for (let weekday = 1; weekday <= 7; weekday += 1) {
    const day = ranges
      .filter((range) => range.weekday === weekday)
      .map((range) => [toMinutes(range.opensAt), toMinutes(range.closesAt)] as const)
      .sort((left, right) => left[0] - right[0]);
    for (const [index, [opens, closes]] of day.entries()) {
      if (opens >= closes) return false;
      const next = day[index + 1];
      if (next !== undefined && next[0] < closes) return false;
    }
  }
  return true;
}

export const siteCalendarSavedEvent = defineTraceEventType(
  'siteCalendarSaved',
  z.object({
    openingRanges: z.array(z.object({ weekday: z.int(), opensAt: z.string(), closesAt: z.string() })),
  }),
);

/**
 * Plages d'ouverture hebdomadaires du site (RG-ORG-031). Un changement vaut pour la suite : les délais
 * figés ne sont pas recalculés (0.1, cas limites).
 */
export const saveSiteCalendarHandler = defineGestureHandler({
  definition: saveSiteCalendar,
  scope: (input) => Promise.resolve({ siteId: input.siteId }),
  async execute({ transaction, input, appendEvent }) {
    await requireSite(transaction, input.siteId);
    if (!rangesAreValid(input.openingRanges)) throw new GestureRefusal('overlappingRanges');
    await transaction.deleteFrom('foundation.siteOpeningRange').where('siteId', '=', input.siteId).execute();
    if (input.openingRanges.length > 0) {
      await transaction
        .insertInto('foundation.siteOpeningRange')
        .values(input.openingRanges.map((range) => ({ siteId: input.siteId, ...range })))
        .execute();
    }
    await appendEvent({
      eventType: siteCalendarSavedEvent,
      data: { openingRanges: input.openingRanges },
      objects: [{ type: SITE, id: input.siteId }],
    });
    await signalChange(transaction, { objectType: SITE, objectId: input.siteId, version: 1 });
    return {};
  },
});

export const siteClosuresAddedEvent = defineTraceEventType(
  'siteClosuresAdded',
  z.object({ closures: z.array(z.object({ day: z.string(), kind: z.string(), label: z.string() })) }),
);

/** Jours fériés et fermetures exceptionnelles, par date (RG-ORG-032) ; une date déjà fermée reste telle. */
export const addSiteClosuresHandler = defineGestureHandler({
  definition: addSiteClosures,
  scope: (input) => Promise.resolve({ siteId: input.siteId }),
  async execute({ transaction, input, appendEvent }) {
    await requireSite(transaction, input.siteId);
    const added = await transaction
      .insertInto('foundation.siteClosure')
      .values(input.closures.map((closure) => ({ siteId: input.siteId, ...closure })))
      .onConflict((conflict) => conflict.columns(['siteId', 'day']).doNothing())
      .returning('day')
      .execute();
    const closures = input.closures.filter((closure) => added.some((row) => row.day === closure.day));
    if (closures.length > 0) {
      await appendEvent({
        eventType: siteClosuresAddedEvent,
        data: { closures },
        objects: [{ type: SITE, id: input.siteId }],
      });
      await signalChange(transaction, { objectType: SITE, objectId: input.siteId, version: 1 });
    }
    return { added: closures.length };
  },
});

export const siteClosureRemovedEvent = defineTraceEventType(
  'siteClosureRemoved',
  z.object({ day: z.string() }),
);

export const removeSiteClosureHandler = defineGestureHandler({
  definition: removeSiteClosure,
  scope: (input) => Promise.resolve({ siteId: input.siteId }),
  async execute({ transaction, input, appendEvent }) {
    await requireSite(transaction, input.siteId);
    const removed = await transaction
      .deleteFrom('foundation.siteClosure')
      .where('siteId', '=', input.siteId)
      .where('day', '=', input.day)
      .executeTakeFirst();
    if (removed.numDeletedRows > 0n) {
      await appendEvent({
        eventType: siteClosureRemovedEvent,
        data: { day: input.day },
        objects: [{ type: SITE, id: input.siteId }],
      });
      await signalChange(transaction, { objectType: SITE, objectId: input.siteId, version: 1 });
    }
    return {};
  },
});

/** Le modèle national, proposé avant d'être ajouté (0.1, parcours « Créer un site », étape 3). */
export const listPublicHolidaysHandler = defineQueryHandler({
  definition: listPublicHolidays,
  permissions: ['administerSites'],
  execute({ input }) {
    return Promise.resolve({ holidays: [...frenchPublicHolidays(input.year)] });
  },
});

/** Le calendrier d'un site, pour compter en heures ouvrées ; aucun s'il n'a pas de plage (RG-ORG-034). */
export async function loadSiteCalendar(db: Database, siteId: string): Promise<SiteCalendar | undefined> {
  const site = await db
    .selectFrom('foundation.site')
    .select('timeZone')
    .where('id', '=', siteId)
    .executeTakeFirst();
  if (site === undefined) return undefined;
  const ranges = await db
    .selectFrom('foundation.siteOpeningRange')
    .select(['weekday', 'opensAt', 'closesAt'])
    .where('siteId', '=', siteId)
    .execute();
  if (ranges.length === 0) return undefined;
  const closures = await db
    .selectFrom('foundation.siteClosure')
    .select('day')
    .where('siteId', '=', siteId)
    .execute();
  return {
    timeZone: site.timeZone,
    ranges: ranges.map((range) => ({
      ...range,
      opensAt: range.opensAt.slice(0, 5),
      closesAt: range.closesAt.slice(0, 5),
    })),
    closedDays: new Set(closures.map((closure) => closure.day)),
  };
}
