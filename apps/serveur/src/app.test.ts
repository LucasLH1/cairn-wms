import { describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { readConfig } from './config.js';

describe('routes techniques', () => {
  const app = buildApp({ version: 'abc1234' });

  it('/live répond tant que le processus répond', async () => {
    const response = await app.inject({ method: 'GET', url: '/live' });
    expect(response.statusCode).toBe(200);
  });

  it('/version rend le commit servi', async () => {
    const response = await app.inject({ method: 'GET', url: '/version' });
    expect(response.json()).toEqual({ version: 'abc1234' });
  });
});

describe('configuration', () => {
  it('refuse un rôle inconnu', () => {
    expect(() => readConfig({ CAIRN_ROLE: 'autre' })).toThrow();
    expect(readConfig({ CAIRN_ROLE: 'jobs' }).role).toBe('jobs');
  });
});
