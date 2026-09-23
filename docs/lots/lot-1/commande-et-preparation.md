# Lot 1 — Scénario de démonstration : commande, préparation et comptage

**Statut** : validé · **S'appuie sur** : fiche 0003, modules 3.1, 3.2, 2.2 et 0.8 · **Suit** :
réception et rangement

## 1. Objet

Deuxième partie du critère de clôture du lot 1. Ce scénario part de l'état final du scénario de
réception et le prolonge jusqu'au dépôt des commandes préparées en zone de colisage. Le colisage, le
contrôle avant fermeture et l'expédition font l'objet du scénario suivant.

Il éprouve aussi ce qui fait qu'un stock reste juste : une rupture découverte au prélèvement, un
comptage déclenché par elle, et un ajustement validé par un humain.

## 2. Périmètre de ce flux au lot 1

| Au lot 1 | Plus tard | Pourquoi ce partage |
|---|---|---|
| Commande saisie à la main, sous permission | Commande injectée par un flux du donneur d'ordre (lot 5) | L'injection passe par les profils et les échanges. |
| Régimes de rupture *partielle autorisée* et *complète exigée* ; reliquat | — | Les deux régimes changent ce qui part ; aucun des deux n'est un raffinement. |
| Priorité par urgence, date souhaitée et ancienneté | Heure limite du transporteur comme critère | Tranché dans le scénario d'expédition, avec les services transporteur. |
| Vague lancée sur un seuil de nombre de commandes, lancement anticipé | Seuils de volume et de poids | Un critère suffit à prouver que la vague se lance seule. |
| Mode mono-commande | Mode groupé et zone de tri (lot 2) | Sans zone de tri, le mode mono-commande s'applique et le WMS le signale (`RG-PRE-023`). |
| Réservation au lancement de la vague | Réservation à l'acceptation ou au prélèvement (lot 2) | La valeur par défaut suffit ; le choix se paramètre par donneur d'ordre. |
| Règle de prélèvement premier entré premier sorti, et solde d'emplacement | Premier périmé premier sorti (lot 2) | Il suppose des dates, donc la gestion au lot. |
| Déconditionnement | Interdiction de déconditionner un niveau | Le déconditionnement est dans chaque préparation de détail ; son interdiction se paramètre. |
| Rupture au prélèvement, réémission, comptage ponctuel déclenché, recomptage, seuil de validation, ajustement | Inventaires tournants, complets et de contrôle (lot 2 et suivants) | Déjà acté par 0003. |
| Annulation d'une commande avant colisage | Modification d'une commande en cours | L'annulation suffit à prouver que les réservations et le travail se défont. |
| — | Exemplaire désigné (lot 2), regroupement de commandes (lot 2), choix du site (lot 2) | Ils supposent le numéro de série, plusieurs commandes d'un même destinataire, et un second site. |

## 3. Jeu de données

Ce scénario reprend tout le jeu de données du scénario de réception, dans l'état final où celui-ci
le laisse. Les emplacements réels de S1 et de S2 sont notés ici A-01-1 et A-03-1.

**État de départ**

| Emplacement | Support | Contenu théorique |
|---|---|---|
| A-01-1 | S1 | MD-001 × 100, MD-002 × 36 |
| A-03-1 | S2 | MD-003 × 60, MD-004 × 10 |

**Préparation physique, avant le scénario** : on retire six MD-003 du support S2, sans rien déclarer.
Le WMS croit donc à 60 chargeurs en A-03-1 ; il n'y en a que 54.

**Ajouts au paramétrage**
- Zone **COL** (zone de colisage, deux emplacements) sur le site A.
- *Maison Démo* : régime de rupture par défaut *partielle autorisée* ; réservation au lancement de
  la vague ; règle de prélèvement premier entré premier sorti ; vague lancée à partir de trois
  commandes ; aucune zone de tri ; seuil de validation d'inventaire de cinq unités.
