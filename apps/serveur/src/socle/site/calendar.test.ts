import { describe, expect, it } from 'vitest';
import { workingDuration, type SiteCalendar } from './calendar.js';
import { frenchPublicHolidays } from './holidays.js';

// Site A du scénario : ouvert du lundi au vendredi de 7 h à 19 h, Europe/Paris.
const weekdays = [1, 2, 3, 4, 5].map((weekday) => ({ weekday, opensAt: '07:00', closesAt: '19:00' }));
const siteA: SiteCalendar = { timeZone: 'Europe/Paris', ranges: weekdays, closedDays: new Set() };
const at = (iso: string) => new Date(iso);
const hours = (seconds: number) => seconds / 3600;

describe('heures ouvrées (RG-ORG-031 à 034)', () => {
  it('ne compte que les plages ouvertes : du vendredi 18 h au lundi 9 h, trois heures', () => {
    // Vendredi 25 septembre 2026, 18 h à Paris (UTC+2) ; lundi 28, 9 h.
    const duration = workingDuration(siteA, at('2026-09-25T16:00:00Z'), at('2026-09-28T07:00:00Z'));
    expect(duration).toEqual({ seconds: 3 * 3600, qualified: true });
  });

  it('retire les jours fériés et les fermetures (RG-ORG-032)', () => {
    const closed = { ...siteA, closedDays: new Set(['2026-11-11']) };
    // Mardi 10 novembre 17 h au jeudi 12 novembre 9 h (UTC+1) : 2 h mardi, férié mercredi, 2 h jeudi.
    const duration = workingDuration(closed, at('2026-11-10T16:00:00Z'), at('2026-11-12T08:00:00Z'));
    expect(hours(duration.seconds)).toBe(4);
  });

  it("suit l'heure légale : la plage reste 7 h - 19 h le jour du passage à l'heure d'hiver", () => {
    const sunday = { ...siteA, ranges: [{ weekday: 7, opensAt: '07:00', closesAt: '19:00' }] };
    // Dimanche 25 octobre 2026 : 7 h à Paris vaut 6 h UTC (après le passage), 19 h vaut 18 h UTC.
    const duration = workingDuration(sunday, at('2026-10-25T00:00:00Z'), at('2026-10-26T00:00:00Z'));
    expect(hours(duration.seconds)).toBe(12);
  });

  it('compte en temps calendaire, non qualifié, un site sans calendrier (RG-ORG-034)', () => {
    const duration = workingDuration(undefined, at('2026-09-25T16:00:00Z'), at('2026-09-28T07:00:00Z'));
    expect(duration).toEqual({ seconds: 63 * 3600, qualified: false });
  });
});

describe('jours fériés français', () => {
  it('place les fêtes mobiles de Pâques', () => {
    const days = frenchPublicHolidays(2026).map((holiday) => holiday.day);
    expect(days).toContain('2026-04-06'); // lundi de Pâques
    expect(days).toContain('2026-05-14'); // Ascension
    expect(days).toContain('2026-05-25'); // lundi de Pentecôte
    expect(days).toHaveLength(11);
  });
});
