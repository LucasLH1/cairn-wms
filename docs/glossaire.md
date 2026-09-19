# Glossaire métier — Cairn WMS

Référence unique du vocabulaire. Le **libellé français** est celui qui apparaît dans les écrans. Le
**terme anglais** est celui qui doit être utilisé dans les données, le code et les identifiants.

Règles d'usage :

- Un concept = un terme. Aucun synonyme n'est admis, ni en français ni en anglais.
- Un terme absent de ce glossaire ne doit pas apparaître dans un document ni dans le code. S'il
  manque, on l'ajoute ici d'abord.
- Les termes marqués *(réservé)* désignent des concepts de couches non encore rédigées. Ils sont
  posés ici pour éviter qu'un autre nom ne s'installe entre-temps.

---

## Organisation

| Français | Anglais | Définition |
|---|---|---|
| Prestataire | `Provider` | L'exploitant du WMS : l'entreprise de logistique qui détient les sites, emploie les opérateurs et facture ses prestations. Une instance de Cairn sert un seul prestataire. |
| Donneur d'ordre | `Principal` | L'entité qui confie de la marchandise au prestataire. Elle ne possède aucun emplacement mais possède du stock. Porteur principal du paramétrage. |
| Groupe de donneurs d'ordre | `PrincipalGroup` | Regroupement purement statistique de plusieurs donneurs d'ordre appartenant au même client commercial. Sans effet opérationnel. |
| Site | `Site` | Un lieu physique exploité par le prestataire, doté d'une adresse postale. |
| Zone logistique | `Zone` | Découpage d'un site : bâtiment, cellule, mezzanine, quai, atelier, zone de quarantaine. Niveau auquel se déclarent la vocation et les règles de cohabitation. |
| Calendrier de site | `SiteCalendar` | Jours et horaires d'ouverture d'un site, jours fériés et fermetures exceptionnelles. Base de tout calcul en heures ouvrées. |
| Rôle | `Role` | Ensemble nommé de permissions, composé par le prestataire. |
| Permission | `Permission` | Autorisation élémentaire d'accomplir un geste précis. Unité indivisible des droits. |
| Schéma de numérotation | `NumberingScheme` | Masque de composition des identifiants métier lisibles par les humains. |

## Référentiel produit

| Français | Anglais | Définition |
|---|---|---|
| Référence | `Item` | Un article du catalogue d'un donneur d'ordre. Porte le code, les libellés, l'axe de gestion, les conditionnements et les caractéristiques. |
| Famille | `ItemFamily` | Regroupement de références propre à un donneur d'ordre, utilisé comme critère de paramétrage et de statistique. |
| Axe de gestion | `TrackingMode` | Manière dont le stock d'une référence est suivi : au quantitatif, au lot, au numéro de série. |
| Lot | `Batch` | Regroupement de production identifié, partageant une origine et des dates communes. |
| Objet sérialisé | `SerializedUnit` | Un exemplaire physique unique et durable, identifié par son numéro de série, dont l'existence et l'historique survivent à ses passages en stock. |
| Numéro de série | `SerialNumber` | Identifiant d'un objet sérialisé. |
| Identifiant scannable | `ItemBarcode` | Code lisible rattaché à une référence : code interne, GTIN/EAN, code fournisseur, code donneur d'ordre. Une référence en porte plusieurs. |
| Niveau de conditionnement | `PackagingLevel` | Un échelon de la hiérarchie d'emballage d'une référence, avec son coefficient et ses caractéristiques physiques. |
| Kit | `Kit` | Référence assemblée à partir d'autres références, que l'on fabrique et que l'on peut défaire, avec effet sur le stock. |
| Nomenclature de réparation | `RepairBom` | Description des composants remplaçables d'une référence, à usage d'atelier. Sans effet sur le stock. |
| Équivalence | `ItemSubstitution` | Lien déclarant qu'une référence peut en remplacer une autre, avec son sens et sa portée. |
| Champ personnalisé | `CustomField` | Attribut supplémentaire déclaré par un donneur d'ordre sur ses propres références. |
| Classement ADR | `AdrClassification` | Classe, numéro ONU et groupe d'emballage d'une référence relevant des matières dangereuses. Déclaratif. |

## Emplacements

