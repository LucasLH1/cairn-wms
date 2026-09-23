# 0004 — Découpe interne et frontière du socle

**Statut** : proposée · **Date** : 2026-09-23 · **Remplace** : — · **Remplacée par** : —

## Contexte

La pile est actée par `0002` : .NET et C# pour le serveur, l'agent d'impression et l'espace
technique ; PostgreSQL ; écrans Vue et TypeScript. Avant la première ligne de code, il faut savoir
**où va chaque ligne** : en combien de parties le code se découpe, qui a le droit de voir qui, et
comment cette règle est vérifiée. C'est la première fiche de détail annoncée par `0002`, parce que
toutes les autres — base de données, contrat, écrans, installation — s'y adossent.

### Ce que la spécification impose

- **`RG-EXI-070`** — Le socle transverse ne présuppose pas la logistique. Il comprend : utilisateurs,
  rôles et permissions, équipes, hiérarchie et périmètres, sites et calendriers, numérotation,
  journal d'événements, alertes, file de décisions, main, recherche, impressions, imports et
  échanges, règles paramétrables et simulation, espace technique. Tout cela doit pouvoir servir un
  autre domaine métier sans être réécrit.
- **`RG-EXI-071`** — Aucun autre domaine n'est modélisé par anticipation. La frontière est à tenir ;
  la généralisation n'est pas à construire d'avance.
- **`RG-EXI-066`** — L'espace technique n'accède à aucune donnée métier. C'est aussi une frontière
  de code : il ne doit pas pouvoir la lire, pas seulement ne pas l'afficher.

### Ce qu'il faut remarquer avant de découper

**Le socle de `RG-EXI-070` n'est pas la couche 0 de la spécification.** La couche 0 comprend aussi le
référentiel produit (0.2), les emplacements (0.3), le modèle de stock (0.4), les tiers (0.5), le
moteur de parcours (0.6) et les unités d'œuvre (0.7), qui sont de la logistique. Découper le code
selon les dossiers de `docs/` violerait `RG-EXI-070` dès le premier module.

**Plusieurs mécanismes que `RG-EXI-070` range dans le socle sont décrits en termes logistiques** :

| Mécanisme du socle | Ce qu'il porte de logistique | Règles |
|---|---|---|
| Périmètres | Restriction de visibilité par donneur d'ordre | `RG-ORG-016`, `RG-ORG-017`, `RG-SUR-066` |
| Numérotation | Segment « code donneur d'ordre » | `RG-ORG-026` |
| Imports et échanges | Profil et échange déclarés **par donneur d'ordre** | `RG-SUR-089`, `RG-SUR-103` |
| File de décisions | Critère d'ordre « stock immobilisé » | `RG-SUR-040` |
| Impressions | Destination rattachée à une **zone logistique** ; objet non étiqueté qui ne quitte pas sa zone | `RG-SUR-085`, `RG-SUR-088` |
| Sites | Désactivation refusée tant qu'il porte du stock | `RG-ORG-009` |
| Utilisateurs et rôles | Rôles modèles logistiques livrés avec le produit | `RG-ORG-020` |
| Exploitant de l'instance | Nommé « prestataire », terme logistique | 0.9 §7 |

Chacun de ces points force un choix : soit le socle connaît la notion, et `RG-EXI-070` est violée ;
soit il la reçoit de l'extérieur, et il faut dire comment sans inventer un domaine (`RG-EXI-071`).

### Critère propre à cette fiche

Celui de `0002` : sans relecture humaine, une frontière qui n'est pas **refusée à la compilation**
finit par être franchie. `0002` a retenu .NET précisément parce que ses références de projet le
permettent ; la vérification en ligne a montré qu'elles sont transitives par défaut
(`DisableTransitiveProjectReferences` pour les rendre étanches).

## Options

### Option A — Un seul projet, frontière par espaces de noms

- **Ce que c'est** : tout le serveur dans un projet ; socle et logistique séparés par espaces de
  noms ; règles de dépendance vérifiées par des tests d'architecture (ArchUnitNET).
- **En faveur** : le plus simple à démarrer ; aucune question de référence entre projets.
- **En défaveur** : la frontière est vérifiée par un test, pas par le compilateur : un test oublié,
  désactivé ou mal écrit, et le socle référence la logistique sans bruit. L'espace technique et
  l'agent d'impression, programmes distincts, exigent de toute façon d'autres projets.
