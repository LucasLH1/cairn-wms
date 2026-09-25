import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';
import { createDatabase } from '../database/index.js';
import { applicationConnection, openApplicationDatabase } from '../../test-support/database.js';
import { databaseHealthCheck } from './index.js';

const app = openApplicationDatabase();
const unreachable = createDatabase({ ...applicationConnection(), port: 1 }, 1);

afterAll(async () => {
  await Promise.all([app.destroy(), unreachable.destroy()]);
});

describe('/health (fiche 0029, règle 2)', () => {
  it("dit l'instance utilisable quand la base répond et est migrée", async () => {
    const server = buildApp({ version: 'test', healthChecks: { database: databaseHealthCheck(app) } });
    const response = await server.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });

  it('la dit dégradée quand la base ne répond pas', async () => {
    const server = buildApp({
      version: 'test',
      healthChecks: { database: databaseHealthCheck(unreachable) },
    });
    const response = await server.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ status: 'degraded', checks: { database: 'database unreachable' } });
  });
});
