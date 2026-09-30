# 0033 — Export des listes : CSV produit par l'écran, tracé par un geste

**Statut** : actée · **Date** : 2026-09-30 · **Remplace** : — · **Remplacée par** : —

## Contexte

`RG-SUR-101` : toute liste affichée est exportable telle qu'elle est affichée — mêmes filtres, mêmes
colonnes, même ordre —, sans écran d'export séparé ni catalogue de rapports figés. `RG-SUR-102` : un
export produit un événement portant son auteur, son horodatage et le périmètre appliqué.

Aucune fiche ne fixe le format ni l'endroit où l'export se fabrique. Le point design du 2026-09-30
(#76) l'a relevé : aucune liste des modules réalisés n'est exportable.

Ce qui contraint : les listes sont des tableaux `DataTable` (fiche 0011), alimentés par les
consultations du contrat (fiche 0019), filtrés à l'écran ou au serveur selon l'écran ; les utilisateurs
du bureau ouvrent les exports dans un tableur, en français.

## Options

### Option A — L'écran fabrique le fichier à partir du tableau affiché

- **Ce que c'est** : le tableau affiché est lu tel quel — colonnes titrées, lignes dans l'ordre, texte
  des cellules — et écrit en CSV ; un geste trace l'export.
- **En faveur** : « tel qu'affiché » par construction, pour toute liste, sans code par écran ; rien de
  plus au serveur qu'un événement.
- **En défaveur** : l'export ne dépasse pas ce que l'écran a chargé (les listes sont bornées à
  quelques centaines de lignes) ; le texte exporté est le texte affiché, formats de date compris.
- **Ce que ça ferme** : un export plus riche que l'écran — qui serait un rapport, que `RG-SUR-101`
  écarte.

### Option B — Le serveur fabrique le fichier à partir de la consultation

- **Ce que c'est** : chaque consultation reçoit une variante qui rend un fichier.
- **En faveur** : pas de limite de volume ; format des valeurs maîtrisé.
- **En défaveur** : une variante par liste, qui doit reproduire colonnes, libellés et filtres de l'écran
  et dérive dès que l'écran change ; précisément ce que « tel qu'affiché » veut éviter.
- **Ce que ça ferme** : rien.

### Format

CSV en UTF-8 avec marque d'ordre des octets, séparateur point-virgule, guillemets doubles autour de
chaque valeur : ce qu'un tableur ouvre directement en français. Un format de tableur natif (XLSX)
demanderait une bibliothèque de plus pour un gain nul à ce stade.

## Décision

**Toute liste affichée par `DataTable` porte un bouton d'export ; l'écran écrit en CSV (UTF-8 avec
marque d'ordre, point-virgule) les colonnes titrées et les lignes affichées, dans leur ordre, et un
geste enregistre l'export avec la liste, le nombre de lignes et le périmètre de l'utilisateur**
(option A).

Critère décisif : « tel qu'affiché » tenu par construction, pour toutes les listes présentes et à
venir, sans rien écrire par écran.

Proposée par Claude au point design du 2026-09-30 (#76) ; validée par Lucas le 2026-09-30 : « vas-y
fais ce que tu proposes ».

## Conséquences

- **Ce qu'on peut faire** : exporter toute liste, y compris celles des modules à venir, sans code
  propre.
- **Ce qu'on ne peut plus faire** : ajouter un écran d'export ou un rapport figé (`RG-SUR-101`).
- **Ce qu'il faut mettre en place** : le bouton d'export dans `DataTable` ; le geste d'export et son
  événement (`RG-SUR-102`) ; les colonnes d'action sans titre sont exclues du fichier.
- **Ce qu'on accepte de payer** : l'export est borné à ce que l'écran a chargé ; les valeurs sont celles
  affichées (dates et nombres formatés dans la langue de l'utilisateur).
- **Ce qui la remettrait en cause** : une liste qu'il faut exporter au-delà de ce qu'un écran charge ;
  un donneur d'ordre qui exige un format de tableur natif.
