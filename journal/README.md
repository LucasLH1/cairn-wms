# Journal des sessions

Une entrée par session de travail. Le journal raconte **ce qui s'est passé** : ce qu'on cherchait,
ce qu'on a fait, ce qu'on a tranché, ce qu'on a laissé en suspens.

Il ne remplace ni la spécification (`docs/`, qui dit ce que le produit doit faire), ni les fiches de
décision (`docs/decisions/`, qui font foi sur les choix engageants), ni `status.yml` (qui donne
l'état courant). Il donne ce qu'aucun des trois ne garde : **la chronologie et les raisons du
moment**.

Écrire l'entrée à la fin de la session, jamais au début. Une session sans entrée est une session
perdue pour celui qui reprendra.

## Nommage

Un fichier par session : `AAAA-MM-JJ.md`.

Deux sessions le même jour : suffixer par un ordinal — `2026-09-15-2.md`. On ne fusionne pas deux
sessions dans un même fichier, et on ne réécrit pas l'entrée d'un jour passé : si on s'aperçoit
après coup qu'on s'était trompé, on le dit dans l'entrée du jour où on s'en aperçoit.

## Format d'une entrée

Six sections, dans cet ordre. Aucune n'est facultative ; une section sans contenu porte `Néant`.

```markdown
# Session du AAAA-MM-JJ

## Objectif

Ce qu'on cherchait à obtenir, en deux ou trois phrases. L'intention de départ, telle qu'elle
était formulée — pas telle qu'on la reformule après coup en voyant le résultat.

## Actions

Ce qui a été fait, dans l'ordre. Une puce par action, à l'indicatif passé. Ce qui a échoué
compte autant que ce qui a réussi : une piste abandonnée évite à la prochaine session de la
reprendre.

## Décisions

Ce qui a été tranché pendant la session, et pourquoi.

Toute décision engageante mentionnée ici doit **aussi** exister en fiche dans
`docs/decisions/` — le journal la raconte, la fiche fait foi. Renvoyer vers elle par son
numéro. Une décision qui n'est pas engageante (un nommage, un ordre de traitement) se note
ici et nulle part ailleurs.

Si rien n'a été tranché : `Néant`.

## Fichiers touchés

Les chemins créés, modifiés ou supprimés, avec en une ligne ce qui a changé et pourquoi.
Le diff dit quoi ; cette section dit pourquoi.

## Issues liées

Les issues GitHub ouvertes, commentées, mises à jour ou fermées pendant la session, par leur
numéro : `#12 — fermée`, `#14 — ouverte`, `#7 — commentée, en attente d'arbitrage`.

## Points ouverts

Ce qui reste en suspens et ce qui bloque : question sans réponse, arbitrage attendu,
incohérence repérée dans la spécification, dette assumée sciemment.

Cette section est la plus utile du journal. Une question qu'on ne note pas est une question
qu'on repose.
```

## Ce qu'une entrée doit permettre

Quelqu'un qui reprend le projet après trois semaines doit pouvoir, en lisant la dernière entrée et
`status.yml`, répondre à trois questions sans ouvrir le code : **où on en est**, **ce qui a été
décidé et pourquoi**, **ce qui coince**.

Si l'entrée ne permet pas ça, elle est trop courte. Si elle paraphrase le diff, elle est trop longue.