- **Ce que ça ferme** : rien, mais la dette s'accumule en silence.
- **Évaluation** : `RG-EXI-070` partiellement (par test) ; `RG-EXI-071` satisfaite ; `RG-EXI-066`
  partiellement.

### Option B — Couches techniques horizontales

- **Ce que c'est** : le découpage classique en domaine, application, infrastructure et interface,
  un projet chacun.
- **En faveur** : patron connu, abondant dans le corpus de l'IA ; isole la base de données du domaine.
- **En défaveur** : **ne répond pas à `RG-EXI-070`** : la frontière demandée sépare deux domaines, pas
  des couches techniques ; socle et logistique se retrouvent mêlés dans chaque couche. Chaque module
  livré en vertical (`0001`) touche quatre projets.
- **Ce que ça ferme** : la vérification de la frontière du socle par le compilateur.
- **Évaluation** : `RG-EXI-070` non ; `RG-EXI-071` satisfaite ; `RG-EXI-066` partiellement.

### Option C — Deux parties verticales et des programmes qui ne voient que ce qu'ils doivent voir

- **Ce que c'est** : un projet pour le socle, un projet pour la logistique qui le référence, et un
  projet par programme livré, chacun ne référençant que ce qu'il a le droit de voir. Références non
  transitives. Le socle expose des **points d'extension** que la logistique remplit ; il est
  **générique sur le détenteur des données**, que la logistique fixe au donneur d'ordre. À
  l'intérieur de chaque partie, un dossier et un espace de noms par module de la spécification.
- **En faveur** : le socle **ne peut pas** nommer une notion logistique : le compilateur refuse. Même
  chose pour l'espace technique face aux données métier (`RG-EXI-066`). La livraison verticale
  d'un module touche une partie, pas quatre couches.
- **En défaveur** : les points d'extension sont une conception de plus à tenir ; il faut résister à
  en créer d'autres que ceux qu'exige la liste de `RG-EXI-070`. Le socle générique sur le détenteur
  est une abstraction de plus pour l'IA.
- **Ce que ça ferme** : un raccourci où le socle consulterait directement le stock ou le donneur
  d'ordre. C'est le but.
- **Évaluation** : `RG-EXI-070` satisfaite, par le compilateur ; `RG-EXI-071` satisfaite si les
  points d'extension se limitent à ceux du tableau de la section « Décision » ; `RG-EXI-066`
  satisfaite, par le compilateur.

### Option D — Un projet par module de la spécification

- **Ce que c'est** : environ vingt-cinq projets, un par module, avec des références déclarées entre
  eux.
- **En faveur** : chaque dépendance entre modules est déclarée et vérifiée.
- **En défaveur** : les modules logistiques dépendent les uns des autres en tous sens — la commande
  de dossier lie 1.2, 3.1 et 4.1 ; le litige touche la réception, les transferts et l'expédition — et
  les projets .NET interdisent les cycles : il faudrait redécouper le métier pour plaire au
  compilateur. Une vingtaine de projets à maintenir avant qu'aucun ne serve.
- **Ce que ça ferme** : la liberté de faire évoluer la frontière entre modules logistiques, que la
  spécification n'a jamais figée.
- **Évaluation** : `RG-EXI-070` satisfaite ; `RG-EXI-071` non : le découpage fin anticipe une
  modularité que rien n'exige.

## Décision

**Le code se découpe selon l'option C : un socle et une logistique en projets distincts, des
programmes qui ne référencent que ce qu'ils doivent voir, des références non transitives, et un
socle qui reçoit de la logistique, par des points d'extension déclarés, tout ce qu'il ne doit pas
connaître.**

Le critère décisif : c'est la seule option où la frontière de `RG-EXI-070` et celle de
`RG-EXI-066` sont **refusées par le compilateur**, et non vérifiées par un test qu'on peut oublier.

Proposée, en attente de validation par Lucas.

### Les parties et leurs références

Les noms anglais ci-dessous sont proposés ; deux d'entre eux ne figurent pas au glossaire et doivent
y entrer avant le premier commit de code (voir « Points à trancher »).

