# Cairn WMS — Spécification métier

Ce dépôt documentaire décrit **le métier** du WMS Cairn. Il ne contient aucune décision technique :
ni technologie, ni schéma de base de données, ni architecture applicative. Ces sujets sont traités
ailleurs et ne doivent pas être introduits ici.

## À qui s'adresse ce document

À l'équipe (humaine ou automatisée) qui réalise le produit. L'objectif est qu'un développeur puisse
construire un module **sans avoir à deviner une règle**, et sans avoir à revenir poser une question
métier. Toute zone d'ombre restante est signalée explicitement dans la section « Points ouverts » du
document concerné.

## Conventions de lecture

**Règles de gestion.** Chaque règle porte un identifiant stable de la forme `RG-XXX-nnn`, où `XXX`
identifie le module. Une règle est atomique, vérifiable, et formulée à l'indicatif. Les règles sont
référencées d'un document à l'autre par leur identifiant. **Un identifiant n'est jamais réutilisé** :
si une règle disparaît, son numéro reste vacant et la règle est déplacée dans « Décisions écartées ».

Préfixes en vigueur :

| Préfixe | Module |
|---|---|
| `RG-ORG` | 0.1 Organisation et multi-clients |
| `RG-REF` | 0.2 Référentiel produit |
| `RG-EMP` | 0.3 Emplacements et plan d'entrepôt |
| `RG-STK` | 0.4 Modèle de stock |
| `RG-TRS` | 0.5 Tiers |
| `RG-WKF` | 0.6 Moteur de workflow |
| `RG-TRA` | 0.7 Traçabilité et unités d'œuvre |
| `RG-REC` | 1.1 Réception |
| `RG-SAV` | 1.2 Dossiers SAV |
| `RG-RET` | 1.3 Retours client |
| `RG-RAN` | 1.4 Mise en stock et rangement |

**Cas limites.** Chaque module liste explicitement ce qui doit se produire quand la situation dérape.
Un cas limite non documenté est un bug en puissance : si un comportement n'est pas décrit, il doit
être remonté comme une question, jamais tranché à l'improviste par celui qui code.

**Parcours opérateur.** Chaque module décrit ce que l'utilisateur voit et fait, écran par écran, pour
chaque rôle concerné. Ces parcours décrivent l'**intention** et l'enchaînement, pas la mise en page.

**Vocabulaire.** Tout terme métier est défini une seule fois, dans `glossaire.md`, avec son libellé
français (celui des écrans) et son équivalent anglais (celui des données et du code). Aucun synonyme
n'est toléré : un objet porte un nom et un seul.

## Carte des modules

### Couche 0 — Socle transverse *(rédigée)*

| # | Module | Document |
|---|---|---|
| 0.1 | Organisation et multi-clients | `socle/0.1-organisation.md` |
| 0.2 | Référentiel produit | `socle/0.2-referentiel-produit.md` |
| 0.3 | Emplacements et plan d'entrepôt | `socle/0.3-emplacements-plan-entrepot.md` |
| 0.4 | Modèle de stock | `socle/0.4-modele-de-stock.md` |
| 0.5 | Tiers | `socle/0.5-tiers.md` |
| 0.6 | Moteur de workflow configurable | `socle/0.6-moteur-de-workflow.md` |
| 0.7 | Traçabilité et unités d'œuvre | `socle/0.7-tracabilite-unites-oeuvre.md` |

### Couche 1 — Flux entrants *(rédigée)*

| # | Module | Document |
|---|---|---|
| 1.1 | Réception | `flux-entrants/1.1-reception.md` |
| 1.2 | Dossiers SAV | `flux-entrants/1.2-dossiers-sav.md` |
| 1.3 | Retours client | `flux-entrants/1.3-retours-client.md` |
| 1.4 | Mise en stock et rangement | `flux-entrants/1.4-mise-en-stock.md` |

### Couche 2 — Cœur stock *(à venir)*

2.1 Mouvements et transferts · 2.2 Inventaires · 2.3 Statuts, blocages et mises à disposition ·
2.4 Supports consignés

### Couche 3 — Flux sortants *(à venir)*

3.1 Commandes et lignes · 3.2 Préparation · 3.3 Expédition et transporteurs

### Couche 4 — Métiers spécifiques *(à venir)*

4.1 Atelier et réparation · 4.2 Litiges

### Couche 5 — Pilotage *(à venir)*

5.1 KPI, tableaux de bord et exports

## Principes directeurs du produit

Ces principes traversent tous les modules. En cas de doute sur une règle non écrite, ils tranchent.

1. **Rien ne se supprime.** Aucun objet ayant porté du stock, du travail ou de l'argent n'est
   effacé. On désactive, on clôture, on annule — jamais on ne supprime.
2. **Toute correction est un mouvement.** Une erreur ne se rattrape pas en modifiant discrètement une
   donnée, mais en produisant un nouvel événement motivé. L'historique doit rester opposable au
   donneur d'ordre.
3. **Le stock ne disparaît jamais.** À tout instant, chaque unité de stock est quelque part — y
   compris hors des murs, y compris en transit, y compris chez un tiers.
4. **Le paramétrage plutôt que le cas particulier.** Une demande d'un donneur d'ordre qui ne se
   satisfait pas par paramétrage est une alerte de conception, pas une tâche de développement.
5. **Le terrain scanne, il ne saisit pas.** Chaque fois qu'un opérateur doit taper au clavier ce
   qu'il aurait pu scanner, c'est une erreur de conception.
6. **Le produit protège l'opérateur.** Une manipulation dangereuse pour le stock ou pour un client
   final doit être impossible, pas déconseillée.

## Statut du périmètre

Hors périmètre à ce stade, et à ne pas anticiper dans le code :

- La douane. Un statut douanier neutre est porté par le modèle, sans aucune règle associée.
- Les échanges EDI normalisés.
- Le mode hors ligne des terminaux opérateurs.
- Le portail donneur d'ordre en libre-service.
- La gestion du froid et de la chaîne de température.
- L'édition de factures à valeur légale. Le WMS **compte** les unités d'œuvre, il ne facture pas.
