# 0011 — Composants et style

**Statut** : actée · **Date** : 2026-09-24 · **Remplace** : — · **Remplacée par** : —

## Contexte

Les fiches 0009 et 0010 fixent TypeScript et React. Reste à dire comment se construisent les composants
et comment s'écrit le style.

Ce que la spécification impose (`lots/lot-1/README.md`) :

- **Couleurs, polices et composants de la maquette imposés** ; disposition des écrans indicative.
- **Un seul thème, sombre.** Toutes les couleurs passent par des jetons nommés, aucune n'est écrite en
  dur dans un écran ou un composant, pour qu'un thème clair puisse s'ajouter sans rien réécrire.
- **Aucune autre maquette.** Chaque écran nouveau se construit à partir des composants existants ; un
  composant nouveau ne se crée que lorsqu'aucun ne convient, et il suit les mêmes jetons.
- **Libellés du glossaire**, français par défaut, anglais par utilisateur (`RG-EXI-054`, `079`).

Le risque principal est la dérive : l'IA construira un grand nombre d'écrans, sans maquette. La méthode
doit rendre l'écart impossible, ou détectable automatiquement, plutôt que compter sur la discipline.

Il faut trancher trois couches : le comportement des composants (clavier, focus, listes, fenêtres,
tableaux), la méthode de style, et la bibliothèque de composants propre au produit.

## Options

### Comportement des composants

#### Option A — Bibliothèque complète avec son propre style (MUI, Mantine, Ant Design)

- **Ce que c'est** : composants prêts à l'emploi, apparence comprise.
- **En faveur** : très rapide à assembler ; offre large.
- **En défaveur** : elle impose son apparence ; retrouver celle de la maquette oblige à la combattre en
  permanence.
- **Ce que ça ferme** : une apparence propre au produit sans lutte.

#### Option B — Composants sans apparence (React Aria Components, Radix, Base UI)

- **Ce que c'est** : la bibliothèque fournit le comportement, l'accessibilité et le clavier ;
  l'apparence est entièrement la nôtre.
- **En faveur** : la maquette se reproduit fidèlement ; le comportement difficile n'est pas à écrire.
- **En défaveur** : chaque composant se style à la main une fois.
- **Ce que ça ferme** : rien.

Parmi elles : **React Aria Components**, maintenu par Adobe, est le plus abouti pour la navigation au
clavier et le focus, et formate dates et nombres selon la langue ; son interface est plus verbeuse.
Radix est très répandu, mais son développement a ralenti. Base UI est plus récent ; sa maturité n'est
pas établie.

### Méthode de style

#### Option C — Tailwind CSS, palette réduite aux jetons

- **Ce que c'est** : classes utilitaires générées à partir d'un thème ; la palette par défaut est
  supprimée et remplacée par les jetons du produit.
- **En faveur** : une couleur hors jeton n'a plus de classe pour l'écrire ; aucun nom de classe à
  inventer ; maîtrise par l'IA très large.
- **En défaveur** : balises chargées de classes ; dépendance à l'outil de génération, coûteuse à
  quitter.
- **Ce que ça ferme** : un changement de méthode de style à bon compte.

#### Option D — CSS maison : modules CSS et variables CSS

- **Ce que c'est** : CSS standard, un fichier par composant, jetons en variables.
- **En faveur** : aucune dépendance ; standard et durable.
- **En défaveur** : l'IA invente des noms et des valeurs, et les écrans dérivent ; la vérification ne
  repose que sur l'analyse de code.
- **Ce que ça ferme** : rien.

#### Option E — Style écrit en TypeScript, sans coût à l'exécution (vanilla-extract, Panda CSS)

- **Ce que c'est** : style déclaré en TypeScript, compilé en CSS.
- **En faveur** : jetons typés, une faute de frappe devient une erreur de compilation.
- **En défaveur** : écosystèmes petits ; maîtrise par l'IA moindre.
- **Ce que ça ferme** : un changement de méthode de style à bon compte.

#### Option F — Style calculé à l'exécution (styled-components, Emotion)

- **Ce que c'est** : style produit par le code au moment du rendu.
- **En faveur** : colocalisation du style et du composant.
- **En défaveur** : coût à l'exécution ; styled-components en maintenance seule depuis 2025.
- **Ce que ça ferme** : —

### Alternative d'ensemble

#### Option G — shadcn/ui (Radix et Tailwind)

- **Ce que c'est** : composants copiés dans le dépôt, construits sur Radix et stylés avec Tailwind.
- **En faveur** : code possédé ; maîtrise par l'IA excellente.
- **En défaveur** : toute l'apparence neutre est à refaire ; dépend de Radix, dont l'avenir est moins
  sûr.
- **Ce que ça ferme** : le choix de la bibliothèque de comportement.

## Décision

**Les écrans reposent sur React Aria Components pour le comportement, sur Tailwind CSS réduit aux jetons
du produit pour le style, et sur une bibliothèque de composants propre à Cairn que les écrans sont
tenus d'utiliser** (options B et C). Les tableaux denses s'appuient sur TanStack Table et TanStack
Virtual, sans apparence eux non plus.

Critère décisif : rendre la dérive visuelle impossible ou détectable automatiquement, pour un grand
nombre d'écrans construits par l'IA sans maquette.

Proposée par Claude, validée par Lucas le 2026-09-24.

## Conséquences

- **Ce qu'on peut faire** : reproduire fidèlement la maquette ; ajouter un thème clair en ne fournissant
  qu'un second jeu de valeurs aux jetons.
- **Ce qu'on ne peut plus faire** : écrire une couleur, un espacement, un rayon ou une police hors
  jeton ; construire un écran avec des éléments qui contournent la bibliothèque de composants.
- **Ce qu'il faut mettre en place** — vérifié par l'intégration continue, qui bloque en cas d'écart :
  - les jetons, seule source des couleurs, espacements, rayons et polices, déclarés en variables CSS et
    tirés de la maquette ;
  - la palette par défaut de Tailwind supprimée ;
  - les valeurs arbitraires interdites (`bg-[#…]`, `p-[13px]`), et aucune couleur dans le CSS brut ;
  - les écrans assemblent des composants et n'emploient de classes utilitaires que pour la mise en
    page ;
  - la police Geist livrée avec le produit, jamais chargée depuis un service extérieur : une instance
    auto-hébergée ne dépend d'aucun tiers (`RG-EXI-063`) ;
  - les libellés des composants tirés du glossaire, en français et en anglais.
- **Ce qu'on accepte de payer** : le style de chaque composant écrit une fois à la main ; des balises
  chargées de classes ; une dépendance à Tailwind coûteuse à quitter ; une interface React Aria plus
  verbeuse.
- **Ce qui la remettrait en cause** : React Aria Components abandonné ou incapable d'un comportement
  exigé ; des écarts de style qui passent malgré les garde-fous.

### Non prouvé

- Que la suppression de la palette par défaut, jointe à la règle d'analyse de code, suffise à bloquer
  toute couleur en dur : à vérifier dès la mise en place.
- L'avenir de Radix et la maturité de Base UI : lecture de Claude, rien de mesuré.