| Projet | Contenu | Référence |
|---|---|---|
| `Cairn.Foundation` | Le socle de `RG-EXI-070`, et rien d'autre | rien de Cairn |
| `Cairn.Logistics` | Tout le reste de la spécification : couches 0 à 5 hors socle | `Cairn.Foundation` |
| `Cairn.Server` | Le programme de l'application : API, temps réel, traitements différés, assemblage des deux parties | `Cairn.Foundation`, `Cairn.Logistics` |
| `Cairn.InstanceHealth` | Le contrat de l'état de santé : indicateurs dénombrés, aucun type métier (`RG-EXI-066`) | rien de Cairn |
| `Cairn.OpsConsole` | L'espace technique (`OpsConsole` au glossaire) | `Cairn.InstanceHealth` seulement |
| `Cairn.PrintAgent` | L'agent d'impression sur site | un contrat d'impression propre, rien d'autre |
| `web/` | Les écrans Vue, un dossier par partie | le client généré depuis le contrat |

Chaque projet active `DisableTransitiveProjectReferences` : `Cairn.Server` ne voit la logistique que
parce qu'il la référence, et `Cairn.OpsConsole` ne voit ni le socle ni la logistique — donc ni
utilisateur nommé, ni stock, ni commande. Les projets de tests suivent la même règle.

### Ce que le socle porte, et ce qu'il reçoit

Le socle porte exactement la liste de `RG-EXI-070`, avec les termes du glossaire. Tout le reste est
logistique, y compris ce qui paraîtrait général — tiers, parcours, tâches, unités d'œuvre — parce
que `RG-EXI-071` interdit de le généraliser d'avance. Un élément ne passe de la logistique au
socle que le jour où un second domaine en a besoin.

Pour les mécanismes du socle décrits en termes logistiques, la réponse est une seule des deux
formes suivantes, jamais une troisième :

**1. Le détenteur des données est un paramètre du socle.** Là où la spécification dit « par
donneur d'ordre » dans un mécanisme du socle, le socle est générique sur le type qui détient les
données, et la logistique le fixe à `Principal`. Le socle n'en connaît ni le nom ni le contenu.
Aucun terme neutre n'est inventé : le paramètre n'a pas de nom métier, seulement une place.

**2. Le socle déclare un point d'extension que la logistique remplit.** Un point d'extension est une
interface du socle, implémentée dans la logistique, enregistrée par `Cairn.Server`.

| Mécanisme du socle | Forme | Ce que la logistique fournit |
|---|---|---|
| Périmètres (`RG-ORG-016`, `017`, `RG-SUR-066`) | 1 et 2 | La restriction par donneur d'ordre, appliquée par le filtre de périmètre du socle |
| Numérotation (`RG-ORG-026`) | 2 | Le segment « code donneur d'ordre », et les types d'objets numérotés |
| Imports et échanges (`RG-SUR-089`, `103`) | 1 et 2 | Le détenteur du profil et de l'échange ; les types de données importables et leurs champs métier |
| File de décisions (`RG-SUR-040`) | 2 | Les éléments de décision de chaque module ; la mesure du stock immobilisé pour le deuxième critère d'ordre |
| Impressions (`RG-SUR-085`, `088`) | 2 | Les documents imprimables ; la zone comme destination possible, à côté du poste ; la règle de sortie de zone de l'objet non étiqueté |
| Sites (`RG-ORG-009`) | 2 | Les raisons qui empêchent la désactivation d'un site (stock non nul, flux en cours) |
| Permissions et rôles (`RG-ORG-018`, `020`) | 2 | Les permissions de la logistique et ses rôles modèles |
| Alertes (`RG-SUR-071`) | 2 | Les faits déclencheurs de la logistique |
| Recherche (`RG-SUR-059`, `062`) | 2 | Les types d'objets et identifiants externes cherchables |
| Règles paramétrables (`RG-SUR-115`) | 2 | Les règles de la logistique — parcours, stratégies de rangement, règles de prélèvement, seuils — bâties sur le modèle de version et de simulation du socle |
| Main (`RG-SUR-049`) | 2 | Les unités de travail de la logistique |

**Aucun point d'extension n'est créé hors de ce tableau** sans modifier cette fiche. C'est la
garde de `RG-EXI-071` : la généralité est bornée par ce que la spécification oblige déjà le socle à
recevoir.

L'exploitant de l'instance reste `Provider` dans le socle, comme le glossaire le nomme, malgré sa
couleur logistique : le renommer serait anticiper (`RG-EXI-071`), et 0.9 §7 laisse la question
ouverte.

