---
date: 2026-09-30 19:00
objectif: Vérifier que les règles de design sont consignées, trouvables et respectées, et corriger les écarts qui contredisent une fiche.
modules: ["0.3", "0.8"]
issues: [3, 25, 76]
---

# Session du 2026-09-30 — point design des écrans

## Objectif

À la demande de Lucas : tout démarrer, faire le point sur le design des écrans réalisés, corriger ce
qui contredit une fiche actée, et installer ce qui empêche les mêmes erreurs de revenir. Aucune
décision nouvelle, aucune fiche modifiée ; ce qui demande une décision se signale (#76).

## Actions

- Application démarrée en local, base réinitialisée ; capture de chaque écran, comparée à la
  maquette.
- Sources relues : fiches 0010, 0011, 0014, 0025 ; README du lot 1 ; RG-SUR-001 à 004, 030 à 035,
  054, 059 à 066, 101, 140 ; RG-EXI-033, 053, 054, 079 ; glossaire et termes proscrits.
- **Consignation** : `CLAUDE.md` (lire 0010, 0011, 0025, le README du lot 1, la maquette et le README
  des composants avant tout écran) ; `packages/ui/README.md` (règles, composants, contrôles).
- **Corrections** (`5cc2d6b`, `33cf84d`, `614de9a`), détaillées ci-dessous.

## Constats, point par point

| Point | Constat |
|---|---|
| Jetons, valeurs arbitraires, palette | Conforme : palette par défaut supprimée (`theme.css`), couleurs dans `jetons.css` seul, aucune valeur arbitraire. Brèche fermée : le contrôle des valeurs arbitraires ne lisait que `className` ; il lit toute chaîne. |
| Classes des écrans | Conforme au contrôle. Brèches fermées : classes passées par une variable, style en ligne, élément HTML brut — aucun contrôle ne les voyait ; règles ESLint ajoutées. |
| React Aria | Conforme pour les composants. Écart corrigé : huit liens de tableau posés avec le `Link` du routeur dans les écrans, hors bibliothèque → `TextLink` (React Aria) par `RouteLink`. |
| Libellés | Aucun texte en dur. Écart corrigé : « client » et « produit » seuls, dans six libellés (`party.anonymized`, `endCustomer.anonymizeTitle`, `item.repairBomHint`, en français et en anglais). Test ajouté contre les termes proscrits sans exception ; règle ESLint contre le texte en dur. |
| Polices, ressources externes | Conforme : Geist et Geist Mono des paquets `@fontsource-variable`, aucune ressource externe dans la construction. |
| Formulaires (0025) | Écart corrigé : seul l'écran de session employait React Hook Form ; quinze écrans migrés (`useGestureForm`). |
| Refus motivés | Conforme : `RefusalBanner` sur chaque geste. |
| Main (RG-SUR-054) | Sans objet encore : aucun module réalisé ne partage une unité de travail. |
| File de décisions (RG-SUR-035) | Absente : l'accueil est vide. Signalé (#76). |
| Recherche et lecture de code-barres | Écart corrigé : une lecture hors mission ne faisait rien, la recherche n'existait pas. Entrée unique dans la barre du haut, résultats, ouverture de l'objet lu, code inconnu dit (RG-SUR-059, 060, 062 à 064). |
| Sélecteur de site | Conforme (0.1, « Contexte de travail »). |
| Contrôles de style éprouvés | stylelint, valeurs arbitraires, classes d'écran : rouges sur leur cas fautif. Quatre fautes passaient toutes les barrières (voir plus haut) ; elles sont désormais rouges, chacune prouvée. |

Défaut visible corrigé à la source : dans une grille serrée, un champ gardait la largeur
intrinsèque d'un `<input>` et débordait sur ses voisins (bloc Conditionnements de la fiche
référence). Un test de bout en bout mesure désormais, sur chaque écran réalisé, chevauchements,
champs tronqués et débordements ; prouvé en réintroduisant le défaut. Écarté après vérification :
la barre de navigation « coupée » sur les pages longues n'était qu'un artefact de capture pleine
page ; elle suit bien le défilement.

## Décisions

Aucune décision de fond. Deux mécanismes, raison dans le code : le schéma d'un écran qui transforme
une saisie avant de se déverser dans celui du contrat (`.pipe`) ; la recherche assemblée dans le
socle à partir de sources fournies par chaque module, pour que le socle ne dépende d'aucun module
logistique. Le nom du prestataire s'affiche sous la marque, comme dans la maquette et comme le
disait déjà le composant.

## Fichiers touchés

