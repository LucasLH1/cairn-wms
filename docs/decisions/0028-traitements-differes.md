# 0028 — Traitements différés

**Statut** : actée · **Date** : 2026-09-25 · **Remplace** : — · **Remplacée par** : —

## Contexte

La fiche 0012 place la file des traitements différés dans PostgreSQL ; la fiche 0017 les confie au rôle
« traitements ». Il faut choisir l'outil qui exécute cette file et dire comment les échéances métier
s'y rattachent.

Ce qui contraint :

- **Échéances de parcours** déclenchées à l'heure, utilisateur connecté ou non (`RG-EXI-021`) ; une
  échéance tombée pendant un arrêt est traitée à la reprise, son retard tracé (`RG-EXI-022`).
- **Photo quotidienne** à l'heure de chaque site ; une journée manquée n'est jamais reconstituée
  (`RG-EXI-023`).
- **Délais en heures ouvrées** selon le calendrier du site (`RG-EXI-024`).
- **Libérations automatiques** au terme de leur seuil (`RG-EXI-025`) ; **absence d'un échange attendu**
  détectée à son échéance (`RG-EXI-026`).
- **Un traitement qui échoue n'est jamais silencieux** et peut être relancé (`RG-EXI-027`).
- **Travail lancé par un geste enregistré dans la même transaction que lui** (`RG-EXI-011`).

## Options

### Option A — graphile-worker

- **Ce que c'est** : file de travaux pour Node, entièrement dans PostgreSQL.
- **En faveur** : un travail s'ajoute par une fonction SQL, donc dans la transaction du geste ;
  verrouillage sans attente et notifications pour la réactivité ; relances avec délai croissant ; tâches
  planifiées dont le rattrapage après arrêt se règle tâche par tâche.
- **En défaveur** : un mainteneur principal.
- **Ce que ça ferme** : —

### Option B — pg-boss

- **Ce que c'est** : autre file de travaux pour Node dans PostgreSQL.
- **En faveur** : mûre ; planification intégrée.
- **En défaveur** : ajout transactionnel moins direct ; un mainteneur principal aussi.
- **Ce que ça ferme** : —

### Option C — File écrite pour Cairn

- **Ce que c'est** : une table et un exécuteur maison.
- **En faveur** : aucune dépendance.
- **En défaveur** : relances, reprise après plantage, planification et réactivité à réécrire et à
  éprouver.
- **Ce que ça ferme** : —

### Option D — BullMQ

- **Ce que c'est** : file de référence de Node, sur Redis.
- **En faveur** : très riche.
- **En défaveur** : exige Redis, écarté par la fiche 0012.
- **Ce que ça ferme** : —

## Décision

**Les traitements différés s'exécutent par graphile-worker dans le rôle « traitements »** (option A).
Règles :

1. **Les échéances métier sont des données de gestion**, pas des travaux planifiés : chaque échéance
   (transition de parcours, relance, libération, échange attendu) est enregistrée avec son heure due
   dans la table de son module. Un travail récurrent traite toutes les échéances dues, y compris celles
   tombées pendant un arrêt, et trace leur retard (`RG-EXI-021`, `022`, `025`, `026`).
2. **La photo quotidienne est planifiée par site, sans rattrapage** : manquée, elle est enregistrée comme
   lacune et remontée, jamais prise après coup (`RG-EXI-023`).
3. **Un travail né d'un geste est ajouté dans la transaction du geste** (`RG-EXI-011`).
4. **Tout travail est rejouable sans effet double** : il vérifie ce qui est déjà fait avant d'agir.
5. **Un échec définitif produit une alerte ou une anomalie** et le travail reste relançable
   (`RG-EXI-027`) ; son dénombrement alimente l'état de santé (`RG-EXI-066`).
6. **Les heures ouvrées** se calculent dans le module sites et calendriers, jamais dans la file.

Critère décisif : ajouter un travail dans la transaction du geste, et garder les échéances métier dans
la base pour qu'aucune ne se perde à l'arrêt.

Proposée et actée par Claude le 2026-09-25, sur délégation explicite de Lucas : « Prends les décisions
qu'il faut, je veux passer au dev le plus rapidement possible. »

## Conséquences

- **Ce qu'on peut faire** : lancer imports, documents, impressions, envois et photos hors du rôle
  « gestes » ; reprendre sans perte après un arrêt.
- **Ce qu'on ne peut plus faire** : confier une échéance métier à un simple minuteur en mémoire ou à une
  tâche planifiée sans trace en base.
- **Ce qu'il faut mettre en place** : le module traitements différés du socle ; le travail récurrent des
  échéances ; la planification par site de la photo quotidienne, au lot 4.
- **Ce qu'on accepte de payer** : une dépendance à un projet à mainteneur principal ; les règles 1 et 4
  en limitent le risque, la file restant remplaçable sans toucher aux échéances.
- **Ce qui la remettrait en cause** : un abandon du projet, ou un débit insuffisant, mesuré.