### Ce qui vérifie la frontière, mécaniquement

| Garde | Ce qu'elle arrête | Nature |
|---|---|---|
| Références de projet non transitives | Le socle qui nomme un type logistique ; l'espace technique qui nomme un type métier | Compilation |
| Tests d'architecture (ArchUnitNET) | Un module logistique qui contourne le socle pour écrire directement dans ses tables ; un point d'extension implémenté hors de la logistique | Test bloquant |
| Test de vocabulaire | Un identifiant du socle égal au terme anglais d'une notion logistique du glossaire (`Principal`, `StockUnit`, `Zone`…) — la liste est lue dans `docs/glossaire.md` et classée selon le tableau ci-dessus | Test bloquant |
| Socle seul | Les tests du socle s'exécutent sans charger `Cairn.Logistics`, avec des extensions de test sans sens métier. Si le socle ne démarre pas seul, `RG-EXI-070` est violée | Test bloquant |

La base de données suit la même frontière : un schéma pour le socle, un pour la logistique ; les
tables logistiques peuvent référencer celles du socle, jamais l'inverse. Le détail relève de la
fiche base de données.

Les écrans suivent la même découpe par dossiers. En TypeScript, la frontière ne peut être que
signalée par un outil, aujourd'hui affaibli par TypeScript 7 (voir `0002`) ; la fiche écrans dira
comment la tenir.

### À l'intérieur de chaque partie

Un dossier et un espace de noms par module de la spécification, portant son nom anglais
(`Receiving`, `Putaway`, `Picking`…). Aucune règle de dépendance n'est imposée entre modules
logistiques : la spécification les fait dépendre les uns des autres, et l'option D a montré le coût
d'un découpage plus fin.

## Conséquences

- **Ce qu'on peut faire** : écrire les fiches base de données, chaîne de qualité et installation,
  qui s'adossent à cette découpe ; savoir, pour chaque règle, dans quel projet elle se code.

- **Ce qu'on ne peut plus faire** : faire référencer la logistique par le socle ; donner à l'espace
  technique un accès à un type métier ; créer un point d'extension absent du tableau ; déplacer une
  notion logistique vers le socle en l'absence d'un second domaine.

- **Ce qu'il faut mettre en place** :
  - au glossaire, avant le premier commit de code : le nom du socle et le nom de la partie
    logistique dans le code, et le terme d'agent d'impression, employé par `0002` sans y figurer ;
  - la fiche chaîne de qualité (issue `#37`) rend bloquants les quatre gardes ci-dessus ;
  - la fiche base de données (issue `#38`) reprend la frontière en schémas et en rôles ;
  - la fiche écrans (issue `#40`) dit comment tenir la découpe en TypeScript.

- **Ce qu'on accepte de payer** : les points d'extension, une conception de plus ; un socle
  générique sur le détenteur, une abstraction de plus pour l'IA ; le test de vocabulaire, qui dépend
  de la structure du glossaire et doit suivre ses changements.

- **Ce qui la remettrait en cause** : un mécanisme du socle qui ne se laisse pas remplir par les deux
  formes retenues — signe qu'une notion logistique fait en réalité partie du socle, et que la liste
  de `RG-EXI-070` est à rouvrir ; ou l'arrivée d'un second domaine, qui déciderait enfin de ce qui est
  général.

### Points à trancher

Ces points ne se tranchent pas dans le code. Ils relèvent de Lucas ou du glossaire.

- **Noms de code des deux parties.** `Foundation` pour le socle et `Logistics` pour la logistique
  sont proposés. Ni l'un ni l'autre n'est au glossaire, qui n'a pas non plus de terme pour « socle ».
- **Agent d'impression.** Employé par `0002`, absent du glossaire ; `PrintAgent` est proposé.
- **Zone comme destination d'impression.** Le glossaire définit la destination d'impression comme
  rattachée « à un poste ou à une zone ». La fiche fait de la zone une destination fournie par la
  logistique. Si Lucas juge qu'un lieu à l'intérieur d'un site est une notion du socle, la liste de
  `RG-EXI-070` est à compléter.
- **Restriction par donneur d'ordre dans les périmètres.** La fiche la traite comme une extension
  logistique du filtre de périmètre du socle. Si un second domaine devait un jour cloisonner ses
  données de la même façon, la notion remonterait au socle avec un nom neutre, qui n'existe pas
  aujourd'hui.