| Français | Anglais | Définition |
|---|---|---|
| Emplacement | `Location` | Endroit identifié pouvant porter du stock. Appartient à une zone. |
| Emplacement virtuel | `VirtualLocation` | Emplacement sans existence physique représentant un stock hors des murs ou en cours de déplacement. |
| Masque d'adressage | `LocationAddressPattern` | Structure de composition des adresses d'emplacement d'une zone, en segments nommés. |
| Séquence de parcours | `TraversalRank` | Position d'un emplacement dans l'ordre de circulation d'une zone. Détermine l'ordre des prélèvements et des rangements. |
| Emplacement de prélèvement dédié | `FixedPickLocation` | Emplacement attitré à une référence, réapprovisionné depuis la réserve. |
| Règle de réapprovisionnement | `ReplenishmentRule` | Seuil et quantité de recomplètement d'un emplacement de prélèvement dédié. |
| Générateur de plan | `LayoutGenerator` | Outil de création en masse d'emplacements à partir d'une description paramétrique d'une zone. |

## Stock

| Français | Anglais | Définition |
|---|---|---|
| Unité de stock | `StockUnit` | Une quantité d'une référence, à un emplacement, dans un état qualité et un statut de disponibilité donnés, appartenant à un donneur d'ordre. |
| État qualité | `QualityState` | Ce qu'est physiquement le produit : neuf, reconditionné, défectueux, à détruire. Configurable par donneur d'ordre. |
| Statut de disponibilité | `AvailabilityStatus` | Ce que le WMS s'autorise à faire d'une unité de stock : libre, réservée, bloquée, en cours de mouvement. Piloté par le moteur, jamais saisi. |
| Mouvement de stock | `StockMovement` | Enregistrement immuable d'un changement affectant une unité de stock. |
| Motif de mouvement | `MovementReason` | Justification obligatoire d'un mouvement qui n'est pas la conséquence d'un flux standard. |
| Support | `HandlingUnit` | Contenant identifié — palette, bac, roll, carton — portant du stock et déplaçable d'un seul geste avec son contenu. |
| Support consigné | `ReturnableHandlingUnit` | Support appartenant à un tiers, dont la restitution doit être suivie. |
| Régime de consigne | `DepositRegime` | Manière dont un type de support consigné est suivi : au solde, ou à l'unité. Déclaré par le type, figé dès le premier mouvement. |
| Compte de consigne | `DepositAccount` | Solde des supports dus entre le prestataire et un tiers, pour un type de support. Seul solde qui fait foi, ventilé par donneur d'ordre en lecture. |
| Mouvement de consigne | `DepositMovement` | Enregistrement immuable d'un fait modifiant un compte de consigne. Distinct du mouvement de stock. |
| Régularisation de consigne | `DepositAdjustment` | Mouvement de consigne motivé corrigeant un solde, sous permission. Ne réécrit jamais le solde. |
| Parc de vides | `EmptyPool` | Stock des supports vides, localisé et inventorié, sans propriétaire au sens du donneur d'ordre et sans référence au catalogue. |
| Échange à quai | `DockExchange` | Régime dans lequel une réception s'accompagne de la restitution d'un nombre équivalent de supports vides. |
| Sortie du parc | `PoolExit` | Départ définitif d'un support hors du suivi du WMS, sans extinction de la dette envers son propriétaire. |
| Réservation | `StockReservation` | Lien entre une unité de stock et une demande qui la revendique. |
| Règle de prélèvement | `PickingRule` | Stratégie de choix du stock à prélever : premier entré premier sorti, premier périmé premier sorti, ou autre. |
| Photo quotidienne du stock | `DailyStockSnapshot` | État figé du stock détenu à une date donnée, par donneur d'ordre et par site. |
| Blocage | `StockHold` | Interdiction motivée et datée de mouvementer ou de prélever du stock. |
| Campagne de blocage | `HoldCampaign` | Blocage massif dont le périmètre est désigné par critères, doté d'une prévisualisation, de missions d'isolement et d'une levée d'ensemble. |
| Mise à disposition | `StockRelease` | Retour automatique d'une unité de stock à la disponibilité, dès que sa dernière cause d'indisponibilité tombe. Constat, jamais décision. |
| Requalification | `StockReclassification` | Sortie d'une unité de stock du dossier auquel elle est rattachée, qui la remet dans le stock ordinaire. Ne désigne jamais un changement d'état qualité. |
| Date d'échéance | `ExpiryDate` | Date à laquelle une unité de stock cesse d'être utilisable : péremption, fin de garantie, limite de détention. |
| Préavis d'échéance | `ExpiryNotice` | Délai, en jours, avant lequel le WMS annonce qu'une échéance va tomber. Informe, n'agit pas. |
| Durée de vie résiduelle | `RemainingShelfLife` | Délai minimal exigé entre aujourd'hui et l'échéance pour qu'une unité reste prélevable. |
| Valeur déclarée | `DeclaredValue` | Montant unitaire déclaré par le donneur d'ordre sur une référence, surchargeable par le flux d'entrée. Sert aux seuils, aux arbitrages et à l'indemnisation ; jamais à une valorisation comptable. |

