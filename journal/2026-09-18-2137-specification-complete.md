---
date: 2026-09-18 21:37
objectif: Reconstituer depuis git log le travail de spécification mené du 18 au 23 septembre par le connecteur de documentation, sans trace de journal.
modules: ["0.1", "0.2", "0.3", "0.4", "0.6", "0.7", "0.8", "0.9", "1.1", "1.2", "1.3", "1.4", "2.1", "2.2", "2.3", "2.4", "3.1", "3.2", "3.3", "4.1", "4.2", "5.1"]
issues: [12, 13, 14, 15, 16, 17, 18, 19, 20, 21]
---

# Session du 2026-09-18 au 2026-09-23 — spécification complète

Entrée écrite après coup, le 2026-09-23, par reconstitution depuis `git log` sur `dev` : le
travail relaté a été poussé par le connecteur de documentation, qui ne tient ni journal, ni
`status.yml`, ni issues. Elle couvre les commits `docs:` du `4598471` (18 septembre, 21:37, premier
commit après l'entrée d'état des lieux de 18:25) au `b1acc15` (23 septembre, 19:12). Elle regroupe
plusieurs séances de rédaction ; la chronologie ci-dessous les distingue. Rien n'y est déduit
d'autre chose que des messages de commit et du contenu de `docs/`.

## Objectif

Achever la spécification métier : rédiger les dix modules des couches 2 à 5 encore « à faire »,
puis ce qui traverse tous les modules (0.8) et ce que toute réalisation doit garantir (0.9), et
acter l'ordre de réalisation du produit.

## Actions

**18 septembre, soirée (21:37 – 23:18).**

- Réorganisé `docs/README.md` : table d'organisation du dossier, renvoi des choix techniques vers
  `decisions/`, mention « rédigé » portée au niveau des couches.
- Renommé le vocabulaire dans le glossaire et dans 0.1, 0.3, 0.4, 1.2, 1.3, 1.4 : *séquence de
  parcours*, *règle de prélèvement*, *stratégie de rangement*, *régime de garantie* remplacent
  les termes précédents (`affectation`, `prise en charge`), désormais proscrits. Retiré le doublon
  *Dossier* du glossaire et réservé les termes de la couche 3.
- Rédigé **2.1 Mouvements et transferts** (`RG-MVT`) et **2.2 Inventaires** (`RG-INV`), ouvert le
  dossier `coeur-stock/`, déclaré les préfixes. 1.4 renvoie désormais à la généralisation de la
  mission en 2.1.

**19 septembre (11:31 – 15:47).**

- Introduit la *valeur déclarée* : sur la référence (0.2), valeur effective d'une unité de stock
  (0.4), valeur de l'article annoncé (1.2). Fermé le point ouvert « valeur » dans 0.7, 1.1, 1.3
  et 2.2.
- Rédigé **2.3 Statuts, blocages et mise à disposition** (`RG-DIS`) et **2.4 Supports consignés**
  (`RG-SUP`) : couche 2 close.
- Rédigé **3.1 Commandes et lignes de commande** (`RG-CDE`), **3.2 Préparation** (`RG-PRE`),
  **3.3 Expédition et transporteurs** (`RG-EXP`) : couche 3 close. Retiré de 3.2 et 3.3 un point
  ouvert erroné sur les unités d'œuvre.
- Rédigé **4.1 Atelier et réparation** (`RG-ATE`). En conséquence : troisième origine de commande,
  la *commande de dossier* (3.1), exception à `RG-STK-041` (0.4), l'emplacement virtuel ne couvre
  pas les articles en dossier (0.3), type d'étape sous-traitance selon le rattachement à un
  dossier (0.6). Levée de la collision sur *constat* : le diagnostic d'atelier est un *symptôme*.
- Rédigé **4.2 Litiges** (`RG-LIT`) : couche 4 close. Le litige interne (2.1) n'a plus
  d'imputation avant instruction, cohérence portée dans tout 2.1.
- Rédigé **5.1 KPI, tableaux de bord et exports** (`RG-KPI`) : toutes les couches sont rédigées,
  plus aucun terme *(réservé)* au glossaire. Clarifié la règle d'usage des termes réservés.
- Aligné la numérotation des sections des huit nouveaux documents sur la convention.

**20 septembre (17:07 – 17:08).**

