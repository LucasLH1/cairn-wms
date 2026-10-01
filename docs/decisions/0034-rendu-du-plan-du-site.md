# 0034 — Rendu du plan du site en 2D et en 3D

**Statut** : proposée · **Date** : 2026-10-01 · **Remplace** : — · **Remplacée par** : —

## Contexte

Le 2026-10-01, Lucas a demandé que la création d'un entrepôt soit « très visuelle : un vrai plan 2D
et 3D, au choix de l'utilisateur ». La spécification 0.3 fait entrer le **plan du site** au
périmètre (`RG-EMP-047` à `054`) : une vue à l'échelle de l'emprise, des allées de racks avec leurs
travées, niveaux et alvéoles, et des surfaces des zones sans racks. Elle se regarde en 2D, vue de
dessus, ou en 3D. Chaque emplacement y est coloré par zone ou par occupation, et le désigner montre
son contenu. Le plan ne se dessine pas à la souris : il se construit en décrivant les allées, et
s'affiche à mesure de la saisie.

Les fiches actées laissent la question ouverte :

- 0010 fixe React ; 0011 fixe React Aria Components et des jetons de style, interdit toute couleur
  écrite en dur et exige que chaque composant nouveau vive dans `packages/ui`.
- Aucune ne couvre le dessin vectoriel ni le rendu 3D, et aucune bibliothèque de dessin ne figure dans
  les dépendances.

Les ordres de grandeur décident du reste. Un site du lot 1 compte de quelques centaines à quelques
milliers d'emplacements, soit autant de boîtes en 3D. La vue tourne sur le poste de bureau, pas sur
le terminal ni sur le téléphone.

Deux couches sont à trancher : la 2D et la 3D.

## Options

### 2D

#### Option A — SVG, dans un composant à nous

- **Ce que c'est** : un composant `SitePlan` de `packages/ui` qui rend l'emprise, les allées, les
  travées et les surfaces en SVG. La géométrie est calculée par une fonction pure du contrat.
- **En faveur** :
  - aucune dépendance ;
  - chaque emplacement est un élément du document : il prend le focus, porte un nom accessible et se
    désigne au clavier, comme le veut 0011 ;
  - les couleurs se lisent directement dans les jetons CSS ;
  - quelques milliers de rectangles restent fluides en SVG ;
  - les tests de bout en bout peuvent cibler un emplacement.
- **En défaveur** : zoom et déplacement de la vue à écrire nous-mêmes (une `viewBox` et quelques
  gestionnaires).
- **Ce que ça ferme** : rien ; une bibliothèque de dessin reste possible plus tard.

#### Option B — Bibliothèque de canevas (Konva, PixiJS)

- **Ce que c'est** : dessin sur `<canvas>`, avec zoom et sélection fournis.
- **En faveur** : passe à des dizaines de milliers de formes.
- **En défaveur** :
  - une dépendance de plus ;
  - un canevas est opaque à l'accessibilité et aux tests ; les couleurs doivent être relues à la main
    dans les jetons ;
  - la capacité gagnée n'est pas nécessaire à l'échelle du lot 1.
- **Ce que ça ferme** : l'accès au clavier emplacement par emplacement, sauf à le doubler.

### 3D

#### Option C — three.js seul, piloté depuis un composant React

- **Ce que c'est** : la bibliothèque de référence du rendu WebGL. Un composant crée la scène, la
  caméra et les maillages dans un `useEffect`, et les met à jour à la main.
- **En faveur** : une seule dépendance ; contrôle complet.
- **En défaveur** : la synchronisation entre l'état React et la scène s'écrit à la main —
  création, mise à jour, libération de chaque objet. C'est un terrain à fuites mémoire et à écarts
  entre la 2D et la 3D.
- **Ce que ça ferme** : rien.

#### Option D — three.js avec @react-three/fiber

