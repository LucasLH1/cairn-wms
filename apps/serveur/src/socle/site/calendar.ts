/**
 * Heures ouvrées d'un site (RG-ORG-031 à 034). Fonction pure : le calendrier, deux instants, une durée
 * en secondes entières. Les plages s'entendent à l'heure légale du site, changements d'heure compris.
 */

/** Une plage d'ouverture : jour ISO (1 lundi … 7 dimanche), heures locales `HH:MM`. */
export interface OpeningRange {
  readonly weekday: number;
  readonly opensAt: string;
  readonly closesAt: string;
}

export interface SiteCalendar {
  readonly timeZone: string;
  readonly ranges: readonly OpeningRange[];
  /** Jours fériés et fermetures exceptionnelles, `AAAA-MM-JJ` (RG-ORG-032). */
  readonly closedDays: ReadonlySet<string>;
}

/** Une durée, et si elle est qualifiée : un site sans calendrier compte en temps calendaire (RG-ORG-034). */
export interface Duration {
  readonly seconds: number;
  readonly qualified: boolean;
}

interface LocalDate {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

const partsFormatter = new Map<string, Intl.DateTimeFormat>();
function formatter(timeZone: string): Intl.DateTimeFormat {
  let existing = partsFormatter.get(timeZone);
  if (existing === undefined) {
    existing = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    });
    partsFormatter.set(timeZone, existing);
  }
  return existing;
}

/** Décalage du fuseau à un instant, en millisecondes (heure légale moins UTC). */
function offsetAt(instant: number, timeZone: string): number {
  const parts = Object.fromEntries(
    formatter(timeZone)
      .formatToParts(new Date(instant))
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  );
  const local = Date.UTC(
    parts['year'] ?? 0,
    (parts['month'] ?? 1) - 1,
    parts['day'] ?? 1,
    parts['hour'] ?? 0,
    parts['minute'] ?? 0,
    parts['second'] ?? 0,
  );
  return local - Math.floor(instant / 1000) * 1000;
}

/** L'instant d'une heure légale du site ; une heure qui n'existe pas (passage à l'heure d'été) glisse. */
function instantOf(date: LocalDate, time: string, timeZone: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  const wall = Date.UTC(date.year, date.month - 1, date.day, hours ?? 0, minutes ?? 0);
  const first = wall - offsetAt(wall, timeZone);
  return wall - offsetAt(first, timeZone);
}

function localDateOf(instant: number, timeZone: string): LocalDate {
  const shifted = new Date(instant + offsetAt(instant, timeZone));
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() };
}

const isoDate = (date: LocalDate) =>
  `${String(date.year)}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;

function nextDay(date: LocalDate): LocalDate {
  const next = new Date(Date.UTC(date.year, date.month - 1, date.day + 1));
  return { year: next.getUTCFullYear(), month: next.getUTCMonth() + 1, day: next.getUTCDate() };
}

const isoWeekday = (date: LocalDate) => {
  const day = new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay();
  return day === 0 ? 7 : day;
};

/**
 * Durée entre deux instants, en heures ouvrées du site (RG-ORG-033). Sans aucune plage d'ouverture, le
 * site est réputé ouvert en continu : la durée est calendaire et marquée non qualifiée (RG-ORG-034).
 */
export function workingDuration(calendar: SiteCalendar | undefined, from: Date, to: Date): Duration {
  const start = from.getTime();
  const end = to.getTime();
  if (end <= start) return { seconds: 0, qualified: calendar !== undefined && calendar.ranges.length > 0 };
  if (calendar === undefined || calendar.ranges.length === 0) {
    return { seconds: Math.floor((end - start) / 1000), qualified: false };
  }
  let total = 0;
  const last = isoDate(localDateOf(end, calendar.timeZone));
  for (let day = localDateOf(start, calendar.timeZone); ; day = nextDay(day)) {
    const key = isoDate(day);
    if (!calendar.closedDays.has(key)) {
      const weekday = isoWeekday(day);
      for (const range of calendar.ranges) {
        if (range.weekday !== weekday) continue;
        const opens = instantOf(day, range.opensAt, calendar.timeZone);
        const closes = instantOf(day, range.closesAt, calendar.timeZone);
        const overlap = Math.min(closes, end) - Math.max(opens, start);
        if (overlap > 0) total += overlap;
      }
    }
    if (key === last) break;
  }
  return { seconds: Math.floor(total / 1000), qualified: true };
}
