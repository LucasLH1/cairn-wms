---
date: 2026-09-23 20:05
objectif: Réviser la fiche 0002 contre les exigences RG-EXI-064 à 071 et les hypothèses corrigées par Lucas, sans l'acter.
modules: ["0.9"]
issues: [24]
---

# Session du 2026-09-23 — révision de la pile d'ensemble

## Objectif

La spécification a changé sur `dev` après la rédaction de 0002 : 0.9 compte désormais 71
exigences, le README porte une orientation à long terme, et une fiche 0003 proposée précise le
découpage en lots. Lucas demande de réviser 0002 avant tout acte : évaluer les quatre piles contre
les nouvelles exigences, corriger les hypothèses de volumétrie, de sauvegarde et de licence, et
dire si la recommandation change. Ne rien reporter de 0003 dans `status.yml`.

## Actions

- Fait `git pull` et lu les cinq commits arrivés depuis `d7edc78` : `RG-EXI-064` à `068` (espace
  technique et état de santé), `069` (sobriété), `070` et `071` (frontière du socle), orientation à
  long terme du README, deux termes au glossaire (`OpsConsole`, `InstanceHealth`) et deux
  proscriptions (*console* au sens technique ; *monitoring*, *supervision*, *surveillance* au sens
  technique), fiche 0003 proposée.
- Fait vérifier en ligne les outils que la révision cite : contrôle des dépendances entre projets
  (ArchUnitNET, NetArchTest, dependency-cruiser, Boundary, Deptrac), sauvegarde continue PostgreSQL
  (pgBackRest, WAL-G), partitionnement, pilotage de conteneurs (Docker.DotNet, dockerode). Sources
  ajoutées à la fiche. Deux corrections en sont sorties : les références de projet .NET sont
  transitives par défaut, la frontière n'est étanche qu'avec un réglage explicite ; Boundary
  contrôle la frontière à la compilation en Elixir, donc la pile B la tient aussi. NetArchTest et
  Docker.DotNet d'origine sont dormants, remplacés par ArchUnitNET et Docker.DotNet.Enhanced.
- Ajouté aux quatre tableaux d'évaluation une ligne par exigence nouvelle (huit lignes par pile,
  71 au total). Bilans : A 68 satisfaites et 3 partielles ; B 68 et 3 ; C 70 et 1 ; D 61 et 10.
- Ajouté à la grille hors 0.9 trois lignes : processus par instance espace technique compris,
  frontière du socle (refusée par le compilateur ou signalée par un outil), empreinte sur un serveur
  d'entrée de gamme.
- Réécrit les hypothèses : volumétrie (plusieurs centaines de millions d'événements en cinq ans,
  journal partitionné dès la fiche base de données), sauvegarde (quelques minutes de perte chez
  l'éditeur par archivage continu ; quotidienne au minimum en auto-hébergement), licence (hypothèse
  « modèle n8n » retirée ; ne fermer aucune option, dépendances à licence permissive seulement).
  Ajouté deux points ouverts nés de la révision de 0.9 : serveur de référence et nom de l'exploitant.
- Ajouté une section sur ce que les nouvelles exigences ajoutent au coût de la pile C, et révisé la
  liste des fiches de détail : ajout de « découpe interne et frontière du socle » et d'« espace
  technique et état de santé », partitionnement du journal dans la fiche base de données, numéros
  retirés parce que `0003` est désormais prise.
- Retiré de la fiche sept emplois de *superviser* et *surveiller* au sens technique, proscrits
  depuis cette session.
- Commenté `#24`.

## Décisions

- **La recommandation de 0002 ne change pas : pile C.** Les nouvelles exigences la renforcent sur
  un point : la frontière du socle (`RG-EXI-070`) y est refusée par le compilateur, comme en B, alors
  que A et D ne la font tenir que par un outil. Elles alourdissent son coût : un troisième
  programme .NET à livrer (l'espace technique), deux modes de pilotage des instances, un
  cloisonnement en base dès le départ, et une empreinte mémoire à mesurer contre le serveur de
  référence.
- **Question du langage unique tranchée par Lucas** : un langage unique sert surtout une équipe
  humaine qui relit ; ici le typage à l'exécution prime. La fiche le dit, et la pile A n'est plus
  présentée comme un arbitrage ouvert.
- 0002 reste `proposée`. Rien n'est mis en œuvre.

## Fichiers touchés

| Chemin | Ce qui change et pourquoi |
|---|---|
| `docs/decisions/0002-pile-d-ensemble.md` | Révision avant acte : 71 exigences, hypothèses corrigées, coût augmenté, fiches de détail revues, vocabulaire aligné sur le glossaire. |
| `journal/2026-09-23-2005-revision-pile-d-ensemble.md` | Créé : la présente entrée. |
| `status.yml` | `mis_a_jour_le` inchangé au 2026-09-23. Aucun module ne change d'état. La section `lots:` n'est **pas** modifiée : 0003 n'est pas actée. |

## Issues liées

- `#24` — commentée : révision de 0002 faite, acte toujours attendu.

## Points ouverts

- **Acte ou refus de 0002 par Lucas.**
- **Acte ou refus de 0003.** À son acte : 0001 passe à « remplacée par 0003 », et la section `lots:`
  de `status.yml` reprend son tableau.
- **Serveur de référence** (0.9 §7) : l'hypothèse de la fiche est deux processeurs virtuels, quatre
  gigaoctets, quarante gigaoctets de SSD. À confirmer, puis à mesurer au lot 1 ; c'est la marge la
  plus étroite de la pile C.
- **Durée de reprise après panne** : la fiche pose une demi-journée ; Lucas n'a fixé que la perte
  admissible.
- **Nom de l'exploitant** : resté `Provider` dans le code tant que le glossaire ne dit pas autre
  chose.
- Pas d'issue ouverte pour l'espace technique : il relève du lot 5 dans 0003, qui n'est pas actée.
