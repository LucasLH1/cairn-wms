# Lot 1 — Scénario de démonstration : contrôle, colisage et expédition

**Statut** : validé · **S'appuie sur** : fiche 0003, modules 3.2, 3.3 et 0.8 · **Suit** : commande,
préparation et comptage

## 1. Objet

Troisième et dernière partie du critère de clôture du lot 1. Ce scénario part de l'état final du
scénario de commande et préparation, et conduit les deux commandes préparées jusqu'au départ du
camion. Il ne reprend que ce qui est nouveau : le contrôle avant fermeture, le colisage, le numéro de
suivi, le chargement et le départ.

## 2. Périmètre de ce flux au lot 1

| Au lot 1 | Plus tard | Pourquoi ce partage |
|---|---|---|
| Un transporteur, un service, désigné par défaut pour le donneur d'ordre | Choix du service par règles ordonnées entre plusieurs transporteurs (lot 2) | Une règle unique suffit à prouver que le service est arrêté avant le colisage et enregistré avec sa raison. |
| Heure limite de remise déclarée sur le service, et critère de priorité des commandes | Vague déclenchée par l'heure limite, le volume ou le poids (lot 2) | L'heure limite est une donnée du service, peu coûteuse ; déclencher une vague sur elle est un raffinement. |
| Transporteur sans interface automatisée : numéros de suivi scannés sur des étiquettes pré-imprimées | Transporteurs avec interface : étiquette et numéro obtenus automatiquement, relances et indisponibilité, suivi et colis silencieux (lot 5) | `RG-EXP-027` rend un transporteur sans interface pleinement exploitable ; les interfaces relèvent des branchements extérieurs du lot 5. |
| Contrôle avant fermeture systématique, par scan | Contrôle par sondage (lot 2) | Le sondage combine des critères de valeur, de sensibilité et d'historique qui supposent plusieurs donneurs d'ordre et de l'historique. |
| Proposition de colisage, et colisage libre quand une donnée manque | — | Le cas de la donnée manquante est le cas réel d'un référentiel neuf. |
| Chargement par scan, départ, sortie de stock, reliquat | Départ incomplet et expédition résiduelle, annulation d'une expédition (lot 2) | Le lot 1 prouve le départ nominal ; ses reprises viennent ensuite. |
| Bon de livraison et liste de colisage | Étiquette et bon de retour (lot 3) | Le retour appartient au SAV. |

## 3. Jeu de données

Ce scénario reprend le jeu de données des deux scénarios précédents, dans l'état final du second.

**État de départ**
- En zone de colisage : les prélèvements de C1 (MD-001 × 30, MD-002 × 10) et de C2 (MD-003 × 54,
  MD-004 × 2).
- C1 et C2 sont destinées à deux destinataires différents. C2 porte encore 6 MD-003 dus.

**Ajouts au paramétrage**
- Transporteur *Messagerie Démo*, sans interface automatisée, avec un service *Messagerie Démo J+1* :
  poids maximum de 30 kg par colis, heure limite de remise à 17 h.
- *Maison Démo* : service par défaut *Messagerie Démo J+1* ; contrôle avant fermeture systématique ;
  bon de livraison et liste de colisage produits à chaque expédition.
- Poids et dimensions unitaires renseignés pour MD-001, MD-002 et MD-003 ; **aucun pour MD-004**.
- Un rouleau d'étiquettes pré-imprimées de *Messagerie Démo*, portant chacune un numéro de suivi.
- Rémi, emballeur ; Sami, cariste au quai Q2.

## 4. Déroulé

### Étape 1 — Le service est arrêté avant le colisage

- **On constate** : C1 et C2 portent chacune le service *Messagerie Démo J+1*, enregistré avec la
  règle qui l'a désigné — le service par défaut du donneur d'ordre ; ses contraintes, dont le poids
  maximum, pèsent sur la proposition de colisage.
- **Règles éprouvées** : `RG-EXP-008`, `010`, `012`, `013`.

### Étape 2 — Contrôler C1, et oublier un article

Rémi contrôle C1 en scannant ses articles. Il oublie de scanner un MD-001, puis tente de fermer.

- **On constate** : le contrôle se fait par scan, jamais sur une liste à cocher ; l'écart est affiché
  et la fermeture refusée ; Rémi scanne le dernier MD-001 et le contrôle se complète.
- **Règles éprouvées** : `RG-PRE-049`, `051`, `052`.

### Étape 3 — Coliser C1 sur proposition

