import { migrateToLatest, readMigrationSettings } from './socle/database/index.js';
import { migrateJobQueue } from './socle/job/index.js';

// Point d'entrée lancé avant les deux rôles (fiches 0015, 0021) : amorce, migre, puis rend la main.
const settings = readMigrationSettings(process.env);
const applied = await migrateToLatest(settings);
// La file des traitements différés (fiche 0028) migre avec le reste, sous le même propriétaire.
await migrateJobQueue(settings.owner);
process.stdout.write(`${JSON.stringify({ event: 'migrations-applied', migrations: applied })}\n`);
