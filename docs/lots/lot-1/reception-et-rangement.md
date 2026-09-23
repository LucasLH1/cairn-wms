# Lot 1 — Scénario de démonstration : réception et rangement

**Statut** : validé · **S'appuie sur** : fiche 0003, modules 1.1, 1.4 et 0.8

## 1. Objet

Ce scénario est la première partie du critère de clôture du lot 1 (fiche 0003) : le lot est clos
quand ce scénario, puis ceux de la commande, du prélèvement, du comptage et de l'expédition, se
déroulent de bout en bout sur le jeu de données ci-dessous, écran par écran, et que chaque constat
attendu est vérifié.

Il ne décrit pas les écrans — c'est le rôle des parcours opérateur de 1.1 et 1.4. Il dit ce qu'on
fait, avec quelles données, et ce qu'on doit voir pour déclarer l'étape réussie.

## 2. Périmètre de ce flux au lot 1

Écrire le scénario oblige à trancher ce que 0003 ne dit pas. Ce tableau est à reporter dans 0003
avant son acte.

| Au lot 1 | Plus tard | Pourquoi ce partage |
|---|---|---|
| Attendu saisi à la main, réception sur attendu en régime visible | Réception à la volée et rapprochement (lot 2) | Le rapprochement suppose des réceptions sans attendu chez plusieurs donneurs d'ordre ; il n'éprouve rien au lot 1. |
| Arrivage, quai, durée d'occupation | — | C'est le point d'entrée physique ; sans lui, pas de quai à libérer. |
| Écarts en moins, en plus, référence non attendue, enregistrés sans litige | Litiges (lot 3) | `RG-REC-071` permet l'écart sans litige. |
| Supports simples, étiquette, support non étiqueté | Supports consignés (lot 2) | Déjà acté par 0003. |
| — | Réception aveugle, contrôle qualité et grilles (lot 2) | Deux régimes déclarés par donneur d'ordre : ils prennent leur sens avec plusieurs donneurs d'ordre aux exigences différentes. |
| — | Création rapide d'une référence inconnue au quai (lot 2) | Au lot 1, le référentiel est saisi avant la réception ; un code inconnu est refusé avec son motif. |
| Mission de rangement, une stratégie, régime libre, débordement | Stratégies multiples ordonnées, régime dirigé et dérogation (lot 2) | Une stratégie suffit à prouver la chaîne ; l'ordonnancement se paramètre par donneur d'ordre. |
| — | Cross-dock, éclatement, prélèvement dédié et réapprovisionnement (lot 2) | Le lot 1 prélève en réserve ; sans emplacement de prélèvement dédié, ni éclatement ni réapprovisionnement n'ont d'objet. |

## 3. Hypothèse sur le parcours

`RG-REC-039` confie la suite d'une ligne validée au parcours de l'article. Le moteur de parcours
n'arrive qu'au lot 3. Au lot 1, la suite est donc le **parcours par défaut** (`RG-WKF-005`) réduit à
sa plus simple expression — réception, mise en stock, fin — et non paramétrable.

Il doit être réalisé *comme* un parcours par défaut, et non comme un enchaînement écrit en dur : au
lot 3, le moteur le rend paramétrable au lieu de le remplacer. C'est la condition pour que le lot 1
ne soit pas une version jetable.

## 4. Jeu de données

Toutes les valeurs sont fictives.

