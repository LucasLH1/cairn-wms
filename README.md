# Cairn WMS

WMS/ERP logistique **multi-donneurs d'ordre** : un prestataire exploite ses sites, ses opérateurs et
ses stocks pour le compte de plusieurs donneurs d'ordre, chacun avec son propre paramétrage.

Ce dépôt est **public**. Il contient la spécification métier, les décisions techniques et le code du
produit. La pile est actée par les fiches `docs/decisions/0009` à `0030` ; le lot 1 est en cours.

## Structure du dépôt

| Chemin | Contenu |
|---|---|
| `docs/` | La spécification métier : ce que le produit doit faire, règle par règle. |
| `docs/README.md` | Carte des modules, conventions de lecture, principes directeurs. |
| `docs/glossaire.md` | Vocabulaire de référence. Un concept, un terme, aucun synonyme. |
| `docs/lots/` | Les scénarios de démonstration de chaque lot, et la maquette du lot 1. |
| `docs/decisions/` | Les décisions engageantes, une fiche par décision. |
| `apps/serveur/` | Le serveur, lancé dans ses deux rôles : gestes et traitements (fiches 0017, 0023). |
| `apps/ecrans/` | Les écrans, application web ouverte dans le navigateur (fiches 0010, 0014, 0025). |
| `packages/contrat/` | Les schémas du contrat entre écrans et serveur (fiches 0019, 0020). |
| `packages/ui/` | Les jetons de la maquette et la bibliothèque de composants (fiche 0011). |
| `packages/libelles/` | Les libellés, en français et en anglais, tirés du glossaire. |
| `journal/` | Une entrée par session de travail : ce qui a été fait, décidé, touché. |
| `status.yml` | L'état d'avancement des modules, des lots et de la pile. |
| `DEVELOPPEMENT.md` | Développer en local : prérequis, commandes. |
| `compose.yaml` | La base PostgreSQL du poste de développement. |
| `scripts/` | Scripts locaux : démarrage, remise à zéro de la base, contrôle des valeurs Tailwind. |
| `CLAUDE.md` | Les règles de travail dans ce dépôt. |
| `.claude/settings.json` | Hooks Claude Code du fil d'activité. Sans effet sur un poste où le script qu'ils appellent est absent. |

## Travailler sur le code

En local uniquement pour l'instant. Prérequis (WSL, Docker, Node.js, pnpm) et commandes :
[`DEVELOPPEMENT.md`](DEVELOPPEMENT.md).

```sh
pnpm install --frozen-lockfile
cp .env.example .env   # valeurs locales fictives
pnpm dev               # base, serveur dans ses deux rôles, écrans ; relancés à chaque modification
pnpm db:reset          # recrée la base et charge le jeu de données des scénarios
pnpm check             # la chaîne de la fiche 0024
```

## Avancement

Six couches, 23 modules, tous spécifiés ; cinq lots, dont le lot 1 en cours de réalisation. L'état se
lit dans `status.yml`.

## Branches

- `main` — production. Protégée : fusion par pull request uniquement, chaîne verte exigée.
- `dev` — branche de travail et branche par défaut.
