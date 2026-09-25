---
date: 2026-09-25 20:00
objectif: Mettre les traces à jour de la pile actée, réaliser l'ossature du lot 1 jusqu'au vert, puis l'étape 1 du scénario 1.
modules: ["0.1", "0.2", "0.5", "0.7", "0.8", "0.9", "1.1"]
issues: [24, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 48, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 72, 73]
---

# Session du 2026-09-25 — ossature du lot 1 et première étape du scénario 1

L'heure de début est approximative : la session a commencé après le commit `435c16d` et avant le
premier commit de code (`fd329b5`).

## Objectif

Lucas : la pile est actée (fiches 0009 à 0030). D'abord les traces — CLAUDE.md §2, `status.yml`, issue
24, issues 36 à 46, journal. Puis l'ossature du lot 1, sans aucune fonctionnalité métier tant qu'elle
n'est pas verte en intégration continue. Puis le scénario 1, étape par étape, chaque étape couverte par
son test de bout en bout.

En cours de session, Lucas a précisé : développement en local uniquement ; 0029 (staging) et 0030
(sauvegarde) restent actées mais leur mise en œuvre est reportée — ni image publiée, ni déploiement, ni
Coolify, ni pgBackRest, ni proxy.

## Actions

**Traces de la pile.** CLAUDE.md §2 et `status.yml` disent la pile actée (0009 à 0030). Issue 24
commentée puis fermée ; issues 36 à 43 et 45 fermées avec la fiche qui les reprend ; 44 (échanges) et
46 (sécurité de l'espace technique) restent ouvertes, aucune fiche ne les couvre avant le lot 5.
L'entrée de journal de la conversation du 2026-09-25 a reçu un complément : 0029 et 0030, le nom
« staging » retenu par Lucas, l'infrastructure reportée.

**Ossature**, dans l'ordre des issues du jalon du lot 1 :

- #51 — espace de travail pnpm et arborescence de 0023 ; réglages de 0017 : versions exactes, délai de
  trois jours avant d'adopter une version, scripts d'installation bloqués.
- #52 — chaîne de 0024 sur GitHub Actions, deux jobs : compilation, analyse, frontières, format,
  style, migration d'une base vierge par le point d'entrée compilé, écart des types de la base, Vitest
  contre PostgreSQL 18.6, audit ; puis tests Playwright dans Chromium. `main` exige les deux.
- #53 — environnement local (périmètre revu) : `compose.yaml` (la base seule), `pnpm dev` qui démarre
  tout et relance à chaque modification, `pnpm db:reset` qui recrée la base et charge le jeu de
  données, `DEVELOPPEMENT.md` avec les prérequis WSL.
- #54 — Kysely, rôles `cairn_owner` (migre) et `cairn_app` (sert), migrations en avant seulement ;
  journal en ajout seul, partitions mensuelles, déclencheur qui refuse modification et suppression
  quel que soit le rôle ; `/health` qui vérifie base et migrations.
- #55 — contrat et greffon des gestes : identifiant de geste sous contrainte d'unicité, rejeu qui rend
  le premier résultat sans rejouer le traitement, droits avant tout effet, refus typés tracés.
- #56 — comptes (scrypt), sessions en base, déclaration de poste et cookie de poste signé, contrôle
  permission et périmètre d'exécution.
- #57 — signaux de changement par `pg_notify`, relayés par WebSocket aux écrans abonnés.
- #58 — graphile-worker dans le rôle « traitements », travaux ajoutés dans la transaction du geste.
- #59 — cadre des écrans (routeur, cache, formulaires, libellés, canal temps réel, service de lecture
  de code-barres), composants tirés de la maquette, écran d'ouverture de session.

