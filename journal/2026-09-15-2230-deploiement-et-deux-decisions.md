---
date: 2026-09-15 22:30
objectif: Verser la logique de déploiement au dépôt et en acter les deux décisions de mise en service.
modules: []
issues: []
---

# Session du 2026-09-15 — déploiement et deux décisions

## Objectif

Ajouter `docs/deploiement.md`, fourni par Lucas, puis en extraire deux décisions engageantes sous
forme de fiches actées : l'hébergement sur Coolify (§4) et le choix d'un environnement unique pour
le dashboard de pilotage (§5). Le document devait renvoyer vers les fiches ainsi créées.

## Actions

- Vérifié que `docs/deploiement.md`, déposé par Lucas dans le répertoire de travail, était
  identique à sa source (`Desktop/Cairn/Docs/Claude outputs/`) — empreinte `sha256` confirmée —
  puis suivi en l'état.
- Rédigé `docs/decisions/0001-hebergement-sur-coolify.md` à partir du §4 : quatre options — Coolify
  conservé, Dokploy, Kamal, Compose et reverse proxy à la main — toutes tirées du document, aucune
  inventée.
- Rédigé `docs/decisions/0002-dashboard-un-seul-environnement.md` à partir du §5. Le document
  n'énonçait pas d'alternative ; la seconde option est celle qu'il décrit lui-même pour Cairn WMS
  (`staging` + `production` avec validation manuelle, §3 et §5), et non une construction.
- Renvoyé vers chaque fiche depuis le titre de section correspondant de `docs/deploiement.md`.
- Corrigé trois affirmations devenues fausses le jour même : `CLAUDE.md` et
  `docs/decisions/README.md` écrivaient qu'aucune décision n'était prise ; `README.md` écrivait
  qu'aucune pile technique n'était choisie. Les trois disent désormais ce qui est tranché — la mise
  en service — et ce qui ne l'est pas — la pile applicative.
- Vérifié que les liens relatifs de tous les fichiers Markdown du dépôt résolvent : aucun lien mort.

## Décisions

Deux fiches actées, les premières du dépôt :

- **[`0001` — Hébergement sur Coolify](../docs/decisions/0001-hebergement-sur-coolify.md).**
  Coolify est conservé sur le VPS. Critère décisif : aucune alternative n'apporte d'avantage
  décisif face à une solution déjà en place et déjà pilotée par API ; changer coûterait une
  migration pour un gain nul.
- **[`0002` — Dashboard : un seul environnement, production](../docs/decisions/0002-dashboard-un-seul-environnement.md).**
  Le dashboard se déploie à la fusion de la pull request `dev` → `main`, sans validation
  supplémentaire. Critère décisif : la proportion — un palier de pré-production doublerait
  l'infrastructure d'un outil interne dont la panne n'interrompt aucun flux, et le contrôle humain
  existe déjà dans la pull request vers une branche protégée.

Les deux fiches disent explicitement ce qu'elles **ne** tranchent pas : rien de la pile applicative
de Cairn WMS, qui reste entièrement ouverte.

## Fichiers touchés

| Chemin | Ce qui change et pourquoi |
|---|---|
| `docs/deploiement.md` | Ajouté tel que fourni. Deux renvois insérés, sous les titres des §4 et §5, vers les fiches qui en actent le contenu. |
| `docs/decisions/0001-hebergement-sur-coolify.md` | Créé. Première décision actée du dépôt. |
| `docs/decisions/0002-dashboard-un-seul-environnement.md` | Créé. |
| `docs/decisions/README.md` | Le paragraphe « aucune décision n'est prise » est remplacé par la table des deux fiches actées et leur portée. |
| `CLAUDE.md` | Règle 2 : la phrase « `docs/decisions/` ne contient aucune décision » est remplacée par ce que les deux fiches tranchent, et par le rappel que la pile applicative reste ouverte. |
| `README.md` | Présentation et table de structure alignées : ajout de `docs/deploiement.md`, mention des deux fiches actées. |
| `status.yml` | **Inchangé, à dessein.** Aucun module n'a changé d'état : ces décisions portent sur la mise en service, pas sur un module de la carte. |

## Issues liées

Néant. Aucune des 21 issues ouvertes ne porte sur la mise en service — voir les points ouverts.

## Points ouverts

- **`docs/deploiement.md` contredit `docs/README.md`.** Ce dernier, qui fait partie de la
  spécification importée et que je n'ai pas modifié, affirme que le dossier « ne contient aucune
  décision technique : ni technologie, ni schéma de base de données, ni architecture applicative.
  Ces sujets sont traités ailleurs et ne doivent pas être introduits ici. » Le document de
  déploiement y entre en tension frontale. Deux sorties possibles, aucune prise : le déplacer hors
  de `docs/` (par exemple `technique/`), ou amender la phrase de `docs/README.md`.
- **Aucune issue ne couvre la mise en œuvre du modèle de déploiement.** `docs/deploiement.md` §3
  identifie un travail réel et non traité : le contrat `/version` et `/health`, les scripts
  `scripts/ci/lint`, `test`, `smoke`, et les trois workflows. La règle 3 de `CLAUDE.md` demande
  d'ouvrir une issue pour tout travail identifié et non traité — mais la nomenclature de labels
  arrêtée hier n'a pas de case pour de l'infrastructure : une issue sans couche ni module serait la
  première anomalie de la grille. À trancher avant d'ouvrir quoi que ce soit.
- **La pile applicative de Cairn WMS reste entièrement ouverte**, et les onze issues de réalisation
  (`#1` à `#11`) restent bloquées pour cette raison. Les deux fiches d'aujourd'hui ne les
  débloquent pas.
- Les points ouverts de l'entrée précédente restent ouverts : préfixes de règles des couches 2 à 5,
  nom des dossiers de couche, label `accessibility` hérité.
