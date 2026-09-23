---
date: 2026-09-23 20:20
objectif: Aligner 0002 sur RG-EXI-072 à 079, l'acter, ouvrir les issues des fiches de détail et rédiger la première, sans code.
modules: ["0.9"]
issues: [24, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47]
---

# Session du 2026-09-23 — acte de la pile et découpe interne

## Objectif

0.9 a reçu huit exigences de plus (`RG-EXI-072` à `079`) : serveur de référence, temps de réponse,
perte et reprise, fuseau, impression, matériel, langue. Lucas demande d'y aligner 0002, de l'acter,
de mettre à jour l'index et `CLAUDE.md`, de fermer l'issue 24, d'ouvrir une issue par fiche de
détail, et de rédiger la première, « découpe interne et frontière du socle ». Toujours aucun code.

## Actions

- Fait `git pull` et lu le commit `286632e` : huit exigences nouvelles, sept points ouverts de 0.9 §7
  fermés, dont la reprise en moins de deux heures dans les deux modes.
- 0002 : ajouté une ligne par exigence nouvelle aux quatre tableaux (79 par pile). Bilans : A 76
  satisfaites et 3 partielles ; B 76 et 3 ; C 78 et 1 ; D 67 et 12. Remplacé le tableau des
  hypothèses par les valeurs de la spécification, en gardant les trois points encore ouverts
  (volumétrie, licence, nom de l'exploitant). Ajouté le coût de la reprise en moins de deux heures.
- 0002 passée à `actée`, datée du 2026-09-23, avec une note qui retrace ses deux révisions ; index
  de `docs/decisions/README.md` mis à jour ; paragraphe « aucun choix technique » réécrit.
- `CLAUDE.md` : la section 2 dit que la pile est arrêtée par 0002 et qu'aucun code ne s'écrit avant
  l'acte de la fiche de détail qui le couvre. La phrase d'ouverture du fichier, « Aucune pile
  technique n'est choisie », devenue fausse, a aussi été corrigée.
- Fermé `#24` en renvoyant à 0002. Ouvert `#36` à `#46`, une par fiche de détail de 0002, et `#47`
  pour le jeu de données et le scénario du lot 1, également listés dans ses Conséquences.
- Rédigé `docs/decisions/0004-decoupe-interne-et-frontiere-du-socle.md`, statut `proposée`, évaluée
  contre `RG-EXI-070`, `071` et `066`. Relevé avant de découper que le socle de `RG-EXI-070` n'est pas
  la couche 0 de la spécification, et que huit mécanismes du socle sont décrits en termes
  logistiques. Commenté `#36`.
- `status.yml` : en-tête remis à jour ; le champ `issue` du module 0.9 passe à vide, ses exigences
  étant désormais portées par les issues des fiches de détail. Aucun état de module ne change ; la
  section `lots:` n'est pas touchée, 0003 n'étant pas actée.

## Décisions

- **0002 — Pile d'ensemble, actée** par Lucas le 2026-09-23 : .NET (LTS) et C#, PostgreSQL, écrans
  Vue 3 et TypeScript, contrat OpenAPI produit par le serveur. La fiche fait foi.
- **0004 — Découpe interne, proposée** : socle et logistique en projets distincts, à références non
  transitives ; points d'extension limités à une liste de onze ; socle générique sur le détenteur des
  données ; espace technique limité à un contrat d'état de santé. Rien n'est mis en œuvre.
- Le module 0.9 n'a plus d'issue propre : il n'a rien à réaliser en tant que tel. Non engageant.

## Fichiers touchés

| Chemin | Ce qui change et pourquoi |
|---|---|
| `docs/decisions/0002-pile-d-ensemble.md` | Alignée sur `RG-EXI-072` à `079`, coût de la reprise, statut `actée`, issues des fiches de détail. |
| `docs/decisions/0004-decoupe-interne-et-frontiere-du-socle.md` | Créée, `proposée`. |
| `docs/decisions/README.md` | Index : 0002 actée, 0004 proposée ; paragraphe sur l'état des choix techniques. |
| `CLAUDE.md` | Section 2 et phrase d'ouverture : la pile est arrêtée, le code attend les fiches de détail. |
| `status.yml` | En-tête ; issue du module 0.9 vidée. |
| `journal/2026-09-23-2020-acte-pile-et-decoupe-interne.md` | Créé : la présente entrée. |

## Issues liées

- `#24` — fermée, renvoie à 0002.
- `#36` — ouverte, commentée : fiche 0004 rédigée, `proposée`.
- `#37` à `#46` — ouvertes : fiches de détail à rédiger après l'acte de 0004, dans l'ordre de leurs
  dépendances.
- `#47` — ouverte : jeu de données et scénario du lot 1, qui attendent l'acte de 0003.

## Points ouverts

- **Acte ou refus de 0004.** Quatre points à trancher par Lucas avant tout code : les noms des deux
  parties au glossaire (`Foundation`, `Logistics` proposés) ; « agent d'impression », employé par
  0002 et absent du glossaire (`PrintAgent` proposé) ; la zone comme destination d'impression,
  traitée comme une extension logistique ; la restriction par donneur d'ordre dans les périmètres,
  traitée de même.
- **Acte de 0003**, préalable à la réalisation du lot 1 avec son scénario (`#47`).
- **Le coût de la reprise en moins de deux heures** chez l'éditeur peut exiger une réplique en attente
  pour les plus grosses instances. À chiffrer dans la fiche espace technique (`#46`).
- **Mesures exigées** par `RG-EXI-072` au lot 1 (tenue sur le serveur de référence) et par
  `RG-EXI-075` au lot 5 (restauration en moins de deux heures).
- Aucun code n'existe. Les issues de réalisation `#1` à `#11` et `#25` à `#35` restent bloquées.