## Tiers

| Français | Anglais | Définition |
|---|---|---|
| Tiers | `Party` | Toute entité extérieure avec laquelle le prestataire échange de la marchandise ou des services. |
| Fournisseur | `Supplier` | Tiers expédiant de la marchandise vers un site du prestataire. |
| Client final | `Customer` | Destinataire d'une expédition, rattaché à un donneur d'ordre. Généralement une personne physique. |
| Transporteur | `Carrier` | Tiers assurant l'acheminement de la marchandise. |
| Service transporteur | `CarrierService` | Prestation nommée d'un transporteur, avec ses contraintes et ses caractéristiques. |
| Sous-traitant | `Subcontractor` | Tiers réalisant une prestation sur la marchandise hors des murs du prestataire : atelier externe, destructeur agréé, recycleur. |
| Adresse | `Address` | Localisation postale rattachée à un tiers, qualifiée par son usage. |

## Workflow

| Français | Anglais | Définition |
|---|---|---|
| Parcours | `ProcessFlow` | Trajectoire configurable d'un article physique à travers une suite d'étapes. |
| Version de parcours | `FlowVersion` | État figé et publié d'un parcours. Un dossier suit la version en vigueur à son entrée. |
| Condition d'entrée | `FlowEntryCondition` | Critère décidant quels articles empruntent un parcours donné. |
| Étape | `FlowStep` | Un palier d'un parcours, instancié à partir d'un type d'étape du catalogue. |
| Type d'étape | `FlowStepType` | Comportement prédéfini livré avec le produit, que le paramétrage assemble mais n'invente pas. |
| Issue | `StepOutcome` | Résultat nommé d'une étape, qui détermine la suite du parcours. |
| Routage | `StepRouting` | Table associant une issue, et éventuellement des conditions, à l'étape suivante. |
| Action automatique | `FlowAction` | Traitement déclenché par une étape sans intervention humaine. |
| Parcours de constat | `FindingFlow` | Parcours livré en standard, déclenchable par le scan d'une unité depuis tout écran du terrain, par lequel passe tout changement d'état qualité hors flux. |
| Constat | `Finding` | Déclaration par un opérateur d'un fait affectant une unité de stock hors de tout parcours en cours : casse, écrasement, anomalie. |
| Forçage | `FlowOverride` | Transition décidée par un superviseur hors du routage prévu, motivée et tracée. |
| Cycle de vie | `Lifecycle` | Suite de statuts non configurable d'un document métier. À ne pas confondre avec un parcours. |

## Flux entrants

| Français | Anglais | Définition |
|---|---|---|
| Arrivage | `InboundArrival` | Arrivée physique d'un véhicule sur un quai. Regroupe une ou plusieurs réceptions et porte le temps d'occupation du quai. |
| Attendu | `ExpectedReceipt` | Annonce de ce qui doit arriver, portant des lignes et un solde. Servi par une ou plusieurs réceptions. |
| Ligne d'attendu | `ExpectedReceiptLine` | Une référence annoncée, sa quantité, et son solde servi ou restant dû. |
| Réception | `Receipt` | Objet unique de l'entrée de marchandise, quel que soit son mode d'arrivée. |
| Type de réception | `ReceiptType` | Qualification de l'origine d'une réception : sur attendu, à la volée, retour client, dossier SAV. |
| Ligne de réception | `ReceiptLine` | Une référence reçue, portant toujours une quantité attendue et une quantité reçue. |
| Détail sérialisé | `ReceiptLineSerial` | Un exemplaire identifié sous une ligne de réception. |
| Écart de réception | `ReceiptDiscrepancy` | Différence constatée entre l'attendu et le reçu, enregistrée qu'elle ouvre un litige ou non. |
| Réception aveugle | `BlindReceiving` | Régime dans lequel les quantités attendues sont masquées pendant le comptage. |
| Grille de contrôle | `InspectionChecklist` | Liste ordonnée de points de contrôle appliquée à une ligne ou à un exemplaire. |
| Point de contrôle | `InspectionPoint` | Un critère nommé d'une grille, avec son caractère bloquant et son déclenchement de litige. |
| Résultat de contrôle | `InspectionResult` | Verdict immuable produit par l'application d'une grille. |
| Rapprochement | `ReceiptMatching` | Rattachement, validé par un humain, d'une réception à la volée à un attendu ouvert. |
| Litige | `Dispute` *(réservé)* | Anomalie qualifiée, imputée et suivie jusqu'à résolution. Défini en 4.2. |

