---
date: 2026-09-24 21:58
objectif: Réinitialiser tous les choix techniques à la demande de Lucas, en gardant les fiches pour l'histoire et les décisions non techniques.
modules: ["0.9", "3.3"]
issues: [24, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 48, 49, 50]
---

# Session du 2026-09-24 — réinitialisation des choix techniques

## Objectif

Lucas demande une réinitialisation complète des choix techniques : il n'a jamais acté la pile. Son
« oui je valide » portait seulement sur le serveur de référence (4 Go) et la remise en service
(2 h). Abandonner les fiches concernées sans les supprimer, sauver dans le README du lot 1 les
décisions non techniques de 0008, retirer de la spécification, de `CLAUDE.md` et de `status.yml`
toute mention de pile, et remettre les issues en état.

## Actions

- Fait `git pull` (un commit de spécification sur 3.1).
- Fiches 0002, 0004, 0005, 0006, 0007 et 0008 passées à `abandonnée`, avec en en-tête la mention
  demandée ; fichiers conservés, numéros jamais réutilisés. Index de `docs/decisions/` mis à jour, son
  paragraphe d'état réécrit : aucune pile choisie.
- README du lot 1 : section « Décisions sur les écrans » reprenant, sans technologie, les trois
  décisions de 0008 — glossaire qui fait foi, thème sombre unique par jetons, conception des écrans
  suivants sans maquette. Retiré les renvois à la fiche et à l'issue des écrans. La maquette reste.
- 0.9 §7 : la mention de 0002 retirée du point ouvert sur la volumétrie ; l'hypothèse elle-même
  gardée. `RG-EXI-072` et suivantes inchangées.
- Recherche dans `docs/` de toute technologie, bibliothèque ou fiche abandonnée : une seule
  occurrence hors des fiches et de l'index — « API transporteur » dans un cas limite de 3.3, remplacé
  par « Interface du transporteur ». Les « vue » de la spécification sont le mot français. La fiche
  0001, remplacée, garde son texte d'origine. Glossaire inchangé.
- `CLAUDE.md` et `status.yml` : plus de pile actée ni de technologie nommée ; aucune pile choisie,
  aucune ligne de code avant l'acte d'une nouvelle fiche de pile. Le module 0.9 renvoie de nouveau à
  l'issue `#24`.
- Issues : `#36` rouverte ; `#24`, « Choisir la pile technique », rouverte aussi, puisque le choix
  qu'elle portait est à refaire ; `#36` à `#46` commentées. Rien supprimé. Jalon du lot 1 et issues
  `#48` à `#50` inchangés.

## Décisions

- **Réinitialisation des choix techniques**, décision de Lucas : 0002 et 0004 à 0008 abandonnées ; la
  pile sera choisie de nouveau dans une nouvelle conversation et une nouvelle fiche.
- Restent acquis : 0003 (ordre des lots), la spécification dont 0.9 et ses valeurs, la maquette du
  lot 1 et les trois décisions sur les écrans, les termes Socle, Logistique, Agent d'impression et
  Quai du glossaire.

## Correction d'une entrée passée

L'entrée `2026-09-23-2020-acte-pile-et-decoupe-interne.md` et l'en-tête de la fiche 0002 disent
« actée par Lucas le 2026-09-23 ». C'était faux : l'acte de la pile a été déduit d'une validation qui
portait sur deux valeurs de 0.9. Ces textes ne se réécrivent pas ; la présente entrée les corrige.
L'acte de 0004 le 2026-09-24 reposait sur la pile de 0002 ; il tombe avec elle.

## Fichiers touchés

| Chemin | Ce qui change et pourquoi |
|---|---|
| `docs/decisions/0002-…`, `0004-…` à `0008-…` | Statut `abandonnée`, mention en en-tête. |
| `docs/decisions/README.md` | Index et paragraphe d'état. |
| `docs/lots/lot-1/README.md` | Décisions sur les écrans, sans technologie. |
| `docs/socle/0.9-exigences-de-fonctionnement.md` | Mention de 0002 retirée. |
| `docs/flux-sortants/3.3-expedition-transporteurs.md` | « API transporteur » devient « Interface du transporteur ». |
| `CLAUDE.md` | Aucune pile choisie. |
| `status.yml` | En-tête sans pile ; module 0.9 rattaché à `#24`. Aucun état de module ou de lot ne change. |
| `journal/2026-09-24-2158-reinitialisation-des-choix-techniques.md` | Créé : la présente entrée. |

## Issues liées

- `#24` — rouverte, commentée : porte de nouveau le choix de la pile.
- `#36` — rouverte, commentée.
- `#37` à `#46` — commentées : fiches abandonnées, travail repris après le nouveau choix de pile.
- `#48`, `#49`, `#50` — inchangées.

## Points ouverts

- **Nouveau choix de la pile**, dans une nouvelle conversation, contre la grille de 0.9.
- Les issues `#36` à `#46` portent des titres de fiches de détail pensés pour l'ancienne pile ; la
  nouvelle fiche dira lesquelles gardent un objet.
