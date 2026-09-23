---
date: 2026-09-23 19:15
objectif: Rattraper status.yml, CLAUDE.md, le journal et les issues après cinq jours de spécification, puis proposer la pile d'ensemble par une fiche 0002.
modules: ["0.8", "0.9", "2.1", "2.2", "2.3", "2.4", "3.1", "3.2", "3.3", "4.1", "4.2", "5.1"]
issues: [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35]
---

# Session du 2026-09-23 — traces et pile technique

## Objectif

Deux phases. D'abord remettre les trois traces du projet au niveau de la spécification, qui a
avancé du 18 au 23 par le connecteur de documentation sans les toucher : `status.yml`, journal,
issues, et la règle 2 de `CLAUDE.md` devenue fausse. Ensuite proposer la pile technique par une
fiche `docs/decisions/0002` au statut `proposée`, évaluée contre les exigences `RG-EXI`, sans
écrire une ligne de code ni une fiche de détail.

## Actions

### Phase 1 — traces

- Reconstitué le travail du 18 au 23 depuis `git log` (98 commits `docs:`) et écrit l'entrée
  `journal/2026-09-18-2137-specification-complete.md`, datée du premier commit qu'elle couvre.
- `status.yml` : modules 2.1 à 5.1 passés à `spécifié` avec `doc` et `prefixe_regles` relevés dans
  la carte de `docs/README.md` ; modules 0.8 (`RG-SUR`) et 0.9 (`RG-EXI`) ajoutés ; section `lots:`
  reprenant les cinq lots de la fiche 0001, contenu et preuve, état `à faire` ; en-tête réécrit ;
  `mis_a_jour_le` au 23. Les noms de 2.3 et 3.1 sont alignés sur la carte du README (« mise à
  disposition », « Commandes et lignes de commande »), qui est la source déclarée du fichier.
- `CLAUDE.md`, règle 2 : « ne contient aucune décision » remplacé par la mention de 0001, actée,
  portant sur l'ordre de réalisation ; aucune pile technique arrêtée. Rien d'autre modifié.
- GitHub : créé deux labels de module, `module/0.8-surfaces` et `module/0.9-exigences`, sur le
  modèle des 21 existants (la grille passe à 32 labels). Ouvert `#24` « Choisir la pile technique »
  (couche 0, module 0.9, `tech`) et `#25` « Réaliser le module 0.8 ». Ouvert `#26` à `#35`
  « Réaliser le module 2.1 … 5.1 » sur le modèle de `#1` à `#11`, dont la section « Préalable
  bloquant » renvoie désormais à 0001 et à `#24` plutôt qu'à un dossier de décisions vide. Fermé
  `#12` à `#21` comme terminées, chacune avec le chemin du document qui la solde et le numéro de
  l'issue de réalisation qui prend le relais. Jalons inchangés, par couche.

### Phase 2 — pile technique

- Reçu en cours de session un correctif de Lucas : 0.9 avait changé sur `dev` (commit `030d57a`,
  « acte les deux modes d'exploitation », `RG-EXI-059` à `063`, soit 63 exigences et non 58).
  Refait `git pull`, relu 0.9 en entier ; l'hébergement n'est plus un point ouvert, les modes
  d'exploitation deviennent le premier critère de départage.
- Lu en entier `docs/README.md`, `docs/glossaire.md`, 0.8, 0.9 et `docs/decisions/`.
- Défini quatre piles complètes : A TypeScript de bout en bout (Node, Fastify, Zod, Drizzle,
  pg-boss, ws, Vue) ; B Elixir/Phoenix (LiveView, Ecto, Oban) ; C .NET (API minimales, EF Core,
  Quartz.NET, SignalR, MailKit) + PostgreSQL + Vue avec client généré depuis OpenAPI ; D Laravel
  (Eloquent, files, Reverb, Inertia, Pest, Larastan, FrankenPHP). Écarté à l'entrée, avec motif :
  Python, Go, Rust, Java/Kotlin, Rails, SQLite en production.
- Évalué chaque pile contre les 63 exigences `RG-EXI` (quatre tableaux, une ligne par exigence,
  générés depuis une structure unique pour garantir la couverture), puis contre une grille hors 0.9
  « les erreurs se voient-elles sans relecture » : typage à la compilation et à l'exécution,
  frontière API/écrans, tests, corpus de l'IA, nombre de choix, rotation de l'écosystème, processus
  par instance, service Windows, agent d'impression, type décimal.
- Vérifié en ligne l'état de chaque technologie citée par quatre agents parallèles (registres npm,
  NuGet, hex.pm ; calendriers de support ; dépôts), sources citées dans la fiche. Faits qui ont
  changé l'évaluation : aucune bibliothèque IPP Node maintenue à source publique ; SharpIpp
  abandonné, remplacé par le fork SharpIppNext ; Quartz.NET 4.0 sorti trois semaines plus tôt avec
  ruptures ; QuestPDF non libre avec seuil de chiffre d'affaires ; Elixir 1.20 typé par inférence
  mais sans signatures avant 1.22 (mai 2027) ; pas de client IMAP Elixir établi ; client IMAP PHP
  de référence dormant depuis seize mois ; `pcntl` absent sous Windows ; Docker Desktop payant
  au-delà de 250 salariés ou 10 M$ ; Oban Web passé en Apache-2.0.