## Service après-vente

| Français | Anglais | Définition |
|---|---|---|
| Dossier | `Case` | Unité de traitement d'une affaire de service après-vente : un donneur d'ordre, un client final, un motif, un ou plusieurs articles annoncés. |
| Article annoncé | `CaseItem` | Ce que le donneur d'ordre déclare devoir arriver, désigné au numéro de série ou à la référence. |
| Motif de dossier | `CaseReason` | Raison du retour : panne, défaut à la livraison, rétractation, rappel constructeur, erreur d'expédition, ou motif propre au donneur d'ordre. |
| Régime de garantie | `WarrantyCoverage` | Qui paie : sous garantie, hors garantie, indéterminé. Annoncé par le donneur d'ordre, recoupé par le WMS. |
| Dérive | `CaseDeviation` | Écart entre ce qu'un dossier annonce et ce qui est reçu. Ouvre toujours un litige. |
| Expédition groupée | `ConsolidatedShipping` | Indicateur d'un dossier dont les articles terminés attendent les autres avant de repartir ensemble. |
| Lien d'échange | `SwapLink` | Rattachement, au sein d'un dossier, entre un article reçu et l'exemplaire de stock qui le remplace. |
| Correction d'aiguillage | `CaseReassignment` | Bascule du rattachement vers un autre dossier ouvert sur le même article, avant validation de la ligne. |
| Réouverture | `CaseReopening` | Retour d'un dossier clos à l'état en traitement, déclenché par un fait scanné et jamais arbitré. |
| Bon de retour | `ReturnVoucher` | Objet dormant émis avec une expédition, portant un code-barres maîtrisé. Son scan crée le dossier et le rattache à la commande. |
| Étiquette retour | `ReturnLabel` | Étiquette de transport du sens retour, prépayée et jointe au colis aller, ou produite à la demande. |
| Preuve de dépôt | `ProofOfLodgement` | Événement de prise en charge d'un colis retour par un transporteur. Distingue un colis non déposé d'un colis perdu. |
| Commande principale | `PrimaryOrder` | Commande désignée par le bon scanné, origine du dossier de retour. |
| Commande rattachée | `LinkedOrder` | Autre commande du même client final dont provient un article reçu dans le même colis. |
| Recevabilité | `ReturnEligibility` | Conformité d'un retour au délai déclaré par le donneur d'ordre. Signalée, jamais bloquante. |
| Incident de livraison | `DeliveryIncident` | Anomalie remontée par un transporteur sur un colis aller. Informe et alerte, ne déclenche rien. |

## Rangement

| Français | Anglais | Définition |
|---|---|---|
| Stratégie de rangement | `PutawayStrategy` | Règle de choix d'un emplacement de rangement, issue d'un catalogue fermé et ordonnée par le paramétrage. |
| Régime de rangement | `PutawayMode` | Caractère dirigé ou libre du rangement dans une zone. |
| Écart de rangement | `PutawayVariance` | Dépôt à un emplacement autre que celui proposé, en zone libre. |
| Dérogation | `PutawayOverride` | Dépôt à un emplacement autre que celui imposé, en zone dirigée, sous permission et avec motif. |
| Cross-dock | `CrossDock` | Envoi direct vers la préparation d'une marchandise déjà attendue, sans passage en stockage. |
| Éclatement | `PutawaySplit` | Division d'une mission en deux dépôts pour servir au passage un emplacement de prélèvement. |
| Emplacement de débordement | `OverflowLocation` | Emplacement sans contrainte de capacité recevant le stock qu'aucune stratégie ne peut placer. |
| Résorption | `OverflowClearing` | Travail de replacement du stock en débordement vers des emplacements conformes. |

