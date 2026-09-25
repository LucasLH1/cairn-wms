import { buildApp } from './app.js';
import { readConfig } from './config.js';
import { createDatabase, readApplicationConnection } from './socle/database/index.js';
import { databaseHealthCheck } from './socle/health/index.js';
import { startJobRunner } from './socle/job/index.js';
import { SignalRelay } from './socle/signal/index.js';
import { readAccessConfig } from './socle/user/index.js';

const config = readConfig(process.env);
const connection = readApplicationConnection(process.env);
const db = createDatabase(connection);

if (config.role === 'gestures') {
  const relay = new SignalRelay(connection);
  await relay.start();
  const app = buildApp({
    version: config.version,
    healthChecks: {
      database: databaseHealthCheck(db),
      signals: () => Promise.resolve(relay.listening ? undefined : 'signal relay not listening'),
    },
    services: { db, access: readAccessConfig(process.env), relay },
  });
  app.addHook('onClose', async () => {
    await relay.stop();
    await db.destroy();
  });
  await app.listen({ host: config.host, port: config.port });
}

if (config.role === 'jobs') {
  // Rôle « traitements » (fiches 0017, 0028) : la file seule, sans route HTTP. Les traitements du
  // produit s'inscrivent ici à mesure que les modules en déclarent.
  const runner = await startJobRunner({ connection, db, jobs: [] });
  await runner.promise;
  await db.destroy();
}
