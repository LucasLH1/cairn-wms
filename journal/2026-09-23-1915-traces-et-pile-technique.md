---
date: 2026-09-23 19:15
objectif: Rattraper status.yml, CLAUDE.md, le journal et les issues après cinq jours de spécification, puis proposer la pile d'ensemble par une fiche 0002.
modules: ["0.8", "0.9", "2.1", "2.2", "2.3", "2.4", "3.1", "3.2", "3.3", "4.1", "4.2", "5.1"]
issues: [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35]
---

# Session du 2026-09-23 — traces et pile technique

## Objectif

Deux phases. D'abord remettre les trois traces du projet au niveau de la spécification, qui a
avancé du 18 au 23 par le connecteur de documentation sans les toucher : `status.yml`, journal,
issues, et la règle 2 de `CLAUDE.md` devenue fausse. Ensuite proposer la pile technique par une
fiche `docs/decisions/0002` au statut `proposée`, évaluée contre les exigences `RG-EXI`, sans
écrire une ligne de code ni une fiche de détail.

## Actions

### Phase 1 — traces

- Reconstitué le travail du 18 au 23 depuis `git log` (98 commits `docs:`) et écrit l'entrée
  `journal/2026-09-18-2137-specification-complete.md`, datée du premier commit qu'elle couvre.
- `status.yml` : modules 2.1 à 5.1 passés à `spécifié` avec `doc` et `prefixe_regles` relevés dans
  la carte de `docs/README.md` ; modules 0.8 (`RG-SUR`) et 0.9 (`RG-EXI`) ajoutés ; section `lots:`
  reprenant les cinq lots de la fiche 0001, contenu et preuve, état `à faire` ; en-tête réécrit ;
  `mis_a_jour_le` au 23. Les noms de 2.3 et 3.1 sont alignés sur la carte du README (« mise à
  disposition », « Commandes et lignes de commande »), qui est la source déclarée du fichier.
- `CLAUDE.md`, règle 2 : « ne contient aucune décision » remplacé par la mention de 0001, actée,
  portant sur l'ordre de réalisation ; aucune pile technique arrêtée. Rien d'autre modifié.
- GitHub : créé deux labels de module, `module/0.8-surfaces` et `module/0.9-exigences`, sur le
  modèle des 21 existants (la grille passe à 32 labels). Ouvert `#24` « Choisir la pile technique »
  (couche 0, module 0.9, `tech`) et `#25` « Réaliser le module 0.8 ». Ouvert `#26` à `#35`
  « Réaliser le module 2.1 … 5.1 » sur le modèle de `#1` à `#11`, dont la section « Préalable
  bloquant » renvoie désormais à 0001 et à `#24` plutôt qu'à un dossier de décisions vide. Fermé
  `#12` à `#21` comme terminées, chacune avec le chemin du document qui la solde et le numéro de
  l'issue de réalisation qui prend le relais. Jalons inchangés, par couche.

### Phase 2 — pile technique

*À compléter en fin de session.*

## Décisions

- Les noms de modules de `status.yml` suivent la carte de `docs/README.md` quand les deux
  divergent : le fichier le déclare lui-même comme source unique. Non engageant.
- Les issues de réalisation des modules gardent la structure de `#1` à `#11` ; seul le préalable
  bloquant est reformulé pour être vrai.

## Fichiers touchés

| Chemin | Ce qui change et pourquoi |
|---|---|
| `status.yml` | 21 → 23 modules, tous `spécifié` ; issues de réalisation reportées ; section `lots:` ; en-tête et date. |
| `CLAUDE.md` | Règle 2 : l'état de `docs/decisions/` dit vrai. |
| `journal/2026-09-18-2137-specification-complete.md` | Créé : reconstitution du 18 au 23. |
| `journal/2026-09-23-1915-traces-et-pile-technique.md` | Créé : la présente entrée. |

## Issues liées

- `#12` à `#21` — fermées, commentées avec le document qui les solde.
- `#24` — ouverte : Choisir la pile technique. Porte la phase 2.
- `#25` — ouverte : Réaliser le module 0.8.
- `#26` à `#35` — ouvertes : Réaliser les modules 2.1 à 5.1.

## Points ouverts

*À compléter en fin de session.*
