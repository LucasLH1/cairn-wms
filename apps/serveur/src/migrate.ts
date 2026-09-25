import { migrateToLatest, readMigrationSettings } from './socle/database/index.js';

// Point d'entrée lancé avant les deux rôles (fiches 0015, 0021) : amorce, migre, puis rend la main.
const applied = await migrateToLatest(readMigrationSettings(process.env));
process.stdout.write(`${JSON.stringify({ event: 'migrations-applied', migrations: applied })}\n`);