- Utilisateur ajouté : Sami, magasinier.
- Trois destinataires fictifs, clients finals de *Maison Démo*, avec une adresse complète.

**Commandes** — à saisir dans le déroulé.

| Commande | Priorité | Régime | Lignes |
|---|---|---|---|
| C1 | normale | partielle autorisée | MD-001 × 30, MD-002 × 10 |
| C3 | normale | complète exigée | MD-002 × 30, MD-001 × 20 |
| C2 | urgente | partielle autorisée | MD-003 × 60, MD-004 × 2 |

## 4. Déroulé

### Étape 1 — Anna saisit C1, puis C3

Au bureau, Anna saisit C1, puis C3 en surchargeant son régime à *complète exigée*.

- **On constate** : les deux commandes sont acceptées, en attente ; aucune unité de stock n'est
  réservée ; aucune mission n'est créée ; le régime de C3 est figé.
- **Règles éprouvées** : `RG-CDE-002`, `003`, `011`, `028`, `030`, `036`, `037`.

### Étape 2 — Anna saisit C2, urgente

- **On constate** : C2 n'attend pas le seuil de trois commandes : une vague se lance aussitôt sur le
  site A, en mode mono-commande, avec le signalement qu'aucune zone de tri n'existe.
- **Règles éprouvées** : `RG-PRE-013`, `016`, `017`, `020`, `021`, `023`, `024`.

### Étape 3 — Les réservations suivent la priorité

- **On constate** : C2 réserve la première, puis C1, plus ancienne que C3. C1 réserve 10 MD-002 ;
  il n'en reste que 26 pour les 30 que demande C3. C3, en régime *complète exigée*, ne réserve rien
  et reste en attente de stock ; l'écran dit que c'est une attente de stock, pas de regroupement.
  C3 apparaît dans la file de décisions : elle bloque un flux.
- **Règles éprouvées** : `RG-PRE-008`, `010`, `RG-CDE-031`, `038`, `058`, `059`, `RG-STK-029`,
  `RG-SUR-036`.

### Étape 4 — Les missions de C2 et de C1

- **On constate** : des missions de prélèvement mono-commande apparaissent dans la file de travail,
  avec leur emplacement, leur référence et leur quantité, ordonnées par séquence de parcours ; celles
  de C2 passent devant, parce que C2 est urgente.
- **Règles éprouvées** : `RG-PRE-026`, `028`, `029`, `030`.

### Étape 5 — La rupture au prélèvement

Bruno prend le travail suivant : MD-003 × 60 en A-03-1. Il scanne l'emplacement, puis la référence ;
il ne trouve que 54 chargeurs, les prend et déclare 54.

- **On constate** : les 54 sont acquis à C2 ; le WMS cherche aussitôt les 6 manquants ailleurs sur le
  site, n'en trouve pas, et met la ligne en rupture ; en régime *partielle autorisée*, C2 garde 6
  MD-003 dus sur la même commande ; le stock théorique d'A-03-1 n'est **pas** corrigé ; une mission de
  comptage de A-03-1 apparaît dans la file de travail.
- **Règles éprouvées** : `RG-PRE-031`, `038`, `039`, `040`, `041`, `042`, `043`, `RG-CDE-039`, `040`.

### Étape 6 — Déconditionner

Bruno prélève MD-004 × 2 pour C2, puis MD-001 × 30 et MD-002 × 10 pour C1. Aucune de ces quantités
ne tombe sur un carton entier.

- **On constate** : le WMS propose le conditionnement le plus élevé compatible, puis le
  déconditionnement ; chaque ouverture de carton produit un événement, sans aucun mouvement de stock.
  Les articles prélevés de C1 et de C2 rejoignent la zone de colisage.
- **Règles éprouvées** : `RG-PRE-045`, `047`, `048`.

### Étape 7 — Le comptage ponctuel

