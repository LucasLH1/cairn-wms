# Lot 1 — L'entrepôt minimal

Un donneur d'ordre, un site, gestion quantitative. Ce que le lot prouve : la marchandise entre, se
range, se prélève, sort, et le stock se corrige. Son contenu est arrêté par la fiche 0003.

## Scénarios

Trois scénarios, à dérouler dans l'ordre : chacun part de l'état final du précédent. Le jeu de
données est posé par le premier et complété par les suivants ; toutes ses valeurs sont fictives.

| # | Scénario | Ce qu'il éprouve |
|---|---|---|
| 1 | [Réception et rangement](reception-et-rangement.md) | Attendu, arrivage, écarts, supports, impression en échec, rangement. |
| 2 | [Commande, préparation et comptage](commande-et-preparation.md) | Priorité, régimes de rupture, vague, rupture au prélèvement, comptage, main. |
| 3 | [Contrôle, colisage et expédition](controle-colisage-expedition.md) | Contrôle par scan, colisage, numéro de suivi, chargement, départ. |

Chaque scénario porte son propre tableau de périmètre : ce qui est au lot 1 pour son flux, ce qui
vient plus tard, et pourquoi.

## Critère de clôture

Le lot 1 est clos quand les deux conditions suivantes sont remplies.

1. **Les trois scénarios sont automatisés en tests de bout en bout, et ces tests passent.** Chaque
   test part d'une instance vide, charge le jeu de données, déroule les étapes, et vérifie chaque
   constat puis l'état final. Ces tests sont rejoués à chaque modification ; un test de scénario qui
   échoue interdit de déclarer le lot clos.
2. **Les moments ci-dessous ont été constatés à l'écran**, lors d'une démonstration sur une instance
   installée. Ce sont ceux qu'un test ne remplace pas : ce qu'un opérateur voit, ou ce qui dépend du
   matériel.

## Moments à constater à l'écran

- **Scénario 1, étape 5** — l'imprimante coupée : le déchargement continue, le support non étiqueté
  ne quitte pas le quai, puis s'étiquette sans être recréé.
- **Scénario 1, étapes 9 et 10** — le rangement guidé par scan, et le refus qui propose un autre
  emplacement.
- **Scénario 2, étapes 5 à 8** — la rupture au prélèvement, le comptage aveugle, le recomptage par un
  autre opérateur.
- **Scénario 2, étape 9** — deux personnes sur le même écart : l'une prend la main, l'autre le voit
  aussitôt.
- **Scénario 3, étapes 4 et 7** — pas de numéro de suivi, pas de colis ; le colis étranger refusé au
  chargement.
- **Sur le serveur de référence** (`RG-EXI-072`) — l'instance du lot 1 y fonctionne, et les délais de
  `RG-EXI-073` y sont tenus : moins de trois cents millisecondes pour un geste, moins de deux
  secondes pour qu'un changement atteigne les écrans ouverts.

## Maquette de référence

[`maquette.html`](maquette.html) est la maquette validée des écrans du lot 1, produite avec Claude
Design et relue contre la spécification et les trois scénarios. Elle s'ouvre dans un navigateur,
sans serveur, et ne contient que le jeu de données fictif des scénarios.

Elle rejoue quatre moments des scénarios, à choisir dans le bloc *Simulation* au bas de l'écran,
avec l'utilisateur dont on prend la place :

| Moment | Heure | Ce qu'on y voit |
|---|---|---|
| A | 10:30 | Réception de l'attendu, support non étiqueté, imprimante du quai Q1 en panne, rangement (scénario 1). |
| B | 14:10 | Rupture au prélèvement, emplacement gelé, comptage à l'aveugle (scénario 2). |
| C | 14:40 | Écart retenu au recomptage, arbitrage sous la main, commande en attente de stock (scénario 2). |
| D | 16:20 | Colisage terminé, chargement au quai Q2, colis étranger refusé, départ (scénario 3). |

Le bloc *Simulation* — choix du moment, de l'utilisateur, panne d'imprimante, codes de douchette —
est un outil de maquette. Il ne fait pas partie du produit.

**Ce qui est imposé** à la réalisation des écrans :

- les couleurs, les polices et les composants — leurs jetons sont relevés dans la fiche de décision
  des écrans (issue `#40`) ;
- le vocabulaire des écrans ;
- les comportements visibles : les refus motivés, les raisons pour lesquelles un stock n'est pas
  prélevable, la main — qui la détient, la demande —, la file de décisions et ses deux onglets.

**Ce qui est indicatif** : la disposition exacte des écrans.

**En cas de désaccord avec la spécification, c'est la spécification qui prime**, et l'écart se
signale. Écarts relevés à la mise en place de la maquette, le 2026-09-24 :

- *Rotation du stock*, libellé d'une règle dans le paramétrage : le glossaire nomme cette notion
  **règle de prélèvement** (`PickingRule`).
- *Contrôle avant fermeture* : c'est l'expression du scénario 3 ; le glossaire nomme l'objet
  **contrôle de colisage** (`PackingCheck`) et 3.2 son paramétrage **régime de contrôle**.
- *Simulation* et *douchette*, dans le bloc de maquette : *simulation* désigne au glossaire tout
  autre chose — l'exécution d'une règle sans effet (`RuleSimulation`) ; *douchette* n'y figure pas,
  la spécification parle de lecteur de code-barres. Sans conséquence tant que ce bloc reste hors
  produit.
