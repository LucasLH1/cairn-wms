import { sql } from 'kysely';
import { z } from 'zod';
import type { Database } from '../../socle/database/index.js';
import { defineJob } from '../../socle/job/index.js';
import { appendTraceEvent, defineTraceEventType } from '../../socle/trace-event/index.js';
import { STOCK_HOLD } from './engine.js';

export const DAILY_SNAPSHOT = 'DailyStockSnapshot';

export const snapshotTakenEvent = defineTraceEventType(
  'dailyStockSnapshotTaken',
  z.object({ siteId: z.string(), date: z.string(), state: z.string(), lines: z.int() }),
);
export const expiryHoldEvent = defineTraceEventType(
  'stockExpiryHoldPlaced',
  z.object({ expiryDate: z.string() }),
);

/**
 * Fige le stock d'un site à une date : par donneur d'ordre, référence, état qualité et emplacement, la
 * quantité, les supports occupés et le volume s'il est connu (RG-STK-057, 058). En échec, la journée
 * est marquée comme telle — jamais un silence (RG-STK-061).
 */
export async function takeDailySnapshot(
  db: Database,
  siteId: string,
  date: string,
): Promise<'complete' | 'failed'> {
  try {
    await db.transaction().execute(async (transaction) => {
      const { id } = await transaction
        .insertInto('logistics.dailyStockSnapshot')
        .values({ siteId, snapshotDate: date, state: 'complete' })
        .returning('id')
        .executeTakeFirstOrThrow();
      const inserted = await sql`
        insert into logistics.daily_stock_snapshot_line
          (snapshot_id, principal_id, item_id, quality_state_id, location_id, quantity, handling_units, volume_cm3)
        select ${id}, unit.principal_id, unit.item_id, unit.quality_state_id, unit.location_id,
          sum(unit.quantity), count(distinct unit.handling_unit_id),
          case when bool_and(base.length_mm is not null and base.width_mm is not null and base.height_mm is not null)
            then ceil(sum(unit.quantity::bigint * base.length_mm * base.width_mm * base.height_mm) / 1000.0)::bigint end
        from logistics.stock_unit unit
        left join logistics.packaging_level base on base.item_id = unit.item_id and base.rank = 0
        where unit.site_id = ${siteId}
        group by unit.principal_id, unit.item_id, unit.quality_state_id, unit.location_id
      `.execute(transaction);
      const count = Number(inserted.numAffectedRows ?? 0);
      await appendTraceEvent(transaction, {
        eventType: snapshotTakenEvent,
        data: { siteId, date, state: 'complete', lines: count },
        author: { origin: 'snapshot' },
        objects: [{ type: DAILY_SNAPSHOT, id }],
      });
    });
    return 'complete';
  } catch (error) {
    // Une photo déjà prise ce jour-là n'est pas un échec : le traitement a seulement été rejoué.
    const already = await db
      .selectFrom('logistics.dailyStockSnapshot')
      .select('state')
      .where('siteId', '=', siteId)
      .where('snapshotDate', '=', date)
      .executeTakeFirst();
    if (already !== undefined) return already.state === 'complete' ? 'complete' : 'failed';
    await db
      .insertInto('logistics.dailyStockSnapshot')
      .values({
        siteId,
        snapshotDate: date,
        state: 'failed',
        failure: error instanceof Error ? error.message : 'failure',
      })
      .onConflict((conflict) => conflict.columns(['siteId', 'snapshotDate']).doNothing())
      .execute();
    return 'failed';
  }
}

/**
 * Prend la photo de chaque site actif dont l'heure locale a passé l'heure de photo et qui n'en a pas
 * encore pour ce jour (RG-STK-057, 060). Ce qui n'est pas figé le jour même est perdu : un jour manqué
 * reste absent, visible comme tel, et ne se rattrape pas le lendemain.
 */
export const takeDailySnapshotsJob = defineJob({
  name: 'takeDailyStockSnapshots',
  payload: z.object({}),
  async run(_payload, { db }) {
    const due = await sql<{ id: string; date: string }>`
      select site.id, (now() at time zone site.time_zone)::date::text as date
      from foundation.site site
      where site.active
        and (now() at time zone site.time_zone)::time >= site.snapshot_time
        and not exists (
          select 1 from logistics.daily_stock_snapshot snapshot
          where snapshot.site_id = site.id and snapshot.snapshot_date = (now() at time zone site.time_zone)::date)
    `.execute(db);
    for (const site of due.rows) await takeDailySnapshot(db, site.id, site.date);
  },
});

/**
 * Bloque le stock dont la date de péremption est atteinte, avec le motif correspondant (RG-STK-039) :
 * une seule fois par unité, rejouable sans effet double.
 */
export const blockExpiredStockJob = defineJob({
  name: 'blockExpiredStock',
  payload: z.object({}),
  async run(_payload, { db }) {
    const expired = await sql<{ id: string; expiryDate: string }>`
      select unit.id, unit.expiry_date::text as "expiryDate"
      from logistics.stock_unit unit
      join foundation.site site on site.id = unit.site_id
      where unit.expiry_date <= (now() at time zone site.time_zone)::date
        and not exists (select 1 from logistics.stock_hold hold
          where hold.stock_unit_id = unit.id and hold.origin = 'expiry' and hold.lifted_at is null)
      limit 1000
    `.execute(db);
    for (const unit of expired.rows)
      await db.transaction().execute(async (transaction) => {
        const { id } = await transaction
          .insertInto('logistics.stockHold')
          .values({
            scope: 'stockUnit',
            stockUnitId: unit.id,
            reason: `expiry:${unit.expiryDate}`,
            origin: 'expiry',
            allowsMove: true,
          })
          .returning('id')
          .executeTakeFirstOrThrow();
        await transaction
          .deleteFrom('logistics.stockReservation')
          .where('stockUnitId', '=', unit.id)
          .execute();
        await appendTraceEvent(transaction, {
          eventType: expiryHoldEvent,
          data: { expiryDate: unit.expiryDate },
          author: { origin: 'expiry' },
          objects: [{ type: STOCK_HOLD, id }],
        });
      });
  },
});
