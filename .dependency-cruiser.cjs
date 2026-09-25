// Règles de dépendance de la fiche 0023, vérifiées à chaque modification (fiche 0024, étape 3).
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'socle-sans-logistique',
      comment: 'Règle 1 : un module du socle n’importe jamais un module logistique (RG-EXI-070).',
      severity: 'error',
      from: { path: '^apps/serveur/src/socle/' },
      to: { path: '^apps/serveur/src/logistique/' },
    },
    {
      name: 'interface-publique-seulement',
      comment:
        'Règle 2 : un module n’importe d’un autre module que son interface publique (index.ts), jamais ses fichiers internes.',
      severity: 'error',
      from: { path: '^apps/serveur/src/(socle|logistique)/([^/]+)/' },
      to: {
        path: '^apps/serveur/src/(socle|logistique)/([^/]+)/',
        pathNot: ['^apps/serveur/src/$1/$2/', '^apps/serveur/src/(socle|logistique)/[^/]+/index\\.ts$'],
      },
    },
    {
      name: 'aucun-cycle',
      comment: 'Règle 3 : aucun cycle.',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'ecrans-sans-serveur',
      comment: 'Règle 4 : les écrans n’importent que contrat, ui et libellés ; jamais le serveur.',
      severity: 'error',
      from: { path: '^apps/ecrans/' },
      to: { path: '^(apps/(serveur|agent-impression)|packages/(?!contrat|ui|libelles))' },
    },
    {
      name: 'contrat-zod-seulement',
      comment: 'Règle 5 : le contrat ne dépend que de Zod (hors tests).',
      severity: 'error',
      from: { path: '^packages/contrat/', pathNot: '[.]test[.]ts$' },
      to: { pathNot: ['^packages/contrat/', '(^|/)node_modules/zod/'] },
    },
    {
      name: 'dependance-non-declaree',
      comment: 'Toute dépendance importée est déclarée dans le manifeste du paquet (fiche 0017).',
      severity: 'error',
      from: {},
      to: { dependencyTypes: ['npm-no-pkg', 'npm-unknown'] },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '(^|/)(dist|node_modules|coverage|[.]tsbuild)/' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    combinedDependencies: true,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['@cairn/source', 'import', 'types', 'default'],
      extensions: ['.ts', '.tsx', '.js'],
    },
  },
};