Sami prend la mission de comptage d'A-03-1. Bruno tente d'y déposer quoi que ce soit.

- **On constate** : A-03-1 est gelé dès la prise en charge ; le geste de Bruno est refusé, en
  nommant la campagne et l'opérateur qui compte.
- **Règles éprouvées** : `RG-INV-015`, `017`, `020`.

Sami compte à l'aveugle : il trouve 8 MD-004, et aucun MD-003.

- **On constate** : aucune quantité théorique ne s'affiche ; Sami déclare ce qu'il voit ; la
  validation du relevé produit l'écart — MD-003 attendu, absent — et lève le gel.
- **Règles éprouvées** : `RG-INV-016`, `018`, `024`, `025`, `029`, `030`, `037`.

### Étape 8 — Le recomptage

- **On constate** : l'écart déclenche un second comptage, attribué à un autre opérateur que Sami.
  Bruno recompte à l'aveugle, sans voir ni le théorique ni le premier relevé, et trouve la même chose.
  L'écart de 6 MD-003 est retenu.
- **Règles éprouvées** : `RG-INV-031`, `032`, `033`, `034`.

### Étape 9 — Valider l'écart, sous la main

L'écart de 6 dépasse le seuil de 5 : il attend une validation nominative. Au bureau, la file de
décisions contient deux éléments : l'écart d'A-03-1, et C3 en attente de stock. Anna et Chloé
ouvrent l'écart au même moment.

- **On constate** : tant que personne ne prend la main, rien n'est ajusté ; Anna prend la main et
  Chloé voit aussitôt qu'Anna la détient ; Anna choisit le motif *casse* et valide.
- **Règles éprouvées** : `RG-INV-042`, `044`, `045`, `046`, `RG-SUR-049`, `053`, `054`.

- **On constate ensuite** : un mouvement d'ajustement de quantité retire les 6 MD-003 d'A-03-1, en
  portant la campagne, le relevé et le motif ; l'élément quitte la file, résolu par arbitrage, avec
  Anna pour auteur et son motif.
- **Règles éprouvées** : `RG-INV-048`, `RG-SUR-042`, `043`.

### Étape 10 — Annuler C3

Le donneur d'ordre renonce à C3. Anna l'annule.

- **On constate** : C3 passe annulée, avec son auteur et son horodatage ; elle ne portait aucune
  réservation ni aucune mission ; son élément quitte la file de décisions, avec l'annulation pour
  cause.
- **Règles éprouvées** : `RG-CDE-051`, `055`, `057`, `RG-SUR-044`.

### Étape 11 — Les traces

- **On constate** : le journal restitue chaque geste des étapes 1 à 10, refus compris, avec son auteur
  et son poste ; la préparation de chaque commande et chacun des deux comptages apparaissent comme des
  tâches mesurées ; le relevé de Sami et celui de Bruno sont conservés, immuables.
- **Règles éprouvées** : `RG-TRA-001` à `005`, `RG-TRA-010`, `RG-CDE-035`, `RG-INV-029`.

## 5. État final attendu

**Stock**

| Emplacement | Contenu |
|---|---|
| A-01-1 (S1) | MD-001 × 70, MD-002 × 26 |
| A-03-1 (S2) | MD-004 × 8 |
| Zone de colisage | Prélèvements de C1 : MD-001 × 30, MD-002 × 10 ; de C2 : MD-003 × 54, MD-004 × 2 |

**Commandes**

| Commande | État | Solde |
|---|---|---|
| C1 | préparée, en attente de colisage | aucun dû |
| C2 | préparée partiellement, en attente de colisage | MD-003 × 6 dus |
| C3 | annulée | — |

- Une campagne de comptage ponctuel close, deux relevés, un écart retenu et ajusté avec le motif
  *casse*.
- La file de décisions est vide.

Le scénario est réussi quand chaque constat des étapes 1 à 11 est vérifié et que l'état final
correspond exactement à ces deux tableaux.
