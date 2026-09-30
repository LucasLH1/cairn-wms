# @cairn/ui — composants et style des écrans

La bibliothèque de composants de Cairn WMS. Les écrans (`apps/ecrans`) l'assemblent ; ils n'ont pas
d'apparence propre. À lire avant tout travail sur un écran ou un composant, avec les fiches
[`0010`](../../docs/decisions/0010-framework-des-ecrans-react.md) (React),
[`0011`](../../docs/decisions/0011-composants-et-style.md) (composants et style),
[`0025`](../../docs/decisions/0025-cadre-des-ecrans.md) (cadre des écrans), le
[README du lot 1](../../docs/lots/lot-1/README.md) et la [maquette](../../docs/lots/lot-1/maquette.html).

## Règles

Elles viennent des fiches citées ; ce document les rassemble, il n'en ajoute aucune.

1. **La maquette du lot 1 est la seule maquette** (README du lot 1, « Décisions sur les écrans »). Ses
   couleurs, ses polices et ses composants sont imposés ; la disposition des écrans est indicative.
   Le fichier de la maquette ne se modifie pas.
2. **React Aria Components pour le comportement** (0011) : tout composant interactif — bouton, champ,
   liste, onglets, lien, section repliable — est construit sur React Aria, qui porte le clavier, le
   focus et l'accessibilité. L'apparence est entièrement la nôtre.
3. **Tailwind réduit aux jetons** (0011) : la palette et toutes les valeurs par défaut de Tailwind sont
   supprimées (`theme.css`, `--*: initial`) ; seules existent les classes tirées des jetons.
4. **Les jetons sont la seule source des valeurs** (0011) : couleurs, espacements, rayons, tailles de
   texte, polices sont déclarés dans [`src/jetons.css`](src/jetons.css) et exposés par
   [`src/theme.css`](src/theme.css). Aucune valeur arbitraire (`p-[13px]`, `bg-[#…]`), aucune
   couleur dans le CSS brut. Une valeur relevée dans la maquette et absente des jetons s'y ajoute
   d'abord.
5. **Un seul thème, sombre, celui de la maquette** (README du lot 1). Toute couleur passe par un jeton,
   pour qu'un thème clair s'ajoute en redéfinissant les jetons, sans toucher un composant.
6. **Polices livrées avec le produit** (0011, `RG-EXI-063`) : Geist et Geist Mono viennent des paquets
   `@fontsource-variable`, jamais d'un service extérieur. Aucune ressource externe.
7. **Un composant nouveau seulement si aucun ne convient** (0011, README du lot 1), et il suit les
   mêmes jetons. Il s'ajoute ici, avec une ligne dans la table ci-dessous.
8. **Les écrans n'emploient que des classes de mise en page** (0011) : grille, flex, espacement,
   dimension, alignement. Couleur, typographie, bordure, fond, rayon et ombre appartiennent aux
   composants. Pas de style en ligne, pas d'élément HTML interactif brut.
9. **Aucun libellé écrit en dur** (0025, règle 4) : tout texte vient de `@cairn/libelles`, dont les
   clés suivent le glossaire. Les termes proscrits du glossaire n'apparaissent nulle part.
10. **Formulaires par React Hook Form**, validés par le schéma du geste tiré du contrat (0025) : dans
    les écrans, `useGestureForm`, `textField` et `valueField` (`apps/ecrans/src/contract/form.ts`).
    Quand la saisie diffère de l'entrée du geste (code mis en capitales, texte à découper), l'écran
    déclare un petit schéma qui la transforme puis se déverse dans celui du contrat (`.pipe`) : le
    contrat garde le dernier mot. Un bouton seul, sans champ, reste un simple envoi du geste.
11. **Un poste d'ordinateur, pas de tablette ni de téléphone** (`RG-SUR-001`, `RG-EXI-053`) ;
    navigateurs pris en charge : Chrome, Edge et Firefox récents (0025, règle 5).

## Composants

| Composant | Usage |
|---|---|
| `AppShell`, `Brand`, `BrandMark` | Ossature de l'application : navigation latérale, barre du haut (fil d'Ariane, titre, outils), contenu. Un seul, dans `apps/ecrans/src/shell/Shell.tsx`. |
| `NavigationGroup`, `NavigationItem` | Groupes et entrées de la navigation latérale. |
| `Panel` | Conteneur de tout contenu d'écran : titre, précision, actions, corps. Région nommée par son titre. |
| `Card`, `CardGrid` | Cartes de la maquette (quais…), en grille. |
| `DataTable` | Tableau dense : largeurs de colonne nommées (`code`, `number`, `date`, `status`, `text`), nombres à droite en chasse fixe, codes en chasse fixe. Défile dans son panneau s'il est large. |
| `Tabs` | Onglets segmentés. |
| `Disclosure` | Section repliée par défaut, ouverte d'emblée si elle concerne l'objet affiché. |
| `Banner` | Bandeau d'information, d'avertissement ou de refus. Dans les écrans, un refus de geste passe par `RefusalBanner`. |
| `StatusBadge` | Pastille d'état, six tonalités (`ok`, `warn`, `bad`, `info`, `hand`, `mute`). |
| `Button` | Bouton, principal ou secondaire ; désactivé dans la forme « off » de la maquette. |
| `TextField` | Champ de texte ; `code` pour la chasse fixe. |
| `NumberField` | Quantité entière (fiche 0017, règle 5), chasse fixe, alignée à droite. |
| `DateField`, `TimeField` | Date sans heure ; heure locale sur vingt-quatre heures. |
| `Select` | Liste déroulante. |
| `ChipGroup` | Choix multiple en puces. |
| `SearchField` | L'entrée de recherche unique de la barre du haut (`RG-SUR-059`). |
| `TextLink` | Lien dans le texte ou une cellule. Les écrans l'emploient par `RouteLink` (`apps/ecrans/src/shell/RouteLink.tsx`), lien typé du routeur. |

Tout champ rétrécit avec sa colonne : dans une grille, il ne déborde jamais sur son voisin.

## Contrôles

Chacun bloque l'intégration continue (`pnpm check`, `pnpm e2e`) et a été éprouvé sur un cas fautif.

| Contrôle | Ce qu'il refuse |
|---|---|
| `stylelint` (`.stylelintrc.json`) | Couleur hexadécimale, nommée ou fonctionnelle hors de `jetons.css`. |
| `scripts/check-tailwind-arbitrary.mjs` | Valeur arbitraire Tailwind dans toute chaîne des écrans et des composants. |
| `scripts/check-screen-classes.mjs` | Classe autre que de mise en page dans un écran. |
| ESLint, bloc des écrans (`eslint.config.js`) | Style en ligne ; élément HTML interactif ou tableau brut ; texte ou libellé écrit en dur ; classes passées par une variable ; `Link` du routeur employé tel quel. |
| `packages/libelles/src/catalogs.test.ts` | Clés différentes entre français et anglais ; libellé vide ; terme proscrit sans exception du glossaire. |
| `tests/e2e/mise-en-page.spec.ts` | Sur chaque écran réalisé, rendu par un vrai navigateur : éléments qui se chevauchent, champ qui tronque sa valeur, contenu qui déborde. |

Un écran nouveau s'ajoute à `tests/e2e/mise-en-page.spec.ts`. Les tests de parcours remplissent les
champs ; seul ce test regarde ce que l'écran montre.