- **On constate** : le WMS propose une répartition de C1 en colis, à partir des poids et dimensions
  et sous la contrainte des 30 kg ; Rémi l'accepte ; chaque colis porte un identifiant scannable et
  son contenu, ligne et commande servies.
- **Règles éprouvées** : `RG-PRE-055`, `056`, `059`, `060`.

### Étape 4 — Pas de numéro de suivi, pas de colis

Rémi tente de fermer le premier colis de C1 sans numéro de suivi.

- **On constate** : la fermeture est refusée : aucun colis n'est fermé sans numéro de suivi.
- **Règles éprouvées** : `RG-EXP-018`.

Il colle une étiquette pré-imprimée de *Messagerie Démo* et en scanne le numéro, puis ferme ses colis.

- **On constate** : le numéro est enregistré sur le colis et n'en change plus ; la fermeture est
  irréversible ; C1 est désormais figée, plus aucune modification n'est possible.
- **Règles éprouvées** : `RG-EXP-016`, `017`, `027`, `RG-PRE-062`, `063`.

### Étape 5 — Coliser C2 sans proposition

Rémi contrôle C2 sans écart, puis passe au colisage.

- **On constate** : faute de poids et de dimensions pour MD-004, le WMS ne peut rien proposer ; il
  le signale, et Rémi colise librement, sans être bloqué. Les colis se ferment avec leurs numéros de
  suivi, comme pour C1.
- **Règles éprouvées** : `RG-PRE-058`, `RG-EXP-018`, `027`.

### Étape 6 — Les expéditions et leurs documents

- **On constate** : deux expéditions existent, une par destinataire, chacune avec son site de
  départ, son adresse, son service, son poids total et ses colis ; le bon de livraison et la liste de
  colisage de chacune s'impriment, sans aucun montant.
- **Règles éprouvées** : `RG-EXP-001`, `004`, `006`, `050`, `052`.

### Étape 7 — Charger, et refuser un colis étranger

Au quai Q2, Sami charge l'expédition de C1, colis par colis. Il scanne par erreur un colis de C2.

- **On constate** : le colis de C2 est refusé, avec un message qui dit à quelle expédition il
  appartient ; les colis de C1 sont acceptés un à un.
- **Règles éprouvées** : `RG-EXP-028`, `030`.

### Étape 8 — Le départ

Sami termine le chargement de C1, puis celui de C2, et valide le départ des deux expéditions.

- **On constate** : les mouvements de sortie retirent de la zone de colisage tout ce qui est parti ;
  les lignes de C1 et de C2 sont soldées de ce qui a été servi ; C1, entièrement servie, passe
  expédiée puis close ; C2 passe partiellement expédiée et reste ouverte, avec ses 6 MD-003 dus sur la
  même commande.
- **Règles éprouvées** : `RG-EXP-032`, `034`, `RG-CDE-032`, `033`, `040`.

### Étape 9 — Ce qui est parti est parti

Anna tente de modifier l'expédition de C1.

- **On constate** : toute modification est refusée, quelle que soit la permission ; les documents
  restent réimprimables à l'identique.
- **Règles éprouvées** : `RG-EXP-036`, `053`.

### Étape 10 — Les traces

- **On constate** : le journal restitue chaque geste des étapes 1 à 9, refus compris, avec son auteur
  et son poste ; le contrôle, le colisage et l'expédition apparaissent comme des tâches mesurées.
- **Règles éprouvées** : `RG-TRA-001` à `005`, `RG-TRA-010`, `012`.

## 5. État final du lot 1

À la fin des trois scénarios, l'entrepôt de démonstration est dans l'état suivant.

**Stock**

| Emplacement | Contenu |
|---|---|
| A-01-1 (S1) | MD-001 × 70, MD-002 × 26 |
| A-03-1 (S2) | MD-004 × 8 |
| Zone de quai, zone de colisage | vides |

**Flux**

| Objet | État | Reste dû |
|---|---|---|
| Attendu de *Fournisseur Démo* | partiellement servi, ouvert | MD-002 × 4 |
| C1 | close | — |
| C2 | partiellement expédiée, ouverte | MD-003 × 6 |
| C3 | annulée | — |
| Expéditions de C1 et de C2 | parties | — |

- La file de décisions est vide ; aucun support n'est non étiqueté ; aucun emplacement n'est gelé.
- Le journal couvre sans trou tout ce qui s'est passé depuis la saisie de l'attendu.

Le scénario est réussi quand chaque constat des étapes 1 à 10 est vérifié et que l'état final
correspond exactement à ces deux tableaux. Le lot 1 est réussi quand les trois scénarios le sont.
