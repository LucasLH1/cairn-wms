---
date: 2026-09-24 22:03
objectif: Reprendre de zéro le choix de la pile technique, brique par brique, une fiche par décision.
modules: ["0.9"]
issues: [24]
---

# Session du 2026-09-24 — conception technique

Entrée écrite le 2026-09-25 par une session Claude Code sur le dépôt, à partir des fiches, des commits
`de8c543` à `1e8caf3` et du compte rendu de Lucas : la conversation elle-même s'est tenue hors du
dépôt, de 22:03 à 22:31.

## Objectif

Après la réinitialisation des choix techniques du même soir, choisir de nouveau la pile de Cairn WMS,
sans partir des fiches abandonnées, contre la grille de `socle/0.9`, en écrivant une fiche par
décision.

## Actions

- Présenté les options de pile pour le langage : TypeScript de bout en bout, C#/.NET côté serveur,
  Elixir et Phoenix LiveView, Go, Kotlin ou Java ; Python et Rust écartés d'emblée (fiche 0009).
- Claude a d'abord recommandé .NET côté serveur. Sur la question de Lucas, les écarts entre les deux
  premières options ont été repris un par un ; ceux qui plaidaient pour .NET se sont révélés réels
  mais modestes, et tous parables. Recommandation révisée en TypeScript de bout en bout.
- Comparé les frameworks d'écrans — React, Vue, Angular, Svelte ou Solid — puis les couches de
  composants et de style (fiches 0010, 0011).
- Proposé la base de données, l'architecture, la forme du poste, la livraison et l'espace technique,
  l'impression, et les garde-fous du serveur TypeScript (fiches 0012 à 0017).
- Écrit les neuf fiches et mis à jour l'index des décisions (commits `de8c543` à `1e8caf3`, de 22:27
  à 22:31).

## Décisions

- **0009 — Langage : TypeScript de bout en bout, actée.** Validation explicite de Lucas.
- **0010 — Framework des écrans : React, actée.** Validation explicite de Lucas.
- **0011 — Composants et style, actée** sur le « je valide » de Lucas : React Aria Components pour le
  comportement, Tailwind CSS réduit aux jetons de la maquette, bibliothèque de composants propre à
  Cairn, TanStack Table et Virtual pour les tableaux denses.
- **0012 à 0017, proposées**, en attente d'acte : PostgreSQL seul ; monolithe modulaire ; application
  web dans le navigateur ; conteneurs et espace technique en processus distinct ; impression par
  agent d'impression dans les deux modes ; garde-fous du serveur TypeScript.
- Les fiches font foi ; `CLAUDE.md` et `status.yml`, que 0009 demandait de mettre à jour, l'ont été
  le 2026-09-25 (entrée suivante).

## Fichiers touchés

| Chemin | Ce qui change et pourquoi |
|---|---|
| `docs/decisions/0009-langage-typescript-de-bout-en-bout.md` | Créé, actée. |
| `docs/decisions/0010-framework-des-ecrans-react.md` | Créé, actée. |
| `docs/decisions/0011-composants-et-style.md` | Créé, actée. |
| `docs/decisions/0012-…` à `0017-…` | Créés, proposées. |
| `docs/decisions/README.md` | Index : 0009 à 0011 actées, 0012 à 0017 proposées ; paragraphe d'état. |

## Issues liées

- `#24` — porte le choix de la pile ; commentée le 2026-09-25 avec l'état des fiches.

## Points ouverts

- **Stockage du journal** : à l'hypothèse de cinquante mille lignes par jour, le journal dépasserait
  en cinq ans les quarante gigaoctets du serveur de référence (`RG-EXI-072`), quelle que soit la
  base — de l'ordre de la centaine de gigaoctets selon l'estimation de Claude (fiche 0012). Question
  de volumétrie et de valeur de référence, à trancher côté spécification.
- **Accès privilégié de l'espace technique** : piloter le moteur de conteneurs équivaut à tout pouvoir
  sur le serveur (fiche 0015) ; une fiche sur sa sécurité est prévue au lot 5.
- **Fiches à venir** : environnement d'exécution et cadre du serveur ; bibliothèque de schémas ;
  journal d'événements ; découpe interne. D'autres sont annoncées par les fiches proposées —
  sauvegarde et restauration, exploitation en série par l'éditeur.
- **Non prouvé**, à mesurer au lot 1 : la tenue en mémoire de la base, des deux rôles de
  l'application et de l'espace technique sur quatre gigaoctets ; la tenue de `RG-EXI-073`.
