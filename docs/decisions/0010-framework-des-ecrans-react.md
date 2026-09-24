# 0010 — Framework des écrans : React

**Statut** : actée · **Date** : 2026-09-24 · **Remplace** : — · **Remplacée par** : —

## Contexte

La fiche 0009 fixe TypeScript de bout en bout. Reste à choisir le framework qui construit les écrans.

Ce que les écrans doivent tenir :

- **Un poste d'ordinateur**, fixe ou embarqué sur chariot ; aucun écran pour tablette ou téléphone
  (`RG-EXI-053`).
- **La lecture de code-barres comme entrée principale du terrain**, reçue quel que soit l'écran ouvert
  (`RG-EXI-033`), par un lecteur branché comme un clavier (`RG-EXI-078`).
- **Des données mises à jour en continu** : toute modification visible sans rechargement
  (`RG-EXI-001`), état de la main tenu à jour (`RG-EXI-003`), file de décisions en continu
  (`RG-EXI-004`), en moins de deux secondes (`RG-EXI-073`).
- **Des écrans de gestion denses** : listes exportables telles qu'affichées (`RG-EXI-056`), saisies
  nombreuses, navigation au clavier.
- **Français par défaut, bascule en anglais par utilisateur** (`RG-EXI-054`, `079`).
- **Des écrans construits sans maquette** à partir des composants existants (`lots/lot-1/README.md`) :
  la cohérence d'un grand nombre d'écrans écrits par l'IA compte plus que tout.

Plusieurs besoins ne départagent aucun framework sérieux : la lecture de code-barres se capte au niveau
de la page, les jetons de couleur sont des variables CSS, les schémas de validation se partagent avec
le serveur, les deux langues et la mise à jour en direct se traitent partout.

La maquette du lot 1 fonctionne sur React, mais à travers l'environnement propre à Claude Design : un
seul composant monolithique, aux couleurs écrites en dur. Elle ne fournit aucun composant réutilisable
tel quel et ne pèse pas dans le choix. Ce qu'on en garde — couleurs, police, formes des composants,
comportements — se transpose de la même façon dans tout framework.

## Options

### Option A — React

- **Ce que c'est** : bibliothèque de composants à rendu déclaratif.
- **En faveur** : l'écosystème le plus riche pour les écrans de gestion, notamment les composants sans
  apparence accessibles au clavier (React Aria) ; la maîtrise par l'IA la plus large ; stable.
- **En défaveur** : chaque changement recalcule la vue du composant touché ; des écrans alimentés en
  continu demandent de la discipline pour éviter les recalculs en cascade, et les erreurs de ce type
  sont typiques d'un code écrit par l'IA.
- **Ce que ça ferme** : les bibliothèques propres aux autres frameworks.

### Option B — Vue

- **Ce que c'est** : framework à réactivité fine.
- **En faveur** : seul ce qui dépend de la donnée changée se met à jour, ce qui convient aux écrans
  alimentés en direct ; même framework que `cairn-dashboard`, petit gain d'outillage.
- **En défaveur** : offre de composants sans apparence plus mince ; maîtrise par l'IA un cran en
  dessous.
- **Ce que ça ferme** : les bibliothèques propres aux autres frameworks.

### Option C — Angular

- **Ce que c'est** : framework complet (formulaires, traduction, structure imposée).
- **En faveur** : conventions fortes, adaptées à une grosse application de gestion.
- **En défaveur** : plus lourd ; ses versions successives ont changé de style, et l'IA mélange les
  époques.
- **Ce que ça ferme** : les bibliothèques propres aux autres frameworks.

### Option D — Svelte ou Solid

- **Ce que c'est** : frameworks légers à réactivité fine.
- **En faveur** : rapides et légers.
- **En défaveur** : écosystèmes petits ; la version 5 de Svelte a changé la syntaxe, et l'IA mélange
  encore l'ancienne et la nouvelle.
- **Ce que ça ferme** : les bibliothèques propres aux autres frameworks.

## Décision

**Les écrans de Cairn WMS sont construits avec React** (option A).

Critère décisif : la profondeur de l'offre de composants pour écrans de gestion et la maîtrise par
l'IA, pour des centaines d'écrans construits sans maquette. L'écart avec Vue est faible ; Vue serait
passé devant si l'on avait donné plus de poids aux écrans alimentés en direct.

Proposée par Claude, validée par Lucas le 2026-09-24.

## Conséquences

- **Ce qu'on peut faire** : s'appuyer sur l'écosystème React pour les composants, les tableaux, les
  formulaires et la traduction.
- **Ce qu'on ne peut plus faire** : introduire un second framework d'écrans dans le produit sans
  nouvelle fiche.
- **Ce qu'il faut mettre en place** : la méthode de composants et de style (fiche 0011) ; une règle de
  gestion de l'état des écrans alimentés en direct, qui évite les recalculs en cascade, à fixer avec
  le cadre des écrans.
- **Ce qu'on accepte de payer** : la discipline de rendu qu'exigent des écrans alimentés en continu.
- **Ce qui la remettrait en cause** : un écran du lot 1 qui ne tient pas les deux secondes de
  `RG-EXI-073` pour une cause propre au rendu.

### Exigences

- **Satisfaites** : `RG-EXI-001` à `005`, `033`, `053` à `056`, `079`, sans condition propre au
  framework.
- **Non mesurée** : `RG-EXI-073` côté rendu. Aux volumes de Cairn — quelques centaines de lignes par
  écran — l'écart de performance entre frameworks est probablement négligeable ; ce n'est pas prouvé.
