/** Lecture et écriture des deux cookies de l'application : session et poste (fiche 0027). */

export const SESSION_COOKIE = 'cairn_session';
export const WORKSTATION_COOKIE = 'cairn_workstation';

export function readCookie(header: string | undefined, name: string): string | undefined {
  if (header === undefined) return undefined;
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator !== -1 && part.slice(0, separator).trim() === name) {
      return part.slice(separator + 1).trim();
    }
  }
  return undefined;
}

/**
 * Cookie inaccessible au code de la page, réservé à HTTPS, restreint au site (fiche 0027, règle 2).
 * Les navigateurs tiennent `localhost` pour sûr : le développement local fonctionne sans HTTPS.
 */
export function serializeCookie(name: string, value: string, maxAgeSeconds: number): string {
  return `${name}=${value}; Path=/; Max-Age=${maxAgeSeconds}; HttpOnly; Secure; SameSite=Strict`;
}
