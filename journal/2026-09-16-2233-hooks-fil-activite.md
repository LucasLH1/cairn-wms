---
date: 2026-09-16 22:33
objectif: Poser .claude/settings.json pour activer les hooks du fil d'activité, identiques à ceux de cairn-dashboard.
modules: []
issues: []
---

# Session du 2026-09-16 — hooks du fil d'activité

## Objectif

Activer dans `cairn-wms` les hooks Claude Code qui alimentent le fil d'activité du dashboard. Le
fichier `.claude/settings.json` est celui décrit et éprouvé dans `cairn-dashboard`
(`docs/hooks-claude-code.md`) : il est posé **tel quel**, sans rien y changer, le script installé
sur le poste reconnaissant le dépôt tout seul à partir du dossier qui porte le `.git`.

## Actions

- Lu, avant d'agir, `CLAUDE.md`, `journal/README.md`, `docs/README.md`, `status.yml` et la dernière
  entrée de journal, pour poser le fichier selon les règles du dépôt.
- Lu la source de référence `docs/hooks-claude-code.md` de `cairn-dashboard`, qui porte le fichier à
  poser, ses garde-fous et la frontière Windows/WSL.
- Créé `.claude/settings.json` avec le contenu fourni, sans modification.
- Vérifié que c'est du JSON valide, et qu'il est identique — au parse et à l'octet près — au bloc
  `hooks` du document de référence. La comparaison a d'abord visé par erreur le **premier** bloc
  JSON du document (l'exemple de secret `env`) ; corrigée pour cibler le bloc contenant
  `SessionStart`, elle confirme l'identité exacte.
- Vérifié qu'aucun secret ne figure dans le fichier : il ne porte que les hooks. Le secret
  `CAIRN_HOOKS_SECRET` vit hors dépôt, dans le `~/.claude/settings.json` du poste, et n'est pas en
  jeu ici.
- Vérifié la branche courante (`dev`), l'arbre propre et le remote avant de committer.

## Décisions

- **Aucune pull request vers `main`.** Les hooks se lisent depuis la copie locale du dépôt sur
  `dev` : y poser le fichier suffit à les activer pour les sessions qui travaillent ici. C'est la
  consigne de la session, cohérente avec la règle 4 (la promotion vers `main` est une décision
  humaine). La note du document de référence qui évoque une PR ne s'applique donc pas à ce cas.
- **Aucune fiche `docs/decisions/`.** Poser un fichier d'outillage local n'arrête aucune pile
  applicative : ce n'est pas un choix technique au sens de la règle 2. Le dossier des décisions
  reste vide.
- **Aucune issue ouverte pour ce chantier.** Le travail est identifié et traité dans la même
  session ; il ne relève d'aucun module, et la nomenclature d'issues reste close — couche, module,
  `spec`, `tech`, `bug`.

## Fichiers touchés

| Chemin | Ce qui change et pourquoi |
|---|---|
| `.claude/settings.json` | Créé. Active quatre hooks — `SessionStart`, `SessionEnd`, `Stop`, et `PostToolUse` restreint à `Edit\|Write\|NotebookEdit` — qui appellent `~/.local/bin/cairn-hooks` s'il est exécutable, et ne font rien sinon (`test -x … \|\| true`). Identique au fichier de `cairn-dashboard`. |
| `status.yml` | Inchangé. Aucun module n'a changé d'état : le fichier ne relève d'aucun module, et `mis_a_jour_le` suit l'état réel des modules, pas la tenue d'une session. |

## Issues liées

Néant. Aucune des 21 issues ouvertes ne porte ce chantier, et aucune n'est créée.

## Points ouverts

- **L'émission effective dépend du poste.** Sur poste Windows + WSL, seule une session lancée
  depuis WSL trouve `~/.local/bin/cairn-hooks` et le secret ; une session côté Windows a un autre
  `$HOME`, ne trouve rien et n'émet rien, sans erreur ni message (`test -x … || true`). Rien à
  corriger : c'est le garde-fou documenté dans `cairn-dashboard`.
- **Le script et le secret sont hors du périmètre de cette session.** L'installation
  (`npm run hooks:installer`) et le secret `CAIRN_HOOKS_SECRET` vivent hors du dépôt, côté
  `cairn-dashboard` et poste. Si le fil ne reçoit rien, c'est là qu'il faut regarder, pas ici.
- Les points ouverts des entrées précédentes restent ouverts : préfixes de règles des couches 2
  à 5, nom des dossiers de couche, label hérité, et la pile applicative non choisie qui bloque les
  onze issues de réalisation.
