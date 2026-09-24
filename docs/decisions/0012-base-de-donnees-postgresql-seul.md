# 0012 — Base de données : PostgreSQL seul

**Statut** : proposée · **Date** : 2026-09-24 · **Remplace** : — · **Remplacée par** : —

## Contexte

La fiche 0009 fixe TypeScript. La base de données porte l'essentiel des exigences de `socle/0.9`, bien
plus que le langage :

- **Intégrité** : un geste et tous ses effets enregistrés ensemble ou pas du tout (`RG-EXI-011`) ; un
  geste reçu deux fois enregistré une fois (`RG-EXI-007`) ; jamais deux réservations sur une unité
  (`RG-EXI-008`) ; deux gestes incompatibles jamais tous deux réussis (`RG-EXI-009`) ; main exclusive
  (`RG-EXI-002`).
- **Journal** : événements immuables, conservés sans purge (`RG-EXI-010`, `015`), historique en un geste
  et relevés qui redescendent aux événements (`RG-EXI-016`), anonymisation sans supprimer d'événement
  (`RG-EXI-018`).
- **Traitements différés durables**, rattrapés à la reprise (`RG-EXI-021` à `027`).
- **Mise à jour en continu des écrans** en moins de deux secondes (`RG-EXI-001`, `073`).
- **Champs personnalisés** servant de critères de routage (`RG-EXI-032`) ; **recherche unique** sur
  identifiants internes et externes (`RG-EXI-036`).
- **Sobriété** : serveur de deux processeurs, quatre gigaoctets, quarante gigaoctets de stockage
  (`RG-EXI-072`) ; sauvegarde et restauration par le prestataire seul (`RG-EXI-061`), reprise en moins
  de deux heures (`RG-EXI-074`, `075`).

Ce qu'on ignorait : la volumétrie réelle. Seule une hypothèse de dimensionnement existe (0.9, points
ouverts) : cinquante mille lignes par jour, plusieurs centaines de millions d'événements en cinq ans.

## Options

### Option A — PostgreSQL seul

- **Ce que c'est** : une seule base relationnelle porte les données, le journal, la file des traitements
  différés et les notifications de changement.
- **En faveur** : transactions et verrous de ligne pour l'intégrité ; file de traitements par
  verrouillage sans attente (`SKIP LOCKED`) ; notifications (`LISTEN`/`NOTIFY`) pour signaler les
  changements aux écrans ; partitionnement du journal ; colonnes JSON indexables pour les champs
  personnalisés ; recherche approximative par trigrammes. Un seul composant à sauvegarder, restaurer et
  surveiller.
- **En défaveur** : la file et les notifications sont moins riches que celles d'un outil dédié.
- **Ce que ça ferme** : rien d'irréversible ; un outil dédié peut s'ajouter plus tard si un besoin le
  prouve.

### Option B — PostgreSQL, avec Redis ou une file de messages

- **Ce que c'est** : la base pour les données ; un composant dédié pour la file et la diffusion.
- **En faveur** : file et diffusion plus puissantes.
- **En défaveur** : un second composant à héberger, sauvegarder et surveiller ; une file hors de la base
  ne s'enregistre pas dans la même transaction que le geste, ce qui complique `RG-EXI-011` ; mémoire
  prise sur quatre gigaoctets.
- **Ce que ça ferme** : la simplicité d'exploitation visée par `RG-EXI-069`.

### Option C — SQLite

- **Ce que c'est** : base embarquée dans un fichier.
- **En faveur** : aucune administration ; sauvegarde triviale.
- **En défaveur** : un seul écrivain à la fois ; pas de notification entre processus ; journal de
  centaines de millions de lignes mal servi.
- **Ce que ça ferme** : la séparation des processus (fiche 0017) et la montée en volume.

### Option D — MariaDB ou MySQL

- **Ce que c'est** : autre base relationnelle courante.
- **En faveur** : répandue.
- **En défaveur** : moins riche que PostgreSQL sur la file, les notifications, le JSON indexé et la
  recherche ; rien à gagner.
- **Ce que ça ferme** : —

## Décision

*Proposée par Claude, à valider par Lucas.* **PostgreSQL est la seule base de données de Cairn WMS, et
porte aussi la file des traitements différés et les notifications de changement** (option A).

Critère décisif : un geste, son événement, ses effets et les traitements qu'il déclenche s'enregistrent
dans une seule transaction, et l'instance n'a qu'un composant de données à sauvegarder et à restaurer.

## Conséquences

- **Ce qu'on peut faire** : garantir `RG-EXI-007` à `011` par la base elle-même ; tenir la file des
  traitements différés dans la même transaction que le geste.
- **Ce qu'on ne peut plus faire** : ajouter un composant de données (cache, file, moteur de recherche)
  sans nouvelle fiche.
- **Ce qu'il faut mettre en place** : une fiche sur le journal d'événements — partitionnement,
  anonymisation compatible avec l'immuabilité (`RG-EXI-010`, `018`), accès en un geste à l'historique ;
  une fiche sur l'accès aux données depuis TypeScript.
- **Ce qu'on accepte de payer** : une file et une diffusion faites avec les moyens de la base.
- **Ce qui la remettrait en cause** : une file ou des notifications qui ne tiennent pas la charge du
  lot 1 ou d'une volumétrie réelle.

### Non prouvé

- **Stockage.** À l'hypothèse de cinquante mille lignes par jour, le journal dépasserait les quarante
  gigaoctets du serveur de référence en cinq ans, quelle que soit la base : estimation de Claude, de
  l'ordre de la centaine de gigaoctets. C'est une question de volumétrie et de valeur de référence, pas
  de choix de base ; elle se tranche côté spécification.
- **Mémoire** : PostgreSQL et l'application tiennent dans quatre gigaoctets selon toute vraisemblance ;
  le lot 1 le mesure (`RG-EXI-072`).
