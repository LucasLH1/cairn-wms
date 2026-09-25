# 0026 — Temps réel : WebSocket et signaux de changement

**Statut** : actée · **Date** : 2026-09-25 · **Remplace** : — · **Remplacée par** : —

## Contexte

- **Toute modification d'une unité de travail est visible sans rechargement** sur tous les écrans qui la
  consultent (`RG-EXI-001`) ; état de la main tenu à jour, y compris chez son détenteur (`RG-EXI-003`) ;
  file de décisions en continu (`RG-EXI-004`) ; disparition d'une condition signalée avant validation
  (`RG-EXI-005`) ; le tout en moins de deux secondes (`RG-EXI-073`).
- **Un utilisateur ne voit rien hors de son périmètre**, quel que soit le chemin (`RG-EXI-050`).
- **Deux rôles** écrivent dans la base (fiche 0017) : un changement fait par le rôle « traitements »
  doit atteindre les écrans servis par le rôle « gestes ».
- **L'agent d'impression** reçoit ses travaux du serveur et lui renvoie leur issue (fiche 0016).
- **PostgreSQL porte les notifications** (fiche 0012).

## Options

### Option A — WebSocket, signaux sans contenu, relayés depuis la base

- **Ce que c'est** : chaque écran ouvre une connexion WebSocket. Après validation d'une transaction, la
  base notifie un signal « tel objet a changé » ; le rôle « gestes » le relaie aux écrans abonnés, qui
  relisent l'objet par le contrat.
- **En faveur** : le signal ne porte aucune donnée, donc le cloisonnement reste celui des consultations ;
  un changement du rôle « traitements » arrive par la base ; le canal est bidirectionnel et sert aussi
  l'agent d'impression.
- **En défaveur** : une relecture après chaque signal.
- **Ce que ça ferme** : —

### Option B — Flux d'événements serveur (SSE)

- **Ce que c'est** : un flux descendant sur HTTP.
- **En faveur** : plus simple ; reconnexion automatique.
- **En défaveur** : descendant seulement, il faut un second canal pour l'agent d'impression ; limite de
  connexions par origine sans HTTP/2, gênante avec plusieurs onglets.
- **Ce que ça ferme** : —

### Option C — Interrogation périodique

- **Ce que c'est** : chaque écran redemande régulièrement l'état.
- **En faveur** : trivial.
- **En défaveur** : charge inutile ; deux secondes intenables sans interroger très souvent.
- **Ce que ça ferme** : la sobriété de `RG-EXI-069`.

## Décision

**Les écrans et l'agent d'impression tiennent une connexion WebSocket avec le rôle « gestes ». Tout
changement validé en base émet un signal sans contenu, relayé aux connexions abonnées ; l'écran relit ce
qui a changé par le contrat, avec ses droits** (option A). Règles :

1. **Le signal part après validation de la transaction**, jamais avant : un geste refusé ou annulé ne
   signale rien.
2. **Le signal ne porte qu'un type d'objet, un identifiant et un numéro de version.** Aucune donnée de
   gestion ne transite par le canal.
3. **À la reconnexion**, l'écran relit tout ce qu'il affiche : aucun changement n'est perdu pendant une
   coupure.
4. **La main** se prend, se demande et se cède par des gestes du contrat (fiche 0019) ; son état se
   diffuse par les mêmes signaux.

Critère décisif : un seul canal pour les écrans et l'agent, qui ne transporte aucune donnée et laisse le
cloisonnement aux consultations.

Proposée et actée par Claude le 2026-09-25, sur délégation explicite de Lucas : « Prends les décisions
qu'il faut, je veux passer au dev le plus rapidement possible. »

## Conséquences

- **Ce qu'on peut faire** : afficher en direct tout changement, d'où qu'il vienne.
- **Ce qu'on ne peut plus faire** : pousser des données de gestion par le canal temps réel.
- **Ce qu'il faut mettre en place** : le module temps réel du socle ; l'abonnement des écrans aux objets
  et aux listes affichés ; le relais des notifications de la base ; la configuration WebSocket du
  mandataire inverse dans le fichier de composition (fiche 0015).
- **Ce qu'on accepte de payer** : une relecture par signal.
- **Ce qui la remettrait en cause** : un volume de signaux qui dépasse ce que les notifications de la
  base acheminent, mesuré.

### Non prouvé

- Le débit des notifications de PostgreSQL au volume d'un petit prestataire : suffisant selon toute
  vraisemblance, à mesurer au lot 1.
