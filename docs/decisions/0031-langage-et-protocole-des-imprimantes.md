# 0031 — Langage et protocole des imprimantes d'étiquettes

**Statut** : proposée · **Date** : 2026-09-29 · **Remplace** : — · **Remplacée par** : —

## Contexte

La fiche 0016 fait passer toute impression par l'agent d'impression installé sur un poste de chaque
site. Elle ne dit pas comment l'agent parle aux imprimantes : ni le langage de l'étiquette, ni le
protocole qui la leur remet. Le lot 1 imprime dès l'étape 3 du scénario 1 : l'étiquette d'un support
sort à l'imprimante du quai Q1 (`RG-REC-049`, `050`), et l'étape 5 exige que l'échec d'impression soit
détecté et remonté (`RG-EXI-038`, `RG-EXI-077`, `RG-SUR-086` à `088`).

Ce qui contraint :

- **Imprimantes du terrain** : imprimantes thermiques d'étiquettes, de marques diverses selon les
  prestataires, raccordées au réseau du site.
- **Détection de l'échec** (`RG-EXI-077`) : l'agent doit savoir si l'imprimante a accepté le travail,
  pas seulement si le système l'a mis en file. La fiche 0016 note ce point comme non prouvé.
- **Aucun tiers** (`RG-EXI-063`) : rien ne dépend d'un service extérieur.
- **Documents de flux** (bons de préparation, lettres de voiture) : ils viendront plus tard sur des
  imprimantes de bureau, au format A4.

Ce qui est déjà réalisé sans préjuger de cette fiche : le serveur décrit une étiquette de façon neutre
(un modèle et ses champs) ; l'agent la traduit. Un pilote « fichier » écrit l'étiquette dans un
répertoire, pour le développement et les tests. Aucun pilote vers une imprimante réelle n'existe tant
que cette fiche n'est pas actée.

## Options

### Option A — ZPL sur connexion TCP brute (port 9100)

- **Ce que c'est** : l'agent compose l'étiquette en ZPL et l'envoie directement à l'imprimante par une
  connexion TCP ; il interroge son état par les commandes d'état du même langage.
- **En faveur** : langage de fait des imprimantes d'étiquettes, émulé par la plupart des marques ;
  aucune dépendance au système du poste ; l'état de l'imprimante (papier, tête, pause) se lit
  directement, ce qui répond à `RG-EXI-077`.
- **En défaveur** : une imprimante qui n'émule pas ZPL demande un autre pilote ; le rendu se décrit en
  commandes, pas en mise en page.
- **Ce que ça ferme** : rien ; d'autres langages s'ajoutent comme pilotes de l'agent.

### Option B — PDF remis au gestionnaire d'impression du poste

- **Ce que c'est** : l'agent produit un PDF et le remet au système (CUPS, spouleur Windows).
- **En faveur** : fonctionne avec toute imprimante installée sur le poste ; sert aussi aux documents A4.
- **En défaveur** : le spouleur accepte le travail sans dire si l'imprimante l'a imprimé : l'échec se
  détecte mal (`RG-EXI-077`) ; dépend du pilote installé sur chaque poste.
- **Ce que ça ferme** : une détection fiable de l'échec d'étiquette.

### Option C — IPP (protocole d'impression Internet) vers chaque imprimante

- **Ce que c'est** : l'agent parle IPP à l'imprimante, qui reçoit un document et rend l'état du travail.
- **En faveur** : protocole normalisé, états de travail lisibles.
- **En défaveur** : peu répandu sur les imprimantes thermiques d'étiquettes ; le document à remettre
  reste à choisir.
- **Ce que ça ferme** : les imprimantes d'étiquettes sans IPP, nombreuses.

## Décision

*Proposée, non actée.* Recommandation : **les étiquettes s'impriment en ZPL, remises par connexion TCP
directe à l'imprimante, dont l'agent lit l'état avant et après chaque travail ; les documents A4
passeront par le gestionnaire d'impression du poste, en PDF, par une fiche à venir** (option A pour
les étiquettes).

Critère proposé : savoir de façon fiable si l'étiquette est sortie, puisque c'est ce qui décide qu'un
support est étiqueté ou non (`RG-SUR-086` à `088`).

Proposée par Claude le 2026-09-29, en réalisant l'étape 3 du scénario 1. À valider par Lucas.

## Conséquences

- **Ce qu'on peut faire** : imprimer les étiquettes de support au quai, détecter une imprimante éteinte
  ou en défaut.
- **Ce qu'on ne peut plus faire** : dépendre du pilote d'impression installé sur le poste pour les
  étiquettes.
- **Ce qu'il faut mettre en place** : le pilote ZPL de l'agent, les modèles d'étiquette en ZPL, la
  déclaration de l'adresse réseau de chaque imprimante dans sa destination d'impression.
- **Ce qu'on accepte de payer** : un pilote par langage d'imprimante qui n'émule pas ZPL.
- **Ce qui la remettrait en cause** : un prestataire dont les imprimantes d'étiquettes n'émulent pas
  ZPL, ou dont le réseau interdit la connexion directe du poste aux imprimantes.
