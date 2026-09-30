import { randomUUID } from 'node:crypto';
import {
  APPLICATION_HEADER,
  APPLICATION_HEADER_VALUE,
  QUERY_INPUT_PARAMETER,
  queryPath,
  type SearchResult,
} from '@cairn/contrat';
import Fastify from 'fastify';
import { afterAll, describe, expect, it } from 'vitest';
import { openApplicationDatabase } from '../../test-support/database.js';
import { registerQueries } from '../query/index.js';
import { readObjectHistory } from '../trace-event/index.js';
import { searchHandler, type SearchSource } from './index.js';

const db = openApplicationDatabase();
afterAll(async () => {
  await db.destroy();
});

// Une source de test : le texte cherché est l'identifiant d'une référence, visible ou non.
const hidden = randomUUID();
const shown = randomUUID();
const result = (id: string, outOfScope: boolean): SearchResult => ({
  type: 'item',
  id,
  code: outOfScope ? null : 'A',
  label: outOfScope ? null : 'Référence A',
  principalCode: 'P',
  siteCode: null,
  outOfScope,
  exact: true,
  inactiveCode: false,
});
const source: SearchSource = (_db, _userId, text) =>
  Promise.resolve(text === 'A' ? [result(hidden, true), result(shown, false)] : []);

const app = Fastify();
registerQueries(app, {
  db,
  resolveUser: (request) => {
    const user = request.headers['x-test-user'];
    return Promise.resolve(typeof user === 'string' ? user : null);
  },
  handlers: [searchHandler([source])],
});

const find = (user: string, text: string) =>
  app.inject({
    method: 'GET',
    url: `${queryPath('search')}?${QUERY_INPUT_PARAMETER}=${encodeURIComponent(JSON.stringify({ text }))}`,
    headers: { [APPLICATION_HEADER]: APPLICATION_HEADER_VALUE, 'x-test-user': user },
  });

describe('recherche qui signale un objet hors du périmètre', () => {
  it("trace le refus, attribué à l'utilisateur et désignant l'objet (RG-SUR-064, 065)", async () => {
    const user = randomUUID();
    const response = await find(user, 'A');
    expect(response.statusCode).toBe(200);
    const [event] = await readObjectHistory(db, { type: 'Item', id: hidden });
    expect(event).toMatchObject({
      type: 'queryRefused',
      authorUserId: user,
      data: { query: 'search', reason: 'outOfScope' },
    });
    // Un seul événement pour l'utilisateur : l'objet visible ne se trace pas.
    expect((await readObjectHistory(db, { type: 'User', id: user })).map((entry) => entry.id)).toEqual([
      event?.id,
    ]);
    expect(await readObjectHistory(db, { type: 'Item', id: shown })).toEqual([]);
  });
});
