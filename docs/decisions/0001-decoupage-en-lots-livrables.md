# 0001 — Découpage du produit en lots livrables

**Statut** : remplacée par 0003 · **Date** : 2026-09-22 · **Remplace** : — · **Remplacée par** : [0003](0003-precision-du-decoupage-en-lots.md), le 2026-09-23

## Contexte

La spécification métier est rédigée pour ses six couches, du socle au pilotage, plus le module
transverse `socle/0.8-surfaces-et-travail-partage.md`. Rien ne dit dans quel ordre le produit se
réalise.

L'ordre des couches est un ordre de **spécification** : le socle est écrit d'abord parce que tout
s'y adosse. Ce n'est pas un ordre de livraison. Le suivre comme tel produirait longtemps des objets
sans usage : un référentiel produit, des emplacements et un moteur de workflow sans qu'aucune
marchandise n'entre ni ne sorte.

Deux contraintes pèsent sur le choix :

- Le cycle de livraison imposé est vertical, module par module : API, tests unitaires, front, tests
  manuels par les écrans. Surtout pas tout le backend puis tout le frontend.
- Le projet est spéculatif : aucun entrepôt réel n'utilise le produit. Un lot ne se prouve donc pas
  par son usage, mais par un scénario déroulé sur un jeu de données fictif.

Le module SAV, réparation et retours n'est pas repoussé : c'est ce qui différencie le produit. Mais
il dépend du numéro de série, du multi-donneurs d'ordre et des parcours configurables, c'est-à-dire
du socle dans sa version riche.

## Options

### Option A — Suivre l'ordre des couches

- **Ce que c'est** : livrer la couche 0 complète, puis la couche 1, et ainsi de suite.
- **En faveur** : ordre déjà écrit, aucune décision à prendre ; chaque module est livré une fois,
  complet.
- **En défaveur** : rien ne fonctionne avant la couche 3 ; aucune démonstration possible entre-temps ;
  le socle est réalisé sans qu'aucun usage ne l'ait éprouvé, donc sans savoir ce qui manque.
- **Ce que ça ferme** : toute possibilité de corriger une erreur de conception du socle avant de
  l'avoir bâti en entier.

### Option B — Découper en verticales fonctionnelles

- **Ce que c'est** : chaque lot traverse toutes les couches et produit un entrepôt qui tourne, même
  étroit. À la fin de chaque lot, quelqu'un fait son travail du début à la fin sans sortir du
  produit.
- **En faveur** : chaque lot est démontrable ; le socle est éprouvé par l'usage au fur et à mesure ;
  une erreur de conception se voit tôt, sur un périmètre réduit.
- **En défaveur** : plusieurs modules sont touchés plusieurs fois ; exige de distinguer le périmètre
  réduit de la simplification, sous peine de produire du travail à refaire.
- **Ce que ça ferme** : rien, à condition que le lot 1 soit écrit en connaissant la cible.

### Option C — Tout réaliser avant de livrer

- **Ce que c'est** : un seul lot, le produit entier.
- **En faveur** : aucune couture entre lots, aucune reprise.
- **En défaveur** : aucun retour avant la fin ; la première erreur de conception se découvre quand
  tout en dépend.
- **Ce que ça ferme** : toute correction de cap.

## Décision

**Le produit se réalise en cinq lots, découpés en verticales fonctionnelles** (option B). Un lot
est clos quand un scénario complet se déroule de bout en bout sur le jeu de données de test, écran
par écran.

Le critère décisif est la vérifiabilité : un projet spéculatif, sans utilisateur pour signaler
l'erreur, n'a que la démonstration pour savoir s'il tient. Un découpage qui ne produit rien de
démontrable avant sa fin ne laisse aucun moyen de se corriger.

| Lot | Contenu | Ce qu'il prouve |
|---|---|---|
| 1 | **L'entrepôt minimal.** Un donneur d'ordre, un site, gestion quantitative seule. Recevoir, ranger, prélever, expédier. Socle dans sa version pauvre : ni série, ni lot, ni parcours configurable. | La marchandise entre et sort. |
| 2 | **L'identité et la multiplicité.** Numéro de série, lot, supports, multi-donneurs d'ordre réel, rôles, équipes, hiérarchie, périmètres. | Le produit distingue les exemplaires et les clients. |
| 3 | **Le SAV.** Dossiers, retours client, parcours configurables, atelier et réparation. | Ce qui différencie le produit fonctionne. |
| 4 | **La mesure.** Unités d'œuvre, photo quotidienne, relevés d'activité, indicateurs, comparaison d'activité. | Le prestataire peut facturer et piloter. |
| 5 | **L'ouverture.** Profils d'import, échanges automatisés, portail donneur d'ordre, interfaçage direct, tarification. | Le produit se branche sur le système d'un client. |

Les fonctions transverses de `0.8` ne forment pas un lot : la file de décisions, la main, la
recherche, les alertes et les impressions naissent au lot 1 dans leur forme simple et s'enrichissent
à chaque lot.

Validé par Lucas en conversation de conception.

## Conséquences

- **Ce qu'on peut faire** : démontrer le produit à la fin de chaque lot ; corriger une erreur de
  conception du socle avant qu'elle ne soit bâtie en entier ; présenter un produit fonctionnel sans
  attendre l'ensemble.

- **Ce qu'on ne peut plus faire** : traiter un module comme clos parce qu'il a été livré une fois.
  Un module est traversé par plusieurs lots et revient à chacun d'eux.

- **Ce qu'il faut mettre en place** :
  - Un jeu de données fictif représentatif, calqué sur la volumétrie de test retenue : deux sites,
    cinq donneurs d'ordre, environ deux cents références. Il sert de support de démonstration à tous
    les lots.
  - Un scénario de démonstration par lot, déroulé écran par écran, qui vaut critère de clôture.
  - `status.yml` : porter le découpage en lots et l'avancement de chacun.

- **Ce qu'on accepte de payer** :
  - **Le lot 1 n'est pas une version jetable.** Un entrepôt mono-donneur d'ordre écrit sans le
    multi-clients en tête produit du code à refaire au lot 2. Le lot livre un périmètre réduit, pas
    un produit simplifié : le cloisonnement existe dès le lot 1, il n'a qu'un seul client à
    cloisonner.
  - **Les événements ne sont pas reportables au lot 4.** Le journal (`RG-TRA-001`) et les tâches
    (`RG-TRA-010`) naissent au lot 1, même si les unités d'œuvre ne sont produites qu'au lot 4 :
    elles s'en déduisent. La photo quotidienne du stock (`RG-STK-057`) ne se reconstitue pas après
    coup, et un travail non tracé au moment du geste ne se compte jamais rétroactivement.
  - Plusieurs passages sur les mêmes modules, et la couture entre lots qui va avec.

- **Ce qui la remettrait en cause** : l'arrivée d'un utilisateur réel, qui remplacerait la
  démonstration par l'usage comme critère de clôture et pourrait imposer un autre ordre ; ou le
  constat qu'un lot ne se démontre pas sans emprunter largement au suivant, signe que la frontière
  est mal placée.
