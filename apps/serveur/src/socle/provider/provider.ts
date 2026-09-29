import { getProvider, saveProvider } from '@cairn/contrat';
import { z } from 'zod';
import { defineGestureHandler } from '../gesture/index.js';
import { defineQueryHandler } from '../query/index.js';
import { defineTraceEventType } from '../trace-event/index.js';

/** Le prestataire est le contexte de l'instance : une seule fiche, son nom (RG-ORG-001). */
export const getProviderHandler = defineQueryHandler({
  definition: getProvider,
  async execute({ db }) {
    const provider = await db.selectFrom('foundation.provider').select('name').executeTakeFirst();
    return { name: provider?.name ?? null };
  },
});

export const providerSavedEvent = defineTraceEventType('providerSaved', z.object({ name: z.string() }));

export const saveProviderHandler = defineGestureHandler({
  definition: saveProvider,
  async execute({ transaction, input, appendEvent }) {
    await transaction.updateTable('foundation.provider').set({ name: input.name }).execute();
    await appendEvent({
      eventType: providerSavedEvent,
      data: { name: input.name },
      objects: [{ type: 'Provider', id: 'instance' }],
    });
    return {};
  },
});
