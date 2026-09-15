# Cairn WMS

WMS/ERP logistique **multi-donneurs d'ordre** : un prestataire exploite ses sites, ses opérateurs et
ses stocks pour le compte de plusieurs donneurs d'ordre, chacun avec son propre paramétrage.

Ce dépôt est **public** et, à ce stade, **documentaire** : il ne contient aucun code applicatif.
**Aucune pile applicative n'est choisie** — ni langage, ni framework, ni base de données — et aucun
choix de technologie ne doit y être supposé. Seules la mise en service et la logique de déploiement
sont tranchées, par fiche, dans `docs/decisions/`.

## Structure du dépôt

| Chemin | Contenu |
|---|---|
| `docs/` | La spécification métier : ce que le produit doit faire, règle par règle. |
| `docs/README.md` | Carte des modules, conventions de lecture, principes directeurs. |
| `docs/glossaire.md` | Vocabulaire de référence. Un concept, un terme, aucun synonyme. |
| `docs/socle/` | Couche 0 — socle transverse (0.1 à 0.7). |
| `docs/flux-entrants/` | Couche 1 — flux entrants (1.1 à 1.4). |
| `docs/deploiement.md` | Logique d'intégration et de déploiement, indépendante de toute pile. |
| `docs/decisions/` | Les décisions engageantes, une fiche par décision. Deux actées : hébergement, environnements du dashboard. |
| `journal/` | Une entrée par session de travail : ce qui a été fait, décidé, touché. |
| `status.yml` | L'état d'avancement de chaque module, couche par couche. |
| `CLAUDE.md` | Les règles de travail dans ce dépôt. |

## Avancement

Six couches, 21 modules. L'état de chacun se lit dans `status.yml` :
**socle** → **flux entrants** → **cœur stock** → **flux sortants** → **métiers spécifiques** →
**pilotage**.

Les couches 0 et 1 sont spécifiées. Les couches 2 à 5 sont annoncées mais pas encore rédigées.
Rien n'est développé à ce jour.

## Branches

- `main` — production. Protégée : fusion par pull request uniquement.
- `dev` — branche de travail et branche par défaut.
