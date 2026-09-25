import { openInboundArrival } from '@cairn/contrat';
import { z } from 'zod';
import { defineGestureHandler, GestureRefusal } from '../../socle/gesture/index.js';
import { signalChange } from '../../socle/signal/index.js';
import { defineTraceEventType } from '../../socle/trace-event/index.js';
import { findActiveDock } from '../location/index.js';
import { findActiveCarrier } from '../party/index.js';

export const INBOUND_ARRIVAL = 'InboundArrival';

/**
 * Ouverture d'un arrivage. L'identification du véhicule vit dans l'arrivage, pas dans l'événement :
 * une plaque peut désigner une personne (fiche 0022, règle 2).
 */
export const inboundArrivalOpenedEvent = defineTraceEventType(
  'inboundArrivalOpened',
  z.object({ siteId: z.string(), dockId: z.string(), carrierId: z.string().nullable() }),
);

/** Ouvrir un arrivage sur un quai libre (RG-REC-001) ; le quai passe occupé (RG-EMP-046). */
export const openInboundArrivalHandler = defineGestureHandler({
  definition: openInboundArrival,
  async scope(input, transaction) {
    const dock = await findActiveDock(transaction, input.dockId);
    return dock === undefined ? {} : { siteId: dock.siteId };
  },
  async execute({ transaction, input, appendEvent }) {
    const dock = await findActiveDock(transaction, input.dockId);
    if (dock === undefined) throw new GestureRefusal('unknownDock');
    if (input.carrierId !== null && (await findActiveCarrier(transaction, input.carrierId)) === undefined) {
      throw new GestureRefusal('unknownCarrier');
    }
    // Un quai n'accueille qu'un véhicule : la base le garantit, même pour deux ouvertures simultanées.
    const arrival = await transaction
      .insertInto('logistics.inboundArrival')
      .values({
        siteId: dock.siteId,
        dockId: dock.id,
        vehicleIdentification: input.vehicleIdentification,
        carrierId: input.carrierId,
      })
      .onConflict((conflict) => conflict.column('dockId').where('releasedAt', 'is', null).doNothing())
      .returning(['id', 'version'])
      .executeTakeFirst();
    if (arrival === undefined) throw new GestureRefusal('dockOccupied', { dock: dock.code });
    await appendEvent({
      eventType: inboundArrivalOpenedEvent,
      data: { siteId: dock.siteId, dockId: dock.id, carrierId: input.carrierId },
      objects: [
        { type: INBOUND_ARRIVAL, id: arrival.id },
        { type: 'Dock', id: dock.id },
        { type: 'Site', id: dock.siteId },
        ...(input.carrierId === null ? [] : [{ type: 'Carrier', id: input.carrierId }]),
      ],
    });
    await signalChange(transaction, {
      objectType: INBOUND_ARRIVAL,
      objectId: arrival.id,
      version: arrival.version,
    });
    await signalChange(transaction, { objectType: 'Dock', objectId: dock.id, version: arrival.version });
    return { inboundArrivalId: arrival.id };
  },
});
