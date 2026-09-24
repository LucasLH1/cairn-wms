# 0005 — Chaîne de qualité et intégration continue

**Statut** : abandonnée · **Date** : 2026-09-24 · **Remplace** : — · **Remplacée par** : —

> Choix techniques réinitialisés le 2026-09-24 à la demande de Lucas ; le sujet sera repris dans une
> nouvelle fiche.

## Contexte

`0002` a retenu sa pile sur un critère : le code est écrit par une IA et personne ne le relit, donc
**une erreur qui ne se manifeste pas mécaniquement n'est vue par personne**. Cette fiche dit ce qui
rend ce critère mécanique : les réglages, les contrôles, les tests, et ce qui empêche un changement
d'entrer quand l'un d'eux échoue.

Elle s'adosse à `0004`, qui a posé quatre gardes de frontière — références de projet non
transitives, tests d'architecture, test de vocabulaire, socle seul — et placé les tests de scénario
sous `tests/scenarios/`, en boîte noire. Elle ne décide ni du schéma de base (issue `#38`), ni du
contrat (issue `#39`), ni des écrans (issue `#40`) ; elle dit seulement comment on vérifie ce qu'ils
produisent.

Deux contraintes de fonctionnement :

- `dev` reçoit des poussées directes, sans demande de fusion (`CLAUDE.md`, règle 4). Un contrôle
  qui ne tourne qu'à la fusion vers `main` découvrirait les erreurs trop tard.
- Le lot 1 est clos par ses trois scénarios automatisés et verts (`0003`, README du lot 1). La
  chaîne doit donc savoir monter une instance vide et y dérouler un scénario.

## Options

### Option A — Le minimum du compilateur

- **Ce que c'est** : avertissements traités en erreurs, nullabilité activée, tests unitaires ; le
  reste à la discrétion de chaque module.
- **En faveur** : rapide à mettre en place, peu de dépendances.
- **En défaveur** : aucune des gardes de `0004` n'est tenue ; aucun test ne touche une vraie base,
  donc aucun des verrous, contraintes et partitions dont dépendent `RG-EXI-006` à `011` n'est
  éprouvé ; rien ne vérifie la cohérence entre le serveur et les écrans.
- **Ce que ça ferme** : la confiance dans un code non relu.

### Option B — Une chaîne complète, bloquante, identique en local et en intégration continue

- **Ce que c'est** : un point d'entrée unique qui construit, analyse, teste et déroule les
  scénarios ; le même lancé par l'agent avant chaque commit et par l'intégration continue à chaque
  poussée.
- **En faveur** : chaque classe d'erreur a son contrôle ; ce qui passe en local passe en
  intégration continue ; les scénarios du lot sont rejoués à chaque changement.
- **En défaveur** : une chaîne plus longue à exécuter ; des dépendances d'outillage à tenir.
- **Ce que ça ferme** : rien.

### Option C — B, plus des seuils de couverture et de mutation bloquants

- **Ce que c'est** : B, et un pourcentage minimal de couverture et de mutants tués pour fusionner.
- **En faveur** : un chiffre à tenir.
- **En défaveur** : un seuil de couverture se satisfait par des tests qui n'affirment rien — c'est
  précisément ce qu'une IA produit sous contrainte de chiffre. Les tests de mutation sont longs.
- **Ce que ça ferme** : la lisibilité du signal : un rouge dû au seuil ne dit pas ce qui est faux.

## Décision

**Option B.** La chaîne est un point d'entrée unique, exécuté à l'identique par l'agent avant chaque
commit et par l'intégration continue à chaque poussée sur `dev` et à chaque demande de fusion vers
`main`. Un rouge sur `dev` se corrige par le commit suivant, avant tout autre travail. La fusion
vers `main` exige tous les contrôles verts. Les tests de mutation tournent chaque semaine, sans
bloquer, et leurs survivants deviennent des issues.

Le critère décisif est celui de `0002` : chaque classe d'erreur doit avoir un contrôle qui la
refuse, et le même contrôle doit tourner partout.

Proposée, en attente de validation par Lucas.

### Serveur (.NET)

