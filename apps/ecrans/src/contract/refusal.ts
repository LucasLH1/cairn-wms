import type { fr } from '@cairn/libelles';

type RefusalReason = keyof typeof fr.refusal;
export type RefusalLabelKey = `refusal.${RefusalReason}`;

function isKnown(reason: string, labels: typeof fr.refusal): reason is RefusalReason {
  return Object.hasOwn(labels, reason);
}

/**
 * Clé du libellé d'un motif de refus. Tout motif du contrat a son libellé : un test le vérifie ; un
 * motif inconnu ne s'invente pas, il retombe sur « saisie invalide ».
 */
export function refusalLabelKey(reason: string, labels: typeof fr.refusal): RefusalLabelKey {
  return isKnown(reason, labels) ? (`refusal.${reason}` as const) : 'refusal.invalidInput';
}
