# 0016 — Impression : agent d'impression dans les deux modes

**Statut** : proposée · **Date** : 2026-09-24 · **Remplace** : — · **Remplacée par** : —

## Contexte

Le produit imprime des étiquettes d'identification, des documents de flux, des documents de restitution
et des étiquettes transporteur (`RG-EXI-039`, `040`). Il faut dire par quel chemin un document part du
serveur et arrive à l'imprimante.

Ce qui contraint :

- **Impression automatique** déclenchée par un fait du flux, vers l'imprimante désignée pour le poste,
  le quai ou la zone (`RG-EXI-037`).
- **Échec détecté et signalé** ; l'objet non étiqueté est marqué comme tel (`RG-EXI-038`) ; une
  impression est réussie quand l'imprimante a accepté le travail sans erreur (`RG-EXI-077`).
- **Imprimantes courantes, joignables par le réseau** ; étiquettes transporteur au format fourni par le
  transporteur (`RG-EXI-078`).
- **Deux modes d'exploitation, une même version** ; tout ce qui dépend de l'environnement, imprimantes
  comprises, se déclare par paramétrage (`RG-EXI-059`, `063`).
- **Les écrans sont ouverts dans le navigateur** (fiche 0014, proposée) : un navigateur n'imprime pas en
  silence vers une imprimante désignée.
- **Le glossaire définit déjà l'agent d'impression** (`PrintAgent`) : programme installé sur un poste
  d'un site, qui reçoit les documents à imprimer et les remet aux imprimantes du site ; son état se lit
  dans l'espace technique.
- **L'impression est au lot 1** (fiche 0003) : étiquettes de support et documents de flux, avec
  l'imprimante en panne au scénario 1.

Le fait qui décide : en mode hébergé, le serveur est dans un centre de données et les imprimantes sur
le réseau de l'entrepôt, derrière son routeur. Le serveur ne peut pas ouvrir de connexion vers elles.

## Options

### Option A — Le serveur imprime directement sur les imprimantes du réseau

- **Ce que c'est** : le serveur envoie chaque travail à l'adresse réseau de l'imprimante.
- **En faveur** : aucun composant de plus.
- **En défaveur** : ne fonctionne que si le serveur est sur le réseau de l'entrepôt, donc en
  auto-hébergement sur place seulement ; deux chemins d'impression selon le mode, contre `RG-EXI-063`.
- **Ce que ça ferme** : l'impression en mode hébergé.

### Option B — Agent d'impression sur chaque site, dans les deux modes

- **Ce que c'est** : un programme installé sur un poste du site ouvre lui-même une connexion vers le
  serveur, reçoit les travaux et les remet aux imprimantes du site ; il rend au serveur l'acceptation ou
  le refus de chaque travail.
- **En faveur** : fonctionne dans les deux modes par le même chemin ; aucune ouverture de port sur le
  réseau de l'entrepôt, la connexion part du site ; l'échec remonte au serveur, qui le trace et marque
  l'objet non étiqueté.
- **En défaveur** : un programme à installer et à tenir à jour sur un poste de chaque site ; si ce poste
  est éteint, le site n'imprime plus.
- **Ce que ça ferme** : —

### Option C — Tunnel réseau entre le serveur hébergé et le site

- **Ce que c'est** : un réseau privé virtuel relie le serveur au réseau de l'entrepôt ; on revient
  ensuite à l'option A.
- **En faveur** : le serveur voit les imprimantes.
- **En défaveur** : configuration réseau chez chaque prestataire, hors de portée d'un petit budget sans
  informaticien (`RG-EXI-069`) ; ouvre au serveur tout le réseau du site, bien au-delà du besoin.
- **Ce que ça ferme** : l'exploitation sans compétence spécialisée.

### Option D — Impression depuis le navigateur

- **Ce que c'est** : le poste ouvre le document et l'utilisateur l'imprime.
- **En faveur** : aucun composant.
- **En défaveur** : pas d'impression automatique ni de destination désignée, contre `RG-EXI-037` ; échec
  non détectable, contre `RG-EXI-038`.
- **Ce que ça ferme** : l'impression automatique.

## Décision

*Proposée par Claude, à valider par Lucas.* **Toute impression passe par l'agent d'impression installé
sur un poste de chaque site, qui se connecte de lui-même au serveur, dans les deux modes
d'exploitation** (option B).

Critère décisif : un seul chemin d'impression pour les deux modes, sans rien ouvrir sur le réseau de
l'entrepôt, avec l'échec remonté au serveur.

## Conséquences

- **Ce qu'on peut faire** : imprimer depuis une instance hébergée ; lire l'état de chaque agent dans
  l'espace technique.
- **Ce qu'on ne peut plus faire** : imprimer sans agent, même en auto-hébergement sur place.
- **Ce qu'il faut mettre en place** :
  - dès le lot 1 : l'agent d'impression, écrit en TypeScript (fiche 0009), et son installation sur un
    poste Windows et Linux ;
  - la file des travaux d'impression côté serveur, avec relance, dans la base (fiche 0012, proposée) ;
  - la déclaration des destinations d'impression par paramétrage (`RG-EXI-063`) ;
  - la mise à jour de l'agent : automatique, depuis le serveur, pour qu'il suive la version de
    l'instance.
- **Ce qu'on accepte de payer** : un programme installé par site ; la dépendance de l'impression d'un
  site à un poste allumé.
- **Ce qui la remettrait en cause** : un prestataire qui ne peut installer aucun programme sur ses
  postes.

### Non prouvé

- L'empaquetage d'un programme TypeScript en exécutable installable sur Windows : possible, maturité à
  vérifier dans la fiche sur l'environnement d'exécution.
- Que l'acceptation d'un travail par l'imprimante soit toujours lisible selon le protocole employé
  (`RG-EXI-077`) : dépend des modèles d'imprimante, à éprouver au lot 1.
- Le poste qui héberge l'agent comme point unique de défaillance d'un site : sa gravité dépend des
  sites réels.
