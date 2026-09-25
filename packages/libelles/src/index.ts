import { en } from './en.js';
import { fr, type LabelCatalog } from './fr.js';

export { en, fr, type LabelCatalog };

export const languages = ['fr', 'en'] as const;
export type Language = (typeof languages)[number];

export const catalogs: Readonly<Record<Language, LabelCatalog>> = { fr, en };
