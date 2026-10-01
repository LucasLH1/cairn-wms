/** Date ISO sans heure, affichée dans la langue de l'utilisateur, sans décalage de fuseau. */
export function formatDate(isoDate: string, language: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  if (year === undefined || month === undefined || day === undefined) return isoDate;
  return new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, month - 1, day)),
  );
}

/** Instant horodaté (mouvement, pose d'un blocage), date et heure dans la langue de l'utilisateur. */
export function formatDateTime(iso: string, language: string): string {
  return new Intl.DateTimeFormat(language, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
}
