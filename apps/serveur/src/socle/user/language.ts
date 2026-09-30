import { setOwnLanguage } from '@cairn/contrat';
import { z } from 'zod';
import { defineGestureHandler } from '../gesture/index.js';
import { defineTraceEventType } from '../trace-event/index.js';
import { USER } from './administration.js';

export const languageChangedEvent = defineTraceEventType(
  'interfaceLanguageChanged',
  z.object({ language: z.string() }),
);

/**
 * Langue de l'interface de l'auteur, conservée sur son compte (RG-EXI-079). Admise sans poste
 * déclaré : elle ne touche aucune opération, seulement l'affichage de celui qui la choisit.
 */
export const setOwnLanguageHandler = defineGestureHandler({
  definition: setOwnLanguage,
  allowUndeclaredWorkstation: true,
  async execute({ transaction, author, input, appendEvent }) {
    await transaction
      .updateTable('foundation.user')
      .set({ language: input.language })
      .where('id', '=', author.userId)
      .execute();
    await appendEvent({
      eventType: languageChangedEvent,
      data: { language: input.language },
      objects: [{ type: USER, id: author.userId }],
    });
    return {};
  },
});
