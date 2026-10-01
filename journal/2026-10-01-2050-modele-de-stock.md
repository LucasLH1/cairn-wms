---
date: 2026-10-01 20:50
objectif: Réaliser le module 0.4, modèle de stock, et brancher ce que les modules précédents attendaient de lui.
modules: ["0.1", "0.2", "0.3", "0.4", "0.5", "0.8"]
issues: [4, 77, 78]
---

# Session du 2026-10-01 — modèle de stock (0.4)

## Objectif

Lucas : « Reprends ». Suite de la réalisation module par module (fiche 0032) : le module 0.4, clé de
voûte du socle, puis ce que 0.1, 0.2, 0.3 et 0.5 laissaient en attente du stock.

## Actions

- **Migration 0011** :
  - états qualité par donneur d'ordre, avec la liste modèle ;
  - motifs de mouvement ; types de support et supports ;
  - lots et objets sérialisés ; unités de stock ;
  - mouvements, dont la base elle-même refuse la modification et la suppression ;
  - déplacements engagés ; réservations ; blocages ;
  - règle de prélèvement par donneur d'ordre et par référence ;
  - heure de photo par site, photos et leurs lignes ;
  - le statut de disponibilité, calculé par une fonction de la base à partir des faits (RG-STK-015, 016).
- **Moteur** :
  - entrée contrôlée au dépôt — capacité en nommant la marge, état qualité accepté, cohabitation ;
  - fusion des unités jumelles (RG-STK-008) ;
  - lot exigé en gestion lot ;
  - numéro de série déjà en stock refusé avec sa localisation, passages comptés.
- **Gestes et consultations** :
  - déplacement en deux temps, d'un support entier ou de lignes ;
  - changement d'état qualité ; ajustement ; correction par mouvement inverse rattaché ;
  - blocage, avec son impact avant validation et la levée des réservations ; levée d'un blocage ;
  - levée manuelle d'une réservation ;
  - consultations : tableau croisé, stock d'un emplacement ou d'un support, fiches support et objet
    sérialisé, blocages, photos et leur comparaison ;
  - traitements récurrents de la photo (tous les quarts d'heure, à l'heure du site) et du stock périmé.
- **Branchements en attente** :
  - ce qui porte du stock ne se désactive pas : emplacement, zone, site, donneur d'ordre ;
  - pas de zone réservée sous le stock d'un autre ;
  - axe de gestion figé au premier mouvement (RG-REF-013) ;
  - stock immobilisé par les brouillons ;
  - stock chez un sous-traitant ;
  - recherche des supports et des numéros de série.
- **Écrans** (réalisés par un agent sur consigne écrite, relus et corrigés par Claude) :
  - Bureau › Stock, en trois onglets : consultation, blocages, photos quotidiennes ;
  - fiches support et objet sérialisé ;
  - écran de déplacement, qui répond au lecteur de code-barres ;
  - paramétrage : états qualité et règle de prélèvement sur la fiche donneur d'ordre, motifs et types
    de support au paramétrage, heure de photo sur la fiche site, règle de prélèvement sur la fiche
    référence.
- **Vérifié** : `pnpm check` vert (147 tests serveur) ; 47 tests de bout en bout. Barrières prouvées
  par leur rouge : poids au dépôt, levée des réservations au blocage, numéro de série en double.

## Décisions

- **Vocabulaire** : l'agent des écrans a relevé que le glossaire réserve « transfert » (`StockTransfer`)
  à l'acheminement entre deux sites. Un changement d'emplacement est un **déplacement** (`StockMove`,
  #74). Le serveur et le contrat, encore non poussés, ont été renommés en conséquence : table
  `stock_move`, nature `move`, gestes `startStockMove` et `completeStockMove`, permission `moveStock`.
  Le titre « Transférer du stock » de la spécification (0.4 § 6) est cité tel quel.
- **Sept choix provisoires**, que la spécification ne tranchait pas, soumis à Lucas (#77) : priorité du
  statut, états acceptés par code, numérotation des supports, heure de photo, déplacement en deux
  gestes, liste modèle des états, fusion qui garde la date d'entrée la plus ancienne.
- La liste modèle des états qualité est posée à la création de chaque donneur d'ordre (branchement
  `principalCreated`), et par le jeu de données et les fixtures, qui insèrent les donneurs d'ordre
  directement.

## Défauts trouvés en vérifiant

- Les passages d'un objet sérialisé ne pouvaient pas se compter une fois son unité sortie : le mouvement
  porte désormais l'objet sérialisé.
- Une requête rendait une erreur sur une liste vide (un identifiant vide comparé à un UUID).
- Deux sources de recherche, supports et numéros de série, étaient importées mais pas branchées.
- À l'œil, sur du stock réel (posé dans la base locale seulement, par un script hors dépôt) :
  - les tableaux des unités et des mouvements rejetaient leurs dernières colonnes hors de vue ;
  - corrigé en réunissant lot et numéro de série, puis motif et commentaire.

  Le contrôle de mise en page ne le voyait pas : il exempte les tableaux, qui défilent par
  construction, et les tests tournent sans stock.
- Panne de l'environnement local : deux `pnpm dev` tournaient ensemble, l'ancien serveur tenant le
  port 3000. Lucas voyait l'ancienne version (« je ne vois pas de nouvelles vues »). Réparé, et noté en
  mémoire de travail.

## Fichiers touchés

| Fichier | Nature |
|---|---|
| `apps/serveur/src/migrations/0011-stock-model.ts` | Schéma du stock. |
| `apps/serveur/src/logistique/stock/*` | Moteur, gestes, consultations, paramétrage, traitements, recherche, branchements, tests. |
| `apps/serveur/src/app.ts`, `main.ts`, `logistique/organization/administration.ts` | Branchements et traitements récurrents. |
| `packages/contrat/src/stock.ts`, `item.ts`, `search.ts`, `permission.ts` | Contrat. |
| `apps/ecrans/src/screens/stock/*`, écrans de paramétrage, recherche, ossature | Écrans. |
| `packages/libelles/src/*`, `docs/glossaire.md` | Libellés, termes (nature de mouvement, type de support, portée de blocage). |
| `apps/serveur/src/dataset/index.ts`, `test-support/fixtures.ts` | États qualité, motifs et types de support fictifs ; permissions de stock d'Anna. |

## Points ouverts

- #77 : sept choix provisoires à valider.
- #78 : reprendre un déplacement interrompu (aucun écran pour l'instant).
- Attaché à d'autres modules :
  - la valeur déclarée par le flux d'entrée et les entrées réelles (1.1) ;
  - le moment de réservation et l'application de la règle de prélèvement (3.2) ;
  - les demandes de réapprovisionnement des emplacements dédiés (RG-EMP-035, 2.1) ;
  - la surveillance des séjours en virtuel (RG-EMP-044) ;
  - le stock rattaché à un dossier (RG-STK-040 à 044, 1.2) ;
  - les demandes nommées dans l'impact d'un blocage, quand des commandes existeront (3.1).

**Module suivant** : 0.7 Traçabilité et unités d'œuvre.
