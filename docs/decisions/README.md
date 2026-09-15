# Décisions

Ce dossier conserve les **décisions engageantes** du projet : celles qu'on ne peut pas revenir
défaire à bon compte, et dont quelqu'un — dans six mois, ou six ans — voudra connaître la raison.

À ce jour, **aucune décision n'est prise**. Ce dossier ne contient que ce README et le modèle de
fiche. Tant qu'il est vide, aucun choix technique n'est arrêté : ni langage, ni base de données,
ni architecture, ni hébergement, ni outillage.

## La règle

> **Ce qui n'est pas écrit ici n'est pas décidé.**

Un choix absent de ce dossier ne doit jamais être supposé, ni déduit d'un fichier existant, ni
imposé par un raccourci de mise en œuvre. Face à un choix engageant non tranché : on écrit une
fiche et on la fait valider — on ne code pas d'abord.

## Ce qui mérite une fiche

Une décision dont on ne peut pas sortir sans coût mérite une fiche. Concrètement :

- un choix de technologie (langage, base de données, file, hébergement, outillage) ;
- une frontière d'architecture (ce qui est un module, ce qui est un service, ce qui parle à quoi) ;
- un modèle de données structurant, ou une règle qui contredit la spécification métier ;
- l'ajout d'une dépendance qu'on ne pourrait plus retirer sans réécrire ;
- un renoncement : ce qu'on décide explicitement de **ne pas** faire.

Ce qui n'en mérite pas : le nommage d'une variable, l'ordre de deux fonctions, tout ce qu'un
`git revert` suffit à annuler.

## Forme

Un fichier par décision, jamais deux décisions dans le même fichier.

**Nom du fichier** : `NNNN-titre-court.md`, numérotation continue à partir de `0001`, en minuscules
et tirets. Exemple : `0001-choix-du-langage-serveur.md`.

**Un numéro n'est jamais réutilisé.** Si une décision est abandonnée, sa fiche reste en place, son
statut passe à *remplacée* ou *abandonnée*, et la suivante prend le numéro d'après. La même
discipline s'applique ici qu'aux identifiants de règles `RG-XXX-nnn` de la spécification.

**Statuts** :

| Statut | Sens |
|---|---|
| `proposée` | Écrite, pas encore validée. N'engage personne, ne doit pas être mise en œuvre. |
| `actée` | Validée. Fait autorité. |
| `remplacée par NNNN` | Une décision plus récente a pris le relais. La fiche reste, pour l'histoire. |
| `abandonnée` | Le sujet ne se pose plus. La fiche reste, pour la même raison. |

**On ne réécrit pas une fiche actée.** Si la décision change, on en écrit une nouvelle qui remplace
l'ancienne. L'historique doit rester lisible : ce qu'on savait au moment de trancher compte autant
que ce qu'on a tranché.

## Écrire une fiche

Copier `modele.md`, le renommer, le remplir. Le modèle est volontairement court : quatre sections,
dont aucune n'est facultative.

Une fiche utile se reconnaît à sa section **Options** : si elle n'en contient qu'une, ce n'était pas
une décision, c'était une constatation. Les options écartées valent autant que celle retenue — elles
évitent de rouvrir six mois plus tard un débat déjà tenu.

## Lien avec le reste du dépôt

- La **spécification** (`docs/`) dit ce que le produit doit faire. Elle ne contient aucun choix
  technique et ne doit pas en recevoir.
- Les **décisions** (ici) disent comment on s'y prend, et pourquoi.
- Le **journal** (`journal/`) dit ce qui s'est passé, session après session. Une décision prise en
  session est mentionnée dans l'entrée du jour **et** fait l'objet d'une fiche ici : le journal
  raconte, la fiche fait foi.
