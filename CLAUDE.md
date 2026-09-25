# Règles de travail — Cairn WMS

Ce dépôt est **public** et, à ce stade, **documentaire**. Il décrit un WMS/ERP logistique
multi-donneurs d'ordre. La pile est actée (fiches 0009 à 0028) ; le code s'écrit dans leur cadre.

Ces règles priment sur toute habitude, tout raccourci et toute suggestion contraire.

---

## 1. Lire avant d'agir

Avant toute action — réponse, proposition, modification, création de fichier — lire :

- `docs/` : la spécification métier. Au minimum `docs/README.md` (carte des modules, conventions,
  principes directeurs), `docs/glossaire.md`, et le document du module concerné.
- `docs/decisions/` : les décisions engageantes déjà prises, et leur statut.

La spécification est la source unique de vérité du métier. Une règle porte un identifiant stable
`RG-XXX-nnn` : la citer par son identifiant plutôt que la reformuler.

**Un comportement non décrit ne se tranche pas à l'improviste.** Il se remonte comme une question.
C'est la consigne de la spécification elle-même : un cas limite non documenté est un bug en
puissance.

**Le vocabulaire n'est pas négociable.** Un concept porte un nom et un seul, défini dans
`docs/glossaire.md` — libellé français pour les écrans, terme anglais pour les données et le code.
Un terme absent du glossaire ne doit apparaître nulle part : on l'ajoute au glossaire d'abord.

## 2. Ne jamais supposer un choix technique

**Ce qui n'est pas écrit dans `docs/decisions/` n'est pas décidé.**

Aucun langage, aucun framework, aucune base de données, aucune architecture, aucun hébergement,
aucun outillage n'est arrêté tant qu'une fiche actée ne le dit pas. La pile a été reprise de zéro le
2026-09-24 (fiches 0002 et 0004 à 0008 abandonnées) ; elle est **actée** par les fiches `0009` à
`0028`, et l'ordre de réalisation en lots par `0003`.

**Le code s'écrit dans le cadre de ces fiches.** Tout choix engageant qu'elles ne couvrent pas — un
langage, une bibliothèque structurante, un composant de plus, une règle de dépendance, une forme de
livraison — demande une nouvelle fiche, actée, avant d'être mis en œuvre. Une fiche `proposée` ne se
met pas en œuvre (`docs/decisions/README.md`).

Cette règle vise **la pile du produit** : ce avec quoi Cairn WMS est construit, exécuté, éprouvé et
livré — intégration continue et déploiement compris. L'outillage du **processus de travail** —
configuration d'agent, hooks, réglages d'éditeur — n'en relève pas et ne demande pas de fiche,
**tant qu'il ne présuppose rien de la pile du produit**. `.claude/settings.json` en est l'exemple.
Au moindre doute sur ce qui tombe de quel côté : on pose la question.

En conséquence, dans ce dépôt :

- ne pas créer de code applicatif, de fichier de configuration de pile, de manifeste de dépendances,
  de conteneur, de schéma de base ;
- ne pas déduire un choix technique d'un fichier existant, d'un nom de dossier, ni de l'habitude
  d'un autre projet ;
- ne pas « commencer par » une technologie en attendant que la décision soit prise. Le provisoire
  fait autorité par défaut : c'est précisément ce qu'on refuse ici.

Face à un choix engageant non tranché : écrire une fiche depuis `docs/decisions/modele.md`, statut
`proposée`, et la faire valider. **On n'implémente pas une fiche `proposée`.**

## 3. Clore chaque session par ses trois traces

Une session n'est pas finie tant que ces trois-là ne sont pas à jour. Elles se font à la fin, et
elles ne se délèguent pas au « prochain coup ».

1. **Une entrée dans `journal/`** — un fichier `AAAA-MM-JJ-HHMM-sujet.md`, ouvert par un en-tête
   YAML, au format décrit dans `journal/README.md` : objectif, actions, décisions, fichiers
   touchés, issues liées, points ouverts.
2. **`status.yml` mis à jour** — l'état de chaque module touché (`à faire`, `spécifié`,
   `en développement`, `livré`), et le champ `mis_a_jour_le`. Un état ne se fait avancer que par ce
   qui existe réellement dans le dépôt, jamais par ce qui est prévu.
3. **Les issues GitHub concernées référencées et mises à jour** — les citer par leur numéro dans
   l'entrée de journal et dans les messages de commit, commenter ce qui a avancé, fermer ce qui est
   fait, en ouvrir une pour tout travail identifié et non traité.

## 4. Travailler sur `dev`, ne jamais pousser sur `main`

- `dev` est la branche de travail et la branche par défaut. Tout commit y va, ou sur une branche
  issue d'elle.
- `dev` est protégée contre la réécriture : ni push forcé, ni suppression, pour personne. **Un
  commit poussé ne se modifie plus** — pas d'`--amend`, pas de rebase sur ce qui est déjà en
  ligne. Une erreur se corrige par un nouveau commit, ou s'annule par `git revert`.
- `main` est la production. **Aucun push direct**, jamais, sous aucun prétexte — y compris pour un
  correctif d'une ligne. La branche est protégée : la fusion passe par une pull request.
- La promotion de `dev` vers `main` est une décision humaine. Ne pas ouvrir, approuver ni fusionner
  une pull request vers `main` de sa propre initiative.
- Vérifier la branche courante avant de committer.

## 5. Ne jamais committer de secret

**Le dépôt est public.** Tout ce qui y entre est lisible par n'importe qui, immédiatement et
définitivement — un secret poussé puis retiré reste dans l'historique et doit être révoqué.

Ne jamais écrire dans un fichier suivi : mot de passe, jeton, clé d'API, clé privée, certificat,
chaîne de connexion, identifiant de compte réel, ni donnée personnelle de client final ou
d'opérateur.

- Les valeurs sensibles vivent hors du dépôt. Seul un modèle sans valeur réelle
  (`.env.example`) peut être suivi.
- Le `.gitignore` exclut déjà les fichiers d'environnement et le matériel de clé : ne pas le
  contourner par un `git add --force`.
- Dans les exemples de documentation, utiliser des valeurs manifestement fictives.
- En cas de doute sur un fichier : ne pas le committer, et poser la question.
