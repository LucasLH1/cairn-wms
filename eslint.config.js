// Analyse de code (fiche 0024, étape 2) : règles strictes et typées de typescript-eslint.
import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/.tsbuild/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/playwright-report/**',
      '**/test-results/**',
      'docs/**',
      '**/*.generated.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['*.js', '*.ts', '*.cjs', 'scripts/*.mjs', 'apps/ecrans/vite.config.ts'],
          // Fichiers de configuration et scripts hors des paquets : options communes, types de Node.
          defaultProject: 'tsconfig.tooling.json',
        },
        tsconfigRootDir: import.meta.dirname,
      },
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-unsafe-type-assertion': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-expect-error': true, 'ts-ignore': true, 'ts-nocheck': true },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[raw=/^[0-9]+\\.[0-9]+$/]',
          message:
            'Aucun nombre à virgule pour une valeur de gestion : entiers dans l’unité de base (fiche 0017, règle 5).',
        },
      ],
    },
  },
  {
    files: ['apps/ecrans/**/*.{ts,tsx}', 'packages/ui/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    languageOptions: { globals: { ...globals.browser } },
    rules: { ...reactHooks.configs.recommended.rules },
  },
  {
    // Les écrans assemblent des composants de packages/ui et tirent tout texte de packages/libelles
    // (fiches 0011 et 0025, règle 4) : ce que stylelint et les scripts de style ne voient pas.
    files: ['apps/ecrans/src/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@tanstack/react-router',
              importNames: ['Link'],
              message:
                'Un lien des écrans passe par RouteLink, rendu par le lien de packages/ui (fiche 0011).',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[raw=/^[0-9]+\\.[0-9]+$/]',
          message:
            'Aucun nombre à virgule pour une valeur de gestion : entiers dans l’unité de base (fiche 0017, règle 5).',
        },
        {
          selector: "JSXAttribute[name.name='style']",
          message:
            'Aucun style en ligne dans un écran : le style appartient aux composants de packages/ui (fiche 0011).',
        },
        {
          selector: 'JSXOpeningElement[name.name=/^(a|button|input|label|select|table|textarea)$/]',
          message:
            'Un élément interactif ou un tableau vient de packages/ui, construit sur React Aria (fiche 0011).',
        },
        {
          selector: 'JSXText[value=/[A-Za-zÀ-ÿ]/]',
          message: 'Aucun libellé écrit en dur : le texte vient de packages/libelles (fiche 0025, règle 4).',
        },
        {
          selector:
            "JSXAttribute[name.name=/^(alt|aria-label|dismissLabel|empty|header|label|meta|placeholder|title)$/][value.type='Literal']",
          message: 'Aucun libellé écrit en dur : le texte vient de packages/libelles (fiche 0025, règle 4).',
        },
        {
          selector:
            "JSXAttribute[name.name='className'] > JSXExpressionContainer > :not(Literal, TemplateLiteral)",
          message:
            'Les classes d’un écran s’écrivent en toutes lettres dans className, pour que le contrôle des classes les voie.',
        },
      ],
    },
  },
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx', 'tests/**/*.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
);