## Mouvements et transferts

| Français | Anglais | Définition |
|---|---|---|
| Mission | `WorkOrder` | Unité de travail interne à exécuter : origine, contenu, destination, priorité, état. Une mission de rangement est une mission de type rangement. |
| Type de mission | `WorkOrderType` | Nature du travail : rangement, réapprovisionnement, transfert interne, départ de transfert, résorption, comptage, mise en quarantaine. |
| Transfert | `StockTransfer` | Déplacement de marchandise entre deux sites, chapeautant l'expédition au départ et la réception à l'arrivée. |
| Ligne de transfert | `StockTransferLine` | Une référence transférée, avec ses quantités demandée, partie et arrivée. |
| Demande de réapprovisionnement | `ReplenishmentRequest` | Besoin de recomplètement d'un emplacement de prélèvement dédié, né d'un seuil, d'une anticipation ou d'une demande manuelle. |
| Quantité attendue | `IncomingQuantity` | Stock en transit vers un site, visible mais ni prélevable ni réservable. |
| Litige interne | `InternalDispute` | Écart entre deux sites du prestataire, sans tiers, imputé par défaut au site expéditeur. |
| Mise en quarantaine | `QuarantineMove` | Mission de regroupement d'une unité bloquée vers la zone de quarantaine du site, générée par une campagne de blocage. |
| Déplacement en masse | `BulkMove` | Sélection de stock générant un lot de missions de transfert interne. |

## Inventaires

| Français | Anglais | Définition |
|---|---|---|
| Campagne d'inventaire | `StockCount` | Un inventaire : un type, un périmètre, une date, un cycle de vie. |
| Type d'inventaire | `StockCountType` | Tournant, complet, ponctuel, de contrôle. |
| Relevé | `CountRecord` | Ce qu'un opérateur a déclaré trouver à un emplacement. Immuable une fois validé. |
| Recomptage | `Recount` | Second comptage aveugle d'un emplacement, déclenché par tout écart. |
| Gel d'inventaire | `CountFreeze` | Interdiction temporaire de mouvementer un emplacement pendant son comptage. |
| Écart d'inventaire | `CountVariance` | Différence entre le stock théorique et le stock compté, retenue seulement si confirmée au recomptage. |
| Écart de localisation | `LocationVariance` | Exemplaire sérialisé trouvé à un autre emplacement que celui où le WMS le situe. Ni manquant, ni surplus. |
| Seuil de validation | `VarianceThreshold` | Quantité ou valeur au-delà de laquelle un écart exige une validation humaine avant ajustement. |
| Taux de fiabilité du stock | `StockAccuracy` | Part des emplacements comptés sans écart. Se calcule sur les emplacements, jamais sur les quantités. |
| Taux de couverture | `CountCoverage` | Part des emplacements comptés au moins une fois sur une période. |

## Flux sortants