- **Ce que c'est** : fiber est un moteur de rendu React pour three.js. La scène s'écrit en JSX, comme
  le reste des écrans, et React se charge des mises à jour et de la libération. La rotation de la
  caméra vient d'`OrbitControls`, fourni par three.js dans ses exemples. Pas de `@react-three/drei` :
  c'est une collection très large dont on n'utiliserait qu'une pièce.
- **En faveur** :
  - même modèle que le reste du produit : la vue se déduit de l'état, y compris pendant la saisie
    d'une allée ;
  - les emplacements se rendent par un maillage instancié, une seule commande de dessin pour des
    milliers de boîtes ;
  - les deux bibliothèques sont les plus utilisées dans leur domaine et activement maintenues.
- **En défaveur** :
  - deux dépendances et environ 150 Ko compressés de plus, chargés à la demande avec la seule vue 3D ;
  - fiber déclare une plage de React compatible (`>=19 <19.4` à la version 9.8) : une montée de React
    attendra fiber ;
  - la 3D est opaque à l'accessibilité, comme tout canevas. La 2D reste la vue accessible, et la 3D
    une vue de lecture.
- **Ce que ça ferme** : une montée de React tant que fiber ne la suit pas.

#### Option E — Fausse 3D en CSS ou SVG isométrique

- **Ce que c'est** : une projection isométrique fixe, sans moteur 3D.
- **En faveur** : aucune dépendance.
- **En défaveur** : pas de rotation ni de zoom libre, et un niveau haut masque ceux du dessous.
  Ce n'est pas le « vrai plan 3D » demandé.
- **Ce que ça ferme** : la demande elle-même.

## Décision

*Proposition, à valider par Lucas.*

**La 2D se rend en SVG par un composant de `packages/ui` (option A). La 3D se rend avec three.js et
@react-three/fiber (option D), sans drei.**

Deux critères emportent le choix. La 2D en SVG garde l'accès au clavier et les tests sans rien
ajouter. Fiber garde, pour la 3D, le modèle déclaratif du reste des écrans : c'est ce qui permet de
voir une allée apparaître pendant qu'on la décrit sans écrire de synchronisation à la main.

## Conséquences

- **Ce qu'on peut faire** :
  - les composants `SitePlan` (2D) et `SitePlan3d` (3D) dans `packages/ui`, alimentés par la même
    géométrie ;
  - cette géométrie est une fonction pure du contrat, testée sans navigateur : elle passe d'une
    description d'allée à des boîtes positionnées en millimètres ;
  - un sélecteur 2D / 3D en onglets segmentés ;
  - coloration par zone ou par occupation, désignation d'un emplacement.
- **Ce qu'on ne peut plus faire** :
  - écrire une couleur en dur dans la scène 3D : les couleurs se lisent dans les jetons CSS au rendu,
    comme partout ailleurs (0011) ;
  - ajouter une autre bibliothèque 3D ou de dessin, ou drei, sans nouvelle fiche ;
  - dessiner le plan à la souris : la spécification l'exclut (0.3 § 7).
- **Ce qu'il faut mettre en place** :
  - dépendances `three`, `@react-three/fiber` et `@types/three`, versions exactes, dans
    `packages/ui` ;
  - chargement à la demande de la vue 3D, pour ne pas alourdir les autres écrans ;
  - le contrôle des écrans (0025) étendu aux composants du plan : jetons seulement, aucun texte en
    dur ;
  - module 0.3 rouvert dans `status.yml`.
- **Ce qu'on accepte de payer** :
  - la 3D n'est pas accessible au clavier : la 2D est la vue de référence ;
  - le WebGL suppose une carte graphique et un navigateur récent sur le poste. Sans WebGL, la vue 3D
    le dit et propose la 2D ;
  - le poids des deux bibliothèques, limité à la vue qui s'en sert.
- **Ce qui la remettrait en cause** :
  - fiber qui ne suit plus React ;
  - un site dont le nombre d'emplacements rend le SVG lent (au-delà de dix mille environ) ;
  - une demande d'édition graphique, qui rouvrirait 0.3 § 7.
