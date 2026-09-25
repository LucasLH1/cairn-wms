import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';

/** Paramètres scrypt recommandés par l'OWASP : N = 2^17, r = 8, p = 1 (fiche 0027, règle 1). */
const PARAMETERS = { N: 2 ** 17, r: 8, p: 1 } as const;
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;

function derive(
  password: string,
  salt: Buffer,
  parameters: { N: number; r: number; p: number },
): Promise<Buffer> {
  const options: ScryptOptions = { ...parameters, maxmem: 256 * parameters.N * parameters.r };
  return new Promise((resolve, reject) => {
    scrypt(password.normalize('NFC'), salt, KEY_LENGTH, options, (error, key) => {
      if (error === null) resolve(key);
      else reject(error);
    });
  });
}

/** Empreinte d'un mot de passe : `scrypt$N$r$p$sel$clé`, en base64url. Le mot de passe n'est jamais gardé. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const key = await derive(password, salt, PARAMETERS);
  const { N, r, p } = PARAMETERS;
  return ['scrypt', N, r, p, salt.toString('base64url'), key.toString('base64url')].join('$');
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const [scheme, N, r, p, salt, key] = hash.split('$');
  if (
    scheme !== 'scrypt' ||
    N === undefined ||
    r === undefined ||
    p === undefined ||
    salt === undefined ||
    key === undefined
  ) {
    return false;
  }
  const expected = Buffer.from(key, 'base64url');
  const actual = await derive(password, Buffer.from(salt, 'base64url'), {
    N: Number(N),
    r: Number(r),
    p: Number(p),
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Empreinte calculée pour un identifiant inconnu : le temps de réponse ne dit pas s'il existe. */
let decoy: Promise<string> | undefined;
export function decoyHash(): Promise<string> {
  decoy ??= hashPassword(randomBytes(16).toString('base64url'));
  return decoy;
}
