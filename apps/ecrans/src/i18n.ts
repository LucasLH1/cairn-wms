import { catalogs, type fr, type Language } from '@cairn/libelles';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

// Les libellés viennent tous de packages/libelles, dont les clés suivent le glossaire (fiche 0025, règle 4).
declare module 'i18next' {
  interface CustomTypeOptions {
    resources: { translation: typeof fr };
  }
}

export async function startLabels(language: Language = 'fr'): Promise<void> {
  await i18next.use(initReactI18next).init({
    resources: { fr: { translation: catalogs.fr }, en: { translation: catalogs.en } },
    lng: language,
    fallbackLng: 'fr',
    interpolation: { escapeValue: false },
  });
}