**Organisation**
- Prestataire : *Logistique Démo*.
- Site : *Site A*, fuseau Europe/Paris, ouvert du lundi au vendredi de 7 h à 19 h.
- Zones : **QUAI** (zone de quai, deux quais Q1 et Q2, deux emplacements de quai par quai) ;
  **RES** (réserve, régime libre, masque allée-travée-niveau, allées A et B, dix travées, trois
  niveaux, capacité d'un support par emplacement) ; **DEB** (un emplacement de débordement).
- Imprimante d'étiquettes rattachée au quai Q1.

**Donneur d'ordre et tiers**
- Donneur d'ordre : *Maison Démo*, régime de réception visible, aucun écart n'ouvre de litige.
- Fournisseur : *Fournisseur Démo*.

**Références** (gestion quantitative, état qualité par défaut : neuf)

| Code | Libellé | Conditionnement |
|---|---|---|
| MD-001 | Câble HDMI 2 m | carton de 50 |
| MD-002 | Manette sans fil | carton de 20 |
| MD-003 | Chargeur USB-C 30 W | carton de 30 |
| MD-004 | Station de charge double | carton de 10 |

**Utilisateurs** (rôles opérationnels, site A)
- Anna, gestionnaire ; Chloé, cheffe de quai ; Rémi, réceptionnaire ; Bruno, magasinier.

**Attendu** — à saisir à l'étape 1 : *Fournisseur Démo*, date prévue le jour du scénario,
MD-001 × 100, MD-002 × 40, MD-003 × 60.

## 5. Déroulé

### Étape 1 — Anna saisit l'attendu

Au bureau, Anna crée l'attendu de *Maison Démo* pour le site A, avec ses trois lignes.

- **On constate** : l'attendu est ouvert, daté, et son solde par ligne égale la quantité attendue.
  Il apparaît parmi les attendus ouverts du site.
- **Règles éprouvées** : `RG-REC-007`, `008`, `009`, `010`, `014`.

### Étape 2 — Chloé ouvre l'arrivage

Au quai Q1, Chloé ouvre un arrivage : véhicule, transporteur.

- **On constate** : le quai Q1 passe occupé, sa durée d'occupation défile en direct.
- **Règles éprouvées** : `RG-REC-001`, `005`.

### Étape 3 — Rémi reçoit le premier support

Sur le poste du chariot, Rémi ouvre la réception sur l'attendu. Il crée un support : l'étiquette
sort à Q1. Il scanne MD-001 et saisit deux cartons ; il valide la ligne.

- **On constate** : 100 MD-001 en stock dans un emplacement de quai, statut libre, état neuf,
  rattachés au support S1 ; le solde de la ligne tombe à zéro ; une mission de rangement de S1 entier
  apparaît dans la file.
- **Règles éprouvées** : `RG-REC-033`, `037`, `038`, `049`, `050`, `RG-RAN-001`, `002`.

### Étape 4 — Un écart en moins

Toujours sur S1, Rémi reçoit MD-002 : il ne compte que 36 unités au lieu de 40, et valide.

- **On constate** : l'écart en moins de 4 est affiché à la validation et enregistré ; aucun litige
  n'est ouvert ; le solde de la ligne reste de 4.
- **Règles éprouvées** : `RG-REC-067`, `068`, `071`, `014`.

### Étape 5 — L'imprimante tombe

On éteint l'imprimante de Q1. Rémi crée un deuxième support, reçoit MD-003 × 60 et valide.

- **On constate** : le support S2 est créé et signalé non étiqueté à l'écran ; une alerte système
  est émise ; Rémi continue son déchargement sans blocage ; S2 apparaît dans la file de décisions.
- **Règles éprouvées** : `RG-SUR-086`, `087`, `088`, `RG-EXI-038`, `077`.

Bruno tente de prendre la mission de S2.

- **On constate** : la sortie de zone est refusée, avec l'étiquette manquante comme motif.
- **Règles éprouvées** : `RG-SUR-088`.

On rallume l'imprimante ; Chloé imprime l'étiquette de S2 depuis sa fiche.

- **On constate** : l'étiquette sort sans que S2 soit recréé ; l'élément quitte la file de
  décisions, résolu par le flux ; la mission de S2 devient prenable.
- **Règles éprouvées** : `RG-SUR-044`, `RG-SUR-083`.

### Étape 6 — Une référence non attendue

Sur S2, Rémi scanne MD-004, absente de l'attendu, et saisit un carton.

- **On constate** : une ligne non attendue s'ouvre ; 10 MD-004 entrent en stock ; l'écart
  « référence non attendue » est enregistré.
- **Règles éprouvées** : `RG-REC-074`.

### Étape 7 — Un code inconnu

Rémi scanne un code qui ne correspond à aucune référence de *Maison Démo*.

- **On constate** : le code est refusé avec son motif ; rien n'entre en stock ; l'écran ne se
  vide pas.
- **Règles éprouvées** : `RG-SUR-063`.

### Étape 8 — Clôture et libération

Rémi clôture la réception ; Chloé libère le quai Q1.

- **On constate** : le récapitulatif liste les trois écarts ; l'attendu est partiellement servi,
  avec un solde de 4 MD-002 ; la durée d'occupation de Q1 est figée ; Q1 redevient libre.
- **Règles éprouvées** : `RG-REC-004`, `016`, `029`.

### Étape 9 — Bruno range S1

Bruno ouvre sa file de missions et prend la suivante.

- **On constate** : la mission propose un emplacement de réserve, avec la stratégie qui l'a choisi ;
  Bruno scanne S1 puis l'emplacement proposé ; la mission se clôt, le mouvement est enregistré, la
  mission suivante s'affiche.
- **Règles éprouvées** : `RG-RAN-024`, `037`, `038`, `040`, `RG-SUR-030`, `031`.

### Étape 10 — Un dépôt refusé, puis un écart de rangement

Pour S2, Bruno scanne un emplacement déjà occupé par S1.

- **On constate** : le dépôt est refusé en une phrase — capacité — et un emplacement compatible est
  proposé.
- **Règles éprouvées** : `RG-RAN-038`, `039`.

Il dépose alors S2 dans un autre emplacement libre que celui proposé.

- **On constate** : en régime libre, le dépôt est accepté et enregistré comme écart de rangement.
- **Règles éprouvées** : `RG-RAN-034`.

### Étape 11 — Retrouver un support

Au bureau, Anna scanne l'étiquette de S1, hors de toute mission.

- **On constate** : la fiche de S1 s'ouvre, avec son contenu, son emplacement en réserve et son
  historique depuis le quai.
- **Règles éprouvées** : `RG-SUR-059`, `060`, `RG-TRA-009`.

### Étape 12 — Les traces

Anna ouvre le journal de la réception et des deux missions.

- **On constate** : chaque geste des étapes 1 à 11 y figure, avec son auteur, son horodatage et son
  poste, refus compris ; la réception et les deux missions apparaissent comme des tâches mesurées.
- **Règles éprouvées** : `RG-TRA-001` à `005`, `RG-TRA-010`, `RG-REC-082`, `083`, `RG-RAN-010`.

## 6. État final attendu

| Référence | Quantité | Où | Support |
|---|---|---|---|
| MD-001 | 100 | Réserve, emplacement proposé | S1 |
| MD-002 | 36 | Réserve, emplacement proposé | S1 |
| MD-003 | 60 | Réserve, emplacement choisi par Bruno | S2 |
| MD-004 | 10 | Réserve, emplacement choisi par Bruno | S2 |

- Aucun stock en zone de quai ; aucun support non étiqueté ; la file de décisions est vide.
- L'attendu reste ouvert avec 4 MD-002 dus.
- Trois écarts de réception et un écart de rangement enregistrés ; aucun litige.

Le scénario est réussi quand chaque constat des étapes 1 à 12 est vérifié et que l'état final
correspond exactement à ce tableau.
