# 0001 — Hébergement sur Coolify

**Statut** : actée · **Date** : 2026-09-15 · **Remplace** : — · **Remplacée par** : —

## Contexte

Plusieurs applications doivent tourner sur un seul serveur privé virtuel : Cairn WMS lui-même, et
le dashboard de pilotage décrit en [`docs/deploiement.md`](../deploiement.md) §5. Il faut décider
ce qui, sur ce serveur, reçoit les images construites en intégration et les met en service.

Coolify y est déjà installé, et l'ancien modèle de déploiement — celui des workflows Laravel dont
`docs/deploiement.md` extrait la logique — le pilotait déjà par son API. La question n'est donc pas
« qu'installe-t-on » mais « conserve-t-on ce qui est en place ».

Ce que l'hébergement doit couvrir, pour plusieurs applications sur un seul serveur :

- un sous-domaine et un certificat TLS par application ;
- des variables d'environnement et des volumes persistants gérés par application ;
- une API pour mettre à jour l'étiquette d'image et déclencher un déploiement, puisque le modèle
  retenu promeut un SHA déjà construit sans jamais reconstruire (`docs/deploiement.md` §2) ;
- une interface pour consulter l'état et les journaux.

## Options

### Option A — Coolify, conservé

- **Ce que c'est** : plateforme d'hébergement auto-installée sur le VPS, déjà en service, avec
  interface et API.
- **En faveur** : couvre les quatre besoins sans travail supplémentaire ; l'API de mise à jour
  d'image et de déploiement est déjà éprouvée par l'ancien modèle ; aucune migration à conduire.
- **En défaveur** : toute mise en service passe par un produit tiers qui s'interpose entre le
  dépôt et le serveur ; il faut détenir et faire vivre un jeton d'API par environnement.
- **Ce que ça ferme** : rien d'irréversible — une image construite par SHA reste déployable
  autrement.

### Option B — Dokploy

- **Ce que c'est** : équivalent très proche de Coolify.
- **En faveur** : couvre le même périmètre.
- **En défaveur** : n'apporte rien de décisif, et impose une migration de ce qui tourne déjà.
- **Ce que ça ferme** : rien.

### Option C — Kamal

- **Ce que c'est** : outil de déploiement par conteneurs, piloté en ligne de commande.
- **En faveur** : plus proche du dépôt, moins de produit intercalé.
- **En défaveur** : sans interface — l'état et les journaux ne se consultent plus au même endroit.
- **Ce que ça ferme** : la consultation de l'état par une interface, à reconstruire ailleurs.

### Option D — Docker Compose et un reverse proxy, à la main

- **Ce que c'est** : sous-domaines, certificats, variables et volumes gérés directement.
- **En faveur** : aucune dépendance à un produit tiers.
- **En défaveur** : tout est à faire et à maintenir — certificats, routage, volumes, journaux.
- **Ce que ça ferme** : rien, au prix d'un travail d'exploitation permanent.

## Décision

**Coolify est conservé comme plateforme d'hébergement**, sur le VPS où il est déjà installé.

Le critère décisif n'est pas la supériorité fonctionnelle : c'est qu'aucune alternative n'apporte
d'avantage décisif face à une solution déjà en place, déjà pilotée par API, et qui couvre les
quatre besoins. Changer coûterait une migration pour un gain nul.

## Conséquences

- **Ce qu'on peut faire** : donner à chaque application son sous-domaine et son certificat ;
  déployer en désignant par API une image déjà construite et éprouvée ; conserver des données sur
  un volume persistant — ce dont le dashboard se sert pour sa base
  ([`0002`](0002-dashboard-un-seul-environnement.md)).
- **Ce qu'on ne peut plus faire** : introduire un autre mécanisme de mise en service sans une
  nouvelle fiche qui remplace celle-ci.
- **Ce que cette fiche ne décide pas** : rien de la pile applicative de Cairn WMS. Langage,
  framework, moteur de persistance, architecture restent entièrement ouverts, et la règle 2 de
  [`CLAUDE.md`](../../CLAUDE.md) leur reste opposable. Cette fiche ne tranche que l'endroit où une
  image est mise en service.
- **Ce qu'il faut mettre en place** : les secrets par environnement GitHub listés en
  `docs/deploiement.md` §3 — `COOLIFY_URL`, `COOLIFY_TOKEN`, `COOLIFY_APP_UUID`, `APP_URL` — et le
  workflow `deploiement.yml` qui les consomme.
- **Ce qu'on accepte de payer** : la dépendance à un produit tiers sur le chemin de toute mise en
  service, et un jeton d'API dont l'échéance doit être suivie.
- **Ce qui la remettrait en cause** : le besoin de dépasser un seul serveur ; la disparition ou la
  fermeture de l'API de déploiement ; une exigence d'exploitation que l'interface ne sait pas
  rendre.
