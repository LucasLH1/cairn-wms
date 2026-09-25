# Décisions

Ce dossier conserve les **décisions engageantes** du projet : celles qu'on ne peut pas revenir
défaire à bon compte, et dont quelqu'un — dans six mois, ou six ans — voudra connaître la raison.

## Décisions en vigueur

| # | Titre | Statut |
|---|---|---|
| 0001 | [Découpage du produit en lots livrables](0001-decoupage-en-lots-livrables.md) | remplacée par 0003 |
| 0002 | [Pile d'ensemble](0002-pile-d-ensemble.md) | abandonnée |
| 0003 | [Précision du découpage en lots](0003-precision-du-decoupage-en-lots.md) | actée |
| 0004 | [Découpe interne et frontière du socle](0004-decoupe-interne-et-frontiere-du-socle.md) | abandonnée |
| 0005 | [Chaîne de qualité et intégration continue](0005-chaine-de-qualite.md) | abandonnée |
| 0006 | [Base de données et journal d'événements](0006-base-de-donnees-et-journal.md) | abandonnée |
| 0007 | [Interface de programmation et contrat](0007-interface-de-programmation-et-contrat.md) | abandonnée |
| 0008 | [Écrans](0008-ecrans.md) | abandonnée |
| 0009 | [Langage : TypeScript de bout en bout](0009-langage-typescript-de-bout-en-bout.md) | actée |
| 0010 | [Framework des écrans : React](0010-framework-des-ecrans-react.md) | actée |
| 0011 | [Composants et style](0011-composants-et-style.md) | actée |
| 0012 | [Base de données : PostgreSQL seul](0012-base-de-donnees-postgresql-seul.md) | actée |
| 0013 | [Architecture : monolithe modulaire](0013-architecture-monolithe-modulaire.md) | actée |
| 0014 | [Poste : application web dans le navigateur](0014-poste-application-web-dans-le-navigateur.md) | actée |
| 0015 | [Livraison : conteneurs, et espace technique en processus distinct](0015-livraison-conteneurs-et-espace-technique-distinct.md) | actée |
| 0016 | [Impression : agent d'impression dans les deux modes](0016-impression-par-agent-d-impression.md) | actée |
| 0017 | [Garde-fous du serveur TypeScript](0017-garde-fous-du-serveur-typescript.md) | actée |
| 0018 | [Environnement d'exécution : Node.js, version à support long](0018-environnement-d-execution-node.md) | actée |
| 0019 | [Cadre du serveur et contrat des gestes](0019-cadre-du-serveur-et-contrat-des-gestes.md) | actée |
| 0020 | [Bibliothèque de schémas : Zod](0020-bibliotheque-de-schemas-zod.md) | actée |
| 0021 | [Accès aux données et migrations : Kysely](0021-acces-aux-donnees-et-migrations-kysely.md) | actée |
| 0022 | [Journal d'événements](0022-journal-d-evenements.md) | actée |
| 0023 | [Organisation du code et découpe interne](0023-organisation-du-code-et-decoupe-interne.md) | actée |
| 0024 | [Chaîne de qualité et intégration continue](0024-chaine-de-qualite.md) | actée |
| 0025 | [Cadre des écrans](0025-cadre-des-ecrans.md) | actée |
| 0026 | [Temps réel : WebSocket et signaux de changement](0026-temps-reel.md) | actée |
| 0027 | [Authentification, sessions et postes](0027-authentification-sessions-et-postes.md) | actée |
| 0028 | [Traitements différés](0028-traitements-differes.md) | actée |

**La pile est reprise de zéro depuis le 2026-09-24 et actée.** Les fiches 0002 et 0004 à 0008 sont
abandonnées et restent ici pour l'histoire ; leurs numéros ne seront jamais réutilisés.

- Validées par Lucas : 0009, 0010 et 0011 le 2026-09-24 ; 0012 et 0013 le 2026-09-25.
- Actées par Claude le 2026-09-25, sur délégation explicite de Lucas (« Prends les décisions qu'il
  faut, je veux passer au dev le plus rapidement possible ») : 0014 à 0028. Chaque fiche le mentionne.

Le code du lot 1 peut s'écrire dans le cadre de ces fiches. Tout choix engageant qu'elles ne couvrent
pas demande une nouvelle fiche avant d'être mis en œuvre. Restent à écrire, avant le lot où ils servent :
la sauvegarde et la restauration, la sécurité et l'exploitation en série de l'espace technique
(fiche 0015).

## La règle

> **Ce qui n'est pas écrit ici n'est pas décidé.**

Un choix absent de ce dossier ne doit jamais être supposé, ni déduit d'un fichier existant, ni
imposé par un raccourci de mise en œuvre. Face à un choix engageant non tranché : on écrit une
fiche et on la fait valider — on ne code pas d'abord.

## Ce qui mérite une fiche

Une décision dont on ne peut pas sortir sans coût mérite une fiche. Concrètement :

- un choix de technologie (langage, base de données, file, hébergement, outillage) ;
- une frontière d'architecture (ce qui est un module, ce qui est un service, ce qui parle à quoi) ;
- un modèle de données structurant, ou une règle qui contredit la spécification métier ;
- l'ajout d'une dépendance qu'on ne pourrait plus retirer sans réécrire ;
- l'ordre dans lequel le produit se réalise, et ce que chaque étape doit prouver ;
- un renoncement : ce qu'on décide explicitement de **ne pas** faire.

Ce qui n'en mérite pas : le nommage d'une variable, l'ordre de deux fonctions, tout ce qu'un
`git revert` suffit à annuler.

## Forme

Un fichier par décision, jamais deux décisions dans le même fichier.

**Nom du fichier** : `NNNN-titre-court.md`, numérotation continue à partir de `0001`, en minuscules
et tirets. Exemple : `0001-choix-du-langage-serveur.md`.

**Un numéro n'est jamais réutilisé.** Si une décision est abandonnée, sa fiche reste en place, son
statut passe à *remplacée* ou *abandonnée*, et la suivante prend le numéro d'après. La même
discipline s'applique ici qu'aux identifiants de règles `RG-XXX-nnn` de la spécification.

**Statuts** :

| Statut | Sens |
|---|---|
| `proposée` | Écrite, pas encore validée. N'engage personne, ne doit pas être mise en œuvre. |
| `actée` | Validée. Fait autorité. |
| `remplacée par NNNN` | Une décision plus récente a pris le relais. La fiche reste, pour l'histoire. |
| `abandonnée` | Le sujet ne se pose plus. La fiche reste, pour la même raison. |

**On ne réécrit pas une fiche actée.** Si la décision change, on en écrit une nouvelle qui remplace
l'ancienne. L'historique doit rester lisible : ce qu'on savait au moment de trancher compte autant
que ce qu'on a tranché.

## Écrire une fiche

Copier `modele.md`, le renommer, le remplir. Le modèle est volontairement court : quatre sections,
dont aucune n'est facultative.

Une fiche utile se reconnaît à sa section **Options** : si elle n'en contient qu'une, ce n'était pas
une décision, c'était une constatation. Les options écartées valent autant que celle retenue — elles
évitent de rouvrir six mois plus tard un débat déjà tenu.

## Lien avec le reste du dépôt

- La **spécification** (`docs/`) dit ce que le produit doit faire. Elle ne contient aucun choix
  technique et ne doit pas en recevoir.
- Les **décisions** (ici) disent comment on s'y prend, et pourquoi.
- Le **journal** (`journal/`) dit ce qui s'est passé, session après session. Une décision prise en
  session est mentionnée dans l'entrée du jour **et** fait l'objet d'une fiche ici : le journal
  raconte, la fiche fait foi.
