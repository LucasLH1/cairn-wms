import { fr } from '@cairn/libelles';
import { Banner } from '@cairn/ui';
import { useTranslation } from 'react-i18next';
import { refusalValues } from './refusal.js';
import type { GestureRefusalState } from './useGesture.js';

const isRemainingKind = (kind: string): kind is keyof typeof fr.remainingKind =>
  Object.hasOwn(fr.remainingKind, kind);

/**
 * Le refus d'un geste, dans le bandeau de la maquette. Un décompte de ce qui reste à solder s'y ajoute
 * quand le refus en porte un (RG-ORG-009 : « le refus indique précisément ce qui reste à solder »).
 */
export function RefusalBanner({
  refusal,
  onDismiss,
}: {
  refusal: GestureRefusalState | undefined;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  if (refusal === undefined) return null;
  const counts = Object.entries(refusal.details ?? {}).filter(([, value]) => typeof value === 'number');
  return (
    <Banner tone="bad" dismissLabel={t('shell.dismiss')} onDismiss={onDismiss}>
      {t(refusal.key, refusalValues(refusal.details))}
      {refusal.key === 'refusal.activityRemaining' && counts.length > 0
        ? ` ${t('administration.remaining', {
            detail: counts
              .map(
                ([kind, count]) =>
                  `${String(count)} ${isRemainingKind(kind) ? t(`remainingKind.${kind}`) : kind}`,
              )
              .join(', '),
          })}`
        : ''}
    </Banner>
  );
}
