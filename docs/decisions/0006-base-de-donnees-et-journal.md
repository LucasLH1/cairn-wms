# 0006 — Base de données et journal d'événements

**Statut** : proposée · **Date** : 2026-09-24 · **Remplace** : — · **Remplacée par** : —

## Contexte

`0002` a retenu PostgreSQL ; `0004` a découpé le code en socle et logistique et demandé que la base
suive la même frontière. Il reste à dire comment les données sont rangées, comment l'immuabilité et
l'intégrité exigées par la spécification sont garanties **par la base elle-même**, et comment le
schéma évolue sans rien perdre.

Les exigences qui pèsent ici :

- **Immuabilité** : événements et mouvements ne se modifient ni ne se suppriment (`RG-TRA-004`,
  `RG-EXI-010`) ; relevés figés et photos quotidiennes ne changent plus (`RG-EXI-017`,
  `RG-STK-059`).
- **Atomicité et concurrence** : un geste et ses effets ensemble ou pas du tout (`RG-EXI-011`) ;
  jamais deux réservations d'une unité de stock (`RG-EXI-008`) ; de deux gestes incompatibles, un seul
  réussit (`RG-EXI-009`) ; un geste reçu deux fois enregistré une fois (`RG-EXI-007`).
- **Conservation et volume** : aucune purge (`RG-TRA-047`) ; plusieurs centaines de millions
  d'événements en cinq ans à la borne haute (`0002`), partitionnement prévu dès l'origine.
- **Anonymisation** : retirer les données identifiantes d'un client final de partout, événements
  compris, sans supprimer un événement (`RG-TRA-048`, `RG-TRS-018`, `RG-TRS-019`, `RG-EXI-018`).
- **Espace technique** : il lit des compteurs, jamais une donnée métier (`RG-EXI-066`).
- **Identifiants** uniques, stables, jamais réattribués (`RG-EXI-035`) ; horodatages
  interprétables sans ambiguïté, fuseau porté par le site (`RG-EXI-076`).
- **Mises à jour** sans perte (`RG-EXI-057`), appliquées sans intervention (`RG-EXI-060`).

## Options

### Option A — Tables d'état modifiables, et une table d'audit alimentée par déclencheurs

- **Ce que c'est** : le schéma relationnel habituel ; chaque modification copiée dans une table
  d'audit par un déclencheur.
- **En faveur** : le patron le plus répandu.
- **En défaveur** : l'audit enregistre des lignes modifiées, pas des gestes ; il ne porte ni le
  poste, ni le motif, ni la règle appliquée (`RG-TRA-002`, `003`, `RG-EXI-031`) ; les mouvements de
  stock, qui doivent être immuables, seraient des lignes modifiables.
- **Ce que ça ferme** : un journal qui dise ce qui s'est passé, et pas seulement ce qui a changé.

### Option B — Source d'événements pure

- **Ce que c'est** : seuls les événements sont stockés ; tout état se reconstitue en les rejouant.
- **En faveur** : immuabilité par construction.
- **En défaveur** : la réservation unique et le refus du second prélèvement (`RG-EXI-008`, `009`)
  exigent un état courant cohérent au moment du geste ; il faudrait des projections tenues à jour
  dans la même transaction, donc revenir à des tables d'état. Coût de conception élevé, corpus de
  l'IA mince, rejeu long sur des centaines de millions d'événements.
- **Ce que ça ferme** : la simplicité des lectures.

### Option C — Tables d'état, plus un journal et des mouvements en ajout seul, écrits dans la même transaction

- **Ce que c'est** : l'état courant — stock, commandes, missions — dans des tables relationnelles
  contraintes ; chaque geste écrit, dans la même transaction, ses mouvements et son événement dans
  des tables où la base refuse modification et suppression.
- **En faveur** : les contraintes de la base portent la concurrence ; le journal dit le geste
  complet ; l'immuabilité est tenue par les droits et non par la discipline.
- **En défaveur** : deux écritures par geste ; un schéma de journal à tenir.
- **Ce que ça ferme** : rien.

## Décision