- Rédigé `docs/decisions/0002-pile-d-ensemble.md` depuis le modèle, statut `proposée` :
  contexte, quatre options, état vérifié, quatre tableaux d'évaluation, grille hors 0.9, décision,
  ce que la pile retenue satisfait mal, ce qu'elle coûte, hypothèses sur chaque point ouvert de 0.9
  §7 avec l'effet d'une autre réponse, fiches de détail à venir avec leurs dépendances.
- Relu la fiche contre les termes proscrits du glossaire : remplacé « tâche » (sens technique de
  traitement en arrière-plan) par « traitement différé », « notification » par « signalement »,
  « verrouille » par « bloque ». Les « verrous de ligne PostgreSQL » restent : la proscription ne
  vise que le sens du droit de modifier, qui s'appelle la main.
- Ajouté 0002 à l'index de `docs/decisions/README.md` avec son statut ; commenté `#24`.
- Aucun code, aucun manifeste, aucune configuration de pile écrits.

## Décisions

- Les noms de modules de `status.yml` suivent la carte de `docs/README.md` quand les deux
  divergent : le fichier le déclare lui-même comme source unique. Non engageant.
- Les issues de réalisation des modules gardent la structure de `#1` à `#11` ; seul le préalable
  bloquant est reformulé pour être vrai.
- **Fiche 0002 — Pile d'ensemble, `proposée`, non actée.** Elle recommande la pile C : .NET (LTS)
  et C# pour le serveur et l'agent d'impression, PostgreSQL, Vue 3 + TypeScript pour les écrans,
  contrat OpenAPI produit par le serveur. Critère décisif : erreurs visibles sans relecture
  (typage à la compilation et à l'exécution, décimal natif, peu de choix de bibliothèques,
  écosystème stable) conjugué aux deux modes d'exploitation (un processus par instance, service
  Windows natif, agent d'impression dans le même langage). Seconde de peu : la pile A. La fiche
  fait foi ; rien n'est mis en œuvre tant qu'elle n'est pas actée.

## Fichiers touchés

| Chemin | Ce qui change et pourquoi |
|---|---|
| `status.yml` | 21 → 23 modules, tous `spécifié` ; issues de réalisation reportées ; section `lots:` ; en-tête et date. |
| `CLAUDE.md` | Règle 2 : l'état de `docs/decisions/` dit vrai. |
| `journal/2026-09-18-2137-specification-complete.md` | Créé : reconstitution du 18 au 23. |
| `journal/2026-09-23-1915-traces-et-pile-technique.md` | Créé : la présente entrée. |
| `docs/decisions/0002-pile-d-ensemble.md` | Créé : la fiche proposée. |
| `docs/decisions/README.md` | 0002 ajoutée à l'index, `proposée` ; précision qu'une fiche proposée n'engage rien. |
| `status.yml` | **Inchangé en phase 2** : aucun module ne change d'état à la rédaction d'une fiche proposée. |

## Issues liées

- `#12` à `#21` — fermées, commentées avec le document qui les solde.
- `#24` — ouverte, commentée : la fiche 0002 est rédigée et attend l'acte ou le refus de Lucas.
- `#25` — ouverte : Réaliser le module 0.8.
- `#26` à `#35` — ouvertes : Réaliser les modules 2.1 à 5.1.

## Points ouverts

- **L'acte de 0002 revient à Lucas.** Trois questions que lui seul peut trancher, et qui pèsent
  sur la fiche : un langage unique de la base à l'écran compte-t-il plus que le typage à
  l'exécution et la stabilité de l'écosystème (si oui, pile A) ? Le code livré aux prestataires
  auto-hébergés peut-il être lisible, ou faut-il un code fermé ou une activation de licence (si
  fermé, la pile C est la mieux placée, et le dépôt public est à revoir) ? Une hypothèse sur
  les points ouverts de 0.9 §7 est-elle fausse (volumétrie, temps de réponse, sauvegarde, fuseau,
  impression, matériel, langue) ?
- **Licence et distribution** sont un point ouvert de 0.9 §7 qui n'est pas technique ; la fiche
  qui le tranchera est à écrire par Lucas, et conditionne la fiche d'installation.
- **Aucune fiche de détail** (base, qualité, contrat, écrans, temps réel, traitements différés,
  impression, échanges, installation et mise à jour) ne s'écrit avant l'acte de 0002.
- **Le dépôt reste sans code.** Les issues `#1` à `#11` et `#25` à `#35` restent bloquées par
  `#24`.
- L'entrée de journal du 18 au 23 couvre plusieurs séances du connecteur en un seul fichier, ce
  que `journal/README.md` déconseille ; c'est assumé : le connecteur ne tient pas de journal, et une
  reconstitution vaut mieux qu'un trou.
- Les jalons GitHub restent par couche ; le passage par lot attend le scénario du lot 1.
