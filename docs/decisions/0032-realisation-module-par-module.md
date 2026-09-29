# 0032 — Réalisation module par module, dans leur version complète

**Statut** : actée · **Date** : 2026-09-29 · **Remplace** : 0003 · **Remplacée par** : —

## Contexte

La fiche 0003 ordonnait la réalisation en cinq lots verticaux : chaque lot ne réalisait des modules que
ce que ses scénarios éprouvaient, et les modules revenaient à chaque lot pour s'enrichir. L'ossature
et les deux premières étapes du scénario 1 ont été réalisées ainsi (journal du 2026-09-25 et du
2026-09-29).

À l'étape 3, la réalisation minimale a montré son coût : chaque étape oblige à poser une partie du
modèle d'un module (réception, stock, supports, missions, parcours) sans le reste de sa
spécification, puis à y revenir ; vingt-sept points non tranchés sont apparus d'un coup (`#74`), la
plupart parce que le module n'était pas pensé en entier. Lucas veut « le vrai site », réalisé tel
qu'il sera dans sa version finale.

## Options

### Option A — Garder les lots de 0003

- **Ce que c'est** : un lot à la fois, chaque module au minimum de ses scénarios.
- **En faveur** : un lot démontrable tôt, de bout en bout.
- **En défaveur** : chaque module est réalisé plusieurs fois ; le modèle se découvre par morceaux et se
  reprend à chaque lot.
- **Ce que ça ferme** : rien, mais le produit final arrive par retouches.

### Option B — Garder les lots, chaque module touché réalisé en entier

- **Ce que c'est** : l'ordre des lots, mais un module abordé l'est complètement.
- **En faveur** : le lot 1 reste la cible visible.
- **En défaveur** : le lot 1 touche presque tous les modules : l'ordre des lots ne dit plus rien.
- **Ce que ça ferme** : —

### Option C — Module par module, dans l'ordre des dépendances

- **Ce que c'est** : chaque module est réalisé en entier selon sa spécification, dans l'ordre où les
  suivants en dépendent. Les scénarios des lots deviennent des tests de bout en bout, écrits à mesure
  que les modules qu'ils traversent existent.
- **En faveur** : chaque modèle est pensé une fois, en entier ; les questions d'un module se posent
  ensemble, au début du module.
- **En défaveur** : le premier scénario complet de bout en bout arrive plus tard.
- **Ce que ça ferme** : la démonstration par lot comme jalon intermédiaire.

## Décision

**Les modules se réalisent un par un, chacun en entier selon sa spécification, dans l'ordre des
dépendances de la carte** (option C) :

1. Socle : 0.1 Organisation et multi-clients, 0.5 Tiers, 0.2 Référentiel produit, 0.3 Emplacements et
   plan d'entrepôt, 0.4 Modèle de stock, 0.7 Traçabilité et unités d'œuvre, 0.6 Moteur de workflow.
2. Flux et cœur de stock : 1.1 Réception, 1.4 Mise en stock et rangement, 2.1 Mouvements et
   transferts, 2.3 Statuts et blocages, 2.4 Supports consignés, 2.2 Inventaires, 3.1 Commandes,
   3.2 Préparation, 3.3 Expédition et transporteurs, 1.3 Retours client, 1.2 Dossiers SAV,
   4.1 Atelier et réparation, 4.2 Litiges.
3. Pilotage : 5.1 KPI, tableaux de bord et exports.

Le module 0.8 ne se réalise pas d'un bloc : chaque fonction transverse (encadrement et périmètres,
file de décisions, main, recherche, alertes, impressions, imports, échanges, simulation) naît avec le
premier module qui l'exige, dans sa forme complète. Un module qui exige un choix technique non couvert
par une fiche attend l'acte de cette fiche (échanges, espace technique, imprimantes : `#44`, `#46`,
fiche 0031).

Les scénarios de `docs/lots/` restent la recette : chaque étape devient un test de bout en bout dès
que les modules qu'elle traverse sont réalisés. Les critères de clôture des lots décrivent désormais
des jalons de recette, plus l'ordre de réalisation.

Critère décisif : penser chaque modèle une fois, en entier, plutôt que de le découvrir étape par étape.

Validée par Lucas le 2026-09-29 : « J'aimerais que tu entames pour de vrai le dev, tel qu'il sera dans
sa version finale. Je veux le vrai site. Vas-y module par module », puis le choix « modules complets,
ordre de la carte ».

## Conséquences

- **Ce qu'on peut faire** : réaliser un module entier, écrans d'administration et de paramétrage
  compris ; poser toutes ses questions ouvertes en une fois.
- **Ce qu'on ne peut plus faire** : réaliser une partie de module « pour le lot » en laissant le reste
  à plus tard sans le dire.
- **Ce qu'il faut mettre en place** : `status.yml` porte l'ordre de réalisation ; les issues « Réaliser
  le module » (#1 à #35) deviennent le fil du travail ; les issues d'étapes du scénario 1 restent
  ouvertes jusqu'à ce que leur test de bout en bout passe.
- **Ce qu'on accepte de payer** : aucun scénario complet de bout en bout avant la fin de la couche 1.
- **Ce qui la remettrait en cause** : le besoin d'une démonstration intermédiaire à date, qui
  demanderait de revenir à un découpage vertical.
