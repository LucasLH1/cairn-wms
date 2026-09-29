import { randomUUID } from 'node:crypto';
import { numberingProblems } from '@cairn/contrat';
import { afterAll, describe, expect, it } from 'vitest';
import { openAdminDatabase, openApplicationDatabase } from '../../test-support/database.js';
import { nextNumber, NumberingExhaustedError } from './index.js';

const db = openApplicationDatabase();
const admin = openAdminDatabase();
afterAll(async () => {
  await Promise.all([db.destroy(), admin.destroy()]);
});

async function scheme(segments: object[]): Promise<string> {
  const objectType = `Test${randomUUID().slice(0, 8)}`;
  await admin
    .insertInto('foundation.numberingScheme')
    .values({ objectType, segments: JSON.stringify(segments) })
    .execute();
  return objectType;
}

const next = (objectType: string, context = {}) =>
  db.transaction().execute((transaction) => nextNumber(transaction, objectType, context));

describe('numérotation (RG-ORG-025 à 030)', () => {
  it('compose les segments, et cloisonne le compteur par site et par année', async () => {
    const type = await scheme([
      { kind: 'literal', value: `R${randomUUID().slice(0, 4)}-` },
      { kind: 'site' },
      { kind: 'literal', value: '-' },
      { kind: 'year' },
      { kind: 'counter', width: 3 },
    ]);
    const at = new Date('2026-09-29T10:00:00Z');
    const a1 = await next(type, { siteCode: 'A', at });
    const a2 = await next(type, { siteCode: 'A', at });
    const b1 = await next(type, { siteCode: 'B', at });
    const nextYear = await next(type, { siteCode: 'A', at: new Date('2027-01-02T10:00:00Z') });
    expect(a1.endsWith('-A-2026001')).toBe(true);
    expect(a2.endsWith('-A-2026002')).toBe(true);
    expect(b1.endsWith('-B-2026001')).toBe(true);
    expect(nextYear.endsWith('-A-2027001')).toBe(true);
  });

  it('bloque la création quand le compteur atteint sa borne, sans jamais revenir à zéro', async () => {
    const type = await scheme([
      { kind: 'literal', value: `X${randomUUID().slice(0, 4)}` },
      { kind: 'counter', width: 1 },
    ]);
    for (let index = 1; index <= 9; index += 1) await next(type);
    await expect(next(type)).rejects.toBeInstanceOf(NumberingExhaustedError);
  });

  it("refuse une composition qui ne garantit pas l'unicité, en nommant ce qui manque (RG-ORG-027)", () => {
    expect(
      numberingProblems(
        [
          { kind: 'counter', width: 4 },
          { kind: 'literal', value: 'X' },
        ],
        [],
      ),
    ).toContain('leadingLiteralRequired');
    expect(
      numberingProblems(
        [
          { kind: 'literal', value: 'AT' },
          { kind: 'counter', width: 4 },
        ],
        ['AT-'],
      ),
    ).toContain('leadingLiteralTaken');
    expect(
      numberingProblems(
        [
          { kind: 'literal', value: 'R-' },
          { kind: 'site' },
          { kind: 'principal' },
          { kind: 'counter', width: 4 },
        ],
        [],
      ),
    ).toEqual(['separatorRequired']);
    expect(
      numberingProblems(
        [{ kind: 'literal', value: 'R-' }, { kind: 'month' }, { kind: 'counter', width: 4 }],
        [],
      ),
    ).toEqual(['yearRequiredForMonth']);
    expect(
      numberingProblems(
        [{ kind: 'literal', value: 'R-' }, { kind: 'year' }, { kind: 'counter', width: 4 }],
        ['AT-'],
      ),
    ).toEqual([]);
  });
});