| Fichier | Nature |
|---|---|
| `CLAUDE.md`, `packages/ui/README.md` | Consignation des règles. |
| `eslint.config.js`, `scripts/check-tailwind-arbitrary.mjs`, `packages/libelles/src/catalogs.test.ts`, `tests/e2e/mise-en-page.spec.ts` | Garde-fous. |
| `packages/ui/src/*` | `TextLink`, `SearchField`, champs qui rétrécissent. |
| `apps/ecrans/src/**` | Formulaires, liens, recherche, marque. |
| `apps/serveur/src/socle/search`, `logistique/*/search.ts` | Recherche. |
| `docs/glossaire.md` | Recherche, Lecteur de code-barres. |

## Points ouverts

- #76 : treize points qui demandent une décision (donneur d'ordre dans la barre du haut, icônes et
  compteurs, pied de navigation, horloge, file de décisions, export, bascule en anglais, traçage du
  refus pour périmètre, choix d'ergonomie).
- Le module 0.3 commencé la veille reste en cours, hors de ces commits (migration 0009 et contrat
  locaux, non poussés).

## Suite — les décisions de #76

Lucas : « vas-y fais ce que tu proposes ». Les treize points de #76 sont tranchés sur les propositions
de Claude et consignés dans le README du lot 1 (« Décisions sur les écrans du 2026-09-30 ») ; le format
d'export, choix engageant, fait l'objet de la fiche **0033**, actée sur cette validation.

Réalisé (`02a9d8b`, `pnpm check` vert : 127 tests serveur ; 29 de bout en bout), en partie par deux
agents sur des fichiers disjoints :

- donneur d'ordre en contexte permanent dans la barre du haut, heure locale du site ;
- navigation : icônes au trait de la maquette, compteur des arrivages en cours ; pied : rôles et
  choix de la langue, conservée sur le compte (migration **0009-user-language** ; celle du module 0.3,
  encore locale, passe en 0010) ; accueil conduit à Réceptions ;
- export CSV de toute liste, tracé avec le site et le donneur d'ordre de travail ; consultation
  refusée pour périmètre et objet hors périmètre de la recherche tracés ;
- champ montant, onglets « Toutes / À compléter », code de zone en texte, bouton désactivé en tirets.

Le contrôle de mise en page a trouvé un défaut de la réalisation : le conteneur ajouté autour des
tableaux pour le bouton d'export ne rétrécissait pas, et poussait le bouton hors du panneau sur les
tableaux larges. Corrigé avant commit.

**Reste ouvert** : la file de décisions, qui naît avec le premier flux qui en produit une (1.1) ; le
module 0.3 reprend.

## Suite — module 0.3 (Emplacements et plan d'entrepôt)

Lucas : « ok vas-y » sur le plan du module et ses quatre propositions, consignées en 0.3 § 7 :
identifiant scannable `EMP-`site`-`adresse ; segment alphanumérique admis ; volume en cm³ ; un
emplacement virtuel par sous-traitant et par site.

**Réalisé sur `dev`** (`eb8e830`, `pnpm check` vert : 135 tests serveur ; 36 de bout en bout) : masque
d'adressage, sens de circulation, mode de prélèvement et ordre de visite des zones ; générateur avec
décompte permanent, aperçu, exclusions, collisions jamais écrasées, séquences en serpentin ;
renumérotation, doublon refusé en nommant l'emplacement en conflit ; quais ; emplacements virtuels et
leur tiers ; prélèvement dédié ; identifiant scannable lu par la recherche, qui ouvre la fiche de la
zone. Écrans réalisés en partie par un agent, sur une consigne écrite ; serveur, décompte permanent,
recherche et vérifications par Claude.

**Défauts trouvés en vérifiant** : la recherche ouvrait un emplacement comme un attendu (un ternaire
qui retombait sur « attendu » pour tout type inconnu) — remplacé par un `switch` exhaustif que
l'analyse de code oblige à compléter ; le tableau des emplacements rejetait états et actions hors de
vue à 1440 px — allégé, l'identifiant passant au panneau de modification. Deux tests se trompaient
aussi (un choix d'option par fragment, des adresses déjà prises par le jeu de données).

**Reste de 0.3, attaché à d'autres modules** : refus au dépôt par capacité et par état qualité, refus
de désactivation ou de changement de type sous du stock (0.4) ; demandes de réapprovisionnement,
séjours en virtuel, écran des anomalies (0.4, 2.1) ; emplacement virtuel créé d'office pour chaque
sous-traitant (RG-TRS-033), avec le premier flux qui confie du stock à un sous-traitant ; étiquette
imprimable (fiche 0031, proposée) ; rangement guidé (1.4) ; listes de prélèvement triées (3.2).

**Module suivant** : 0.4 Modèle de stock.
