// Refuse toute valeur arbitraire Tailwind (`bg-[#…]`, `p-[13px]`, `[color:…]`) dans le code
// des écrans et des composants : seules les classes issues des jetons sont permises (fiche 0011).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const roots = ['apps/ecrans/src', 'packages/ui/src'];
const pattern = /(?:^|[\s"'`])(?:[a-z][a-z0-9-]*:)*(?:[a-z][a-z0-9-]*-)?\[[^\]\s]+\]/gu;
const offenders = [];

const walk = (directory) => {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.(?:tsx?|jsx?)$/u.test(path) && !/\.test\./u.test(path)) {
      readFileSync(path, 'utf8')
        .split('\n')
        .forEach((line, index) => {
          for (const match of line.matchAll(/className=\{?[`"'][^`"']*[`"']/gu)) {
            for (const value of match[0].matchAll(pattern))
              offenders.push(`${path}:${index + 1} ${value[0].trim()}`);
          }
        });
    }
  }
};

for (const root of roots) walk(root);

if (offenders.length > 0) {
  console.error('Valeurs arbitraires Tailwind interdites :\n' + offenders.join('\n'));
  process.exit(1);
}
