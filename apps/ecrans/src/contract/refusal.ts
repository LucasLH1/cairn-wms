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

/** Détails d'un refus, tels que le contrat les porte. */
export type RefusalDetails = Readonly<Record<string, string | number | boolean>> | undefined;

/**
 * Valeurs d'interpolation d'un libellé de refus : chaque variable des libellés de refus, tirée des
 * détails du refus, vide si le refus ne la porte pas.
 */
export function refusalValues(details: RefusalDetails): {
  holder: string;
  name: string;
  dock: string;
  item: string;
  cycle: string;
} {
  const text = (key: string) => {
    const value = details?.[key];
    return value === undefined ? '' : String(value);
  };
  return {
    holder: text('holder'),
    name: text('name'),
    dock: text('dock'),
    item: text('item'),
    cycle: text('cycle'),
  };
}
