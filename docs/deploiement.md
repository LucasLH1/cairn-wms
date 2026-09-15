# Logique de CI et de déploiement

Extraite des anciens workflows Cairn (`cloisonnement.yml`, `image.yml`, `qualite.yml`), écrits pour une pile Laravel/PostgreSQL/Vue **qui n'est pas reprise**. Ce document garde leur logique, indépendamment de toute pile, pour que les nouveaux workflows soient réutilisables d'un projet à l'autre sans reconfiguration.

## 1. Ce que faisaient les anciens fichiers

### `qualite.yml` — les contrôles bloquants
- **Déclenché** par un push sur `dev`, par toute pull request, ou à la main. Une nouvelle exécution sur la même branche annule la précédente.
- **La CI utilise la même pile que le poste de dev** (le même `docker compose`), avec une configuration tirée de `.env.example`. Objectif : jamais « vert chez moi, rouge en CI ».
- **Les contrôles vont du moins cher au plus cher** : cohérence de la copie de la spécification → interdiction des exceptions d'analyse statique → formatage (vérification seule) → analyse statique au niveau maximal → migrations → jeu de données → tests (architecture, unitaires, intégration) → contrôle du cloisonnement sur la base migrée.
- **Base réelle, jamais simulée.** Les migrations tournent sous le rôle propriétaire, pas sous le rôle applicatif, comme en production.
- **La base de test est remplie avant les tests**, pour qu'aucun test ne dépende d'une base vide.
- **Travail front séparé** : installation depuis le fichier de verrouillage, typage strict, tests unitaires, construction de production identique à celle de l'image.
- **Travail « adaptation aux appareils »** : application complète avec des données réalistes, Playwright sur **Chromium et WebKit** (WebKit = tous les navigateurs iOS), recherche des débordements et des cibles tactiles trop petites, route par route. Captures d'écran conservées en cas d'échec.
- **En cas d'échec** : journaux de la pile affichés.

### `cloisonnement.yml` — éprouver le garde-fou lui-même
- Plutôt que lancer le contrôle d'isolation des données (vert sur une base sans tables, donc sans valeur), il lance **l'épreuve du contrôle** : 13 cas, dont 12 doivent échouer **avec le bon message**.
- Principe : **un garde-fou qui ne refuse jamais n'est pas prouvé.**
- Le contrôle réel tourne dans `qualite.yml`, après les migrations.

### `image.yml` — construire une fois, promouvoir sans reconstruire
- **Sur `dev` uniquement : construction de l'image**, étiquetée **par le SHA du commit**, jamais par une étiquette mouvante (`latest`). Le SHA est injecté dans l'image. Publication sur le registre GitHub (GHCR), nom calculé en minuscules. Cache de construction GitHub Actions.
- **L'image est éprouvée avant publication** : démarrage avec ses dépendances, puis vérification que :
  - les dépendances d'exécution se chargent ;
  - `/version` renvoie **ce** SHA ;
  - `/health` répond **200** avec ses dépendances ;
  - `/health` répond **503** une fois une dépendance coupée (la sonde doit savoir dire non).
- **Sur les autres branches : aucune reconstruction.** On vérifie que l'image du SHA existe déjà. « Accès refusé » et « image absente » sont deux erreurs distinctes. Une image manquante signifie que le commit n'est pas passé par `dev` : on enquête, on ne reconstruit pas.
- **Déploiement (Coolify)**, seulement si l'image existe : mise à jour de l'étiquette d'image de l'application, appel de déploiement, attente que `/version` serve le nouveau SHA, **puis** que `/health` soit à 200.