**Option C**, sur PostgreSQL 18 (supporté jusqu'en novembre 2030), avec les règles qui suivent.
Le critère décisif : l'immuabilité et la concurrence sont **refusées par la base**, pas confiées au
code — un code non relu peut se tromper, un droit absent ne se contourne pas.

Proposée, en attente de validation par Lucas.

### Schémas et rôles

| Schéma | Contenu |
|---|---|
| `foundation` | Tables du socle (`0004`) |
| `logistics` | Tables de la logistique ; elles peuvent référencer `foundation`, jamais l'inverse |
| `health` | Vues de compteurs dénombrés, sans donnée métier |

| Rôle | Droits |
|---|---|
| Propriétaire | Crée et modifie le schéma ; utilisé seulement par les migrations |
| Application | Lecture et écriture sur `foundation` et `logistics` ; **sur les tables en ajout seul, `INSERT` et `SELECT` seulement** |
| Espace technique | `SELECT` sur `health` seulement (`RG-EXI-066`) |
| Sauvegarde | Lecture de tout, pour produire les sauvegardes ; aucun affichage |

Les tables en ajout seul — journal, mouvements de stock, mouvements de consigne, relevés d'inventaire
validés, photos quotidiennes, relevés d'activité figés — portent en outre un déclencheur qui refuse
`UPDATE` et `DELETE`, même pour le propriétaire : défense en profondeur contre une migration fautive.

### Journal

Une table `foundation.trace_event`, partitionnée par mois sur l'horodatage de l'événement :
identifiant, nature, horodatage, auteur ou origine, poste, objet, contexte de flux, horodatage
d'origine pour les faits externes (`RG-TRA-006`), et un contenu structuré en `jsonb` portant la règle,
sa version et les critères quand une règle a décidé (`RG-EXI-031`). Les partitions à venir sont
créées d'avance par un traitement différé de l'application, trois mois en avance ; leur absence est
une dégradation signalée. pg_partman est écarté : il exige un superutilisateur à l'installation,
contraire à l'installation par un prestataire seul (`RG-EXI-060`).

### Données identifiantes

**Aucun événement, mouvement ou message conservé ne contient de donnée identifiante d'un client
final.** Il porte une référence vers une table `personal_data`, seule dépositaire des nom, adresse,
téléphone et adresse électronique (`RG-TRS-018`). Quand un contenu conservé doit reproduire ce qui a
été transmis — un envoi vers un donneur d'ordre (`RG-SUR-111`), une étiquette —, les champs
identifiants y sont remplacés par des références résolues à la lecture. L'anonymisation efface les
champs de `personal_data` ; aucun événement n'est modifié, et pourtant aucun ne restitue plus la
donnée effacée (`RG-EXI-018`). C'est ce qui réconcilie `RG-EXI-010` et `RG-EXI-018`.

### Concurrence

- **Réservation unique** (`RG-EXI-008`) : contrainte d'unicité sur l'unité de stock réservée.
- **Gestes incompatibles** (`RG-EXI-009`) : verrou de ligne `SELECT … FOR UPDATE` sur l'unité de
  stock ou l'emplacement touchés, pris dans l'ordre des identifiants pour éviter les interblocages ;
  écrit en SQL, EF Core ne l'exposant pas.
- **Main** (`RG-EXI-002`) : une table des mains avec contrainte d'unicité sur l'unité de travail.
- **Modifications concurrentes hors main** : concurrence optimiste sur `xmin`.
- **Geste reçu deux fois** (`RG-EXI-007`) : table des clés d'idempotence, unique par auteur et par
  clé, conservant la réponse rendue ; un second envoi reçoit la même réponse sans rien réécrire. Les
  clés, qui ne sont pas des événements, sont conservées trente jours.
- **Effets différés** (`RG-EXI-011`) : table de sortie écrite dans la transaction du geste, lue par
  les traitements différés (fiche `#42`).

### Types et identifiants

- Identifiants techniques : `uuid` produits par `uuidv7()`, natif en PostgreSQL 18 — ordonnés dans le
  temps, donc favorables aux index du journal. Les numéros lisibles par un humain (`RG-ORG-025`)
  sont une colonne à part, produite par le schéma de numérotation.
- Horodatages : `timestamptz`, lus côté .NET en `Instant` par NodaTime 3.3 et le module NodaTime de
  Npgsql ; le fuseau est une colonne du site. Un instant ne peut plus être confondu avec une heure
  locale : le compilateur les distingue.
- Quantités entières ; montants — valeur déclarée — en `numeric`, lus en `decimal`.

### Accès et migrations

- EF Core 10 avec Npgsql 10 ; SQL écrit à la main permis pour les verrous, les partitions, les
  droits et les déclencheurs, dans les migrations ou dans des requêtes nommées et testées.
- **Migrations additives seulement** : on ajoute une colonne, une table, un index ; on ne renomme ni
  ne supprime dans la même version que celle qui cesse de s'en servir (`RG-EXI-057`). Une suppression
  passe par deux versions successives.
- Les migrations s'appliquent au démarrage du serveur, sous le verrou de migration d'EF Core, avant
  qu'il accepte des requêtes. Le script SQL correspondant est produit à chaque version pour relecture
  éventuelle et pour la restauration.

## Conséquences

- **Ce qu'on peut faire** : écrire les tables du lot 1 ; tester en intégration les contraintes de
  concurrence et les refus de modification.
- **Ce qu'on ne peut plus faire** : stocker une donnée identifiante de client final ailleurs que
  dans `personal_data` ; modifier une ligne d'une table en ajout seul ; supprimer une colonne dans
  la version qui cesse de l'utiliser.
- **Ce qu'il faut mettre en place** : les deux schémas, les rôles et leurs droits, le journal
  partitionné et son traitement de création de partitions, la table des clés d'idempotence, la table
  de sortie, les vues `health`.
- **Ce qu'on accepte de payer** : deux écritures par geste ; du SQL écrit à la main pour les
  verrous, les droits et les partitions ; une résolution de références à la lecture des contenus
  conservés.
- **Ce qui la remettrait en cause** : un volume qui ferait dépasser au journal ce qu'un seul serveur
  PostgreSQL sert dans les délais de `RG-EXI-073` ; une donnée identifiante qu'on ne pourrait pas
  sortir d'un contenu conservé.
