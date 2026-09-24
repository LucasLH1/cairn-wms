# 0014 — Poste : application web dans le navigateur

**Statut** : proposée · **Date** : 2026-09-24 · **Remplace** : — · **Remplacée par** : —

## Contexte

Les fiches 0009 et 0010 fixent TypeScript et React. Elles ne disent pas sous quelle forme les écrans
arrivent sur le poste : page ouverte dans un navigateur, ou application installée qui embarque un
navigateur.

Ce qui contraint :

- **Un poste d'ordinateur**, fixe ou embarqué sur chariot (`RG-EXI-053`).
- **La session suit la personne** : un utilisateur retrouve son travail sur n'importe quel poste, et
  peut être connecté sur plusieurs à la fois (`RG-EXI-055`).
- **Le lecteur de code-barres se branche comme un clavier, sans pilote** (`RG-EXI-078`).
- **L'impression automatique part vers l'imprimante du poste ou de la zone**, sans action de
  l'utilisateur (`RG-EXI-037`) ; les imprimantes sont joignables par le réseau (`RG-EXI-078`).
- **Mise à jour par le prestataire seul, sans ligne de commande** (`RG-EXI-060`, `064`).
- **Aucun fonctionnement hors ligne exigé** (0.9, section 5).

## Options

### Option A — Application web ouverte dans le navigateur

- **Ce que c'est** : le poste ouvre une adresse ; rien n'est installé pour les écrans.
- **En faveur** : aucune installation ni mise à jour sur les postes ; mise à jour de l'instance = mise à
  jour de tous les écrans ; tout poste avec un navigateur récent convient ; la session suivant la
  personne va de soi.
- **En défaveur** : un navigateur ne peut pas imprimer en silence vers une imprimante désignée ;
  l'impression passe donc par un autre chemin (fiche 0016).
- **Ce que ça ferme** : l'accès direct du poste à du matériel local autre que clavier et lecteur.

### Option B — Application installée embarquant un navigateur (Electron, Tauri)

- **Ce que c'est** : les mêmes écrans, empaquetés dans un programme installé sur chaque poste.
- **En faveur** : impression directe depuis le poste ; accès au matériel local ; contrôle de la fenêtre.
- **En défaveur** : une installation et une mise à jour par poste, par système d'exploitation, à rebours
  de `RG-EXI-060` ; un parc de postes à tenir à la même version que le serveur.
- **Ce que ça ferme** : la mise à jour de l'instance en un seul geste.

## Décision

*Proposée par Claude, à valider par Lucas.* **Les écrans de Cairn WMS sont une application web ouverte
dans le navigateur du poste ; rien n'est installé sur le poste pour les écrans** (option A).

Critère décisif : mettre à jour une instance met à jour tous ses écrans, sans intervention sur les
postes.

## Conséquences

- **Ce qu'on peut faire** : utiliser n'importe quel poste doté d'un navigateur récent.
- **Ce qu'on ne peut plus faire** : compter sur le poste pour imprimer ou pour piloter un matériel
  local.
- **Ce qu'il faut mettre en place** : l'impression par l'agent d'impression (fiche 0016) ; la liste des
  navigateurs pris en charge, avec le cadre des écrans.
- **Ce qu'on accepte de payer** : un composant d'impression séparé des écrans.
- **Ce qui la remettrait en cause** : un matériel exigé par la spécification qui ne se branche ni comme
  un clavier ni par le réseau.
