# 0009 — Langage : TypeScript de bout en bout

**Statut** : actée · **Date** : 2026-09-24 · **Remplace** : — · **Remplacée par** : —

## Contexte

Les choix techniques ont été réinitialisés le 2026-09-24 : les fiches 0002 et 0004 à 0008 sont
abandonnées et n'ont pas servi de point de départ. Le choix de la pile est repris de zéro, brique par
brique, une fiche par décision.

Ce qui contraint le langage :

- **Le code est entièrement écrit par l'IA.** Les compétences de Lucas ne sont pas un critère. Ce qui
  compte : la maîtrise du langage par l'IA, et la part des erreurs que les outils attrapent avant
  l'exécution.
- **Les exigences de `socle/0.9`.** L'essentiel — intégrité des gestes (`RG-EXI-006` à `012`),
  traçabilité (`RG-EXI-013` à `020`), traitements différés (`RG-EXI-021` à `027`) — repose sur la base
  de données et l'architecture, pas sur le langage. Le langage pèse directement sur trois points : le
  temps de réponse d'un geste (`RG-EXI-073`), la sobriété sur le serveur de référence (`RG-EXI-069`,
  `072`), et la durée de vie du produit, livré et mis à jour chez des prestataires qui l'exploitent
  seuls (`RG-EXI-060`).
- **Le domaine est riche en états et en variantes** : cycles de vie des documents, catalogue fermé
  des types d'étapes, règles paramétrables versionnées et simulables (`RG-EXI-028` à `032`).
- **Les écrans sont une application web** et les tests de bout en bout des scénarios du lot 1 (fiche
  0003, `lots/lot-1/README.md`) s'écrivent de toute façon dans le langage du navigateur.

Ce qu'on ignorait au moment de décider : la tenue en mémoire réelle de chaque option sur le serveur de
référence n'a pas été mesurée ; les écarts de maîtrise par l'IA entre langages relèvent de constats
généraux, non mesurés.

## Options

### Option A — TypeScript de bout en bout

- **Ce que c'est** : écrans, serveur, traitements différés et tests dans le même langage.
- **En faveur** : un seul langage et une seule chaîne d'outils ; les mêmes schémas de validation
  servent à l'écran et au serveur, un refus motivé a la même forme partout ; les unions discriminées,
  avec vérification d'exhaustivité, conviennent aux cycles de vie et aux catalogues fermés ; maîtrise
  par l'IA la plus large ; faible empreinte mémoire.
- **En défaveur** : types effacés à l'exécution ; un seul fil d'exécution par processus ; forte
  dépendance à des paquets tiers, sur un registre qui a connu en 2025 plusieurs compromissions de
  paquets très utilisés ; pas de décimal natif.
- **Ce que ça ferme** : rien d'irréversible au-delà du langage lui-même.

### Option B — C#/.NET côté serveur, écrans en TypeScript

- **Ce que c'est** : serveur .NET, application web en TypeScript, contrat généré entre les deux.
- **En faveur** : typage vérifié à la compilation et à l'exécution ; plateforme qui fournit l'essentiel
  (web, temps réel, tâches de fond, décimal, traduction), donc peu de dépendances ; multi-fil natif ;
  versions à support long.
- **En défaveur** : deux langages ; seuls des types générés se partagent avec les écrans, pas la
  logique de validation.
- **Ce que ça ferme** : le partage de code entre écrans et serveur.

### Option C — Elixir, Phoenix LiveView

- **Ce que c'est** : le serveur pilote l'écran ; temps réel et présence natifs.
- **En faveur** : temps réel natif ; tenue aux pannes de processus.
- **En défaveur** : typage dynamique ; écosystème plus petit pour les échanges, l'impression et les
  transporteurs ; maîtrise par l'IA moindre ; un aller-retour serveur par interaction.
- **Ce que ça ferme** : les bibliothèques d'écran du navigateur.

### Option D — Go côté serveur, écrans en TypeScript

- **Ce que c'est** : serveur Go compilé en binaire unique.
- **En faveur** : très sobre ; distribution simple.
- **En défaveur** : peu expressif pour un domaine riche en états, en règles et en versions ; accès aux
  données plus rudimentaire ; deux langages.
- **Ce que ça ferme** : le partage de code entre écrans et serveur.

### Option E — Kotlin ou Java (Spring), écrans en TypeScript

- **Ce que c'est** : serveur sur machine virtuelle Java.
- **En faveur** : très mature et typé.
- **En défaveur** : la plus gourmande en mémoire sur quatre gigaoctets ; rien de plus que B ici ; deux
  langages.
- **Ce que ça ferme** : le partage de code entre écrans et serveur.

Écartées d'emblée : Python, faute de garanties de typage suffisantes pour un cœur transactionnel ;
Rust, dont le coût de développement ne rapporte rien à ce besoin.

## Décision

**Cairn WMS est écrit en TypeScript de bout en bout : écrans, serveur, traitements différés et tests**
(option A).

Critère décisif : un seul langage, où les mêmes schémas valident un geste à l'écran et au serveur. Les
faiblesses de A ont chacune une parade simple, écrite en règle et vérifiable automatiquement ; l'atout
de A, lui, n'a pas d'équivalent en B.

Claude a d'abord recommandé l'option B. Sur la question de Lucas, les écarts ont été repris un par un :
ceux qui plaidaient pour B se sont révélés réels mais modestes, et tous parables. Recommandation
révisée en A par Claude, validée par Lucas le 2026-09-24.

## Conséquences

- **Ce qu'on peut faire** : partager types, schémas et règles de validation entre écrans et serveur ;
  écrire les tests de bout en bout des scénarios dans le même langage que le produit.
- **Ce qu'on ne peut plus faire** : introduire un second langage de programmation dans le produit sans
  nouvelle fiche.
- **Ce qu'il faut mettre en place** :
  - les parades aux quatre faiblesses de l'option A, proposées dans la fiche 0017 ;
  - une fiche sur l'environnement d'exécution (Node en version à support long, ou Bun) et le cadre du
    serveur ;
  - `CLAUDE.md` et `status.yml` : à mettre à jour par une session Claude Code sur le dépôt.
- **Ce qu'on accepte de payer** : une vigilance permanente sur les dépendances tierces ; le travail
  lourd tenu hors du processus qui sert les gestes.
- **Ce qui la remettrait en cause** : la mesure du lot 1 sur le serveur de référence qui ne tient pas
  `RG-EXI-072` ou `073` pour une raison propre au langage ; une dépendance critique compromise ou
  abandonnée sans remplaçant.

### Exigences

- **Satisfaites sans condition** : le langage est neutre pour les exigences d'intégrité, de
  traçabilité, de traitements différés et d'échanges, qui reposent sur la base et l'architecture.
- **Satisfaites sous condition** : `RG-EXI-073` (trois cents millisecondes par geste), à condition que
  le travail lourd ne tourne jamais dans le processus qui sert les gestes (fiche 0017) ; `RG-EXI-069`
  et `072`, non mesurées.
- **Mal satisfaites** : aucune identifiée.
