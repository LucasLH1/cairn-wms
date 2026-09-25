import { buildApp } from './app.js';
import { readConfig } from './config.js';
import { createDatabase, readApplicationConnection } from './socle/database/index.js';
import { databaseHealthCheck } from './socle/health/index.js';

const config = readConfig(process.env);
const db = createDatabase(readApplicationConnection(process.env));

if (config.role === 'gestures') {
  const app = buildApp({ version: config.version, healthChecks: { database: databaseHealthCheck(db) } });
  app.addHook('onClose', () => db.destroy());
  await app.listen({ host: config.host, port: config.port });
}
