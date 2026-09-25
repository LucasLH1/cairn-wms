# 0018 — Environnement d'exécution : Node.js, version à support long

**Statut** : actée · **Date** : 2026-09-25 · **Remplace** : — · **Remplacée par** : —

## Contexte

La fiche 0009 fixe TypeScript de bout en bout. Il faut choisir ce qui exécute le code côté serveur et
dans l'agent d'impression (fiche 0016).

Ce qui contraint :

- **Durée de vie et mises à jour par des tiers** (`RG-EXI-060`) : l'environnement doit être stable,
  maintenu longtemps, et compatible avec les bibliothèques retenues.
- **Temps de réponse et sobriété** (`RG-EXI-072`, `073`) : deux rôles de l'application tournent en
  mémoire (fiche 0017).
- **Agent d'impression** installé sur un poste Windows ou Linux (fiche 0016).

## Options

### Option A — Node.js, version à support long

- **Ce que c'est** : l'environnement de référence de l'écosystème TypeScript côté serveur.
- **En faveur** : le plus mûr et le plus compatible ; calendrier de support long publié ; pilote
  PostgreSQL et bibliothèques de file éprouvés dessus ; exécutable autonome possible pour l'agent.
- **En défaveur** : démarrage et outillage moins rapides que Bun.
- **Ce que ça ferme** : —

### Option B — Bun

- **Ce que c'est** : environnement récent, rapide, avec gestionnaire de paquets et tests intégrés.
- **En faveur** : rapidité ; outillage intégré ; exécutable autonome simple.
- **En défaveur** : plus jeune ; écarts de compatibilité avec certaines bibliothèques de Node ;
  calendrier de support moins établi.
- **Ce que ça ferme** : une partie de l'écosystème Node, au cas par cas.

### Option C — Deno

- **Ce que c'est** : environnement à sécurité par permissions, TypeScript natif.
- **En faveur** : modèle de permissions ; outillage intégré.
- **En défaveur** : compatibilité avec l'écosystème npm meilleure qu'avant mais moins complète ; moins
  répandu en production.
- **Ce que ça ferme** : une partie de l'écosystème npm.

## Décision

**Le serveur et l'agent d'impression s'exécutent sur Node.js, dans sa version à support long active au
moment de la mise en place ; le code est compilé en JavaScript par le compilateur TypeScript à la
construction de l'image** (option A).

Critère décisif : la stabilité et la compatibilité sur la durée de vie du produit comptent plus que la
vitesse de l'outillage.

Proposée et actée par Claude le 2026-09-25, sur délégation explicite de Lucas : « Prends les décisions
qu'il faut, je veux passer au dev le plus rapidement possible. »

## Conséquences

- **Ce qu'on peut faire** : utiliser toute bibliothèque de l'écosystème Node.
- **Ce qu'on ne peut plus faire** : dépendre d'une fonction propre à Bun ou à Deno.
- **Ce qu'il faut mettre en place** : la version de Node figée dans le dépôt et dans l'image ; son
  passage à la version à support long suivante, chacun par une modification tracée ; l'empaquetage de
  l'agent d'impression en exécutable autonome.
- **Ce qu'on accepte de payer** : une étape de compilation avant exécution.
- **Ce qui la remettrait en cause** : une exigence de `RG-EXI-072` ou `073` non tenue pour une raison
  propre à Node.

### Non prouvé

- Le numéro de la version à support long active au moment de la mise en place : à lire sur le
  calendrier officiel de Node.js, non figé ici.
- La maturité des exécutables autonomes de Node pour l'agent d'impression sous Windows : à éprouver au
  lot 1 ; à défaut, l'agent s'installe avec un Node embarqué.
