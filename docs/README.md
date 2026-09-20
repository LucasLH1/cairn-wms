# Cairn WMS — Spécification métier

La spécification décrit **le métier** du WMS Cairn. Elle ne contient aucune décision technique :
ni technologie, ni schéma de base de données, ni architecture applicative. Ces choix vivent dans
`decisions/`, sous forme de fiches, et ne doivent jamais être introduits dans la spécification.

## Organisation du dossier

| Chemin | Contenu |
|---|---|
| `README.md` | Ce document : conventions, carte des modules, principes directeurs, périmètre. |
| `glossaire.md` | Le vocabulaire métier, français et anglais. Référence unique, sans synonyme. |
| `socle/` | Couche 0 — les objets que tous les modules manipulent, et ce qui les traverse tous. |
| `flux-entrants/` | Couche 1 — réception, dossiers SAV, retours client, rangement. |
| `coeur-stock/` | Couche 2 — mouvements, inventaires, blocages, supports consignés. |
| `flux-sortants/` | Couche 3 — commandes, préparation, expédition. |
| `metiers-specifiques/` | Couche 4 — atelier et réparation, litiges. |
| `pilotage/` | Couche 5 — KPI, tableaux de bord et exports. |
| `decisions/` | Les fiches de décision engageante. Ce qui n'y est pas écrit n'est pas décidé. |

La spécification dit **ce que le produit doit faire**. Les fiches de `decisions/` disent **comment on
s'y prend, et pourquoi**. Les deux ne se mélangent jamais dans un même document.

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
| `RG-SUR` | 0.8 Surfaces, travail partagé et échanges |
| `RG-REC` | 1.1 Réception |
| `RG-SAV` | 1.2 Dossiers SAV |
| `RG-RET` | 1.3 Retours client |
| `RG-RAN` | 1.4 Mise en stock et rangement |
| `RG-MVT` | 2.1 Mouvements et transferts |
| `RG-INV` | 2.2 Inventaires |
| `RG-DIS` | 2.3 Statuts, blocages et mise à disposition |
| `RG-SUP` | 2.4 Supports consignés |
| `RG-CDE` | 3.1 Commandes et lignes de commande |
| `RG-PRE` | 3.2 Préparation |
| `RG-EXP` | 3.3 Expédition et transporteurs |
| `RG-ATE` | 4.1 Atelier et réparation |
| `RG-LIT` | 4.2 Litiges |
| `RG-KPI` | 5.1 KPI, tableaux de bord et exports |

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
| 0.8 | Surfaces, travail partagé et échanges | `socle/0.8-surfaces-et-travail-partage.md` |

Le module 0.8 décrit ce qui traverse tous les autres : les surfaces de travail, l'encadrement et les
périmètres, la file de décisions, le partage de la main, la recherche, les alertes, les impressions,
les imports et les échanges, la simulation des règles paramétrables. Sa section « Révisions à
porter » recense les modules que ses décisions modifient ; tant qu'une révision n'est pas portée,
c'est 0.8 qui fait foi.

### Couche 1 — Flux entrants *(rédigée)*

| # | Module | Document |
|---|---|---|
| 1.1 | Réception | `flux-entrants/1.1-reception.md` |
| 1.2 | Dossiers SAV | `flux-entrants/1.2-dossiers-sav.md` |
| 1.3 | Retours client | `flux-entrants/1.3-retours-client.md` |
| 1.4 | Mise en stock et rangement | `flux-entrants/1.4-mise-en-stock.md` |

### Couche 2 — Cœur stock *(rédigée)*

| # | Module | Document |
|---|---|---|
| 2.1 | Mouvements et transferts | `coeur-stock/2.1-mouvements-transferts.md` |
| 2.2 | Inventaires | `coeur-stock/2.2-inventaires.md` |
| 2.3 | Statuts, blocages et mise à disposition | `coeur-stock/2.3-statuts-blocages-mise-a-disposition.md` |
| 2.4 | Supports consignés | `coeur-stock/2.4-supports-consignes.md` |

### Couche 3 — Flux sortants *(rédigée)*

| # | Module | Document |
|---|---|---|
| 3.1 | Commandes et lignes de commande | `flux-sortants/3.1-commandes.md` |
| 3.2 | Préparation | `flux-sortants/3.2-preparation.md` |
| 3.3 | Expédition et transporteurs | `flux-sortants/3.3-expedition-transporteurs.md` |

### Couche 4 — Métiers spécifiques *(rédigée)*

| # | Module | Document |
|---|---|---|
| 4.1 | Atelier et réparation | `metiers-specifiques/4.1-atelier-reparation.md` |
| 4.2 | Litiges | `metiers-specifiques/4.2-litiges.md` |

### Couche 5 — Pilotage *(rédigée)*

| # | Module | Document |
|---|---|---|
| 5.1 | KPI, tableaux de bord et exports | `pilotage/5.1-kpi-tableaux-de-bord-exports.md` |

### Modules annoncés, non rédigés

| Module | Statut |
|---|---|
| Portail donneur d'ordre | Au périmètre, en consultation seule. Non spécifié. |
| Tarification et valorisation du relevé | Au périmètre. Non spécifié. |
| Interfaçage direct entre systèmes | Au périmètre, sur le principe d'une interface unique (`RG-SUR-113`). Non spécifié. |

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
7. **Un fait constaté s'enregistre toujours.** La marchandise est arrivée, la palette est montée,
   l'article est réparé : refuser d'enregistrer le fait parce qu'une condition manque ne le fait pas
   disparaître, cela le rend invisible et pousse le terrain à contourner le produit. C'est **ce qui
   vient après** qui est bloqué, jamais l'enregistrement.

## Statut du périmètre

### Au périmètre, non encore spécifié

- Le **portail donneur d'ordre**, en consultation seule : stock, flux en cours, relevés d'activité,
  dossiers le concernant. Aucune saisie, aucun déclenchement.
- La **tarification** : le WMS porte les grilles tarifaires et valorise son relevé d'activité.
- L'**interfaçage direct** entre le produit et le système d'un donneur d'ordre, par une interface
  unique adaptée par profil.

### Hors périmètre, et à ne pas anticiper dans le code

- La douane. Un statut douanier neutre est porté par le modèle, sans aucune règle associée.
- Les échanges EDI normalisés. Les échanges de fichiers et l'interfaçage direct couvrent le besoin
  courant ; un donneur d'ordre exigeant de l'EDI strict relèvera d'un module dédié.
- Le mode hors ligne des terminaux opérateurs. En revanche, une perte de communication ne détruit
  jamais de travail (`RG-SUR-007`).
- La gestion du froid et de la chaîne de température.
- L'édition de factures à valeur légale. Le WMS **compte** les unités d'œuvre et les valorise ; il
  n'édite aucun document à valeur légale.
