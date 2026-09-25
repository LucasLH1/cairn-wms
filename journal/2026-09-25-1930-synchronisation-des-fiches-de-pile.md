---
date: 2026-09-25 19:30
objectif: Synchroniser CLAUDE.md, status.yml, l'issue 24 et le journal avec les fiches 0009 à 0017, sans modifier aucune fiche.
modules: ["0.9"]
issues: [24]
---

# Session du 2026-09-25 — synchronisation des fiches de pile

## Objectif

Les fiches 0009 à 0017 ont été écrites sur `dev` le 2026-09-24 par une conversation de conception
tenue hors du dépôt, qui ne tient ni `CLAUDE.md`, ni `status.yml`, ni les issues, ni le journal.
Remettre ces traces au niveau des fiches, sans toucher aux fiches.

## Actions

- Fait `git pull` et lu en entier les fiches 0009 à 0017 et l'index des décisions.
- `CLAUDE.md` §2 : « Aucune pile n'est choisie » remplacé par l'état réel — actées 0003, 0009, 0010,
  0011 ; proposées 0012 à 0017 — et par la règle de l'index : une fiche proposée ne se met pas en
  œuvre, rien de ce que couvrent 0012 à 0017 ne s'écrit avant leur acte. Phrase d'ouverture ajustée.
- `status.yml` : en-tête réécrit ; section `pile:` listant fiches actées et proposées avec leur
  chemin, rattachée à `#24` ; le module 0.9 reste sur `#24` ; `mis_a_jour_le` au 2026-09-25.
- `#24` commentée avec l'état et les liens ; laissée ouverte.
- Écrit l'entrée `2026-09-24-2203-conception-technique.md` relatant la conversation, à partir des
  fiches, des commits et du compte rendu de Lucas.

## Décisions

Néant. Aucune fiche modifiée ni actée.

## Fichiers touchés

| Chemin | Ce qui change et pourquoi |
|---|---|
| `CLAUDE.md` | §2 et phrase d'ouverture : état réel de la pile. |
| `status.yml` | Section `pile:`, en-tête, date. Aucun module ni lot ne change d'état. |
| `journal/2026-09-24-2203-conception-technique.md` | Créé : la conversation de conception. |
| `journal/2026-09-25-1930-synchronisation-des-fiches-de-pile.md` | Créé : la présente entrée. |

## Issues liées

- `#24` — commentée, laissée ouverte.

## Points ouverts

- Acte ou refus des fiches 0012 à 0017.
- Les issues `#36` à `#46` portent encore les titres des fiches de détail de l'ancienne pile ; elles
  seront à reprendre ou à fermer quand les fiches à venir seront écrites.
