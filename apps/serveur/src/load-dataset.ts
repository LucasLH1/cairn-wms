import { loadScenarioDataset } from './dataset/index.js';
import { createDatabase, readApplicationConnection } from './socle/database/index.js';

// Charge le jeu de données des scénarios dans une base migrée et vide (`pnpm db:reset`, tests de bout en bout).
const db = createDatabase(readApplicationConnection(process.env), 1);
try {
  const report = await loadScenarioDataset(db);
  process.stdout.write(`${JSON.stringify({ event: 'dataset-loaded', objects: report })}\n`);
} finally {
  await db.destroy();
}
