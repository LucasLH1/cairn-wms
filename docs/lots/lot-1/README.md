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

- les couleurs, les polices et les composants ;
- le vocabulaire des écrans, aux correspondances près relevées ci-dessous : le glossaire fait foi ;
- les comportements visibles : les refus motivés, les raisons pour lesquelles un stock n'est pas
  prélevable, la main — qui la détient, la demande —, la file de décisions et ses deux onglets.

**Ce qui est indicatif** : la disposition exacte des écrans.

**En cas de désaccord avec la spécification, c'est la spécification qui prime**, et l'écart se
signale. Le glossaire fait foi sur tous les libellés : là où la maquette s'en écarte, c'est la
maquette qui a tort, et l'écran réalisé emploie le terme du glossaire. Le fichier de la maquette
n'est pas corrigé ; les correspondances ci-dessous suffisent.

| Dans la maquette | Dans le produit |
|---|---|
| Rotation du stock | Règle de prélèvement (`PickingRule`) |
| Contrôle avant fermeture | Contrôle de colisage (`PackingCheck`) |
| Douchette | Lecteur de code-barres — jamais « douchette » |

Le bloc *Simulation* de la maquette ne fait pas partie du produit. Son nom ne doit pas être confondu
avec la *simulation* du glossaire (`RuleSimulation`), l'exécution d'une règle paramétrable sans
effet.

## Décisions sur les écrans

Trois décisions de Lucas, prises le 2026-09-24. Elles ne dépendent d'aucun choix technique.

**Le glossaire fait foi contre la maquette.** Là où un libellé de la maquette s'écarte du glossaire,
l'écran réalisé emploie le terme du glossaire ; les correspondances connues sont dans le tableau
ci-dessus.

**Un seul thème, sombre, celui de la maquette.** Toutes les couleurs passent par des jetons nommés,
et aucune n'est écrite en dur dans un écran ou un composant, pour qu'un thème clair puisse s'ajouter
plus tard sans rien réécrire. La spécification n'exige pas de thème clair aujourd'hui.

**La conception des écrans suivants se fait sans maquette.**

- La maquette du lot 1 est la seule maquette. Elle fixe le langage visuel une fois pour toutes ;
  aucune autre ne sera produite, sauf demande explicite de Lucas.
- Aucun écran n'est conçu à part avant d'être réalisé. Chaque écran nouveau se construit
  directement à partir des règles de gestion et des parcours opérateur des modules, du glossaire
  pour les libellés, et des écrans et composants existants, en commençant par ceux du lot 1.
- Un composant nouveau ne se crée que lorsqu'aucun composant existant ne convient, et il suit les
  mêmes jetons.
- Les parcours opérateur disent ce que l'écran doit permettre, pas à quoi il ressemble. Quand ils ne
  suffisent pas, le manque précis se signale au lieu d'être inventé ; il se tranche côté métier.
- Lucas vérifie les écrans une fois construits, dans l'application, pas sur maquette.

## Décisions sur les écrans du 2026-09-30

Treize points relevés au point design des écrans (#76), tranchés par Lucas le 2026-09-30 sur les
propositions de Claude (« vas-y fais ce que tu proposes »). Le format d'export fait l'objet de la fiche
[0033](../../decisions/0033-export-des-listes.md).

1. **Le donneur d'ordre est un contexte permanent**, choisi dans la barre du haut comme dans la
   maquette, à côté du site. Il fixe le donneur d'ordre des écrans qui en montrent un seul (Références,
   Tiers) et la valeur proposée des formulaires qui en demandent un. Il est mémorisé par navigateur,
   comme le site. Le donneur d'ordre interne reste choisissable, jamais proposé d'office.
2. **La navigation reprend les icônes au trait de la maquette.** Une entrée porte un compteur quand elle
   mène à du travail en attente, et seulement alors : Réceptions compte les arrivages en cours du site.
3. **Le pied de la navigation** montre l'utilisateur, ses rôles et son poste. « Toutes zones » n'est pas
   repris : la spécification ne connaît pas de zone de poste.
4. **La barre du haut montre l'heure locale du site de travail**, comme la maquette.
5. **La file de décisions naît avec le premier flux qui produit une décision** (module 1.1). D'ici là,
   l'accueil conduit au premier écran que l'utilisateur peut ouvrir.
6. **Toute liste est exportable** en CSV, telle qu'affichée, et l'export est tracé (fiche 0033).
7. **Chaque utilisateur choisit sa langue**, français ou anglais, depuis le pied de la navigation ; elle
   est conservée sur son compte (`RG-EXI-054`, `079`).
8. **Une consultation refusée pour cause de périmètre produit un événement**, comme l'objet hors
   périmètre rendu par la recherche (`RG-SUR-065`, `RG-TRA-005`).
9. **Un montant se saisit dans la devise**, avec ses décimales, et se conserve en centimes.
10. **Une bascule entre deux vues d'une même liste prend la forme des onglets segmentés** de la
    maquette (« Toutes » / « À compléter »), jamais une puce.
11. **Dans un tableau, un code est un lien quand il ouvre une fiche** ; sinon c'est du texte en chasse
    fixe, et les actions sont des boutons en fin de ligne.
12. **Un panneau porte un geste et un seul bouton qui l'enregistre.** Une fiche qui compte plusieurs
    panneaux compte donc plusieurs boutons « Enregistrer » : chacun enregistre ce qui est dans son
    panneau, et seulement cela.
13. **Un bouton désactivé se distingue au premier coup d'œil** : fond transparent, bord en tirets,
    texte estompé. La maquette ne montre aucun bouton désactivé.
