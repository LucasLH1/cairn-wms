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

`AAAA-MM-JJ-HHMM-sujet.md`

- `AAAA-MM-JJ` — la date de la session.
- `HHMM` — son heure de **début**, sur 24 heures. Elle distingue deux sessions du même jour sans
  ordinal, et classe les fichiers dans l'ordre chronologique.
- `sujet` — deux à quatre mots en minuscules et tirets, qui disent de quoi il retourne. Assez
  précis pour qu'on retrouve l'entrée sans l'ouvrir : `structuration-du-depot`,
  `specification-inventaires`, pas `travaux` ni `suite`.

Exemple : `2026-09-15-2155-structuration-du-depot.md`.

On ne fusionne pas deux sessions dans un même fichier, et on ne réécrit pas l'entrée d'un jour
passé : si on s'aperçoit après coup qu'on s'était trompé, on le dit dans l'entrée du jour où on
s'en aperçoit.

## En-tête

Chaque entrée s'ouvre par un bloc YAML, avant tout titre. C'est la partie lisible par une machine :
elle permet de retrouver toutes les sessions ayant touché un module ou une issue sans lire le corps.

```yaml
---
date: 2026-09-15 21:55
objectif: Structurer le dépôt autour de la spécification existante.
modules: ["0.1", "1.2"]
issues: [8, 14]
---
```

| Champ | Contenu |
|---|---|
| `date` | Date et heure de début, au format `AAAA-MM-JJ HH:MM`. Cohérente avec le nom du fichier. |
| `objectif` | L'intention de la session **en une ligne**. La section « Objectif » la développe. |
| `modules` | Les identifiants des modules touchés, tels qu'ils figurent dans `status.yml` : `["2.1", "2.2"]`. Liste vide `[]` si la session n'a touché aucun module. |
| `issues` | Les numéros d'issue GitHub concernés : `[8, 14]`. Liste vide `[]` si aucune. |

Les identifiants de module sont **entre guillemets** — sans quoi `2.1` est lu comme un nombre, et
`0.10` deviendrait `0.1`.

## Format d'une entrée

Six sections, dans cet ordre, après l'en-tête. Aucune n'est facultative ; une section sans contenu
porte `Néant`.

```markdown
---
date: AAAA-MM-JJ HH:MM
objectif: …
modules: []
issues: []
---

# Session du AAAA-MM-JJ — sujet

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

Les issues de l'en-tête, avec ce qui leur est arrivé : `#12 — fermée`, `#14 — ouverte`,
`#7 — commentée, en attente d'arbitrage`.

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
