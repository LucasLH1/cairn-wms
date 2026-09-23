---
date: 2026-09-23 20:45
objectif: Acter 0003, reporter les lots dans status.yml, ouvrir le jalon du lot 1 et ses issues, et dire ce qui doit être acté avant la première ligne de code.
modules: []
issues: [36, 47, 48, 49, 50]
---

# Session du 2026-09-23 — acte des lots et jalon du lot 1

## Objectif

La spécification du lot 1 est complète sur `dev` : un README avec son critère de clôture, et trois
scénarios validés. Lucas demande d'acter 0003, de faire remplacer 0001, de reporter le tableau des
lots dans `status.yml`, de créer le jalon du lot 1 avec une issue d'automatisation par scénario, et
de dire quelles fiches de détail doivent être actées avant la première ligne de code, dont 0004.
Aucun code.

## Actions

- Fait `git pull` et lu les sept commits arrivés depuis `7fe6782` : `docs/lots/lot-1/` (README et
  trois scénarios), 0003 complétée, dossier `lots/` déclaré dans `docs/README.md`.
- Lu en entier le README du lot 1, les trois scénarios et 0003.
- 0003 passée à `actée`, datée du 2026-09-23, validée par Lucas. 0001 passée à « remplacée par
  0003 » dans son seul en-tête ; son corps n'est pas réécrit. Index de `docs/decisions/README.md`
  mis à jour.
- `CLAUDE.md`, section 2 : la phrase qui citait 0001 comme décision actée nomme désormais 0003, qui
  la remplace. Rien d'autre.
- `status.yml` : section `lots:` réécrite d'après le tableau de 0003 ; pour le lot 1, jalon, README
  du critère de clôture, et trois scénarios avec leur issue ; en-tête mis à jour.
- Créé le jalon 7, « Lot 1 — L'entrepôt minimal ». Ouvert `#48`, `#49`, `#50`, une par scénario,
  qui renvoient chacune à son fichier et au critère de clôture du README. Jalons de couche et issues
  de module non touchés.
- Fermé `#47`, « jeu de données de test et scénario du lot 1 », soldée par `docs/lots/lot-1/`.
- Analysé les fiches de détail nécessaires au lot 1 et l'état de 0004 ; commenté `#36`.

## Décisions

- **0003 — Précision du découpage en lots, actée** par Lucas ; elle remplace 0001. La fiche fait foi.
- Les scénarios du lot 1 portent chacun leur issue dans `status.yml` ; le lot porte son jalon. Non
  engageant.

## Fichiers touchés

| Chemin | Ce qui change et pourquoi |
|---|---|
| `docs/decisions/0003-precision-du-decoupage-en-lots.md` | Statut `actée`, validation par Lucas. |
| `docs/decisions/0001-decoupage-en-lots-livrables.md` | En-tête : remplacée par 0003. |
| `docs/decisions/README.md` | Index : 0001 remplacée, 0003 actée. |
| `CLAUDE.md` | Section 2 : 0003 remplace 0001 parmi les décisions actées. |
| `status.yml` | Section `lots:` d'après 0003 ; scénarios, critère et jalon du lot 1 ; en-tête. |
| `journal/2026-09-23-2045-acte-des-lots-et-jalon-lot-1.md` | Créé : la présente entrée. |

## Issues liées

- `#47` — fermée : soldée par les scénarios du lot 1.
- `#48`, `#49`, `#50` — ouvertes dans le jalon du lot 1 : automatiser chaque scénario.
- `#36` — commentée : 0004 n'est pas prête à être actée, ce qui lui manque est listé.

## Points ouverts

- **Fiches à acter avant la première ligne de code du lot 1**, dans l'ordre de leurs dépendances :
  découpe interne (`#36`, fiche 0004), chaîne de qualité (`#37`), base de données et journal
  (`#38`), contrat (`#39`), écrans (`#40`). Puis, avant que le premier module du lot 1 soit fini,
  parce que le scénario 1 les mobilise dès ses premières étapes : temps réel (`#41`), traitements
  différés (`#42`), impression (`#43`). Avant la clôture du lot : installation et mise à jour (`#45`),
  pour la démonstration sur une instance installée et les mesures de `RG-EXI-072` et `073`. Hors lot
  1 : échanges (`#44`) et espace technique (`#46`), au lot 5.
- **0004 n'est pas prête à être actée.** Il lui manque : les réponses de Lucas à ses quatre points à
  trancher ; la place des tests de bout en bout des scénarios dans le dépôt ; le classement explicite
  des termes du glossaire entre socle et logistique, sur lequel repose son test de vocabulaire ; et
  une réponse sur la destination d'impression soulevée ci-dessous.
- **Incohérence de spécification** : le scénario 1 rattache l'imprimante d'étiquettes « au quai
  Q1 » ; `RG-SUR-085` et le glossaire ne connaissent comme destination que le poste ou la zone. De
  plus, « quai » n'est pas au glossaire : 0.3 en fait un type d'emplacement, le scénario un
  regroupement d'emplacements dans la zone QUAI. À trancher par Lucas.
- Toujours aucun code. Les issues de réalisation des modules restent bloquées.
