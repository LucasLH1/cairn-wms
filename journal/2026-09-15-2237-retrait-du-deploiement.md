---
date: 2026-09-15 22:37
objectif: Retirer du dépôt le document de déploiement et les deux fiches qu'il avait fait acter, qui relèvent de cairn-dashboard.
modules: []
issues: []
---

# Session du 2026-09-15 — retrait du déploiement

## Objectif

Sortir de `cairn-wms` ce qui n'y appartient pas : `docs/deploiement.md` et les fiches `0001` et
`0002` qui en avaient été tirées une heure plus tôt. `cairn-dashboard` en devient l'unique source.
Le dépôt doit retrouver l'état exact qui précédait leur ajout.

## Actions

- Vérifié que rien n'était entré dans `cairn-wms` depuis le push de `3d4ae2b` : `dev` local et
  distant sur le même commit, arbre propre. La session qui travaille sur `cairn-dashboard` n'y a
  pas touché.
- Annulé `3d4ae2b` par `git revert`, sans réécriture d'historique : le commit fautif reste lisible,
  son annulation est un commit à part entière.
- Contrôlé que l'arbre résultant est **identique à l'octet près** à celui de `7fb7385`, l'état
  d'avant l'ajout — `git diff` vide, pas seulement les fichiers attendus.
- Constaté que `CLAUDE.md`, `docs/decisions/README.md` et `README.md` ont retrouvé leurs phrases
  d'origine : aucune décision actée, aucune pile choisie. Elles redeviennent exactes.

## Décisions

- **`docs/deploiement.md` et les fiches `0001` et `0002` appartiennent à `cairn-dashboard`**, qui
  en devient l'unique source. Les deux décisions portent sur la mise en service du dashboard et sur
  l'hébergement qui la sert : aucune ne dit quoi que ce soit de Cairn WMS.
- **Aucun renvoi n'est laissé ici.** Pas de lien, pas de fiche « voir ailleurs », pas de mention
  résiduelle. Le déploiement de Cairn sera traité quand sa pile sera choisie, et pas avant — s'y
  référer aujourd'hui reviendrait à laisser croire qu'une partie de la question est réglée.
- **Ni label `infra`, ni issue de déploiement dans ce dépôt.** La nomenclature reste close : une
  couche, un module, `spec`, `tech`, `bug`.
- **Aucune fiche n'est écrite dans `docs/decisions/` pour cet arbitrage**, et c'est délibéré : il ne
  tranche rien du produit, il diffère une question. Le dossier doit redevenir — et rester — vide,
  puisque c'est ce qui donne sa force à la règle 2 de `CLAUDE.md`.

## Fichiers touchés

| Chemin | Ce qui change et pourquoi |
|---|---|
| `docs/deploiement.md` | Retiré. Relève de `cairn-dashboard`. |
| `docs/decisions/0001-hebergement-sur-coolify.md` | Retiré. Idem. |
| `docs/decisions/0002-dashboard-un-seul-environnement.md` | Retiré. Idem. |
| `docs/decisions/README.md` | Retrouve « aucune décision n'est prise ». Le dossier est de nouveau vide de décisions. |
| `CLAUDE.md` | Règle 2 : retrouve « `docs/decisions/` ne contient aucune décision ». |
| `README.md` | Retrouve « aucune pile technique n'est choisie », et la table perd la ligne du document de déploiement. |
| `journal/2026-09-15-2230-deploiement-et-deux-decisions.md` | **Emporté par le revert.** Son contenu reste lisible dans le commit `3d4ae2b` ; la présente entrée le remplace au fil du journal. |
| `status.yml` | Inchangé. Aucun module n'a changé d'état, ni tout à l'heure ni maintenant. |

## Issues liées

Néant. Le retrait ne touche aucune des 21 issues ouvertes, et aucune n'est créée.

## Points ouverts

- **La contradiction avec `docs/README.md` est close** — c'était le premier point ouvert de
  l'entrée de 22:30. Elle disparaît avec le document qui la causait : `docs/` ne contient plus que
  de la spécification métier, comme son propre README l'exige.
- **Coordination avec `cairn-dashboard`** : ce dépôt reste la référence pour deux fichiers
  réutilisables tels quels — `journal/README.md` et `docs/decisions/modele.md`. `CLAUDE.md` et
  `docs/decisions/README.md` ne se copient pas : le premier décrit les branches et la protection de
  `cairn-wms`, le second porte l'état de son propre dossier de décisions.
- Les points ouverts de l'entrée du soir restent ouverts : préfixes de règles des couches 2 à 5,
  nom des dossiers de couche, label `accessibility` hérité, et la pile applicative entièrement
  ouverte qui bloque les onze issues de réalisation.
