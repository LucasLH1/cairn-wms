import {
  APPLICATION_HEADER,
  APPLICATION_HEADER_VALUE,
  openSessionInputSchema,
  permissionSchema,
  SESSION_CLOSE_PATH,
  SESSION_PATH,
  type CurrentSession,
} from '@cairn/contrat';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Database } from '../database/index.js';
import type { GestureRights } from '../gesture/index.js';
import { LoginAttempts } from './attempts.js';
import type { AccessConfig } from './config.js';
import { readCookie, serializeCookie, SESSION_COOKIE, WORKSTATION_COOKIE } from './cookie.js';
import { closeSession, openSession, resolveSession } from './session.js';
import { resolveWorkstation, workstationCookie } from './workstation.js';

export interface AccessOptions {
  readonly db: Database;
  readonly config: AccessConfig;
}

const refused = (reason: string) => ({ outcome: 'refused' as const, reason });

/** Permissions de l'utilisateur : l'union de celles de ses rôles (RG-ORG-021). */
async function permissionsOf(db: Database, userId: string): Promise<CurrentSession['permissions']> {
  const rows = await db
    .selectFrom('foundation.userRole as userRole')
    .innerJoin('foundation.rolePermission as rolePermission', 'rolePermission.roleId', 'userRole.roleId')
    .select('rolePermission.permission')
    .distinct()
    .where('userRole.userId', '=', userId)
    .execute();
  return rows.flatMap((row) => {
    const permission = permissionSchema.safeParse(row.permission);
    return permission.success ? [permission.data] : [];
  });
}

/** Sites de rattachement de l'utilisateur, et si son périmètre d'exécution les couvre. */
async function sitesOf(db: Database, userId: string): Promise<CurrentSession['sites']> {
  return db
    .selectFrom('foundation.userSite as userSite')
    .innerJoin('foundation.site as site', 'site.id', 'userSite.siteId')
    .select(['site.id', 'site.code', 'site.name', 'userSite.execution'])
    .where('userSite.userId', '=', userId)
    .orderBy('site.code')
    .execute();
}

/**
 * Routes de session du contrat : ouvrir, lire, fermer (fiche 0027). Toutes exigent l'en-tête de
 * l'application, contre les requêtes forgées.
 */
export function registerSessionRoutes(app: FastifyInstance, options: AccessOptions): void {
  const { db, config } = options;
  const attempts = new LoginAttempts();
  const idle = config.sessionIdleMinutes;

  app.addHook('onRequest', async (request, reply) => {
    if (
      request.url.startsWith(SESSION_PATH) &&
      request.headers[APPLICATION_HEADER] !== APPLICATION_HEADER_VALUE
    ) {
      await reply.code(401).send(refused('notAuthenticated'));
    }
  });

  app.post(SESSION_PATH, async (request, reply) => {
    const input = openSessionInputSchema.safeParse(request.body);
    if (!input.success) {
      return reply.code(400).send(refused('invalidInput'));
    }
    const opened = await openSession(db, attempts, idle, input.data.loginName, input.data.password);
    if (opened.outcome === 'refused') {
      return reply.code(opened.reason === 'tooManyAttempts' ? 429 : 401).send(refused(opened.reason));
    }
    const cookies = [serializeCookie(SESSION_COOKIE, opened.token, idle * 60)];
    // Le cookie de poste est renouvelé à chaque ouverture : un poste utilisé ne perd jamais sa déclaration.
    const workstation = await resolveWorkstation(
      db,
      config.cookieSecret,
      readCookie(request.headers.cookie, WORKSTATION_COOKIE),
    );
    if (workstation !== undefined) {
      cookies.push(workstationCookie(config.cookieSecret, workstation.id));
    }
    const session: CurrentSession = {
      user: { id: opened.userId, displayName: opened.displayName },
      workstation: workstation ?? null,
      sites: await sitesOf(db, opened.userId),
      permissions: await permissionsOf(db, opened.userId),
    };
    return reply.header('set-cookie', cookies).send({ outcome: 'accepted', result: session });
  });

  app.get(SESSION_PATH, async (request, reply) => {
    const user = await resolveSession(db, idle, readCookie(request.headers.cookie, SESSION_COOKIE));
    if (user === undefined) {
      return reply.code(401).send(refused('notAuthenticated'));
    }
    const workstation = await resolveWorkstation(
      db,
      config.cookieSecret,
      readCookie(request.headers.cookie, WORKSTATION_COOKIE),
    );
    const session: CurrentSession = {
      user: { id: user.userId, displayName: user.displayName },
      workstation: workstation ?? null,
      sites: await sitesOf(db, user.userId),
      permissions: await permissionsOf(db, user.userId),
    };
    return session;
  });

  app.post(SESSION_CLOSE_PATH, async (request, reply) => {
    await closeSession(db, readCookie(request.headers.cookie, SESSION_COOKIE));
    return reply
      .header('set-cookie', serializeCookie(SESSION_COOKIE, '', 0))
      .send({ outcome: 'accepted', result: {} });
  });
}

/** L'auteur d'un geste : l'utilisateur de la session et le poste du navigateur (fiche 0027, règle 4). */
export function sessionAuthor(options: AccessOptions): GestureRights['resolveAuthor'] {
  return async (request: FastifyRequest) => {
    const user = await resolveSession(
      options.db,
      options.config.sessionIdleMinutes,
      readCookie(request.headers.cookie, SESSION_COOKIE),
    );
    if (user === undefined) {
      return { userId: null, workstationId: null };
    }
    const workstation = await resolveWorkstation(
      options.db,
      options.config.cookieSecret,
      readCookie(request.headers.cookie, WORKSTATION_COOKIE),
    );
    return { userId: user.userId, workstationId: workstation?.id ?? null };
  };
}

/** Vrai si la requête porte une session en cours : l'ouverture du canal temps réel l'exige. */
export function hasSession(options: AccessOptions): (request: FastifyRequest) => Promise<boolean> {
  return async (request) =>
    (await resolveSession(
      options.db,
      options.config.sessionIdleMinutes,
      readCookie(request.headers.cookie, SESSION_COOKIE),
    )) !== undefined;
}

/** L'utilisateur de la session en cours, ou `null` : ce qu'une consultation exige. */
export function sessionUserId(options: AccessOptions): (request: FastifyRequest) => Promise<string | null> {
  return async (request) =>
    (
      await resolveSession(
        options.db,
        options.config.sessionIdleMinutes,
        readCookie(request.headers.cookie, SESSION_COOKIE),
      )
    )?.userId ?? null;
}
