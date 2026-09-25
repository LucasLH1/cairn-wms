# Développer Cairn WMS en local

Tout tourne sur le poste : la base dans un conteneur, les deux rôles du serveur et les écrans en
processus locaux, relancés à chaque modification. Aucune image n'est construite ni publiée, aucun
déploiement n'a lieu : la mise en œuvre du staging (fiche 0029) et de la sauvegarde (fiche 0030) est
reportée (#72).

## Prérequis sous Windows : WSL

1. **WSL 2 avec Ubuntu.** Dans PowerShell : `wsl --install -d Ubuntu`, puis redémarrer.
2. **Le dépôt dans le système de fichiers Linux**, par exemple `~/projects/cairn-wms`, et non sous
   `/mnt/c/…` : la surveillance des fichiers et l'installation y sont bien plus rapides.
3. **Docker**, visible depuis WSL : Docker Desktop avec l'intégration WSL activée pour Ubuntu, ou
   Docker Engine installé dans Ubuntu. Vérifier : `docker compose version`.
4. **Node.js 24.21.0** (`.node-version`), installé dans WSL — par exemple avec nvm :
   `nvm install 24.21.0 && nvm use 24.21.0`. Vérifier que `which node` pointe dans le Linux, pas
   vers un `node.exe` de Windows.
5. **pnpm par Corepack**, dans WSL : `corepack enable`. La version est fixée par `packageManager`.
   Si `which pnpm` pointe sous `/mnt/c/…`, c'est le pnpm de Windows : lancer `corepack pnpm …` ou
   retirer le chemin Windows du `PATH` de WSL.

Sous Linux ou macOS, seuls les points 3 à 5 s'appliquent.

6. **Chromium pour les tests de bout en bout** : `pnpm exec playwright install --with-deps chromium`
   (demande les droits d'administration pour les bibliothèques système du navigateur).

## Première installation

```sh
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env    # puis remplacer chaque « a-remplacer » par une valeur locale fictive
```

Le `.env` n'est jamais suivi. Les mots de passe y sont ceux de la base jetable du poste, rien d'autre.

## Commandes

| Commande | Ce qu'elle fait |
|---|---|
| `pnpm dev` | Démarre tout : PostgreSQL par `docker compose`, compilation, migrations, puis compilation continue, rôles « gestes » (http://localhost:3000) et « traitements » relancés à chaque modification, écrans Vite (http://localhost:5173). `Ctrl+C` arrête tout sauf la base. |
| `pnpm db:reset` | Recrée la base locale, la migre et charge le jeu de données des scénarios du lot 1 (`docs/lots/lot-1/`), toutes valeurs fictives. Refuse d'agir sur une base qui n'est pas sur le poste. |
| `pnpm check` | La chaîne de la fiche 0024 : compilation, analyse, frontières, format, style, tests Vitest contre PostgreSQL. |
| `pnpm e2e` | Les tests de bout en bout : compile, construit les écrans, lance une instance à part (base `cairn_e2e`, port 3100) chargée du jeu de données, et déroule les tests Playwright dans Chromium. N'interfère pas avec `pnpm dev`. |
| `pnpm test` | Les tests seuls. La base `cairn_test` est recréée à chaque lancement. |
| `pnpm db:migrate` | Compile, puis applique les migrations en attente à la base locale. |
| `pnpm db:types` | Régénère les types de la base depuis la base migrée, après une nouvelle migration. |
| `docker compose down` | Arrête la base ; `docker compose down --volumes` l'efface. |

Après `pnpm db:reset`, les utilisateurs du scénario 1 — `anna`, `chloe`, `remi`, `bruno` — ouvrent
une session avec le mot de passe fictif `demo-fictif`, commun au jeu de données et sans valeur ailleurs.
Leurs rôles ne sont pas encore posés : ils viendront avec le scénario 1 (#60).

Routes techniques du serveur : `/live` (le processus répond), `/health` (la base répond et est
migrée), `/version` (le commit servi).

## Ajouter une migration

1. Écrire `apps/serveur/src/migrations/nnnn-sujet.ts` et l'inscrire en fin de liste dans
   `apps/serveur/src/migrations/index.ts`. Une migration publiée ne se modifie plus (fiche 0021).
2. `pnpm db:migrate`, puis `pnpm db:types`.
3. Committer la migration et `database.generated.ts` ensemble : la chaîne vérifie qu'ils concordent.