| Français | Anglais | Définition |
|---|---|---|
| Commande | `Order` | Demande de sortie de marchandise pour un destinataire, portant un régime de rupture et une priorité. Origine possible d'un dossier de retour. |
| Ligne de commande | `OrderLine` | Une référence demandée, sa quantité, l'état qualité exigé et son solde servi ou restant dû. |
| Exemplaire désigné | `DesignatedUnit` | Numéro de série exigé par une ligne de commande, qui interdit au WMS tout choix et toute substitution. |
| Régime de rupture | `BackorderPolicy` | Comportement d'une commande dont une ligne manque : partielle autorisée, ou complète exigée. |
| Reliquat | `Backorder` | Solde restant dû d'une commande partiellement servie. Ne constitue jamais une nouvelle commande. |
| Règle de regroupement | `ConsolidationRule` | Critères et durée d'attente selon lesquels plusieurs commandes d'un même destinataire partagent une expédition. |
| Fenêtre d'attente | `ConsolidationWindow` | Délai pendant lequel une commande éligible patiente avant expédition, dans l'espoir d'un regroupement. |
| Référence externe | `ExternalReference` | Identifiant de la commande chez le donneur d'ordre. Garantit qu'un flux rejoué ne duplique rien. |
| Vague de préparation | `PickWave` | Ensemble de commandes d'un même site lancées ensemble en préparation. Porte son mode et son avancement. |
| Mode de préparation | `PickingMode` | Manière de prélever une vague : mono-commande, ou groupée avec tri final. Décidé par le WMS, enregistré sur la vague. |
| Zone de tri | `SortingZone` | Zone où le prélèvement groupé est éclaté par commande avant colisage. |
| Rupture au prélèvement | `ShortPick` | Constat qu'un emplacement contient moins que ce que le WMS y voyait. Déclenche une réémission et un comptage, n'ajuste jamais le stock. |
| Déconditionnement | `PackagingBreak` | Ouverture d'un niveau de conditionnement pour servir une quantité inférieure. Sans effet sur la quantité en stock. |
| Contrôle de colisage | `PackingCheck` | Vérification par scan du contenu d'une commande avant fermeture du colis. |
| Proposition de colisage | `PackingProposal` | Répartition en colis calculée par le WMS, que l'opérateur peut modifier. L'écart est enregistré. |
| Expédition | `Shipment` | Départ effectif de marchandise vers un tiers, porteur du numéro cité par les colis qui reviennent. Définie en 3.3. *(réservé)* |
| Colis | `Parcel` | Unité de transport constituée au colisage, portant un identifiant scannable et son contenu détaillé. À ne pas confondre avec le support. |

## Traçabilité et facturation

| Français | Anglais | Définition |
|---|---|---|
| Événement | `TraceEvent` | Enregistrement immuable d'un geste ou d'un fait : qui, quoi, quand, où, sur quel objet, depuis quel poste. |
| Tâche | `Task` | Unité de travail identifiable attribuée à un opérateur, dont la durée est mesurée. |
| Unité d'œuvre | `ChargeableUnit` | Compteur d'une prestation vendue à un donneur d'ordre, rattaché à une période. |
| Famille d'unités d'œuvre | `ChargeableUnitFamily` | Regroupement des unités d'œuvre par nature : manutention, stockage, SAV, prestations annexes. |
| Relevé d'activité | `ActivityStatement` | Consolidation des unités d'œuvre d'un donneur d'ordre sur une période, destinée à alimenter la facturation réelle. Sans valeur légale. |

---

## Termes proscrits

Ces mots sont ambigus ou déjà pris. Ils ne doivent apparaître nulle part.

| À ne pas employer | Employer à la place | Pourquoi |
|---|---|---|
| Client | Donneur d'ordre, ou client final | Désigne deux choses opposées selon l'interlocuteur. |
| Article, produit, SKU, code article | Référence / `Item` | Quatre mots pour un seul objet. |
| Statut (seul, à propos du stock) | État qualité, ou statut de disponibilité | La confusion entre les deux axes est l'erreur de conception que le modèle évite. |
| Workflow (en français) | Parcours, ou cycle de vie | Le français doit distinguer ce qui est configurable de ce qui ne l'est pas. |
| Palette (comme objet de gestion) | Support | Une palette est un type de support parmi d'autres. |
| Colis (dans le socle et les flux entrants) | Support | Le colis est un concept d'expédition, défini en 3.2. Dans le socle et en couche 1, ce qui porte du stock est un support. |
| Entrepôt *(pour désigner un lieu)* | Site, ou zone logistique | Le mot désigne tantôt l'un, tantôt l'autre. Il reste admis dans la prose, au sens général du métier ; jamais pour nommer un objet, un champ, un écran ou un périmètre précis. |
| Avis d'expédition, ASN, commande fournisseur | Attendu | Trois mots pour ce que le WMS attend, quelle que soit son origine. |
| Bon de réception | Réception | Le document n'est pas l'objet métier. |
| Affectation | Règle de prélèvement, ou stratégie de rangement | Le mot désignait deux mécanismes opposés : le choix du stock à sortir et le choix de l'emplacement où ranger. |
| Requalification (au sens de la qualité) | Changement d'état qualité | « Requalification » désigne la sortie d'une unité de son dossier, et rien d'autre. |
| Prise en charge (au sens de la garantie) | Régime de garantie | « Prise en charge » est réservé à l'événement transporteur qui vaut preuve de dépôt. |
