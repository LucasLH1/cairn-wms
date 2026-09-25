import { loadScenarioDataset } from './dataset/index.js';

// Charge le jeu de données des scénarios dans une base migrée (`pnpm db:reset`, tests de bout en bout).
const report = await loadScenarioDataset();
process.stdout.write(`${JSON.stringify({ event: 'dataset-loaded', objects: report })}\n`);
