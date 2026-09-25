# 0019 — Cadre du serveur et contrat des gestes

**Statut** : actée · **Date** : 2026-09-25 · **Remplace** : — · **Remplacée par** : —

## Contexte

Les fiches 0009, 0013, 0017 et 0018 fixent un serveur TypeScript unique sur Node, en deux rôles. Il faut
choisir le cadre qui reçoit les requêtes, et la forme du contrat entre écrans et serveur.

Ce qui contraint :

- **Un geste validé est enregistré ou refusé, jamais laissé indéterminé** ; reçu deux fois, il n'est
  enregistré qu'une fois (`RG-EXI-006`, `007`).
- **Droits contrôlés à chaque geste**, quoi qu'ait présenté l'écran (`RG-EXI-012`) ; **refus tracés**
  (`RG-EXI-014`) ; refus motivés à l'écran (`lots/lot-1/README.md`).
- **Mêmes schémas à l'écran et au serveur** (fiche 0017).
- **Interface directe unique** pour les systèmes des donneurs d'ordre, au lot 5 (`RG-EXI-043`), qui
  suppose un contrat publiable.
- **Temps réel** vers les écrans (fiche 0026).
- **Réponse d'un geste en moins de trois cents millisecondes** (`RG-EXI-073`).

## Options

### Option A — Fastify, contrat par schémas partagés

- **Ce que c'est** : cadre HTTP de Node, rapide, organisé en greffons encapsulés ; les routes sont
  déclarées à partir des schémas du contrat.
- **En faveur** : mûr et performant ; l'encapsulation des greffons épouse la découpe en modules
  (fiche 0013) ; validation et description publiable du contrat tirées des mêmes schémas ; greffon
  WebSocket officiel.
- **En défaveur** : un peu plus de cérémonie qu'un cadre minimal.
- **Ce que ça ferme** : —

### Option B — Hono

- **Ce que c'est** : cadre minimal, multi-environnements.
- **En faveur** : léger ; bon typage de bout en bout.
- **En défaveur** : pensé d'abord pour les environnements périphériques ; écosystème Node plus mince
  que Fastify.
- **Ce que ça ferme** : —

### Option C — NestJS

- **Ce que c'est** : cadre complet à injection de dépendances et décorateurs.
- **En faveur** : structure imposée ; maîtrise par l'IA large.
- **En défaveur** : lourd ; décorateurs et métadonnées d'exécution qui contredisent la simplicité
  visée ; beaucoup de code de cérémonie.
- **Ce que ça ferme** : —

### Option D — Appel de procédures typées (tRPC)

- **Ce que c'est** : les écrans appellent des fonctions du serveur, typées de bout en bout.
- **En faveur** : typage sans effort.
- **En défaveur** : contrat interne, mal adapté à une interface directe publiée pour des tiers ; deux
  contrats à tenir au lot 5.
- **Ce que ça ferme** : un contrat unique pour les écrans et les systèmes externes.

## Décision

**Le serveur repose sur Fastify. Écrans et serveur partagent un contrat, écrit en schémas, qui déclare
chaque geste et chaque consultation ; le serveur en tire ses routes et sa validation, les écrans leur
client typé, et le lot 5 sa description publiée** (option A).

Règles du contrat :

1. **Un geste est une commande nommée** (réceptionner une ligne, déposer un support…), envoyée par
   `POST`, jamais une modification de ressource générique. Une consultation est une lecture sans effet.
2. **Chaque geste porte un identifiant généré par le poste.** Le serveur l'enregistre dans la même
   transaction que ses effets, sous contrainte d'unicité ; un geste reçu une seconde fois rend le
   résultat du premier sans rien réenregistrer (`RG-EXI-006`, `007`).
3. **Chaque geste contrôle les droits et le périmètre** avant tout effet (`RG-EXI-012`, `050`).
4. **Un refus est une réponse typée**, avec son motif issu d'un catalogue fermé et libellé par le
   glossaire, et il produit un événement (`RG-EXI-014`).
5. **Un geste et tous ses effets tiennent dans une transaction** (`RG-EXI-011`, fiche 0012).

Critère décisif : un cadre mûr dont la validation et le contrat publiable sortent des mêmes schémas.

Proposée et actée par Claude le 2026-09-25, sur délégation explicite de Lucas : « Prends les décisions
qu'il faut, je veux passer au dev le plus rapidement possible. »

## Conséquences

- **Ce qu'on peut faire** : rejouer un geste sans risque de double ; publier au lot 5 un contrat déjà
  écrit.
- **Ce qu'on ne peut plus faire** : exposer une route hors du contrat ; modifier une donnée de gestion
  par une route générique.
- **Ce qu'il faut mettre en place** : le paquet du contrat (fiche 0023) ; le catalogue des motifs de
  refus ; le greffon qui applique les règles 2 à 5 à tout geste.
- **Ce qu'on accepte de payer** : un nom et un schéma par geste, écrits une fois.
- **Ce qui la remettrait en cause** : un geste du lot 1 qui ne tient pas trois cents millisecondes pour
  une raison propre au cadre.
