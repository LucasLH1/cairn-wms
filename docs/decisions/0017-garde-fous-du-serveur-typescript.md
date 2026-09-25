# 0017 — Garde-fous du serveur TypeScript

**Statut** : actée · **Date** : 2026-09-25 · **Remplace** : — · **Remplacée par** : —

## Contexte

La fiche 0009 retient TypeScript de bout en bout en connaissant quatre faiblesses du langage côté
serveur, chacune jugée parable. Cette fiche fixe les parades. Elles conditionnent la tenue de plusieurs
exigences de `socle/0.9`.

| Faiblesse | Ce qu'elle menace |
|---|---|
| Types effacés à l'exécution | `RG-EXI-012` (droits contrôlés à chaque geste), `044` à `046` (fichiers et flux), `051` (cloisonnement des systèmes) : tout ce qui entre sans être vérifié. |
| Un seul fil d'exécution par processus | `RG-EXI-073` : un import, une simulation de règle (`RG-EXI-030`), une génération de document ou la photo quotidienne (`RG-EXI-023`) retardent les gestes. |
| Forte dépendance à des paquets tiers | La durée de vie du produit et la sécurité d'instances mises à jour par des tiers (`RG-EXI-060`) ; le registre npm a connu en 2025 plusieurs compromissions de paquets très utilisés. |
| Pas de décimal natif | L'exactitude des quantités, poids, dimensions et, au lot 5, des montants valorisés. |

## Options

### Option A — Garde-fous écrits en règles et vérifiés par l'intégration continue

- **Ce que c'est** : chaque parade est une règle ; l'intégration continue bloque toute modification qui
  l'enfreint.
- **En faveur** : la règle tient quel que soit le nombre de sessions et d'écrans écrits par l'IA.
- **En défaveur** : un outillage de vérification à écrire et à entretenir.
- **Ce que ça ferme** : les raccourcis, y compris ponctuels.

### Option B — Conventions écrites, sans vérification automatique

- **Ce que c'est** : les mêmes règles, dans `CLAUDE.md`, laissées à la discipline.
- **En faveur** : aucun outillage.
- **En défaveur** : la dérive est certaine sur la durée ; elle se découvre en production.
- **Ce que ça ferme** : —

### Pour le travail lourd : Option C — fils d'exécution secondaires dans le même processus

- **Ce que c'est** : le travail lourd tourne sur des fils secondaires du processus qui sert les gestes.
- **En faveur** : un seul processus.
- **En défaveur** : mémoire et pannes partagées avec les gestes ; un traitement qui s'emballe met en
  péril `RG-EXI-073` et la disponibilité.
- **Ce que ça ferme** : l'isolement des traitements.

### Pour le travail lourd : Option D — deux rôles d'une même application

- **Ce que c'est** : la même application (fiche 0013) est lancée deux fois : un rôle sert les écrans et
  les gestes, l'autre exécute les traitements différés et le travail lourd, qu'il prend dans la file de
  la base (fiches 0012 et 0028).
- **En faveur** : un traitement lourd ne ralentit jamais un geste ; une panne de traitement laisse les
  écrans debout ; la reprise des échéances après arrêt se fait par la file (`RG-EXI-022`).
- **En défaveur** : deux processus en mémoire.
- **Ce que ça ferme** : —

## Décision

**Le serveur TypeScript est tenu par les garde-fous ci-dessous, vérifiés par l'intégration continue,
qui bloque en cas d'écart ; le travail lourd tourne dans un second rôle de l'application, jamais dans
celui qui sert les gestes** (options A et D).

1. **Typage strict.** Mode strict du compilateur ; `any`, les conversions non vérifiées et les
   suppressions d'erreur interdites par l'analyse de code.
2. **Validation à chaque entrée.** Tout ce qui entre — geste venu d'un écran, appel de l'interface
   directe, fichier, courriel, réponse d'un transporteur, lecture de la base hors de l'accès typé — est
   validé par un schéma avant d'être utilisé. Les mêmes schémas servent à l'écran et au serveur.
3. **Deux rôles.** Le rôle « gestes » ne fait que des traitements courts ; imports, simulations,
   documents, photo quotidienne, échanges et échéances passent par la file et le rôle « traitements ».
4. **Dépendances tenues.** Chaque dépendance est justifiée ; les dépendances structurantes passent par
   une fiche. Versions exactes figées ; délai minimal avant d'adopter une version nouvellement publiée ;
   scripts d'installation des paquets désactivés ; audit des vulnérabilités à chaque modification.
5. **Nombres exacts.** Quantités, poids et dimensions en entiers dans l'unité de base ; montants en
   centimes entiers. Aucun nombre à virgule flottante pour une valeur de gestion.

Critère décisif : les faiblesses retenues en 0009 ne sont acceptables que si leur parade tient sans
dépendre de la discipline.

Proposée par Claude le 2026-09-24. Actée par Claude le 2026-09-25, sur délégation explicite de Lucas :
« Prends les décisions qu'il faut, je veux passer au dev le plus rapidement possible. »

## Conséquences

- **Ce qu'on peut faire** : s'appuyer sur les types à l'intérieur du serveur ; tenir `RG-EXI-073` même
  pendant un import ou une photo quotidienne.
- **Ce qu'on ne peut plus faire** : lancer un travail lourd depuis le rôle « gestes » ; ajouter une
  dépendance sans justification ; stocker une quantité ou un montant en virgule flottante.
- **Ce qu'il faut mettre en place** : la bibliothèque de schémas (fiche 0020) ; l'outillage de
  vérification dans l'intégration continue, dès le premier code (fiche 0024) ; les réglages du
  gestionnaire de paquets (fiche 0023) ; l'unité de base de chaque grandeur, avec le modèle de données.
- **Ce qu'on accepte de payer** : deux processus en mémoire ; une adoption plus lente des nouvelles
  versions de dépendances, y compris des correctifs, sauf faille connue.
- **Ce qui la remettrait en cause** : les deux rôles qui ne tiennent pas dans quatre gigaoctets avec la
  base et l'espace technique.

### Non prouvé

- La tenue en mémoire des deux rôles, de la base et de l'espace technique sur le serveur de référence :
  le lot 1 le mesure (`RG-EXI-072`).
- Que ces garde-fous suffisent à tenir `RG-EXI-073` : ils en sont la condition, pas la preuve.
