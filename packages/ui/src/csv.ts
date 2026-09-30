/**
 * Fichier d'export d'une liste (fiche 0033) : ce qu'un tableur ouvre directement en français — UTF-8
 * avec marque d'ordre des octets, séparateur point-virgule, chaque valeur entre guillemets doubles,
 * lignes terminées par CRLF.
 */
const BYTE_ORDER_MARK = '﻿';

/** Une valeur entre guillemets, ses guillemets doublés : un point-virgule ou un saut de ligne y reste. */
const quoted = (value: string) => `"${value.replaceAll('"', '""')}"`;

export function toCsv(lines: readonly (readonly string[])[]): string {
  return `${BYTE_ORDER_MARK}${lines.map((line) => line.map(quoted).join(';')).join('\r\n')}\r\n`;
}

/**
 * Nom du fichier : le nom de la liste et la date locale du jour. Les caractères qu'un système de
 * fichiers refuse deviennent des tirets.
 */
export function exportFileName(list: string, date: Date): string {
  const day = [
    String(date.getFullYear()),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
  const name = list
    // eslint-disable-next-line no-control-regex -- les caractères de contrôle sont précisément visés.
    .replace(/[\u0000-\u001f\u007f<>:"/\\|?*]+/gu, '-')
    .replace(/\s+/gu, ' ')
    .trim();
  return `${name === '' ? 'export' : name}-${day}.csv`;
}
