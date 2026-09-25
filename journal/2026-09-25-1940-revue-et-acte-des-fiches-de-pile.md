---
date: 2026-09-25 19:40
objectif: Revoir les fiches de pile proposées, les acter, et écrire les fiches de détail jusqu'à une pile complète.
modules: ["0.9"]
issues: [24]
---

# Session du 2026-09-25 — revue et acte des fiches de pile

Entrée écrite par la session Claude Code suivante, à partir des fiches et des commits `90b7464` à
`435c16d` (19:41 à 19:55) : la conversation s'est tenue hors du dépôt. L'heure de début est celle du
premier commit, faute de mieux.

## Objectif

Relire les fiches 0012 à 0017, proposées la veille, les acter, puis écrire les fiches qui manquaient
pour passer au développement : environnement d'exécution, cadre du serveur, schémas, accès aux données,
journal, découpe interne, chaîne de qualité, cadre des écrans, temps réel, authentification,
traitements différés.

## Actions

- Revu les fiches 0012 à 0017.
- 0012 (PostgreSQL seul) et 0013 (monolithe modulaire) validées par Lucas.
- Lucas a délégué la suite : « Prends les décisions qu'il faut, je veux passer au dev le plus
  rapidement possible. » Sur cette délégation, Claude a acté 0014 à 0017, puis écrit et acté 0018 à
  0028. Chaque fiche porte la mention de la délégation.
- Corrigé une coquille dans 0028, sans changer la décision ; mis à jour l'index des décisions.

## Décisions

- **Validées par Lucas** : 0012 — PostgreSQL seul, porteur aussi de la file et des notifications ;
  0013 — monolithe modulaire.
- **Actées par Claude sur délégation** : 0014 — application web dans le navigateur ; 0015 — conteneurs
  et fichier de composition, espace technique en processus distinct ; 0016 — impression par agent
  d'impression ; 0017 — garde-fous du serveur TypeScript ; 0018 — Node.js en version à support long ;
  0019 — Fastify et contrat des gestes ; 0020 — Zod ; 0021 — Kysely et migrations à la main ; 0022 —
  journal d'événements ; 0023 — espace de travail pnpm et découpe interne vérifiée par
  dependency-cruiser ; 0024 — GitHub Actions, Vitest et Playwright ; 0025 — Vite, TanStack Router et
  Query, React Hook Form, i18next ; 0026 — WebSocket et signaux sans contenu ; 0027 — comptes, sessions
  et postes tenus par l'instance ; 0028 — graphile-worker.
- La pile est complète : le développement du lot 1 peut commencer.

## Fichiers touchés

| Chemin | Ce qui change et pourquoi |
|---|---|
| `docs/decisions/0012-…` à `0017-…` | Statut `actée`, mention de validation ou de délégation. |
| `docs/decisions/0018-…` à `0028-…` | Créées, actées. |
| `docs/decisions/README.md` | Index : pile actée. |

## Issues liées

- `#24` — soldée par ces fiches ; fermée par la session suivante.

## Points ouverts

- Les « Non prouvé » des fiches, à mesurer au lot 1 : mémoire sur le serveur de référence, temps de
  réponse, débit des notifications, distinction lecture-frappe des lecteurs, exécutable autonome de
  l'agent sous Windows.
- Navigateur non déclaré comme poste : à trancher en conversation métier (fiche 0027).
- Stockage du journal au-delà de quarante gigaoctets à l'hypothèse de volumétrie (fiches 0012, 0022).
- Fiches encore à écrire : échanges (lot 5), sécurité de l'espace technique (lot 5).

## Complément — 0029 et 0030 (ajouté par la session suivante)

L'entrée ci-dessus s'arrêtait à 0028. La même conversation a ensuite produit deux fiches, arrivées dans
le dépôt par les commits `b551616`, `43be54c` et `15ff1d3` :

- **0029 — Environnements et déploiement** : un environnement de préproduction nommé **« staging »**,
  nom retenu par Lucas ; déploiement par Coolify, une image par commit, routes `/version`, `/health`,
  `/live`. Actée par Claude sur délégation.
- **0030 — Sauvegarde et restauration** : pgBackRest, restauration éprouvée par la chaîne. Actée par
  Claude sur délégation.

La pile actée va donc de 0009 à 0030 : 0012 et 0013 validées par Lucas, 0014 à 0030 actées par Claude sur
délégation.

**Infrastructure reportée** (Lucas, 2026-09-25) : 0029 et 0030 restent actées, mais leur mise en œuvre
attend. Développement en local uniquement : ni image publiée, ni déploiement, ni Coolify, ni pgBackRest,
ni proxy. Suivi : `#72`.
