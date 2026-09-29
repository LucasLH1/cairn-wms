import { z } from 'zod';
import { loadScenarioDataset } from './dataset/index.js';
import { createDatabase, readApplicationConnection } from './socle/database/index.js';

// Charge le jeu de données des scénarios dans une base migrée et vide (`pnpm db:reset`, tests de bout en bout).
// Le compte d'administration local vient du `.env` du poste, s'il y est déclaré.
// Une variable laissée vide, comme dans le modèle `.env.example`, vaut « aucun compte local ».
const filled = z.preprocess((value) => (value === '' ? undefined : value), z.string().min(1).optional());
const local = z
  .object({
    CAIRN_LOCAL_ADMIN_LOGIN: filled,
    CAIRN_LOCAL_ADMIN_EMAIL: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.email().optional(),
    ),
    CAIRN_LOCAL_ADMIN_PASSWORD: filled,
  })
  .parse(process.env);
const db = createDatabase(readApplicationConnection(process.env), 1);
try {
  const report = await loadScenarioDataset(
    db,
    local.CAIRN_LOCAL_ADMIN_LOGIN !== undefined && local.CAIRN_LOCAL_ADMIN_PASSWORD !== undefined
      ? {
          loginName: local.CAIRN_LOCAL_ADMIN_LOGIN,
          email: local.CAIRN_LOCAL_ADMIN_EMAIL ?? null,
          password: local.CAIRN_LOCAL_ADMIN_PASSWORD,
        }
      : undefined,
  );
  process.stdout.write(`${JSON.stringify({ event: 'dataset-loaded', objects: report })}\n`);
} finally {
  await db.destroy();
}
