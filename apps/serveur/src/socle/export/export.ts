import { recordListExport } from '@cairn/contrat';
import { z } from 'zod';
import { defineGestureHandler } from '../gesture/index.js';
import { defineTraceEventType, type TraceObject } from '../trace-event/index.js';

/**
 * Un export de liste : la liste, son nombre de lignes, le périmètre appliqué (RG-SUR-102). L'auteur et
 * l'horodatage sont ceux de l'événement. La liste est désignée par le nom de son tableau, jamais par ce
 * qu'elle contient : l'événement ne porte aucune donnée d'un tiers (fiche 0022, règle 2).
 */
export const listExportedEvent = defineTraceEventType(
  'listExported',
  z.object({
    list: z.string(),
    rows: z.int().nonnegative(),
    siteId: z.uuid().nullable(),
    principalId: z.uuid().nullable(),
  }),
);

/**
 * Trace l'export d'une liste, que l'écran a déjà écrit à partir du tableau affiché (fiche 0033). Admis
 * depuis un poste non déclaré : un export est une consultation emportée, pas une opération ; il se
 * trace quand même, poste compris quand il est connu.
 */
export const recordListExportHandler = defineGestureHandler({
  definition: recordListExport,
  allowUndeclaredWorkstation: true,
  async execute({ author, input, appendEvent }) {
    // L'événement se retrouve depuis l'utilisateur, et depuis le site et le donneur d'ordre exportés.
    const objects: [TraceObject, ...TraceObject[]] = [{ type: 'User', id: author.userId }];
    if (input.siteId !== null) objects.push({ type: 'Site', id: input.siteId });
    if (input.principalId !== null) objects.push({ type: 'Principal', id: input.principalId });
    await appendEvent({
      eventType: listExportedEvent,
      data: { list: input.list, rows: input.rows, siteId: input.siteId, principalId: input.principalId },
      objects,
    });
    return {};
  },
});