**Scénario 1, étape 1** (#60) : Anna saisit l'attendu de Maison Démo pour le site A, trois lignes ;
l'attendu est ouvert, numéroté, daté, son solde égale la quantité attendue, il apparaît parmi les
attendus ouverts du site. Serveur (migration 0003, modules organization, party, item, reception,
consultations), écrans (Réceptions, saisie, attendu), test de bout en bout vert en intégration.

Chaque barrière posée a été prouvée par son rouge : déclencheur du journal, droits du rôle de
l'application, ordre droits-effets, absence de rejeu du traitement, permission, échéance de session,
signature du cookie de poste, filtre des abonnements, référence obsolète, visibilité, écart des types.
Deux tests verts pour une mauvaise raison ont été corrigés : un cookie de poste falsifié sur un poste
inexistant, et un rejeu que la contrainte d'unicité rattrapait sans que le test le distingue.

## Décisions

- **pnpm 12, délai de trois jours** avant d'adopter une version publiée (`minimumReleaseAge`), comme le
  veut la fiche 0017 ; vérifié : une version publiée le jour même est écartée.
- **TypeScript 6.0.3**, pas 6.1 : typescript-eslint exige une version inférieure à 6.1.
- **Protection de `main`** : fusion par pull request, les deux jobs de la chaîne exigés, ni poussée
  forcée ni suppression, y compris pour les administrateurs. Aucune pull request vers `main` ouverte.
- **Alignement sur 0029 et 0030**, arrivées pendant la session : flux nommé `qualite.yml`, routes
  `/version`, `/health`, `/live`. Leur infrastructure est ensuite reportée à la demande de Lucas (#72).
- **Glossaire** : section « Gestes et accès » (geste, identifiant de geste, refus, motif de refus,
  utilisateur, session, clé d'agent, signal de changement), puis identifiant de connexion, mot de
  passe, traitement différé, consultation.
- **Aucune date d'activité d'utilisateur** : une session ne porte que son échéance ; ni heure de
  connexion, ni dernière activité, ni événement d'ouverture (RG-TRA-015, RG-SUR-138). Tension avec la
  « expiration après inactivité » de 0027, remontée en #73.
- **Cookie de poste signé** (HMAC) plutôt que jeton en base : le geste de déclaration, rejoué, pose le
  même cookie sans qu'aucun secret ne soit gardé dans la réponse enregistrée.
- **File des traitements** : les tables de graphile-worker sont protégées par des politiques de ligne
  que seul leur propriétaire contourne ; le rôle de l'application reçoit la sienne, pour ajouter un
  travail dans la transaction du geste.
- **Tests et base de développement** sur la même instance PostgreSQL : les rôles valent pour toute
  l'instance, les tests reprennent donc les mots de passe du `.env` au lieu de les changer.
- **Maquette** : jetons manquants ajoutés (texte secondaire, bords, navigation, barre du haut,
  ambiance), surface des panneaux corrigée à 70 %. Écarts comblés au plus juste et signalés : anneau
  de focus (la maquette n'en a pas), écran d'ouverture de session, fermeture de session.
- **Nouvelle barrière de la chaîne** : les écrans n'emploient de classes utilitaires que pour la mise
  en page (fiche 0011) ; couleur, typographie et bordures appartiennent aux composants.

## Fichiers touchés

| Chemin | Ce qui change et pourquoi |
|---|---|
| `CLAUDE.md`, `README.md`, `DEVELOPPEMENT.md` | Pile actée ; structure du dépôt ; développement local. |
| `status.yml` | Pile actée ; modules 0.1, 0.2, 0.5, 0.7, 0.8, 1.1 en développement ; lot 1 en développement, ossature réalisée, étape 1 du scénario 1. |
| `docs/glossaire.md` | Termes des gestes, de l'accès, des traitements différés et des consultations. |
| `journal/2026-09-25-1940-…` | Complément : 0029, 0030, « staging », infrastructure reportée. |
| `package.json`, `pnpm-workspace.yaml`, `tsconfig*.json`, `eslint.config.js`, `.dependency-cruiser.cjs`, `.stylelintrc.json`, `vitest.config.ts`, `playwright.config.ts` | Espace de travail et chaîne de qualité. |
| `.github/workflows/qualite.yml` | Chaîne complète, service PostgreSQL, job de bout en bout. |
| `compose.yaml`, `scripts/`, `.env.example` | Environnement local, remise à zéro, instance des tests, barrières de style. |
| `apps/serveur/` | Socle (base, journal, gestes, consultations, comptes, droits, temps réel, file, numérotation, santé), logistique (organisation, tiers, références, réception), migrations 0001 à 0003, jeu de données. |
| `apps/ecrans/` | Cadre des écrans, session, ossature, Réceptions, saisie et consultation d'un attendu. |
| `packages/contrat/`, `packages/libelles/`, `packages/ui/` | Contrat, libellés français et anglais, jetons et composants. |
| `tests/` | Tests de bout en bout : session, scénario 1 étape 1. |

## Issues liées

- `#24` fermée ; `#36` à `#43` et `#45` fermées ; `#44`, `#46` ouvertes (lot 5).
- `#51` à `#59` : ossature réalisée, commentées ; `#72` ouverte (infrastructure reportée).
- `#48`, `#60` : scénario 1, étape 1 réalisée.
- `#73` ouverte : seize questions nées de la réalisation, chacune avec sa réponse provisoire.

## Points ouverts

- **#73**, à trancher par Lucas — les plus pressantes pour la suite du scénario : les permissions des
  rôles du jeu de données (Chloé ouvre l'arrivage dès l'étape 2), qui déclare les postes, l'échéance
  de session face à RG-TRA-015.
- **Étape 2 et suivantes** (#61 à #71) : quais et zones, arrivage, supports et étiquettes, agent
  d'impression, stock, missions de rangement, file de décisions, alertes.
- **Clés d'agent** (0027, règle 5) : avec l'agent d'impression, étape 5.
- **Tests sur appareil réel** : les tests de bout en bout tournent dans Chromium ; les moments à
  constater à l'écran (README du lot 1) restent à voir par Lucas.
