import { sql } from 'kysely';
import { afterAll, describe, expect, it } from 'vitest';
import { inject } from 'vitest';
import { openApplicationDatabase } from '../../test-support/database.js';
import { countPendingMigrations, migrateToLatest } from './index.js';

const app = openApplicationDatabase();

afterAll(async () => {
  await app.destroy();
});

describe('migrations', () => {
  it('ne laisse aucune migration en attente, et une seconde application ne fait rien', async () => {
    expect(await countPendingMigrations(app)).toBe(0);
    expect(await migrateToLatest(inject('migrationSettings'))).toEqual([]);
  });

  it('prépare les partitions du journal pour le mois courant et les suivants', async () => {
    const partitions = await sql<{ name: string }>`
      select relname as name from pg_class
      where relnamespace = 'foundation'::regnamespace and relname ~ '^trace_event_[0-9]{6}$'`.execute(app);
    const now = new Date();
    const expected = [0, 1, 2, 3].map((offset) => {
      const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
      return `trace_event_${month.toISOString().slice(0, 7).replace('-', '')}`;
    });
    expect(partitions.rows.map((row) => row.name)).toEqual(expect.arrayContaining(expected));
  });

  it("interdit au rôle de l'application de créer des objets dans la base", async () => {
    await expect(sql`create table logistics.intruder (id int)`.execute(app)).rejects.toThrow(
      /permission denied/u,
    );
  });
});
