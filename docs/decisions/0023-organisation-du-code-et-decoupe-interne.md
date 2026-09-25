# 0023 — Organisation du code et découpe interne

**Statut** : actée · **Date** : 2026-09-25 · **Remplace** : — · **Remplacée par** : —

## Contexte

La fiche 0013 fait du serveur un monolithe modulaire dont le socle ne dépend d'aucun module logistique
(`RG-EXI-070`, `071`). Les fiches 0010, 0011, 0016 et 0019 ajoutent des écrans, une bibliothèque de
composants, un agent d'impression et un contrat partagé. Il faut dire comment le dépôt s'organise, quels
modules existent et qui peut dépendre de qui. La fiche 0017 exige aussi des dépendances tenues.

## Options

### Option A — Un seul dépôt, espaces de travail pnpm, modules vérifiés par dependency-cruiser

- **Ce que c'est** : applications et paquets partagés dans le dépôt `cairn-wms`, gérés par pnpm ; règles
  de dépendance entre modules vérifiées par dependency-cruiser.
- **En faveur** : le contrat et les composants se partagent sans publication ; pnpm isole strictement
  les dépendances, bloque par défaut les scripts d'installation et, depuis sa version 11, refuse par
  défaut une version publiée depuis moins d'un jour, ce que la fiche 0017 demande ; les règles de
  dépendance s'écrivent et se vérifient.
- **En défaveur** : un outil de vérification de plus.
- **Ce que ça ferme** : —

### Option B — Un paquet par module

- **Ce que c'est** : chaque module du serveur est un paquet de l'espace de travail.
- **En faveur** : frontières visibles dans les manifestes.
- **En défaveur** : des dizaines de manifestes et de configurations à tenir ; aucune vérification de
  plus que l'option A.
- **Ce que ça ferme** : —

### Option C — Plusieurs dépôts

- **Ce que c'est** : écrans, serveur, contrat dans des dépôts distincts.
- **En faveur** : séparation forte.
- **En défaveur** : contrat publié et versionné entre dépôts ; changements coordonnés pénibles.
- **Ce que ça ferme** : les modifications de bout en bout en un commit.

## Décision

**Le dépôt `cairn-wms` est un espace de travail pnpm ; le serveur est une application découpée en
modules dont les dépendances sont vérifiées par dependency-cruiser dans l'intégration continue**
(option A).

**Organisation**

| Chemin | Contenu |
|---|---|
| `apps/serveur` | L'application serveur, lancée dans ses deux rôles (fiche 0017). |
| `apps/ecrans` | Les écrans React (fiches 0010, 0025). |
| `apps/agent-impression` | L'agent d'impression (fiche 0016). |
| `packages/contrat` | Les schémas du contrat : gestes, consultations, événements, motifs de refus (fiches 0019, 0020). |
| `packages/ui` | Jetons et bibliothèque de composants Cairn (fiche 0011). |
| `packages/libelles` | Libellés français et anglais, tirés du glossaire. |

L'espace technique (`apps/espace-technique`) s'ajoute au lot 5.

**Modules du serveur**, dans `apps/serveur/src/socle/` et `apps/serveur/src/logistique/`. Ceux du lot 1 :

- *Socle* — utilisateurs, sessions et postes ; rôles, permissions et périmètres ; sites et
  calendriers ; numérotation ; journal ; main ; file de décisions ; alertes ; recherche ; impressions ;
  traitements différés ; temps réel.
- *Logistique* — organisation logistique (donneur d'ordre, zones) ; référentiel produit ;
  emplacements ; stock et supports ; réception ; rangement ; commandes ; préparation ; inventaire ;
  expédition et transporteurs ; missions et tâches.

Les noms de dossiers, de types et de tables emploient les termes anglais du glossaire.

**Règles de dépendance**, vérifiées à chaque modification :

1. Un module du socle n'importe jamais un module logistique.
2. Un module n'importe d'un autre module que son interface publique, jamais ses fichiers internes.
3. Aucun cycle entre modules.
4. `apps/ecrans` n'importe que `packages/contrat`, `packages/ui` et `packages/libelles` ; jamais le
   serveur.
5. `packages/contrat` ne dépend que de Zod.

Ajouter un module, dans le respect de ces règles, ne demande pas de fiche : il s'inscrit dans la carte
des modules du dépôt. Changer une règle en demande une.

Critère décisif : partager contrat et composants sans publication, et faire vérifier la frontière du
socle par une machine.

Proposée et actée par Claude le 2026-09-25, sur délégation explicite de Lucas : « Prends les décisions
qu'il faut, je veux passer au dev le plus rapidement possible. » Elle reprend l'objet de l'ancienne
fiche 0004, abandonnée, sans s'appuyer sur son contenu.

## Conséquences

- **Ce qu'on peut faire** : modifier un geste de bout en bout — contrat, serveur, écran — en un commit.
- **Ce qu'on ne peut plus faire** : franchir la frontière du socle ; importer l'intérieur d'un module.
- **Ce qu'il faut mettre en place** : les réglages pnpm de la fiche 0017 (versions exactes, délai
  minimal, scripts bloqués) ; la configuration dependency-cruiser ; la carte des modules.
- **Ce qu'on accepte de payer** : une interface publique à tenir par module.
- **Ce qui la remettrait en cause** : une règle de dépendance qui force des contournements répétés,
  signe d'une frontière mal placée.
