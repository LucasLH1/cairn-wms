---
date: 2026-09-24 21:45
objectif: Porter les réponses de Lucas sur le vocabulaire de la maquette, le thème et la conception des écrans.
modules: []
issues: [40]
---

# Session du 2026-09-24 — réponses sur la maquette et les écrans

## Objectif

Lucas a répondu aux questions laissées ouvertes par la session précédente. Porter ses réponses dans
le README du lot 1 et dans la fiche 0008, sans modifier le fichier de la maquette ni acter de fiche.

## Actions

- README du lot 1 : le glossaire fait foi contre la maquette ; tableau des correspondances —
  *Rotation du stock* → règle de prélèvement, *Contrôle avant fermeture* → contrôle de colisage,
  *douchette* → lecteur de code-barres ; le bloc *Simulation* hors produit ; la maquette du lot 1
  seule maquette. La phrase qui faisait imposer le vocabulaire par la maquette est corrigée.
- 0008, toujours `proposée` : thème sombre unique, toutes les couleurs par des jetons, aucune valeur
  en dur, contrôle qui le refuse, pour qu'un thème clair s'ajoute sans réécriture ; section
  « Libellés » ; section « Conception des écrans suivants » reprenant les cinq règles de Lucas ;
  interdictions correspondantes dans les Conséquences.
- Le fichier `docs/lots/lot-1/maquette.html` n'est pas modifié.
- Commenté `#40`.

## Décisions

- Décisions de Lucas, portées dans 0008 et dans le README du lot 1 : le glossaire l'emporte sur la
  maquette ; thème sombre unique pour l'instant, tout par jetons ; plus aucune maquette ni conception
  écran par écran — chaque écran se construit depuis les règles et parcours des modules, le
  glossaire et les composants existants ; un manque dans un parcours opérateur se signale, il ne
  s'invente pas ; Lucas vérifie les écrans dans l'application.
- 0005 à 0008 sont relues dans une conversation dédiée ; aucune ligne de code avant leur acte.

## Fichiers touchés

| Chemin | Ce qui change et pourquoi |
|---|---|
| `docs/lots/lot-1/README.md` | Correspondances de vocabulaire, bloc de simulation hors produit, maquette unique. |
| `docs/decisions/0008-ecrans.md` | Thème par jetons, libellés, conception des écrans suivants. |
| `journal/2026-09-24-2145-reponses-maquette-et-ecrans.md` | Créé : la présente entrée. |
| `status.yml` | Inchangé : aucun module ni lot ne change d'état, la date est déjà au 2026-09-24. |

## Issues liées

- `#40` — commentée : 0008 complétée, acte attendu.

## Points ouverts

- **Acte de 0005 à 0008**, dans la conversation dédiée ; c'est la condition de la première ligne
  de code du lot 1.
- Le contrôle qui refuse une couleur hors de la feuille des jetons est exigé par 0008 ; sa mise en
  œuvre relève de la chaîne de qualité (0005).
