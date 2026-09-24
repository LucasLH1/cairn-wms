---
date: 2026-09-24 21:30
objectif: Ranger la maquette validée du lot 1, acter 0004, et rédiger les fiches de détail des issues 37 à 40.
modules: []
issues: [36, 37, 38, 39, 40, 48, 49, 50]
---

# Session du 2026-09-24 — maquette du lot 1 et fiches de détail

## Objectif

Lucas fournit la maquette validée des écrans du lot 1, produite avec Claude Design. La ranger dans
le dépôt après contrôle, dire dans le README du lot ce qu'elle impose, en faire la référence
visuelle de la fiche Écrans, puis reprendre la suite : compléter et acter 0004, rédiger les fiches
des issues 37 à 40.

## Actions

- Fait `git pull` : sept commits de spécification arrivés, dont le glossaire (*Quai*, *Agent
  d'impression*, *Socle*, *Logistique*), `RG-SUR-085` (destination d'impression par poste, quai ou
  zone), `RG-SUR-003` (terrain et bureau au même langage visuel), `RG-EMP-046`, `RG-PRE-066`.
- Retrouvé la maquette dans le dossier de téléchargements de Windows, vérifié qu'elle est la
  version jointe, et contrôlé son contenu décompressé : aucun secret, aucune adresse, aucun
  numéro ; seulement le jeu fictif des scénarios. Les seules occurrences de « SECRET » et
  « password » sont des noms internes de React. Elle embarque React (MIT) et les polices Geist (OFL).
- Copiée à l'identique sous `docs/lots/lot-1/maquette.html` : même empreinte SHA-256, aucun retour
  chariot que Git pourrait réécrire.
- README du lot 1 : section « Maquette de référence » — les quatre moments, ce qui est imposé, ce
  qui est indicatif, la primauté de la spécification, et trois écarts de vocabulaire relevés.
  `status.yml` référence la maquette.
- 0004 complétée et actée : alignée sur le glossaire et `RG-SUR-085`, tests de scénario placés en
  boîte noire sous `tests/scenarios/`, classement du glossaire pour le test de vocabulaire.
  Index des décisions et `CLAUDE.md` mis à jour ; `#36` fermée.
- Fait vérifier en ligne les outils des fiches 37 à 40 ; sources dans les fiches.
- Rédigé 0005 (chaîne de qualité), 0006 (base de données et journal), 0007 (interface de
  programmation et contrat), 0008 (écrans), au statut `proposée`. Relevé dans la maquette les jetons
  de couleur, les polices et les composants, portés dans 0008. Relu les quatre fiches contre les
  termes proscrits ; corrigé un emploi de *notification*. Commenté `#37` à `#40`.

## Décisions

- **0004 — Découpe interne et frontière du socle, actée** le 2026-09-24 sur instruction de Lucas.
- **0005 à 0008, proposées.** Lucas a demandé de rédiger les fiches 37 à 40 ; il n'a pas dit de les
  acter, et chacune engage des bibliothèques. Elles attendent sa validation.
- Choix notables des fiches proposées, faits sur les faits vérifiés : TypeScript 6.0 et non 7,
  l'outillage Vue et typescript-eslint ne supportant pas encore 7 ; SonarAnalyzer et PrimeVue 5
  écartés pour leur licence ; StyleCop et Headless UI pour leur abandon ; Orval pour le code d'appel,
  openapi-typescript déclarant TypeScript 5 seulement.

## Fichiers touchés

| Chemin | Ce qui change et pourquoi |
|---|---|
| `docs/lots/lot-1/maquette.html` | Créé : la maquette validée, à l'identique. |
| `docs/lots/lot-1/README.md` | Section « Maquette de référence ». |
| `docs/decisions/0004-…` | Complétée et actée. |
| `docs/decisions/0005-…` à `0008-…` | Créées, `proposée`. |
| `docs/decisions/README.md` | Index : 0004 actée, 0005 à 0008 proposées. |
| `CLAUDE.md` | Section 2 : trois décisions actées, dont 0004. |
| `status.yml` | Maquette du lot 1 référencée ; `mis_a_jour_le` au 2026-09-24. Aucun module ne change d'état. |
| `journal/2026-09-24-2130-maquette-et-fiches-de-detail.md` | Créé : la présente entrée. |

## Issues liées

- `#36` — fermée : 0004 actée.
- `#37`, `#38`, `#39`, `#40` — commentées : fiches 0005 à 0008 rédigées, acte attendu.
- `#48`, `#49`, `#50` — référencées : la maquette sert à leurs moments à constater à l'écran.

## Points ouverts

- **Acte ou refus de 0005 à 0008 par Lucas.** Avec 0004, ce sont les fiches à acter avant la
  première ligne de code du lot 1.
- **Écarts de vocabulaire de la maquette** : *Rotation du stock* au lieu de *règle de prélèvement* ;
  *Contrôle avant fermeture*, expression du scénario 3, là où le glossaire nomme le *contrôle de
  colisage*. La spécification prime ; à trancher dans le glossaire ou dans la maquette.
- **Thème unique sombre** : la maquette n'a pas de thème clair, la spécification n'en exige pas ;
  0008 le prend comme tel.
- **Orval et TypeScript 6** : compatibilité non vérifiée, à contrôler à la première installation.
- Suivantes dans l'ordre des dépendances : temps réel (`#41`), traitements différés (`#42`),
  impression (`#43`), avant la fin du premier module ; installation (`#45`) avant la clôture du
  lot 1.
