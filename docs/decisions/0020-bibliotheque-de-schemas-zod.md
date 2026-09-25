# 0020 — Bibliothèque de schémas : Zod

**Statut** : actée · **Date** : 2026-09-25 · **Remplace** : — · **Remplacée par** : —

## Contexte

La fiche 0017 impose la validation de toute entrée par un schéma, les mêmes schémas servant à l'écran et
au serveur ; la fiche 0019 fait du contrat un ensemble de schémas dont sortent routes, client typé et
description publiée. La bibliothèque de schémas est structurante : elle se retrouve dans chaque geste,
chaque écran, chaque import.

## Options

### Option A — Zod

- **Ce que c'est** : bibliothèque de schémas TypeScript la plus répandue.
- **En faveur** : maîtrise par l'IA la plus large ; les types se déduisent des schémas ; conversion en
  JSON Schema intégrée depuis sa version 4, qui alimente la description publiée du contrat ;
  intégrations prêtes avec Fastify et les formulaires React.
- **En défaveur** : plus lourde que Valibot dans le navigateur.
- **Ce que ça ferme** : —

### Option B — Valibot

- **Ce que c'est** : bibliothèque modulaire, très légère.
- **En faveur** : poids minimal dans le navigateur.
- **En défaveur** : écosystème et maîtrise par l'IA moindres.
- **Ce que ça ferme** : —

### Option C — TypeBox

- **Ce que c'est** : schémas qui sont directement du JSON Schema.
- **En faveur** : natif pour Fastify ; description publiée sans conversion.
- **En défaveur** : écriture plus verbeuse ; moins répandue côté écrans.
- **Ce que ça ferme** : —

### Option D — ArkType

- **Ce que c'est** : schémas écrits dans une syntaxe proche des types TypeScript.
- **En faveur** : très rapide ; concis.
- **En défaveur** : plus jeune ; maîtrise par l'IA moindre.
- **Ce que ça ferme** : —

## Décision

**Les schémas du contrat, des entrées et des paramétrages s'écrivent avec Zod, dans sa version 4 ou
suivante** (option A).

Critère décisif : la bibliothèque la plus répandue, dont les schémas donnent à la fois les types, la
validation et la description publiée.

Proposée et actée par Claude le 2026-09-25, sur délégation explicite de Lucas : « Prends les décisions
qu'il faut, je veux passer au dev le plus rapidement possible. »

## Conséquences

- **Ce qu'on peut faire** : écrire un schéma une fois pour l'écran, le serveur et le contrat publié.
- **Ce qu'on ne peut plus faire** : valider une entrée par du code ad hoc ou une seconde bibliothèque.
- **Ce qu'il faut mettre en place** : les schémas vivent dans le paquet du contrat (fiche 0023) ; les
  messages de validation passent par les libellés du glossaire.
- **Ce qu'on accepte de payer** : quelques dizaines de kilo-octets de plus dans le navigateur.
- **Ce qui la remettrait en cause** : une validation trop lente pour `RG-EXI-073` sur les gros imports,
  mesurée.
