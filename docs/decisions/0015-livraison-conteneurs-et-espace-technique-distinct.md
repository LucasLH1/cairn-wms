# 0015 — Livraison : conteneurs, et espace technique en processus distinct

**Statut** : proposée · **Date** : 2026-09-24 · **Remplace** : — · **Remplacée par** : —

## Contexte

Il faut dire sous quelle forme une instance se livre, s'installe, se met à jour et se restaure, et où
vit l'espace technique.

Ce qui contraint :

- **Deux modes d'exploitation** : hébergé par l'éditeur, ou auto-hébergé par le prestataire
  (`RG-EXI-059`), avec une même version pour les deux (`RG-EXI-063`).
- **Auto-hébergement** : installation et mise à jour par le prestataire seul, la mise à jour appliquant
  d'elle-même ce qu'elle suppose sur les données (`RG-EXI-060`) ; sauvegarde et restauration seules
  (`RG-EXI-061`), restauration en moins de deux heures (`RG-EXI-075`).
- **Hébergement par l'éditeur** : instances créées, mises à jour et sauvegardées en série
  (`RG-EXI-062`, `065`) ; reprise en moins de deux heures, quelques minutes de données perdues au plus
  (`RG-EXI-074`).
- **Espace technique** : installation, mise à jour, sauvegarde, restauration et état de santé sans
  ligne de commande (`RG-EXI-064`) ; aucune donnée métier (`RG-EXI-066`) ; fonctionne quand
  l'application métier est arrêtée ou défaillante (`RG-EXI-067`) ; signale de lui-même une dégradation
  (`RG-EXI-068`).
- **Sobriété** : un serveur d'entrée de gamme, aucune compétence spécialisée (`RG-EXI-069`, `072`).
- **L'espace technique est placé au lot 5** (fiche 0003) ; d'ici là, un déploiement reproductible
  suffit. Le format de livraison, lui, se fixe dès le lot 1.

## Options

### Livraison

#### Option A — Conteneurs et fichier de composition

- **Ce que c'est** : l'application, la base et l'espace technique sont livrés en images de conteneurs,
  assemblées par un fichier de composition ; une mise à jour remplace les images.
- **En faveur** : une même livraison sur tout serveur Linux doté d'un moteur de conteneurs ; mise à jour
  et retour arrière par changement d'image ; identique dans les deux modes ; se prête à l'exploitation
  en série.
- **En défaveur** : un moteur de conteneurs à installer une fois sur le serveur.
- **Ce que ça ferme** : l'installation sur un serveur sans moteur de conteneurs.

#### Option B — Paquets du système (deb, rpm) et services système

- **Ce que c'est** : un paquet par distribution, installé et mis à jour par le gestionnaire du système.
- **En faveur** : intégration native.
- **En défaveur** : un paquet par distribution et par version ; mise à jour de la base et retour arrière
  délicats ; exploitation en série plus lourde.
- **Ce que ça ferme** : une livraison unique pour tous les serveurs.

#### Option C — Orchestrateur (Kubernetes)

- **Ce que c'est** : déploiement sur un orchestrateur de conteneurs.
- **En faveur** : exploitation en série puissante.
- **En défaveur** : hors de portée d'un prestataire sans informaticien et d'un serveur de quatre
  gigaoctets.
- **Ce que ça ferme** : l'auto-hébergement sobre.

### Espace technique

#### Option D — Processus distinct qui pilote l'instance

- **Ce que c'est** : l'espace technique est une application à part, lancée à côté de l'application
  métier ; il pilote le moteur de conteneurs pour mettre à jour, sauvegarder, restaurer et surveiller.
- **En faveur** : reste accessible quand l'application métier est arrêtée (`RG-EXI-067`) ; séparé des
  données métier par construction (`RG-EXI-066`).
- **En défaveur** : piloter le moteur de conteneurs demande un accès privilégié au serveur, qui
  équivaut à tout pouvoir sur lui.
- **Ce que ça ferme** : —

#### Option E — Espace technique intégré à l'application métier

- **Ce que c'est** : des écrans techniques dans l'application elle-même.
- **En faveur** : un seul processus.
- **En défaveur** : tombe avec l'application, contre `RG-EXI-067`.
- **Ce que ça ferme** : la restauration d'une instance défaillante sans ligne de commande.

## Décision

*Proposée par Claude, à valider par Lucas.* **Une instance de Cairn WMS se livre en images de conteneurs
assemblées par un fichier de composition, identiques dans les deux modes ; l'espace technique est un
processus distinct, livré de la même façon, qui pilote l'instance** (options A et D).

Critère décisif : une même livraison sert les deux modes, se met à jour et se restaure en changeant
d'image, et l'espace technique survit à la défaillance de l'application.

## Conséquences

- **Ce qu'on peut faire** : installer une instance sur tout serveur Linux doté d'un moteur de
  conteneurs ; revenir à la version précédente ; exploiter les instances hébergées en série.
- **Ce qu'on ne peut plus faire** : livrer une instance sous une autre forme sans nouvelle fiche.
- **Ce qu'il faut mettre en place** :
  - dès le lot 1 : images et fichier de composition reproductibles, migrations de données appliquées
    d'elles-mêmes à la mise à jour (`RG-EXI-057`, `060`) ;
  - au lot 5 : l'espace technique, et une fiche sur sa sécurité — isolement de l'accès privilégié,
    authentification propre, exposition réseau ;
  - une fiche sur la sauvegarde et la restauration (fréquence, perte maximale de `RG-EXI-074`,
    restauration en moins de deux heures) ;
  - une fiche sur l'exploitation en série par l'éditeur (`RG-EXI-062`, `065`).
- **Ce qu'on accepte de payer** : un moteur de conteneurs sur le serveur du prestataire ; un accès
  privilégié à protéger pour l'espace technique.
- **Ce qui la remettrait en cause** : un prestataire cible qui ne peut pas installer de moteur de
  conteneurs ; un accès privilégié impossible à protéger correctement.

### Non prouvé

- La tenue de l'ensemble — base, application, espace technique — dans quatre gigaoctets : le lot 1 le
  mesure (`RG-EXI-072`).
- La restauration en moins de deux heures sur le serveur de référence : dépend de la volumétrie, à
  mesurer.