| Contrôle | Réglage | Arrête |
|---|---|---|
| Compilateur | `Nullable` activé ; `TreatWarningsAsErrors` ; `AnalysisLevel` `latest-all` (toutes les règles des analyseurs du SDK en avertissement, donc en erreur) | Nullité non traitée, code mort, usage fautif des API du cadre |
| Analyseurs ajoutés | Roslynator.Analyzers 5.0 (Apache-2.0), Meziantou.Analyzer 3.0 (MIT) | Asynchronisme mal tenu, comparaisons de chaînes sans culture, ressources non libérées |
| Mise en forme | `dotnet format --verify-no-changes`, fourni avec le SDK | Écarts de style qui brouillent les différences entre versions |
| Frontière | Références non transitives, ArchUnitNET, test de vocabulaire, socle seul (`0004`) | Le socle qui voit la logistique, l'espace technique qui voit le métier |
| Tests unitaires | xUnit v3 | Règles de gestion en isolation |
| Tests d'intégration | xUnit v3, `WebApplicationFactory`, Testcontainers.PostgreSql sur PostgreSQL 18 | Contraintes, verrous, partitions, droits par rôle, idempotence — tout ce qu'une base simulée cacherait |
| Modèle de données | `dotnet ef migrations has-pending-model-changes` | Un modèle modifié sans migration |
| Contrat | Régénération du contrat OpenAPI à la compilation, comparée à la version suivie dans le dépôt | Une API modifiée sans que les écrans le sachent |

Écartés : SonarAnalyzer.CSharp, sous licence « Source-Available » non libre, contraire à la règle des
licences permissives de `0002` ; StyleCop.Analyzers, sans version stable depuis 2019 ; CSharpier,
redondant avec `dotnet format` ; Respawn, inutile quand chaque classe de tests reçoit sa base.

### Écrans (TypeScript)

| Contrôle | Réglage | Arrête |
|---|---|---|
| Typage | `vue-tsc --noEmit`, TypeScript 6.0 en mode `strict` avec `noUncheckedIndexedAccess` et `exactOptionalPropertyTypes` | Erreurs de types, y compris dans les gabarits Vue |
| Analyse | ESLint 10, typescript-eslint 8 en `strict-type-checked`, eslint-plugin-vue ; `no-explicit-any` et `no-unsafe-*` en erreur | Les trous par lesquels TypeScript laisse passer l'inconnu |
| Frontière | Règle `no-restricted-imports` : le dossier du socle n'importe rien du dossier de la logistique | Le pendant, côté écrans, de la frontière de `0004` |
| Tests | Vitest | Logique des écrans en isolation |

**TypeScript reste en 6.0** : TypeScript 7 n'expose pas encore d'API programmatique,
typescript-eslint plafonne sous 6.1, et le gabarit officiel de Vue fixe `~6.0.0`. Le passage à 7 se
fera quand ces trois conditions seront levées, par une révision de cette fiche.

### Scénarios

Les tests de scénario (`tests/scenarios/`, issues `#48` à `#50`) sont écrits en TypeScript avec
Playwright et son lanceur de tests (`@playwright/test` 1.63, Apache-2.0) : c'est la variante qui
fournit le rapport, les traces et la reprise en cas d'échec, que la variante .NET n'a pas. Ils sont
en boîte noire (`0004`) : chaque exécution monte une instance vide à partir de l'image livrée,
charge le jeu de données par l'interface de programmation publique, déroule les étapes et vérifie
chaque constat puis l'état final.

Ils relèvent aussi, pour chaque geste, le temps de réponse du serveur. Sur les machines de
l'intégration continue, ce relevé informe et ne bloque pas : la mesure qui vaut est celle du serveur
de référence, exigée à la clôture du lot (`RG-EXI-072`, `073`).

### Intégration continue

GitHub Actions, sur des machines Linux : `actions/setup-dotnet` v6, `actions/setup-node` v7,
PostgreSQL 18 en conteneur de service. Aucun secret réel n'y est nécessaire : les bases de test
sont éphémères et leurs mots de passe fictifs. Une protection de `main` exige les contrôles verts
pour fusionner.

### Mutation

Stryker.NET 5.0 (Apache-2.0) sur le socle et sur les règles de gestion de la logistique, chaque
semaine, sans bloquer.

## Conséquences

- **Ce qu'on peut faire** : écrire le premier module du lot 1 en sachant ce qui le refusera.
- **Ce qu'on ne peut plus faire** : committer sans avoir lancé la chaîne ; désactiver un
  avertissement dans le code sans le motiver sur la ligne même ; ajouter un outil d'analyse sous
  licence non libre.
- **Ce qu'il faut mettre en place** : le point d'entrée unique, le fichier d'intégration continue,
  la protection de `main` qui exige les contrôles — premiers fichiers du dépôt une fois 0004, 0005
  et la fiche base de données actées.
- **Ce qu'on accepte de payer** : une chaîne de plusieurs minutes à chaque commit ; deux
  environnements d'outillage, .NET et Node ; TypeScript maintenu une version en retard.
- **Ce qui la remettrait en cause** : une chaîne si longue qu'elle cesse d'être lancée avant chaque
  commit ; un contrôle qui échoue de manière aléatoire, qu'on apprendrait à ignorer.
