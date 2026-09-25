import { describe, expect, it } from 'vitest';
import { commonRefusalSchema, gestureIdSchema } from './index.js';

describe('contrat', () => {
  it('accepte un identifiant de geste au format UUID et refuse le reste', () => {
    expect(gestureIdSchema.safeParse('0199b6a0-3f7e-7c1a-9d2e-5b4c3a2f1e0d').success).toBe(true);
    expect(gestureIdSchema.safeParse('pas-un-identifiant').success).toBe(false);
  });

  it('refuse un motif de refus hors du catalogue fermé', () => {
    expect(commonRefusalSchema.safeParse({ outcome: 'refused', reason: 'permissionDenied' }).success).toBe(
      true,
    );
    expect(commonRefusalSchema.safeParse({ outcome: 'refused', reason: 'autre chose' }).success).toBe(false);
  });
});
