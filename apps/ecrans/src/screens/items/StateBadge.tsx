import type { ItemState } from '@cairn/contrat';
import { StatusBadge } from '@cairn/ui';
import { useTranslation } from 'react-i18next';

const tones = { draft: 'warn', active: 'ok', dormant: 'mute', obsolete: 'bad' } as const;

/** L'état d'une référence (RG-REF-005) : un brouillon attend d'être complété. */
export function StateBadge({ state }: { state: ItemState }) {
  const { t } = useTranslation();
  return <StatusBadge tone={tones[state]}>{t(`item.states.${state}`)}</StatusBadge>;
}
