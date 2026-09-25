import { listDocks } from '@cairn/contrat';
import { sql } from 'kysely';
import type { DatabaseTransaction } from '../../socle/database/index.js';
import { canSeeSite } from '../../socle/permission/index.js';
import { defineQueryHandler, QueryRefusal } from '../../socle/query/index.js';

/** Un quai actif, avec son site, ou rien. */
export async function findActiveDock(transaction: DatabaseTransaction, dockId: string) {
  return transaction
    .selectFrom('logistics.dock as dock')
    .innerJoin('logistics.zone as zone', 'zone.id', 'dock.zoneId')
    .select(['dock.id', 'dock.code', 'zone.siteId'])
    .where('dock.id', '=', dockId)
    .where('dock.active', '=', true)
    .where('zone.active', '=', true)
    .executeTakeFirst();
}

/**
 * Quais d'un site, libres ou occupés : l'arrivage en cours, et qui l'a ouvert, lu dans le journal
 * plutôt que recopié (RG-EXI-016).
 */
export const listDocksHandler = defineQueryHandler({
  definition: listDocks,
  async execute({ db, userId, input }) {
    if (!(await canSeeSite(db, userId, input.siteId))) throw new QueryRefusal('outOfScope');
    const rows = await db
      .selectFrom('logistics.dock as dock')
      .innerJoin('logistics.zone as zone', 'zone.id', 'dock.zoneId')
      .leftJoin('logistics.inboundArrival as arrival', (join) =>
        join.onRef('arrival.dockId', '=', 'dock.id').on('arrival.releasedAt', 'is', null),
      )
      .leftJoin('logistics.party as carrier', 'carrier.id', 'arrival.carrierId')
      .select([
        'dock.id',
        'dock.code',
        'arrival.id as arrivalId',
        'arrival.vehicleIdentification',
        sql<
          string | null
        >`to_char(arrival.arrived_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`.as('arrivedAt'),
        'carrier.id as carrierId',
        'carrier.code as carrierCode',
        'carrier.name as carrierName',
        sql<string | null>`(
          select author.display_name
          from foundation.trace_event_object link
          join foundation.trace_event event on event.id = link.event_id and event.occurred_at = link.occurred_at
          join foundation."user" author on author.id = event.author_user_id
          where link.object_type = 'InboundArrival' and link.object_id = arrival.id::text
            and event.type = 'inboundArrivalOpened'
          limit 1
        )`.as('openedBy'),
      ])
      .where('zone.siteId', '=', input.siteId)
      .where('dock.active', '=', true)
      .orderBy('dock.code')
      .execute();
    return {
      docks: rows.map((row) => ({
        id: row.id,
        code: row.code,
        arrival:
          row.arrivalId === null || row.vehicleIdentification === null || row.arrivedAt === null
            ? null
            : {
                id: row.arrivalId,
                vehicleIdentification: row.vehicleIdentification,
                carrier:
                  row.carrierId === null || row.carrierCode === null || row.carrierName === null
                    ? null
                    : { id: row.carrierId, code: row.carrierCode, name: row.carrierName },
                arrivedAt: row.arrivedAt,
                openedBy: row.openedBy,
              },
      })),
    };
  },
});