- Rédigé **0.8 Surfaces, travail partagé et échanges** (`RG-SUR`) : surfaces et postes, équipes
  et hiérarchie, périmètres, file de décisions, main, recherche et scan, alertes, impressions,
  imports, exports, échanges automatisés, simulation des règles paramétrables, administration,
  comparaison des opérateurs. Ajouté au README le septième principe directeur (un fait constaté
  s'enregistre toujours) et revu le périmètre : portail donneur d'ordre et tarification entrent ;
  EDI, hors ligne, froid et factures restent dehors.

**22 septembre (21:11 – 22:35).**

- Porté le vocabulaire de 0.8 au glossaire, avec cinq nouveaux termes proscrits. Renommé le poste
  de travail d'atelier en *établi* ; *poste* désigne désormais l'ordinateur (4.1, glossaire).
- Rédigé et acté la fiche **0001 — Découpage du produit en lots livrables**, ouvert l'index de
  `docs/decisions/README.md`.
- Porté les révisions de 0.8 §8 dans les modules concernés : équipes, périmètres, création
  d'utilisateur, `RG-ORG-015` rectifiée (0.1) ; référentiel au bureau et non en administration
  (0.2) ; objet non étiqueté, mécanisme d'import commun, `RG-REC-011` alignée sur les profils,
  anti-doublon strict (1.1) ; modèle de version et simulation généralisés à toute règle
  paramétrable (0.6) ; comparaison d'activité et valorisation du relevé (0.7) ; mesure du temps de
  passage par étape encadrée (4.1).
- Unifié le vocabulaire des versions sur *brouillon* et *publiée* (glossaire, 0.8). Renommé le
  type d'étape *Notification* en *Émission de message* (0.6), les notifications au donneur
  d'ordre en messages (4.2, 3.1) ; *notification* proscrit. Soldé les trois contradictions
  restantes de 0.8, dont le tableau des révisions est passé de « à porter » à « portées ».

**23 septembre (19:03 – 19:12).**

- Rédigé **0.9 Exigences de fonctionnement** (`RG-EXI`) : les exigences que les règles métier
  imposent à toute réalisation, chacune rattachée à sa règle d'origine, plus la liste de ce qui
  n'est pas exigé et les points ouverts que le choix technique devra trancher par hypothèse.
  Référencé dans le README comme grille d'évaluation des fiches de `decisions/`.
- Remplacé *terminal* par *poste* partout (0.2, 0.7, 1.1, 1.4, 2.1), *terminal* proscrit.
  Articulé la file de décisions et les vues de domaine (`RG-SUR-142` à `RG-SUR-144`). Restreint
  la proscription de *verrou* au sens de la main.

## Décisions

- **0001 — Découpage du produit en cinq lots livrables**, actée le 22 : verticales fonctionnelles,
  un lot clos par un scénario déroulé de bout en bout sur le jeu de données de test. La fiche fait
  foi ; elle est reprise dans `status.yml` le 23.
- Décisions de spécification, actées dans les documents eux-mêmes (sections « Décisions
  actées ») : écran d'ordinateur uniquement, main exclusive sur l'unité de travail, file de
  décisions partagée à priorité calculée, interface directe unique adaptée par profil, comparaison
  des opérateurs sans classement, interface en français avec bascule en anglais. Aucune n'est un
  choix technique.
- Les points ouverts du 18 (préfixes des couches 2 à 5, nom des dossiers de couche) sont fermés
  par les documents eux-mêmes.

## Fichiers touchés

| Chemin | Ce qui change et pourquoi |
|---|---|
| `docs/README.md` | Organisation du dossier, préfixes `RG-MVT` à `RG-KPI`, `RG-SUR`, `RG-EXI`, carte complète, septième principe, périmètre revu. |
| `docs/glossaire.md` | Termes des couches 2 à 5, de 0.8, valeur déclarée ; renommages ; proscriptions ajoutées (*poste de travail*, *terminal*, *version active*, *verrou*, *notification*, *mapping*, *tâche*). |
| `docs/decisions/0001-decoupage-en-lots-livrables.md`, `docs/decisions/README.md` | Première fiche actée, index ouvert. |
| `docs/socle/0.8-…`, `docs/socle/0.9-…` | Créés. |
| `docs/coeur-stock/2.1` à `2.4`, `docs/flux-sortants/3.1` à `3.3`, `docs/metiers-specifiques/4.1`, `4.2`, `docs/pilotage/5.1` | Créés. |
| `docs/socle/0.1`, `0.2`, `0.3`, `0.4`, `0.6`, `0.7` ; `docs/flux-entrants/1.1` à `1.4` | Révisés : vocabulaire, valeur déclarée, révisions portées depuis 0.8, effets de 4.1. |
| `status.yml`, `journal/`, issues | **Non touchés** par le connecteur. Rattrapés le 23 (entrée suivante). |

## Issues liées

- `#12` à `#21` — soldées par les documents des modules 2.1 à 5.1, sans avoir été fermées à
  l'époque. Fermées le 23.

## Points ouverts

- Les points ouverts propres à chaque module vivent dans sa section « Points ouverts ». Ceux de
  0.8 §9 (arbitrage entre natures de missions, cloisonnement par zone, catalogue des faits
  déclencheurs, socle d'alertes imposées, portail, tarification, interfaçage direct, droit du
  travail) et de 0.9 §7 (volumétrie, temps de réponse, hébergement, sauvegarde, fuseau,
  impression, matériel, langue) attendent une réponse de Lucas ou une hypothèse explicite dans la
  fiche technique.
- Trois modules restent annoncés et non rédigés : portail donneur d'ordre, tarification,
  interfaçage direct.
- La pile technique n'est toujours pas choisie ; 0.9 en est la grille d'évaluation.
