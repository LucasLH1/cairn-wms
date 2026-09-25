# 0022 — Journal d'événements

**Statut** : actée · **Date** : 2026-09-25 · **Remplace** : — · **Remplacée par** : —

## Contexte

Le journal naît au lot 1 (fiche 0003) et dure toute la vie de l'instance. Il porte une grande part des
exigences de `socle/0.9` :

- **Un événement par geste et par fait significatif**, horodaté, avec son auteur ou son origine, et le
  poste d'émission (`RG-EXI-013`) ; les refus aussi (`RG-EXI-014`).
- **Immuable, jamais purgé** (`RG-EXI-010`, `015`).
- **Historique d'un objet en un geste** ; relevés qui redescendent aux événements (`RG-EXI-016`).
- **Anonymisation** d'un client final partout, événements compris, sans supprimer un événement
  (`RG-EXI-018`).
- **Événement externe** : horodatage d'origine et de réception (`RG-EXI-020`).
- **Décision d'une règle** : la règle, sa version et les critères retenus (`RG-EXI-031`).
- **Enregistré avec le geste et tous ses effets**, ou pas du tout (`RG-EXI-011`).

Le glossaire nomme l'objet : événement (`TraceEvent`).

## Options

### Option A — État courant et journal, écrits dans la même transaction

- **Ce que c'est** : les tables de gestion portent l'état courant ; chaque geste ajoute, dans la même
  transaction, ses événements à un journal en ajout seul.
- **En faveur** : lectures simples sur l'état ; journal complet et cohérent par construction ; modèle
  connu.
- **En défaveur** : l'état et le journal sont deux écritures à tenir cohérentes, garanties par la
  transaction.
- **Ce que ça ferme** : —

### Option B — Journal seul, état déduit des événements

- **Ce que c'est** : l'état se reconstruit en rejouant les événements ; des vues le matérialisent.
- **En faveur** : une seule source de vérité.
- **En défaveur** : complexité forte (vues à reconstruire, versions d'événements) ; l'anonymisation
  d'un journal qui fait foi devient un problème de reconstruction.
- **Ce que ça ferme** : la simplicité des lectures.

### Option C — Journal générique alimenté par déclencheurs de la base

- **Ce que c'est** : chaque modification de ligne est copiée par la base dans une table d'audit.
- **En faveur** : aucun oubli possible.
- **En défaveur** : trace des lignes, pas des gestes : ni le motif, ni le refus, ni la règle appliquée,
  ni le poste ne s'y lisent.
- **Ce que ça ferme** : un journal lisible en termes métier.

## Décision

**L'état courant vit dans les tables de gestion ; chaque geste ajoute ses événements au journal dans la
même transaction** (option A). Règles :

1. **Ajout seul, garanti par la base.** Le rôle de l'application ne peut qu'ajouter et lire des
   événements ; un déclencheur refuse toute modification ou suppression, quel que soit le rôle.
2. **Aucune donnée identifiante dans un événement.** Un événement désigne un client final par son
   identifiant, jamais par son nom, son adresse ou ses coordonnées ; ces données vivent dans la fiche du
   tiers et dans les objets de gestion, où l'anonymisation les efface. L'événement reste intact, le fait
   aussi, la personne n'y est plus (`RG-EXI-018`).
3. **Contenu d'un événement** : type issu d'un catalogue fermé, horodatage, auteur ou origine, poste
   d'émission, identifiant du geste (fiche 0019), objets concernés, données propres au type validées par
   schéma ; pour un événement externe, horodatage d'origine et de réception ; pour une décision de règle,
   la règle, sa version et les critères.
4. **Un événement concerne un ou plusieurs objets**, reliés par une table de liaison indexée par objet
   et par date : c'est elle qui donne l'historique en un geste.
5. **Partitionnement mensuel par horodatage.** Aucune partition n'est jamais supprimée.

Critère décisif : un journal lisible en termes métier, cohérent par construction avec l'état, et
anonymisable sans toucher à un seul événement.

Proposée et actée par Claude le 2026-09-25, sur délégation explicite de Lucas : « Prends les décisions
qu'il faut, je veux passer au dev le plus rapidement possible. »

## Conséquences

- **Ce qu'on peut faire** : afficher l'historique de tout objet ; tracer un refus comme un geste ;
  anonymiser sans perte d'historique logistique.
- **Ce qu'on ne peut plus faire** : corriger un événement ; écrire une donnée identifiante dans un
  événement.
- **Ce qu'il faut mettre en place** : le module journal du socle ; le catalogue des types d'événements,
  à partir des règles `RG-TRA` ; le contrôle, dans les tests, qu'aucun schéma d'événement ne porte de
  champ identifiant.
- **Ce qu'on accepte de payer** : deux écritures par geste ; une jointure pour l'historique.
- **Ce qui la remettrait en cause** : un besoin de rejouer l'état passé à une date que les tables de
  gestion ne permettent pas.

### Non prouvé

- **Textes libres.** Un motif ou un commentaire saisi librement peut contenir un nom. La règle 2 ne le
  couvre que si tout texte libre lié à un client final est porté par l'objet de gestion et non par
  l'événement : à vérifier module par module.
- **Volume.** À l'hypothèse de 0.9, le journal dépasse les quarante gigaoctets du serveur de référence
  (fiche 0012) ; le partitionnement n'y change rien.
