# 0007 — Interface de programmation et contrat

**Statut** : proposée · **Date** : 2026-09-24 · **Remplace** : — · **Remplacée par** : —

## Contexte

`0002` a retenu des API minimales ASP.NET Core, un contrat OpenAPI produit par le serveur, et un code
d'appel TypeScript généré depuis ce contrat pour les écrans. Cette fiche dit la forme de cette
interface, comment le contrat reste vrai, et ce que chaque appel garantit.

Les exigences qui pèsent ici :

- **Geste enregistré ou refusé, jamais deux fois** (`RG-EXI-006`, `007`).
- **Droits contrôlés à chaque geste**, quoi que l'écran ait présenté (`RG-EXI-012`, `RG-ORG-022`) ;
  **rien hors périmètre**, quel que soit le chemin (`RG-EXI-050`, `052`).
- **Refus motivés** : un geste refusé dit pourquoi, et le refus est tracé (`RG-EXI-014`,
  `RG-TRA-005`) ; un stock non prélevable dit sa raison (`RG-DIS-004`, `RG-PRE-066`).
- **Poste d'émission** porté par l'événement (`RG-TRA-003`) ; **session qui suit la personne**, sur
  plusieurs postes à la fois (`RG-EXI-055`).
- **Langue par utilisateur** (`RG-EXI-079`) ; **export tel qu'affiché** (`RG-EXI-056`).
- **Interface directe unique** pour les systèmes des donneurs d'ordre (`RG-EXI-043`, `051`) — au lot
  5 (`0003`).
- Le lot 1 exige que les tests de scénario chargent leur jeu de données **par l'interface publique**
  (`0004`, `0005`).

## Options

### Option A — Une interface « ressources » : lecture et écriture des objets

- **Ce que c'est** : chaque objet exposé en création, lecture, modification, suppression.
- **En faveur** : patron répandu, génération facile.
- **En défaveur** : le métier est fait de gestes — recevoir une ligne, déposer un support, valider un
  écart — dont chacun a ses préconditions, ses refus motivés et son événement. Une modification
  générique les dilue, et rien n'y interdit de modifier ce que la spécification veut immuable.
- **Ce que ça ferme** : un journal qui corresponde un à un aux gestes.

### Option B — Des lectures par objet, et un point d'appel par geste

- **Ce que c'est** : les lectures exposent les objets et leurs listes ; chaque geste de la
  spécification est un appel nommé, qui réussit en produisant son événement ou échoue avec un motif.
- **En faveur** : un geste, un appel, un événement, une permission ; les refus sont décrits dans le
  contrat ; l'immuabilité n'est même pas exprimable.
- **En défaveur** : plus de points d'appel à nommer.
- **Ce que ça ferme** : les modifications génériques. C'est le but.

## Décision

**Option B.** Critère décisif : la spécification est écrite en gestes, et chaque geste porte une
permission, un événement et des refus motivés ; l'interface doit les porter un à un pour que le
compilateur et le contrat en répondent.

Proposée, en attente de validation par Lucas.

### Forme

- API minimales ASP.NET Core 10, regroupées par module de la spécification, dans le projet de la
  partie concernée (`0004`) ; les noms suivent les termes anglais du glossaire.
- Lectures en `GET` ; chaque geste en `POST` sur l'objet visé, nommé par le geste
  (`/receipts/{id}/lines`, `/putaway-missions/{id}/deposit`…).
- Les listes acceptent un filtre, un tri et des colonnes ; le même descripteur produit l'export, ce
  qui garantit l'export tel qu'affiché (`RG-EXI-056`).
- Deux interfaces distinctes : **l'interface des écrans**, livrée avec eux et libre d'évoluer avec
  eux ; **l'interface directe** des systèmes des donneurs d'ordre, versionnée et stable, décidée par
  la fiche Échanges (issue `#44`) au lot 5. La seconde n'est pas ouverte avant.

### Contrat

- Le document OpenAPI 3.1 est produit par Microsoft.AspNetCore.OpenApi, à la compilation, et suivi
  dans le dépôt. La chaîne de qualité (`0005`) le régénère et refuse toute différence non suivie.
- Le code d'appel TypeScript des écrans est généré depuis ce document par Orval 8 (MIT, actif), en
  mode `fetch`, sans dépendance à une bibliothèque de requêtes. Il n'est jamais modifié à la main.
  Sa compatibilité avec TypeScript 6 n'a pas été vérifiée : elle l'est à la première installation,
  et un échec renvoie à @hey-api/openapi-ts, qui la déclare mais reste en 0.x.
  openapi-typescript est écarté : il déclare TypeScript 5 seulement et n'a rien publié depuis février ;
  Kiota l'est aussi, son TypeScript étant en préversion.

### Garanties de chaque appel

- **Idempotence** : tout geste porte un en-tête `Idempotency-Key`, clé choisie par l'écran pour ce
  geste et renvoyée à l'identique en cas de nouvel envoi. Le serveur rend la réponse conservée
  (`0006`). La sémantique suit le brouillon IETF *Idempotency-Key HTTP Header Field*, expiré, sans
  en dépendre : elle est décrite dans le contrat lui-même.
- **Droits** : chaque point d'appel déclare sa permission du catalogue (`RG-ORG-018`) ; le serveur
  la vérifie avant tout, et le filtre de périmètre du socle s'applique à toute lecture (`0004`). Un
  refus produit son événement (`RG-EXI-014`).
- **Refus** : réponse au format *Problem Details* (RFC 9457), portant un **code de motif** stable
  pris dans un catalogue par module et ses paramètres — emplacement proposé, campagne, opérateur qui
  compte. Le texte est composé par l'écran dans la langue de l'utilisateur (`RG-EXI-079`) ; le
  journal conserve le code et les paramètres.
- **Transaction** : un geste s'exécute dans une transaction ; il réussit en entier ou pas du tout
  (`RG-EXI-011`).

### Identité

- **Utilisateur** : session côté serveur, désignée par un cookie sécurisé, `HttpOnly` et
  `SameSite=Strict` ; un utilisateur peut en avoir plusieurs à la fois (`RG-EXI-055`). Mots de passe
  hachés par l'algorithme fourni par ASP.NET Core Identity ; une connexion par annuaire d'entreprise
  n'est pas exigée et n'est pas prévue.
- **Poste** : chaque navigateur de poste reçoit, à son enregistrement par un administrateur, un
  jeton de poste durable ; le serveur le résout en `Workstation` et le porte sur chaque événement
  (`RG-TRA-003`). Un navigateur sans poste enregistré consulte et ne peut pas émettre de geste du
  terrain.
- **Systèmes des donneurs d'ordre** : hors lot 1 ; fiche Échanges.

## Conséquences

- **Ce qu'on peut faire** : écrire les points d'appel du lot 1, un par geste des scénarios.
- **Ce qu'on ne peut plus faire** : exposer une modification générique d'un objet ; modifier à la
  main le code d'appel généré ; renvoyer un refus sans code de motif.
- **Ce qu'il faut mettre en place** : le catalogue des permissions et celui des codes de motif du
  lot 1, la génération du contrat et du code d'appel, l'enregistrement des postes.
- **Ce qu'on accepte de payer** : un point d'appel par geste ; deux interfaces à terme ; une
  composition des messages de refus côté écrans.
- **Ce qui la remettrait en cause** : des gestes si nombreux et si proches que leur nommage cesse
  d'être lisible ; un besoin de connexion par annuaire d'entreprise.
