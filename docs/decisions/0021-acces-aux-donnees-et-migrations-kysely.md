# 0021 — Accès aux données et migrations : Kysely

**Statut** : actée · **Date** : 2026-09-25 · **Remplace** : — · **Remplacée par** : —

## Contexte

La fiche 0012 fait de PostgreSQL la seule base, porteuse aussi de la file et des notifications. Il faut
choisir comment le code TypeScript lit et écrit, et comment le schéma de la base évolue d'une version à
l'autre.

Ce qui contraint :

- **Contrôle fin des transactions et des verrous** : réservation unique (`RG-EXI-008`), gestes
  concurrents (`RG-EXI-009`), main exclusive (`RG-EXI-002`), verrouillage sans attente de la file,
  partitionnement du journal, notifications.
- **Typage strict** (fiche 0017) : les requêtes doivent être vérifiées par le compilateur.
- **Mise à jour sans perte** : une mise à jour applique d'elle-même ce qu'elle suppose sur les données
  (`RG-EXI-057`, `060`).

## Options

### Option A — Kysely, constructeur de requêtes typé

- **Ce que c'est** : on écrit du SQL en TypeScript, vérifié par le compilateur ; aucune couche cachée.
- **En faveur** : tout le SQL de PostgreSQL reste accessible (verrous, `SKIP LOCKED`, partitions) ;
  transactions explicites ; aucun moteur à embarquer ; migrations intégrées.
- **En défaveur** : les types de la base se déclarent ou se génèrent.
- **Ce que ça ferme** : —

### Option B — Drizzle

- **Ce que c'est** : schéma déclaré en TypeScript, requêtes proches du SQL, migrations générées.
- **En faveur** : schéma et types au même endroit ; très répandu.
- **En défaveur** : migrations générées par comparaison, à relire avec soin ; SQL avancé parfois moins
  direct.
- **Ce que ça ferme** : —

### Option C — Prisma

- **Ce que c'est** : ORM à schéma propre et client généré.
- **En faveur** : très confortable pour les lectures simples.
- **En défaveur** : les verrous, `SKIP LOCKED` et le partitionnement sortent de son modèle ; couche
  d'abstraction épaisse entre le code et le SQL qui garantit l'intégrité.
- **Ce que ça ferme** : un contrôle direct du SQL.

### Option D — SQL écrit à la main, sans constructeur

- **Ce que c'est** : requêtes en texte, pilote seul.
- **En faveur** : contrôle total ; aucune dépendance.
- **En défaveur** : aucune vérification des requêtes par le compilateur, contre la fiche 0017.
- **Ce que ça ferme** : —

## Décision

**Le code accède à PostgreSQL par Kysely, sur le pilote `pg`. Le schéma évolue par migrations écrites à
la main, numérotées, jamais modifiées une fois publiées, appliquées d'elles-mêmes au démarrage d'une
nouvelle version ; les types de la base sont générés depuis la base migrée et leur écart est vérifié
par l'intégration continue** (option A).

Règles :

1. **Migrations en avant seulement.** Pas de migration de retour en exploitation ; un retour arrière
   passe par la restauration ou par une nouvelle migration.
2. **Une migration ne perd rien** (`RG-EXI-057`) : aucune suppression de donnée de gestion ni de colonne
   porteuse d'historique sans reprise écrite dans la même migration.
3. **Application unique.** Les migrations s'appliquent avant le lancement des deux rôles, sous un verrou
   de la base qui empêche deux applications simultanées.
4. **Rôles de base séparés.** Le rôle qui migre n'est pas celui qu'utilise l'application ; le rôle de
   l'application n'a aucun droit de modifier ni de supprimer un événement (fiche 0022).

Critère décisif : garder la main sur le SQL qui porte l'intégrité, tout en faisant vérifier chaque
requête par le compilateur.

Proposée et actée par Claude le 2026-09-25, sur délégation explicite de Lucas : « Prends les décisions
qu'il faut, je veux passer au dev le plus rapidement possible. »

## Conséquences

- **Ce qu'on peut faire** : écrire les verrous, la file et le partitionnement en SQL typé.
- **Ce qu'on ne peut plus faire** : modifier une migration publiée ; accéder à la base hors de Kysely,
  sauf SQL brut explicitement balisé et relu.
- **Ce qu'il faut mettre en place** : le module d'accès aux données du socle ; la génération des types
  et sa vérification (fiche 0024) ; le lancement des migrations dans l'image (fiche 0015).
- **Ce qu'on accepte de payer** : des migrations écrites à la main.
- **Ce qui la remettrait en cause** : une migration de grande table qui ne tient pas dans une fenêtre de
  mise à jour raisonnable, mesurée.
