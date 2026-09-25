import { buildApp } from './app.js';
import { readConfig } from './config.js';

const config = readConfig(process.env);

if (config.role === 'gestures') {
  const app = buildApp({ version: config.version });
  await app.listen({ host: config.host, port: config.port });
}
