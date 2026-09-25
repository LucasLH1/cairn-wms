import { randomUUID } from 'node:crypto';
import { sql } from 'kysely';
import { afterAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { applicationConnection, openApplicationDatabase } from '../../test-support/database.js';
import { appendTraceEvent, defineTraceEventType, readObjectHistory } from '../trace-event/index.js';
import { addJob, countPermanentlyFailedJobs, defineJob, runDueJobs } from './index.js';

const db = openApplicationDatabase();
afterAll(async () => {
  await db.destroy();
});

const jobDone = defineTraceEventType('testJobDone', z.object({}));

/** Traitement de test rejouable : il n'agit que si son effet n'existe pas déjà (fiche 0028, règle 4). */
const recordDone = defineJob({
  name: 'testRecordDone',
  payload: z.object({ subjectId: z.uuid() }),
  async run({ subjectId }, { db: database }) {
    const done = await readObjectHistory(database, { type: 'TestSubject', id: subjectId });
    if (done.length > 0) return;
    await database.transaction().execute((transaction) =>
      appendTraceEvent(transaction, {
        eventType: jobDone,
        data: {},
        author: { origin: 'job' },
        objects: [{ type: 'TestSubject', id: subjectId }],
      }),
    );
  },
});

const runner = { connection: applicationConnection(), db, jobs: [recordDone] };
const done = (subjectId: string) => readObjectHistory(db, { type: 'TestSubject', id: subjectId });

describe('traitements différés (fiche 0028)', () => {
  it('exécute un traitement ajouté dans la transaction validée du geste', async () => {
    const subjectId = randomUUID();
    await db.transaction().execute((transaction) => addJob(transaction, recordDone, { subjectId }));
    await runDueJobs(runner);
    expect(await done(subjectId)).toHaveLength(1);
  });

  it("n'ajoute rien quand le geste est annulé (règle 3)", async () => {
    const subjectId = randomUUID();
    await expect(
      db.transaction().execute(async (transaction) => {
        await addJob(transaction, recordDone, { subjectId });
        throw new Error('geste refusé');
      }),
    ).rejects.toThrow('geste refusé');
    await runDueJobs(runner);
    expect(await done(subjectId)).toEqual([]);
  });

  it("rejoué, n'a pas d'effet double (règle 4)", async () => {
    const subjectId = randomUUID();
    for (const key of ['a', 'b']) {
      await db
        .transaction()
        .execute((transaction) =>
          addJob(transaction, recordDone, { subjectId }, { key: `${subjectId}-${key}` }),
        );
      await runDueJobs(runner);
    }
    expect(await done(subjectId)).toHaveLength(1);
  });

  it('refuse une charge hors schéma dès l’ajout', async () => {
    await expect(
      db
        .transaction()
        .execute((transaction) => addJob(transaction, recordDone, { subjectId: 'pas-un-uuid' })),
    ).rejects.toThrow();
  });

  it('compte un traitement en échec définitif, qui reste relançable (règle 5)', async () => {
    const before = await countPermanentlyFailedJobs(db);
    // Une charge écrite hors du contrat, comme par une version antérieure : elle échoue à l'exécution.
    await sql`select graphile_worker.add_job('testRecordDone', '{"subjectId": 1}'::json, max_attempts => 1)`.execute(
      db,
    );
    await runDueJobs(runner);
    expect(await countPermanentlyFailedJobs(db)).toBe(before + 1);
  });
});
