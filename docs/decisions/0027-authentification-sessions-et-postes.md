# 0027 — Authentification, sessions et postes

**Statut** : actée · **Date** : 2026-09-25 · **Remplace** : — · **Remplacée par** : —

## Contexte

Le lot 1 a des utilisateurs nommés, des rôles et des postes (scénarios du lot 1). Il faut dire comment
un utilisateur s'identifie, comment sa session vit, et comment le serveur sait de quel poste vient un
geste.

Ce qui contraint :

- **La session suit la personne** : elle retrouve son travail sur tout poste, et peut être connectée sur
  plusieurs à la fois (`RG-EXI-055`).
- **Chaque événement d'opérateur porte son poste d'émission** (`RG-EXI-013`) ; le poste est aussi une
  destination d'impression (glossaire, `Workstation`, `PrintTarget`).
- **Droits contrôlés à chaque geste** (`RG-EXI-012`) ; cloisonnement des systèmes (`RG-EXI-051`).
- **Auto-hébergement sans dépendre d'un service extérieur** (`RG-EXI-063`) ; peu de dépendances
  (fiche 0017).

## Options

### Option A — Comptes et sessions tenus par l'instance

- **Ce que c'est** : identifiant et mot de passe propres à l'instance ; sessions enregistrées en base,
  désignées par un jeton opaque dans un cookie protégé.
- **En faveur** : aucun service extérieur ; une session se révoque en base ; plusieurs sessions par
  utilisateur vont de soi ; le hachage des mots de passe se fait avec la bibliothèque standard de Node,
  sans dépendance.
- **En défaveur** : pas d'authentification unique d'entreprise au lot 1.
- **Ce que ça ferme** : rien ; une authentification unique peut s'ajouter plus tard.

### Option B — Fournisseur d'identité externe (Keycloak, service en ligne)

- **Ce que c'est** : l'identification est déléguée à un service tiers.
- **En faveur** : authentification unique, double facteur fournis.
- **En défaveur** : un composant de plus à héberger, ou une dépendance à un service extérieur, contre
  `RG-EXI-063` et `069`.
- **Ce que ça ferme** : l'instance autonome.

### Option C — Jetons signés sans état côté serveur

- **Ce que c'est** : la session est un jeton signé que le serveur ne mémorise pas.
- **En faveur** : aucune lecture en base par requête.
- **En défaveur** : une session ne se révoque pas avant son expiration ; retirer un droit ne prend pas
  effet aussitôt.
- **Ce que ça ferme** : la révocation immédiate.

## Décision

**Les utilisateurs s'identifient par un compte de l'instance ; les sessions sont enregistrées en base et
désignées par un jeton opaque dans un cookie protégé ; chaque navigateur de poste est déclaré une fois
et porte l'identifiant de son poste** (option A). Règles :

1. **Mots de passe** hachés par `scrypt`, de la bibliothèque standard de Node, avec des paramètres
   conformes aux recommandations de l'OWASP ; tentatives de connexion limitées.
2. **Cookie de session** inaccessible au code de la page, réservé à HTTPS, restreint au site ; les gestes
   exigent en plus un en-tête propre à l'application, contre les requêtes forgées.
3. **Plusieurs sessions** par utilisateur, chacune révocable ; expiration après inactivité, paramétrable.
4. **Déclaration d'un poste** : un administrateur déclare le poste dans l'instance et l'associe au
   navigateur par un geste unique, qui pose un cookie de poste durable, distinct de la session. Tout
   geste porte ce poste.
5. **Systèmes et agents** : l'agent d'impression et, au lot 5, les systèmes des donneurs d'ordre
   s'identifient par une clé propre, émise par l'instance, révocable, jamais par un compte d'utilisateur.

Critère décisif : une instance qui identifie seule ses utilisateurs, ses postes et ses agents, et
révoque aussitôt ce qu'elle retire.

Proposée et actée par Claude le 2026-09-25, sur délégation explicite de Lucas : « Prends les décisions
qu'il faut, je veux passer au dev le plus rapidement possible. »

## Conséquences

- **Ce qu'on peut faire** : connecter un utilisateur sur plusieurs postes ; tracer le poste de chaque
  geste ; révoquer une session, un poste ou une clé.
- **Ce qu'on ne peut plus faire** : identifier un poste par son adresse réseau ou par déclaration de
  l'utilisateur.
- **Ce qu'il faut mettre en place** : le module utilisateurs, sessions et postes du socle ; le geste de
  déclaration d'un poste ; l'émission des clés d'agent.
- **Ce qu'on accepte de payer** : une lecture de session par requête ; pas d'authentification unique ni
  de double facteur au lot 1.
- **Ce qui la remettrait en cause** : un prestataire qui exige l'authentification unique de son
  entreprise ; elle s'ajoutera alors par une nouvelle fiche, sans retirer celle-ci.

### Non prouvé

- **Poste non déclaré.** La spécification ne dit pas si un navigateur non déclaré peut servir, par
  exemple au bureau, ni avec quel poste ses gestes sont tracés. À trancher en conversation métier ;
  d'ici là, un navigateur non déclaré ne peut effectuer aucun geste.
