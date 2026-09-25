# 0025 — Cadre des écrans

**Statut** : actée · **Date** : 2026-09-25 · **Remplace** : — · **Remplacée par** : —

## Contexte

Les fiches 0010, 0011 et 0014 fixent React, React Aria et Tailwind, et une application web ouverte dans
le navigateur. Il reste à choisir ce qui construit l'application, la navigation entre écrans, la tenue
des données du serveur, les formulaires, les libellés et la lecture de code-barres.

Ce qui contraint :

- **Données mises à jour en continu** sans rechargement (`RG-EXI-001` à `005`), en moins de deux
  secondes (`RG-EXI-073`), sans recalcul en cascade (fiche 0010).
- **Lecture de code-barres reçue quel que soit l'écran** : réponse dans une mission, ouverture de l'objet
  hors mission (`RG-EXI-033`), par un lecteur branché comme un clavier (`RG-EXI-078`).
- **Mêmes schémas qu'au serveur** (fiches 0017, 0020) ; **libellés du glossaire**, français par défaut,
  anglais par utilisateur (`RG-EXI-054`, `079`).
- **Session qui suit la personne** sur plusieurs postes (`RG-EXI-055`).

## Options

### Option A — Vite, TanStack Router et TanStack Query, React Hook Form, i18next

- **Ce que c'est** : un outil de construction rapide, un routeur typé, un cache des données du serveur,
  une bibliothèque de formulaires, une bibliothèque de traduction.
- **En faveur** : chaque brique est la référence de son domaine pour une application React sans rendu
  serveur ; routes et paramètres typés et validés par Zod ; le cache se met à jour élément par élément
  quand le serveur signale un changement, ce qui évite les recalculs en cascade.
- **En défaveur** : cinq bibliothèques à tenir.
- **Ce que ça ferme** : —

### Option B — Un cadre complet à rendu serveur (Next.js, React Router en mode cadre)

- **Ce que c'est** : un cadre qui rend les pages côté serveur et intègre routage et données.
- **En faveur** : tout-en-un.
- **En défaveur** : un second serveur applicatif, en doublon du serveur Fastify ; le rendu serveur
  n'apporte rien à une application de gestion derrière une connexion.
- **Ce que ça ferme** : la séparation nette écrans–serveur de la fiche 0023.

### Option C — Un magasin d'état global (Redux, Zustand) pour tout

- **Ce que c'est** : les données du serveur et l'état des écrans dans un même magasin.
- **En faveur** : un seul modèle.
- **En défaveur** : réinvente le cache, l'invalidation et les relances ; source classique de recalculs en
  cascade.
- **Ce que ça ferme** : —

## Décision

**Les écrans sont construits par Vite ; la navigation passe par TanStack Router, les données du serveur
par TanStack Query, les formulaires par React Hook Form avec les schémas Zod du contrat, les libellés
par i18next** (option A). Règles :

1. **Pas de magasin d'état global.** Les données du serveur vivent dans le cache de TanStack Query ;
   l'état propre à un écran reste dans ses composants.
2. **Le temps réel met à jour le cache**, élément par élément, à partir des signaux du serveur
   (fiche 0026) ; un écran ne recharge jamais une liste entière pour un changement d'un élément.
3. **Un seul service de lecture de code-barres** pour toute l'application : il distingue une lecture
   d'une frappe, la remet à l'écran actif s'il attend une réponse, et ouvre l'objet lu sinon.
4. **Aucun libellé écrit en dur** : tout texte vient de `packages/libelles`, dont les clés suivent le
   glossaire.
5. **Navigateurs pris en charge** : les versions courantes de Chrome, Edge et Firefox sur ordinateur.

Critère décisif : une application React simple, où l'état venu du serveur a un seul propriétaire que le
temps réel met à jour finement.

Proposée et actée par Claude le 2026-09-25, sur délégation explicite de Lucas : « Prends les décisions
qu'il faut, je veux passer au dev le plus rapidement possible. »

## Conséquences

- **Ce qu'on peut faire** : ajouter un écran en assemblant composants, routes typées et requêtes du
  contrat.
- **Ce qu'on ne peut plus faire** : introduire un magasin d'état global ; écrire un libellé en dur ;
  capter la lecture de code-barres écran par écran.
- **Ce qu'il faut mettre en place** : le service de lecture de code-barres et ses tests ; le branchement
  du temps réel sur le cache ; le catalogue des libellés.
- **Ce qu'on accepte de payer** : cinq bibliothèques ; aucune prise en charge de Safari.
- **Ce qui la remettrait en cause** : un écran du lot 1 qui dépasse deux secondes pour afficher un
  changement, pour une cause propre au cadre.

### Non prouvé

- Que la distinction entre lecture et frappe soit fiable pour tous les lecteurs du marché : elle
  repose sur la vitesse de saisie et le suffixe envoyé par le lecteur ; à éprouver avec le matériel
  réel.
