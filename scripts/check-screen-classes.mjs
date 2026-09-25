// Les écrans assemblent des composants et n'emploient de classes utilitaires que pour la mise en page
// (fiche 0011) : couleur, typographie, bordure, fond, rayon et ombre appartiennent aux composants de
// packages/ui. Toute autre classe dans apps/ecrans est refusée.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = 'apps/ecrans/src';
const layout = new RegExp(
  '^-?(?:' +
    [
      'flex(?:-(?:row|col|wrap|1|auto|none))?',
      'grid(?:-(?:cols|rows|flow)-[a-z0-9-]+)?',
      'col(?:-span)?-[a-z0-9-]+',
      'row(?:-span)?-[a-z0-9-]+',
      '(?:inline-)?(?:block|flex|grid)',
      'hidden|contents',
      'gap(?:-[xy])?-[a-z0-9-]+',
      '[pm][trblxyse]?-[a-z0-9-]+',
      '(?:min-|max-)?[wh]-[a-z0-9-]+',
      'size-[a-z0-9-]+',
      '(?:items|justify|content|self|place-items|place-content|place-self)-[a-z-]+',
      '(?:grow|shrink)(?:-0)?|basis-[a-z0-9-]+|order-[a-z0-9-]+',
      'overflow(?:-[xy])?-[a-z]+',
      'static|relative|absolute|fixed|sticky',
      '(?:inset|top|right|bottom|left)(?:-[xy])?-[a-z0-9-]+',
      'z-[0-9]+',
    ].join('|') +
    ')$',
  'u',
);

const offenders = [];
const walk = (directory) => {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.tsx$/u.test(path)) {
      readFileSync(path, 'utf8')
        .split('\n')
        .forEach((line, index) => {
          for (const match of line.matchAll(/className=\{?[`"']([^`"']*)[`"']/gu)) {
            for (const utility of (match[1] ?? '').split(/\s+/u).filter(Boolean)) {
              const base = utility.split(':').at(-1) ?? utility;
              if (!layout.test(base)) offenders.push(`${path}:${index + 1} ${utility}`);
            }
          }
        });
    }
  }
};
walk(root);

if (offenders.length > 0) {
  console.error(
    'Classes hors mise en page dans les écrans (à porter par un composant de packages/ui) :\n' +
      offenders.join('\n'),
  );
  process.exit(1);
}
