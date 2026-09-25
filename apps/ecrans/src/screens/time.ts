import { useEffect, useState } from 'react';

/** L'heure courante, relue chaque seconde : ce qui « défile en direct » à l'écran. */
export function useNow(intervalMilliseconds = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, intervalMilliseconds);
    return () => {
      clearInterval(timer);
    };
  }, [intervalMilliseconds]);
  return now;
}

/** Durée écoulée au format `HH:MM:SS`, comme le chronomètre de la maquette. */
export function formatElapsed(fromIso: string, now: number): string {
  const seconds = Math.max(0, Math.floor((now - Date.parse(fromIso)) / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return [hours, minutes, seconds % 60].map((part) => String(part).padStart(2, '0')).join(':');
}

/** Heure et minute d'un instant, dans la langue de l'utilisateur. */
export function formatTime(iso: string, language: string): string {
  return new Intl.DateTimeFormat(language, { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}
