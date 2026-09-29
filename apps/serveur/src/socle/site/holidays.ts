/**
 * Modèle national de jours fériés proposé à l'initialisation d'un calendrier (0.1, parcours « Créer
 * un site »). France métropolitaine : fêtes fixes, lundi de Pâques, Ascension, lundi de Pentecôte.
 * Les jours propres à certaines régions s'ajoutent à la main, comme toute fermeture.
 */
export interface PublicHoliday {
  readonly day: string;
  readonly label: string;
}

/** Dimanche de Pâques (calendrier grégorien, algorithme de Meeus). */
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

const iso = (date: Date) => date.toISOString().slice(0, 10);
const plusDays = (date: Date, days: number) => new Date(date.getTime() + days * 86_400_000);

export function frenchPublicHolidays(year: number): readonly PublicHoliday[] {
  const easter = easterSunday(year);
  const fixed = (month: number, day: number, label: string) => ({
    day: iso(new Date(Date.UTC(year, month - 1, day))),
    label,
  });
  return [
    fixed(1, 1, 'Jour de l’an'),
    { day: iso(plusDays(easter, 1)), label: 'Lundi de Pâques' },
    fixed(5, 1, 'Fête du Travail'),
    fixed(5, 8, 'Victoire 1945'),
    { day: iso(plusDays(easter, 39)), label: 'Ascension' },
    { day: iso(plusDays(easter, 50)), label: 'Lundi de Pentecôte' },
    fixed(7, 14, 'Fête nationale'),
    fixed(8, 15, 'Assomption'),
    fixed(11, 1, 'Toussaint'),
    fixed(11, 11, 'Armistice 1918'),
    fixed(12, 25, 'Noël'),
  ].sort((left, right) => left.day.localeCompare(right.day));
}
