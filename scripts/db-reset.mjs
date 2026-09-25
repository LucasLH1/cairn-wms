// `pnpm db:reset` : recrée la base locale, la migre et charge le jeu de données des scénarios du
// lot 1 (docs/lots/lot-1/), toutes valeurs fictives. N'agit que sur une base du poste.
import { assertLocalDatabase, bin, loadLocalEnvironment, run, startDatabase } from './local.mjs';

loadLocalEnvironment();
assertLocalDatabase();
startDatabase();
run(bin('tsc'), ['-b', 'tsconfig.build.json']);
for (const entry of ['reset-database', 'migrate', 'load-dataset']) {
  run(process.execPath, [`apps/serveur/dist/${entry}.js`]);
}
