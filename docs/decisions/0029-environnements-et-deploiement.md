# 0029 — Environnements et déploiement : le staging

**Statut** : actée · **Date** : 2026-09-25 · **Remplace** : — · **Remplacée par** : —

## Contexte

Le lot 1 se clôt sur deux conditions (`lots/lot-1/README.md`) : des tests de bout en bout verts, et des
moments constatés à l'écran « lors d'une démonstration sur une instance installée », dont le
fonctionnement sur le serveur de référence (`RG-EXI-072`, `073`). Tant que l'éditeur installe lui-même
ses instances, un déploiement reproductible suffit ; l'espace technique vient au lot 5 (fiche 0003).
La fiche 0015 fixe la livraison en images et fichier de composition.

Ce qui existe déjà :

- **Le serveur de Lucas** : VPS OVH, modèle VPS-1 2026, Gravelines ; 4 processeurs virtuels, 8 Go de
  mémoire, 75 Go de stockage ; Ubuntu 24.04 ; sauvegarde automatique quotidienne d'OVH active. Il
  héberge Coolify (`coolify.cairn-wms.fr`) et `cairn-dashboard` (`monitoring.cairn-wms.fr`).
- **Une logique de déploiement éprouvée** dans `cairn-dashboard` (`docs/deploiement.md`, fiches 0002
  et 0003 de ce dépôt) : une image par commit, construite une fois sur `dev` et éprouvée avant
  publication ; promotion d'un commit, jamais d'une branche ; contrat `/version`, `/health`, `/live` ;
  un workflow `deploiement.yml` à deux paramètres, l'environnement et le commit. Elle prévoit pour
  Cairn deux environnements, `staging` et `production`, déployés depuis le dashboard.
- **L'adresse `staging.cairn-wms.fr`**, dont l'enregistrement DNS a été conservé.

## Options

### Option A — Staging sur Coolify, alimenté par le fichier de composition du produit

- **Ce que c'est** : un environnement `staging` sur le serveur de Lucas ; Coolify déploie le fichier de
  composition du dépôt, sans rien y ajouter qui lui soit propre ; la logique de déploiement du
  dashboard est reprise.
- **En faveur** : domaine, certificat et proxy déjà fournis ; même livraison que chez un client
  (`RG-EXI-063`) ; déploiement pilotable plus tard depuis le dashboard ; aucune dépense.
- **En défaveur** : Coolify n'est pas ce qu'utilisera un client qui héberge lui-même son instance ; le
  serveur est partagé et plus puissant que le serveur de référence.
- **Ce que ça ferme** : —

### Option B — Déploiement direct par SSH et `docker compose`

- **Ce que c'est** : l'intégration continue se connecte au serveur et lance la composition.
- **En faveur** : chemin exact d'un client auto-hébergé.
- **En défaveur** : proxy et certificats à gérer à côté de Coolify, qui occupe déjà les ports ; une
  seconde logique de déploiement sur le même serveur.
- **Ce que ça ferme** : —

### Option C — Un environnement « démo » distinct du staging

- **Ce que c'est** : une instance réservée aux démonstrations.
- **En faveur** : démonstrations isolées des essais.
- **En défaveur** : un troisième nom et une troisième instance pour le même usage ; au lot 1, le
  staging n'a que des données fictives.
- **Ce que ça ferme** : —

## Décision

**Cairn WMS a un environnement `staging`, sur `staging.cairn-wms.fr`, déployé par Coolify à partir du
fichier de composition du produit, selon la logique de déploiement de `cairn-dashboard`. La production
n'existera qu'avec un premier entrepôt réel** (option A). Règles :

1. **Une image par commit**, construite sur `dev`, éprouvée avant publication (démarrage, `/version`
   rend ce commit, `/health` à 200, puis à 503 une dépendance coupée), publiée sur le registre de
   GitHub. Aucune étiquette mouvante.
2. **Contrat de routes** : `/version` rend le commit servi ; `/health` dit si l'instance est utilisable,
   base et migrations comprises ; `/live` dit seulement si le processus répond, et sert au contrôle de
   santé du conteneur.
3. **`deploiement.yml`** prend l'environnement et le commit, vérifie que l'image existe, met à jour
   Coolify, déclenche le déploiement, puis attend `/version` et `/health` avant de déclarer le succès.
   Le staging se déploie de lui-même quand la chaîne de `dev` est verte ; plus tard, depuis le
   dashboard.
4. **Aucune configuration propre à Coolify dans le produit** : tout ce que l'environnement fournit passe
   par des variables d'environnement documentées (`RG-EXI-063`).
5. **Les écrans sont servis par le serveur** : l'image du serveur embarque les écrans construits ; la
   même image tient les deux rôles de la fiche 0017. Le fichier de composition prévoit un proxy avec
   certificat automatique, activable pour l'auto-hébergement et inutile derrière Coolify.
6. **Données du staging fictives uniquement.** Une remise à zéro recharge le jeu de données des
   scénarios, par le même chargeur que les tests de bout en bout ; elle n'est possible que sur une
   instance déclarée staging par sa configuration, et elle est tracée.
7. **Mesure du serveur de référence en deux temps** :
   - *en continu*, les conteneurs de Cairn en staging sont limités ensemble à deux processeurs et quatre
     gigaoctets : tout dépassement de mémoire se voit tôt ;
   - *à la clôture du lot 1*, la mesure qui fait foi a lieu sur une machine vierge de deux processeurs,
     quatre gigaoctets et quarante gigaoctets, installée par le seul fichier de composition, comme chez
     un client. Elle éprouve du même coup le chemin de l'auto-hébergement.

Critère décisif : reprendre une logique de déploiement déjà éprouvée, sur un serveur déjà en place, sans
que le produit dépende de l'outil qui le déploie.

Nom et principe du staging retenus par Lucas le 2026-09-25 (« ne vaut-il pas mieux staging ? ») ; le
reste proposé et acté par Claude le même jour, sur délégation explicite de Lucas : « Prends les
décisions qu'il faut, je veux passer au dev le plus rapidement possible. »

## Conséquences

- **Ce qu'on peut faire** : constater à l'écran les moments du lot 1 sur une instance installée ;
  redéployer ou revenir à tout commit déjà construit.
- **Ce qu'on ne peut plus faire** : reconstruire une image pour la déployer ; mettre une donnée réelle
  en staging.
- **Ce qu'il faut mettre en place** : les workflows `qualite.yml`, `image.yml` et `deploiement.yml` sur
  le modèle du dashboard ; l'environnement GitHub `staging` et ses secrets (`COOLIFY_URL`,
  `COOLIFY_TOKEN`, `COOLIFY_APP_UUID`, `APP_URL`) ; la ressource Coolify ; les limites de ressources
  des conteneurs ; le chargeur du jeu de données et la remise à zéro.
- **Ce qu'on accepte de payer** : un staging sur un serveur partagé ; la location ponctuelle d'une
  machine de mesure à la clôture du lot 1, à décider par Lucas à ce moment.
- **Ce qui la remettrait en cause** : un staging qui ne tient pas à côté de Coolify et du dashboard ; un
  premier entrepôt réel, qui ouvre la production.

### Non prouvé

- Que Coolify applique les limites de ressources écrites dans le fichier de composition : à vérifier au
  premier déploiement.
- Que la limite à deux processeurs et quatre gigaoctets sur un serveur partagé donne une indication
  fidèle : elle borne la mémoire, pas la contention du disque ni du processeur ; seule la mesure sur
  machine vierge fait foi.