## 2. Principes
1. **Construire une fois, déployer partout** : une image immuable par SHA, la même dans chaque environnement.
2. **Éprouver l'artefact, pas seulement la construction** : démarrage réel, contrôles positifs **et** négatifs.
3. **Contrat `/version` et `/health`** : `/version` renvoie `{"commit": "<sha>"}`, `/health` renvoie 200 ou 503 selon les dépendances.
4. **Promotion sans reconstruction** : un déploiement désigne un SHA déjà construit et éprouvé.
5. **Déploiement vérifié** : la bonne version, puis la bonne santé, avant de déclarer le succès.
6. **Parité poste / CI** : même fichier compose, même configuration d'exemple.
7. **Contrôles ordonnés du moins cher au plus cher**, avec délai maximal par travail, annulation des exécutions obsolètes, journaux ou captures en cas d'échec.
8. **Données réalistes** pour les tests et les contrôles visuels.
9. **Tout garde-fou est éprouvé** par des cas qui doivent échouer.
10. **Secrets uniquement dans les secrets GitHub et Coolify** ; aucun nom propre au dépôt écrit en dur.

## 3. Modèle réutilisable

### Contrat que chaque application respecte
- Un `Dockerfile` à la racine, qui accepte le SHA en argument de construction (`APP_COMMIT`).
- Les routes `/version` et `/health`, conformes au contrat.
- Un `compose.yaml` pour le poste et la CI.
- Les étapes propres à la pile dans des scripts à noms fixes : `scripts/ci/lint`, `scripts/ci/test`, `scripts/ci/smoke` (démarre l'image, vérifie le contrat, coupe une dépendance, vérifie le 503). **Les workflows appellent ces scripts et ne connaissent pas la pile.**

### Workflows génériques
- **`qualite.yml`** : pull request, push sur `dev`, manuel ; lance `scripts/ci/lint` puis `scripts/ci/test`.
- **`image.yml`** : sur `dev`, construit, lance `scripts/ci/smoke`, publie l'image `ghcr.io/<dépôt en minuscules>:<sha>`.
- **`deploiement.yml`** : lancé à la main, par un événement, ou par le dashboard, avec deux paramètres : l'**environnement** et le **SHA**. Il vérifie que l'image existe, met à jour l'application Coolify de l'environnement, déclenche le déploiement, puis attend `/version` et `/health`. Il s'appuie sur les environnements GitHub ; `production` exige une validation manuelle quand le projet a plusieurs environnements.

### Secrets par environnement GitHub
`COOLIFY_URL`, `COOLIFY_TOKEN`, `COOLIFY_APP_UUID`, `APP_URL`.

### Promotion par SHA, pas par branche
L'ancien modèle promouvait par branches (`dev` → `staging` → `main`). Ici, on promeut **un SHA** : pas de branche `staging`. `main` reflète ce qui est en production.

## 4. Hébergement : Coolify, conservé

> **Décision actée** : [`0001 — Hébergement sur Coolify`](decisions/0001-hebergement-sur-coolify.md).
Coolify reste sur le VPS. Il couvre ce dont on a besoin pour plusieurs applications sur un seul serveur :
- un sous-domaine et un certificat TLS par application ;
- des variables d'environnement et des volumes persistants gérés par application ;
- une API pour mettre à jour l'image et déployer, déjà utilisée par l'ancien modèle ;
- une interface pour voir l'état et les journaux.

Les alternatives (Dokploy, très proche ; Kamal, sans interface ; Docker Compose avec un reverse proxy, tout à la main) n'apportent rien de décisif ici.

## 5. Application au dashboard

> **Décision actée** : [`0002 — Dashboard : un seul environnement, production`](decisions/0002-dashboard-un-seul-environnement.md).
- Adresse : **monitoring.cairn-wms.fr**.
- **Un seul environnement : production.** La fusion de la pull request `dev` → `main` déclenche `deploiement.yml`, sans validation manuelle supplémentaire (la pull request en tient lieu).
- **Piège à éviter** : la fusion crée sur `main` un commit de fusion dont le SHA n'a jamais été construit. Le déploiement utilise donc le **SHA de tête de la pull request** (le dernier commit de `dev`, `pull_request.head.sha`), qui, lui, a son image éprouvée.
- `/health` à 503 si la base SQLite est inaccessible ou si le jeton GitHub est refusé.
- SQLite sur un **volume persistant** Coolify.
- Cairn aura, lui, `staging` et `production`, déployés depuis le dashboard.
