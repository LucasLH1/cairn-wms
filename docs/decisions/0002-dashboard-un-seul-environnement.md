# 0002 — Dashboard : un seul environnement, production

**Statut** : actée · **Date** : 2026-09-15 · **Remplace** : — · **Remplacée par** : —

## Contexte

Le dashboard de pilotage est servi à l'adresse **monitoring.cairn-wms.fr**. C'est l'application
depuis laquelle Cairn WMS sera lui-même déployé.

Le modèle de déploiement retenu ([`docs/deploiement.md`](../deploiement.md) §3) fait de
l'environnement un paramètre : `deploiement.yml` reçoit un environnement et un SHA, s'appuie sur
les environnements GitHub, et **exige une validation manuelle sur `production` lorsque le projet a
plusieurs environnements**. Il faut donc décider combien d'environnements le dashboard possède —
la réponse commande le chemin de mise en service et le nombre de contrôles humains avant la
production.

Deux éléments cadrent le choix. D'une part la promotion se fait par SHA et non par branche
(§3) : il n'y a pas de branche `staging`, et `main` reflète ce qui est en production. D'autre part
Cairn WMS aura, lui, deux environnements — `staging` et `production` — déployés depuis ce même
dashboard (§5) : le dashboard doit donc savoir en piloter deux sans nécessairement en avoir deux.

## Options

### Option A — Un seul environnement : production

- **Ce que c'est** : le dashboard n'a qu'une cible. La fusion de la pull request `dev` → `main`
  déclenche `deploiement.yml`, sans validation manuelle supplémentaire.
- **En faveur** : un seul chemin, donc un seul endroit où quelque chose peut diverger ; la pull
  request tient lieu de contrôle humain, et `main` étant protégée, aucune mise en production ne
  peut avoir lieu sans elle.
- **En défaveur** : aucun palier entre l'intégration et la production — ce qui casse, casse
  devant l'utilisateur.
- **Ce que ça ferme** : la possibilité d'éprouver une version du dashboard en conditions réelles
  avant qu'elle ne serve.

### Option B — Deux environnements : staging et production

- **Ce que c'est** : le modèle prévu pour Cairn WMS lui-même. Un déploiement en `staging`, puis
  une promotion du même SHA vers `production` avec la validation manuelle qu'impose §3.
- **En faveur** : un palier de vérification avant la production ; le dashboard s'appliquerait à
  lui-même le modèle qu'il sert à piloter.
- **En défaveur** : un second environnement à créer et à tenir — application Coolify,
  sous-domaine, certificat, secrets, volume — et une validation manuelle de plus sur un outil
  interne.
- **Ce que ça ferme** : rien, mais alourdit chaque mise en service.

## Décision

**Le dashboard n'a qu'un seul environnement : production.** La fusion de la pull request
`dev` → `main` déclenche le déploiement, sans validation manuelle supplémentaire : la pull request
en tient lieu.

Le critère décisif est la proportion. Le dashboard est un outil interne à un seul serveur ; lui
imposer un palier de pré-production reviendrait à doubler l'infrastructure et les contrôles
humains d'un outil dont la panne n'interrompt aucun flux logistique. Le contrôle humain existe
déjà — il est dans la pull request vers une branche protégée.

Cette décision ne vaut que pour le dashboard. Cairn WMS garde `staging` et `production`.

## Conséquences

- **Ce qu'on peut faire** : mettre le dashboard en service par simple fusion, sans étape
  supplémentaire.
- **Ce qu'on ne peut plus faire** : éprouver une version du dashboard ailleurs qu'en production.
  Toute régression est vue par l'utilisateur, jamais avant lui.
- **Ce qu'il faut mettre en place** :
  - le déploiement doit utiliser le **SHA de tête de la pull request** (`pull_request.head.sha`,
    dernier commit de `dev`) et non le SHA du commit de fusion. **C'est le piège central de ce
    modèle** : la fusion fabrique sur `main` un commit qui n'a jamais été construit, donc sans
    image publiée ; le déployer échouerait, et le reconstruire violerait le principe « construire
    une fois, promouvoir sans reconstruire » (`docs/deploiement.md` §2) ;
  - `/health` doit répondre **503** si la base SQLite est inaccessible ou si le jeton GitHub est
    refusé — la sonde doit savoir dire non, faute de quoi elle ne prouve rien ;
  - la base SQLite doit vivre sur un **volume persistant** Coolify
    ([`0001`](0001-hebergement-sur-coolify.md)), sans quoi elle disparaît à chaque déploiement.
- **Ce qu'on accepte de payer** : l'absence de palier avant la production pour cet outil, et le
  fait qu'une seule erreur de configuration du SHA déployé suffit à mettre en ligne autre chose que
  ce qui a été éprouvé.
- **Ce qui la remettrait en cause** : le jour où une panne du dashboard empêcherait de déployer
  Cairn WMS en urgence, ou le jour où d'autres personnes que son auteur en dépendraient pour
  travailler.
