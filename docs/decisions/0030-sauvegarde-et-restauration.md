# 0030 — Sauvegarde et restauration

**Statut** : actée · **Date** : 2026-09-25 · **Remplace** : — · **Remplacée par** : —

## Contexte

La fiche 0012 fait de PostgreSQL le seul composant de données : sauvegarder l'instance, c'est
sauvegarder cette base. Ce qu'il faut tenir :

- **Remise en état depuis les sauvegardes, journal d'événements compris** (`RG-EXI-058`), le journal
  étant conservé sans limite (`RG-EXI-015`).
- **Auto-hébergement** : le prestataire sauvegarde et restaure seul (`RG-EXI-061`) ; la sauvegarde
  quotidienne est le minimum documenté ; une restauration tient en moins de deux heures sur le serveur
  de référence (`RG-EXI-075`).
- **Hébergement par l'éditeur** : une panne fait perdre au plus quelques minutes de données, reprise en
  moins de deux heures (`RG-EXI-074`) ; sauvegardes conduites en série (`RG-EXI-062`, `065`).
- **Un échec de sauvegarde se signale de lui-même** (`RG-EXI-068`).
- **Une même version pour les deux modes** ; le lieu de sauvegarde se déclare par paramétrage
  (`RG-EXI-063`).
- **Stockage de quarante gigaoctets sur le serveur de référence** (`RG-EXI-072`) : une sauvegarde sur le
  disque de l'instance ne survit pas à une panne de ce disque et n'y tient pas longtemps.

## Options

### Option A — Copie logique quotidienne (`pg_dump`)

- **Ce que c'est** : un export complet de la base chaque jour.
- **En faveur** : simple ; portable d'une version de PostgreSQL à l'autre.
- **En défaveur** : jusqu'à vingt-quatre heures de données perdues, contre `RG-EXI-074` ; restauration
  de plus en plus longue avec le volume, tous les index étant reconstruits.
- **Ce que ça ferme** : l'hébergement par l'éditeur.

### Option B — Copie physique et archivage continu du journal de transactions (pgBackRest)

- **Ce que c'est** : copies physiques de la base, complètes et différentielles, et archivage continu
  du journal de transactions de PostgreSQL vers un dépôt de sauvegarde ; restauration à un instant
  choisi.
- **En faveur** : perte de l'ordre de la minute ; restauration par recopie des fichiers et rejeu du
  journal, bien plus rapide qu'un import ; dépôts sur disque, stockage objet compatible S3 ou SFTP ;
  chiffrement, rétention et vérification intégrés ; outil mûr.
- **En défaveur** : un composant de plus dans la composition ; configuration plus riche.
- **Ce que ça ferme** : —

### Option C — Réplique en attente permanente

- **Ce que c'est** : une seconde base maintenue à jour en continu.
- **En faveur** : bascule quasi immédiate.
- **En défaveur** : double les ressources ; ne protège pas d'une erreur répliquée ; au-delà du besoin.
- **Ce que ça ferme** : la sobriété de `RG-EXI-069`.

### Option D — Instantanés de disque chez l'hébergeur

- **Ce que c'est** : la sauvegarde de la machine entière par le fournisseur.
- **En faveur** : aucun travail.
- **En défaveur** : pas un mécanisme du produit ; dépend de chaque hébergeur ; granularité d'un jour ;
  restauration de toute la machine.
- **Ce que ça ferme** : l'auto-hébergement sur une infrastructure quelconque.

## Décision

**L'instance se sauvegarde par pgBackRest, dans les deux modes, vers un dépôt déclaré par paramétrage**
(option B). Règles :

1. **Rythme par défaut** : une copie complète par semaine, une copie différentielle par jour, et
   l'archivage continu du journal de transactions, forcé au moins chaque minute. Le prestataire peut
   aller plus loin (`RG-EXI-075`).
2. **Dépôt déclaré par paramétrage** : chemin sur un disque distinct, stockage objet compatible S3 ou
   SFTP ; dépôt chiffré ; rétention paramétrable, deux copies complètes par défaut.
3. **Une instance sans dépôt extérieur se déclare dégradée** : elle fonctionne, sauvegarde sur son propre
   disque, et le signale dans son état de santé jusqu'à ce qu'un dépôt extérieur soit déclaré.
4. **Une sauvegarde jamais restaurée ne prouve rien.** L'intégration continue sauvegarde puis restaure
   une instance à chaque modification et vérifie que le journal restauré est complet. En hébergement par
   l'éditeur, une restauration d'essai a lieu régulièrement, et son échec alerte.
5. **Tout échec est signalé de lui-même** (`RG-EXI-068`) : au lot 1, il est journalisé et exposé par un
   indicateur technique dénombré de l'instance, sans donnée métier (`RG-EXI-066`) ; l'espace technique
   le reprend au lot 5.
6. **Restauration** : au lot 1, par une commande documentée ; au lot 5, depuis l'espace technique, sans
   ligne de commande (`RG-EXI-064`).
7. **Staging** : dépôt sur un volume dédié du serveur, ce qui suffit pour des données fictives et
   éprouve le mécanisme ; la sauvegarde automatique d'OVH couvre en plus le serveur entier. La production
   exigera un dépôt extérieur.
8. **Périmètre : la base seule.** Au lot 1, aucun fichier n'est à conserver : les documents se
   régénèrent à l'identique depuis les données. Les fichiers importés, pièces jointes et envois conservés
   tels qu'émis (lots 3 et 5) feront l'objet d'une fiche de stockage des fichiers, qui dira comment ils se
   sauvegardent.

Critère décisif : le seul mécanisme qui tient à la fois la perte de quelques minutes de l'hébergement par
l'éditeur et la restauration en moins de deux heures, identique dans les deux modes.

Proposée et actée par Claude le 2026-09-25, sur délégation explicite de Lucas : « Prends les décisions
qu'il faut, je veux passer au dev le plus rapidement possible. »

## Conséquences

- **Ce qu'on peut faire** : restaurer une instance à un instant choisi ; mesurer tôt le temps de
  restauration.
- **Ce qu'on ne peut plus faire** : livrer une instance sans sauvegarde configurée ; considérer une
  sauvegarde comme valable sans restauration éprouvée.
- **Ce qu'il faut mettre en place** : le conteneur de sauvegarde dans le fichier de composition
  (fiche 0015) ; l'archivage du journal de transactions dans la configuration de PostgreSQL ; l'épreuve
  sauvegarde-restauration dans la chaîne (fiche 0024) ; l'indicateur d'état ; la documentation de
  restauration.
- **Ce qu'on accepte de payer** : un composant de plus ; un dépôt extérieur à fournir en production.
- **Ce qui la remettrait en cause** : une restauration qui dépasse deux heures sur le serveur de
  référence à la volumétrie d'un petit prestataire, mesurée.

### Non prouvé

- La restauration en moins de deux heures : dépend de la volumétrie réelle, non établie (0.9, points
  ouverts) ; à mesurer à la clôture du lot 1 puis à volume croissant.
- Une perte de l'ordre de la minute : dépend du réglage d'archivage et de la joignabilité du dépôt au
  moment de la panne.
