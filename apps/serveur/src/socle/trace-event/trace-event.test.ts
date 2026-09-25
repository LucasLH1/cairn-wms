import { randomUUID } from 'node:crypto';
import { sql } from 'kysely';
import { afterAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { openAdminDatabase, openApplicationDatabase } from '../../test-support/database.js';
import { appendTraceEvent, defineTraceEventType, readObjectHistory } from './index.js';

const testEventType = defineTraceEventType('testRecorded', z.object({ quantity: z.int() }));

const app = openApplicationDatabase();
const admin = openAdminDatabase();

afterAll(async () => {
  await Promise.all([app.destroy(), admin.destroy()]);
});

async function recordOne(objectId: string): Promise<string> {
  return app.transaction().execute(async (transaction) => {
    const recorded = await appendTraceEvent(transaction, {
      eventType: testEventType,
      data: { quantity: 3 },
      author: { userId: randomUUID() },
      objects: [{ type: 'Receipt', id: objectId }],
      gestureId: randomUUID(),
    });
    return recorded.id;
  });
}

/** Code d'erreur PostgreSQL d'une promesse rejetée. */
async function errorCodeOf(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise;
  } catch (error) {
    return z.object({ code: z.string() }).safeParse(error).data?.code;
  }
  return undefined;
}

describe('journal des événements', () => {
  it("rend l'historique d'un objet, du plus récent au plus ancien", async () => {
    const receiptId = randomUUID();
    const first = await recordOne(receiptId);
    const second = await recordOne(receiptId);
    const history = await readObjectHistory(app, { type: 'Receipt', id: receiptId });
    expect(history.map((entry) => entry.id)).toEqual([second, first]);
    expect(history[0]?.data).toEqual({ quantity: 3 });
  });

  it("n'enregistre rien si la transaction du geste échoue", async () => {
    const receiptId = randomUUID();
    await expect(
      app.transaction().execute(async (transaction) => {
        await appendTraceEvent(transaction, {
          eventType: testEventType,
          data: { quantity: 1 },
          author: { userId: randomUUID() },
          objects: [{ type: 'Receipt', id: receiptId }],
        });
        throw new Error('effet refusé');
      }),
    ).rejects.toThrow('effet refusé');
    expect(await readObjectHistory(app, { type: 'Receipt', id: receiptId })).toEqual([]);
  });

  it('refuse des données hors du schéma du type', async () => {
    await expect(
      app.transaction().execute((transaction) =>
        appendTraceEvent(transaction, {
          eventType: testEventType,
          data: { quantity: 1.5 },
          author: { origin: 'test' },
          objects: [{ type: 'Receipt', id: randomUUID() }],
        }),
      ),
    ).rejects.toThrow();
  });

  it('exige un auteur ou une origine', async () => {
    const code = await errorCodeOf(
      sql`insert into foundation.trace_event (type) values ('orphan')`.execute(app),
    );
    expect(code).toBe('23514');
  });
});

describe('ajout seul (fiche 0022, règle 1)', () => {
  it("refuse au rôle de l'application toute modification ou suppression", async () => {
    await recordOne(randomUUID());
    for (const statement of [
      sql`update foundation.trace_event set type = 'altered'`,
      sql`delete from foundation.trace_event`,
      sql`truncate foundation.trace_event cascade`,
      sql`update foundation.trace_event_object set object_id = 'altered'`,
      sql`delete from foundation.trace_event_object`,
    ]) {
      expect(await errorCodeOf(statement.execute(app))).toBe('42501');
    }
  });

  it("refuse aussi à l'administrateur, par le déclencheur, y compris sur une partition", async () => {
    await recordOne(randomUUID());
    const partition = `trace_event_${new Date().toISOString().slice(0, 7).replace('-', '')}`;
    for (const statement of [
      sql`update foundation.trace_event set type = 'altered'`,
      sql`delete from foundation.trace_event`,
      sql`truncate foundation.trace_event cascade`,
      sql`update ${sql.table(`foundation.${partition}`)} set type = 'altered'`,
      sql`delete from foundation.trace_event_object`,
    ]) {
      await expect(statement.execute(admin)).rejects.toThrow(/append-only/u);
    }
  });
});

describe('gestes reçus', () => {
  it("n'enregistre un identifiant de geste qu'une fois, sans jamais le réécrire", async () => {
    const id = randomUUID();
    const insert = sql`insert into foundation.gesture (id, name, outcome, response)
      values (${id}, 'test', 'accepted', '{}'::jsonb)`;
    await insert.execute(app);
    expect(await errorCodeOf(insert.execute(app))).toBe('23505');
    await expect(
      sql`update foundation.gesture set outcome = 'refused' where id = ${id}`.execute(admin),
    ).rejects.toThrow(/append-only/u);
  });
});
