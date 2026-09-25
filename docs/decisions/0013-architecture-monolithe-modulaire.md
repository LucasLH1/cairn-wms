# 0013 — Architecture : monolithe modulaire

**Statut** : actée · **Date** : 2026-09-25 · **Remplace** : — · **Remplacée par** : —

## Contexte

Il faut dire comment le serveur se découpe : en une application ou en plusieurs services.

Ce qui contraint :

- **Une instance par prestataire**, mise en place sans développement (`RG-EXI-049`) ; installée, mise à
  jour, sauvegardée par le prestataire seul (`RG-EXI-060`, `061`) ; exploitée en série par l'éditeur
  (`RG-EXI-062`).
- **Sobriété** : un seul serveur d'entrée de gamme, aucune compétence spécialisée pour l'exploitation
  (`RG-EXI-069`, `072`).
- **Intégrité** : un geste et tous ses effets — mouvement, événement, unité d'œuvre, transition de
  parcours — enregistrés ensemble ou pas du tout (`RG-EXI-011`). Ces effets relèvent de modules
  différents.
- **Frontière du socle** : le socle ne présuppose pas la logistique et doit pouvoir servir un autre
  domaine sans être réécrit (`RG-EXI-070`), sans qu'aucun autre domaine soit modélisé d'avance
  (`RG-EXI-071`).
- **Une mise à jour peut interrompre le service** (0.9, section 5) : le déploiement sans interruption
  n'est pas exigé.

## Options

### Option A — Monolithe modulaire

- **Ce que c'est** : une seule application, un seul code, livrée d'un bloc ; découpée en modules aux
  frontières strictes, vérifiées automatiquement. Le socle est un ensemble de modules dont aucun ne
  dépend d'un module logistique.
- **En faveur** : un geste et tous ses effets tiennent dans une transaction locale ; une seule chose à
  installer, mettre à jour et surveiller ; frontière du socle tenue par une règle de dépendances plutôt
  que par le réseau.
- **En défaveur** : les frontières ne tiennent que si elles sont vérifiées ; rien n'empêche
  physiquement un raccourci.
- **Ce que ça ferme** : rien ; un module aux frontières propres peut devenir un service plus tard si un
  besoin le prouve.

### Option B — Services séparés

- **Ce que c'est** : un service par domaine (stock, préparation, SAV…), qui communiquent par le réseau.
- **En faveur** : frontières physiques ; déploiement indépendant.
- **En défaveur** : un geste qui touche plusieurs domaines ne s'enregistre plus en une transaction, ce
  qui met `RG-EXI-011` à la merci de mécanismes de compensation ; plusieurs composants à exploiter par
  instance, à rebours de `RG-EXI-069` ; déploiement indépendant sans objet, puisque l'interruption est
  admise.
- **Ce que ça ferme** : l'auto-hébergement sans compétence spécialisée.

### Option C — Monolithe sans découpage imposé

- **Ce que c'est** : une application, sans frontières vérifiées.
- **En faveur** : aucune contrainte de structure.
- **En défaveur** : le socle finit par dépendre de la logistique, contre `RG-EXI-070`.
- **Ce que ça ferme** : l'élargissement du socle à un autre domaine.

## Décision

**Le serveur de Cairn WMS est un monolithe modulaire : une seule application livrée d'un bloc, découpée
en modules aux frontières vérifiées automatiquement, dont les modules du socle ne dépendent d'aucun
module logistique** (option A).

Critère décisif : un geste et tous ses effets tiennent dans une seule transaction, sans composant de
plus à exploiter.

Proposée par Claude le 2026-09-24, validée par Lucas le 2026-09-25.

## Conséquences

- **Ce qu'on peut faire** : tenir `RG-EXI-011` par une transaction ; livrer l'instance comme une seule
  application.
- **Ce qu'on ne peut plus faire** : faire dépendre un module du socle d'un module logistique ; extraire
  un service sans nouvelle fiche.
- **Ce qu'il faut mettre en place** : la découpe interne — liste des modules, sens des dépendances
  permises, règle vérifiée par l'intégration continue (fiche 0023). La même application est lancée
  dans deux rôles (fiche 0017) : c'est toujours un seul code et une seule livraison.
- **Ce qu'on accepte de payer** : la tenue des frontières repose sur une vérification automatique, pas
  sur une séparation physique.
- **Ce qui la remettrait en cause** : un besoin de mise à l'échelle qu'une seule application ne tient
  pas sur le serveur de l'instance.
