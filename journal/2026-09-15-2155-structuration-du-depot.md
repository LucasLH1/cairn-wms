---
date: 2026-09-15 21:55
objectif: Structurer le dépôt autour de la spécification métier existante, sans arrêter aucun choix technique.
modules: []
issues: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]
---

# Session du 2026-09-15 — structuration du dépôt

## Objectif

Structurer le dépôt Cairn WMS, jusqu'ici vide de tout commit, autour de la spécification métier
existante : poser les branches et leur protection, importer la documentation sans la modifier,
ouvrir le cadre des décisions, tracer l'avancement des modules, et fixer les règles de travail.
Aucun choix technique ne devait être fait ni supposé.

## Actions

- Constaté l'état de départ : dépôt local sans aucun commit, remote GitHub public vide, branche
  `main` déclarée par défaut mais sans référence existante.
- Créé le commit d'amorce sur `main` (`README.md`, `.gitignore`, `.gitattributes`) et poussé —
  préalable indispensable, une branche sans référence ne pouvant pas être protégée.
- Repris ce commit après coup : il avait embarqué `docs/`, que Lucas avait copié dans le
  répertoire de travail pendant la phase de plan. Conformité du dossier vérifiée à la source par
  empreinte `sha256`, fichier par fichier — 13/13 identiques — avant de l'isoler dans son propre
  commit sur `dev`.
- Créé `dev` depuis `main`, puis empilé les commits de structuration : import de la spécification,
  cadre des décisions, `status.yml`, journal, `CLAUDE.md`.
- Défini `dev` comme branche par défaut du dépôt.
- Protégé `main` : fusion par pull request uniquement, zéro approbation requise, poussées forcées
  et suppression interdites, résolution des conversations exigée. **Puis, à la demande de Lucas,
  `enforce_admins` porté à `true`** — la protection ne connaît plus d'exception, administrateur
  du dépôt compris.
- Créé sur GitHub 30 labels (6 de couche, 21 de module, `spec`, `tech`, `bug`), 6 jalons sans date
  d'échéance, et 21 issues. Labels, jalons et issues sont générés depuis `status.yml` : le fichier
  reste la source, GitHub en est le reflet.
- Réinjecté les numéros d'issue dans `status.yml`, chaque module pointant vers celle qui porte son
  travail restant.
- Supprimé les 8 labels GitHub par défaut, tous inutilisés (`enhancement`, `duplicate`,
  `good first issue`, `help wanted`, `documentation`, `invalid`, `question`, `wontfix`).
- Adopté le format d'entrée de journal décrit dans `journal/README.md` — nom de fichier horodaté et
  en-tête YAML — et renommé la présente entrée en conséquence.

## Décisions

Aucune décision engageante, donc aucune fiche dans `docs/decisions/` — le dossier reste vide et
aucun choix technique n'est arrêté.

Cinq arbitrages d'organisation, tous validés en séance :

- **Amorce de `main` par un commit minimal**, le reste allant sur `dev`. `main` devient un point de
  départ de production légitime sans que le travail de structuration y soit poussé.
- **`enforce_admins` à `true`.** La protection avait d'abord été posée à `false` pour garder une
  sortie de secours ; Lucas a tranché l'inverse. Conséquence assumée : plus personne ne peut
  pousser sur `main`, et toute promotion passera par une pull request — y compris la sienne, y
  compris en urgence.
- **Zéro approbation requise** sur les pull requests vers `main` : seul contributeur, GitHub
  interdisant d'approuver sa propre demande, en exiger une bloquerait toute fusion.
- **Labels par défaut retirés.** La nomenclature du dépôt est close : une couche, un module, et
  trois labels transverses. Un label hors de cette grille est une anomalie à corriger, pas une
  variante à tolérer.
- **Journal horodaté à en-tête YAML.** Le nom du fichier porte l'heure de début et le sujet ; les
  modules et issues touchés sont déclarés en tête, donc retrouvables sans lire le corps.

## Fichiers touchés

| Chemin | Ce qui change et pourquoi |
|---|---|
| `README.md` | Créé. Présente le projet et la structure du dépôt. |
| `.gitattributes` | Créé. Normalise les fins de ligne en LF. |
| `.gitignore` | Créé. Exclut environnement, systèmes de fichiers, éditeurs — le dépôt est public. |
| `docs/` | 13 fichiers importés à l'identique, arborescence conservée, contenu non modifié. |
| `docs/decisions/README.md` | Créé. Ce qui mérite une fiche, comment elle se nomme, ce qu'on fait quand une décision change. |
| `docs/decisions/modele.md` | Créé. Modèle à quatre sections : contexte, options, décision, conséquences. |
| `status.yml` | Créé. 21 modules sur 6 couches, état déduit du seul contenu de `docs/`, lien vers l'issue portant le reste à faire. |
| `journal/README.md` | Créé, puis repris : nommage horodaté `AAAA-MM-JJ-HHMM-sujet.md` et en-tête YAML obligatoire. |
| `journal/2026-09-15-2155-structuration-du-depot.md` | Créé sous le nom `2026-09-15.md`, renommé au format adopté en fin de session. La présente entrée. |
| `CLAUDE.md` | Créé. Les cinq règles de travail dans ce dépôt. |

## Issues liées

- `#1` à `#11` — ouvertes. *Réaliser* les modules des couches 0 et 1, déjà spécifiés. Label `tech`.
- `#12` à `#21` — ouvertes. *Spécifier* les modules des couches 2 à 5, seulement annoncés. Label `spec`.

Aucune n'est fermée : rien n'est développé à ce jour.

## Points ouverts

- **Les préfixes de règles des couches 2 à 5 ne sont pas choisis** (`RG-XXX`). À déclarer dans le
  tableau de `docs/README.md` au moment de rédiger chaque module.
- **Le nom des dossiers de couche pour les modules 2 à 5 n'est pas fixé.** Les issues `#12` à `#21`
  le signalent plutôt que de l'inventer.
- **Le label `accessibility` subsiste**, hérité d'un état antérieur du projet et rattaché à aucune
  issue. À retirer ou à assumer explicitement dans la nomenclature.
- **Aucun choix technique n'est tranché.** Les onze issues de réalisation (`#1` à `#11`) sont
  bloquées tant que `docs/decisions/` reste vide. C'est volontaire, et c'est le prochain sujet.
