import { createHash, randomBytes } from 'node:crypto';
import { sql } from 'kysely';
import type { Database } from '../database/index.js';
import type { LoginAttempts } from './attempts.js';
import { decoyHash, verifyPassword } from './password.js';

const tokenHash = (token: string): Buffer => createHash('sha256').update(token).digest();

export type OpenSessionOutcome =
  | {
      readonly outcome: 'opened';
      readonly token: string;
      readonly userId: string;
      readonly displayName: string;
    }
  | { readonly outcome: 'refused'; readonly reason: 'invalidCredentials' | 'tooManyAttempts' };

/**
 * Ouvre une session : jeton opaque tiré au hasard, dont la base ne garde que l'empreinte, et une
 * échéance repoussée à chaque requête (fiche 0027, règles 1 à 3). Un utilisateur tient autant de
 * sessions qu'il le veut (RG-SUR-006).
 */
export async function openSession(
  db: Database,
  attempts: LoginAttempts,
  idleMinutes: number,
  loginName: string,
  password: string,
): Promise<OpenSessionOutcome> {
  if (attempts.isBlocked(loginName)) {
    return { outcome: 'refused', reason: 'tooManyAttempts' };
  }
  const user = await db
    .selectFrom('foundation.user')
    .select(['id', 'displayName', 'passwordHash', 'active'])
    .where(sql<string>`lower(login_name)`, '=', loginName.toLowerCase())
    .executeTakeFirst();
  const valid = await verifyPassword(password, user?.passwordHash ?? (await decoyHash()));
  if (user === undefined || !valid || !user.active) {
    attempts.recordFailure(loginName);
    return { outcome: 'refused', reason: 'invalidCredentials' };
  }
  attempts.clear(loginName);
  const token = randomBytes(32).toString('base64url');
  await db
    .insertInto('foundation.session')
    .values({
      userId: user.id,
      tokenHash: tokenHash(token),
      expiresAt: sql`now() + make_interval(mins => ${idleMinutes})`,
    })
    .execute();
  return { outcome: 'opened', token, userId: user.id, displayName: user.displayName };
}

export interface SessionUser {
  readonly userId: string;
  readonly displayName: string;
}

/** L'utilisateur d'un jeton de session en cours ; repousse l'échéance. Rien pour un jeton échu ou révoqué. */
export async function resolveSession(
  db: Database,
  idleMinutes: number,
  token: string | undefined,
): Promise<SessionUser | undefined> {
  if (token === undefined || token === '') return undefined;
  const row = await db
    .updateTable('foundation.session as session')
    .from('foundation.user as user')
    .set({ expiresAt: sql`now() + make_interval(mins => ${idleMinutes})` })
    .whereRef('user.id', '=', 'session.userId')
    .where('session.tokenHash', '=', tokenHash(token))
    .where('session.revoked', '=', false)
    .where('session.expiresAt', '>', sql<Date>`now()`)
    .where('user.active', '=', true)
    .returning(['user.id as userId', 'user.displayName'])
    .executeTakeFirst();
  return row;
}

/** Ferme une session : elle est révoquée aussitôt. */
export async function closeSession(db: Database, token: string | undefined): Promise<void> {
  if (token === undefined || token === '') return;
  await db
    .updateTable('foundation.session')
    .set({ revoked: true })
    .where('tokenHash', '=', tokenHash(token))
    .execute();
}
