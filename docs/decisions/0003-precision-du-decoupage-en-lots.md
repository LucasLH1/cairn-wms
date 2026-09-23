# 0003 — Précision du découpage en lots

**Statut** : proposée · **Date** : 2026-09-23 · **Remplace** : 0001, à son acte · **Remplacée par** : —

## Contexte

La fiche 0001 a découpé la réalisation en cinq lots verticaux, chacun démontrable par un scénario
déroulé sur le jeu de données de test. Son critère reste bon. Mais en commençant à écrire le
scénario du lot 1, trois constats sont apparus :

- **Un élément est mal placé.** 0001 met les supports au lot 2. Or la réception crée les supports dès
  le quai (`RG-REC-049`), y rattache les lignes reçues (`RG-REC-050`), et le rangement déplace un
  support entier (`RG-RAN-002`). Un lot 1 sans supports obligerait à réécrire réception et rangement
  au lot 2 — exactement la dette que 0001 refuse (« le lot 1 n'est pas une version jetable »).
- **Un élément manque au lot 1.** Une rupture au prélèvement déclenche un comptage de l'emplacement,
  et seul un comptage validé corrige le stock (`RG-PRE-042`, `RG-PRE-043`). Sans comptage, la
  première rupture du lot 1 ne se corrige jamais.
- **Plusieurs modules ne sont placés nulle part** : les litiges (4.2), les blocages et la quarantaine
  (2.3), les supports consignés (2.4), le second site et les transferts inter-sites (2.1), les
  inventaires autres que le comptage ponctuel (2.2), et l'espace technique (`RG-EXI-064` à `068`),
  né après 0001.

Laisser ces trous en l'état revient à laisser le code décider des placements, ce que `CLAUDE.md`
interdit.

Une conséquence ne demande aucun changement mais doit être dite : l'import d'attendus relève du lot
5 (profils et échanges). Au lot 1, l'attendu est saisi à la main, ce que `RG-REC-010` prévoit.

## Options

### Option A — Conserver 0001 et placer au fil de l'eau

- **Ce que c'est** : garder les cinq lots tels quels et trancher chaque placement quand il se pose.
- **En faveur** : aucune fiche nouvelle.
- **En défaveur** : le lot 1 n'est pas réalisable sans supports ni comptage ; chaque placement
  tranché en cours de route l'est sans vue d'ensemble, souvent dans le code.
- **Ce que ça ferme** : la possibilité d'écrire le scénario du lot 1 avant de le réaliser.

### Option B — Préciser les lots, en gardant leur critère

- **Ce que c'est** : les cinq lots de 0001 et leur ordre sont conservés ; chaque élément trouve sa
  place, et le lot 1 reçoit ce sans quoi il ne tient pas.
- **En faveur** : le critère de 0001 reste intact ; tout module a un lot ; le lot 1 devient
  démontrable.
- **En défaveur** : le lot 1 s'alourdit des supports simples et du comptage ponctuel.
- **Ce que ça ferme** : rien.

### Option C — Redécouper entièrement

- **Ce que c'est** : reprendre le découpage à zéro, par exemple module par module.
- **En faveur** : un découpage neuf, aligné sur la spécification.
- **En défaveur** : abandonne le critère de 0001 — un entrepôt qui tourne à chaque lot — qui n'est pas
  en cause.
- **Ce que ça ferme** : la démonstration par lot.

## Décision

**Les cinq lots de 0001 sont conservés dans leur ordre et dans leur critère, et précisés comme
suit** (option B). Proposée par Claude en conversation de conception, en attente de validation par
Lucas.

| Lot | Contenu | Ce qu'il prouve |
|---|---|---|
| 1 | **L'entrepôt minimal.** Un donneur d'ordre, un site, gestion quantitative. Attendu saisi à la main, réception au quai, **supports simples** créés et étiquetés dès le quai, rangement, commande, prélèvement, **comptage ponctuel**, expédition. Un écart de réception est enregistré sans ouvrir de litige (`RG-REC-071`). Journal d'événements et tâches dès ce lot. Fonctions de 0.8 dans leur forme simple : file de décisions, main, recherche et lecture de code-barres, alertes dans l'application, impression des étiquettes de support et des documents de flux. | La marchandise entre, se range, se prélève, sort, et le stock se corrige. |
| 2 | **L'identité et la multiplicité.** Numéro de série, lot, multi-donneurs d'ordre réel, rôles, équipes, hiérarchie et périmètres, **second site et transferts inter-sites**, **supports consignés**, **blocages et quarantaine**, **inventaires tournants et complets**. | Le produit distingue les exemplaires, les clients et les sites. |
| 3 | **Le SAV.** Dossiers, retours client, parcours configurables, atelier et réparation, **litiges**. | Ce qui différencie le produit fonctionne. |
| 4 | **La mesure.** Unités d'œuvre, photo quotidienne, relevés d'activité, indicateurs, comparaison d'activité. | Le prestataire peut facturer et piloter. |
| 5 | **L'ouverture.** Profils d'import, échanges automatisés, portail donneur d'ordre, interfaçage direct, tarification, **espace technique**. | Le produit se branche sur le système d'un donneur d'ordre, et s'installe et s'exploite sans l'éditeur. |

Les raisons de chaque placement :

- **Supports simples au lot 1** : réception et rangement ne se décrivent pas sans eux.
- **Comptage ponctuel au lot 1** : c'est le seul moyen de corriger le stock après une rupture.
- **Litiges au lot 3** : le SAV ne tient pas sans eux, puisqu'une dérive ouvre toujours un litige ;
  avant, un écart s'enregistre sans litige.
- **Blocages au lot 2** : un rappel se désigne au lot de fabrication, qui arrive au lot 2.
- **Supports consignés au lot 2** : ils supposent plusieurs propriétaires, donc le multi-donneurs
  d'ordre.
- **Second site et transferts au lot 2** : c'est de la multiplicité, et le jeu de test compte deux
  sites.
- **Inventaires tournants et complets au lot 2** : au-delà du comptage ponctuel, ils portent sur le
  stock de plusieurs donneurs d'ordre.
- **Espace technique au lot 5** : tant que l'éditeur installe lui-même ses instances de
  démonstration, un déploiement reproductible suffit ; l'espace technique devient nécessaire quand
  un tiers installe et exploite seul, ce qui est l'objet du lot 5.

## Conséquences

- **Ce qu'on peut faire** : écrire le scénario de démonstration du lot 1 ; savoir, pour tout module,
  dans quel lot il se réalise.

- **Ce qu'on ne peut plus faire** : réaliser au lot 1 un élément qu'une autre ligne du tableau place
  plus loin, même s'il paraît simple.

- **Ce qu'il faut mettre en place** :
  - À l'acte de cette fiche, 0001 passe au statut « remplacée par 0003 ».
  - `status.yml` : la section `lots:` reprend le tableau ci-dessus.
  - Le scénario de démonstration du lot 1, qui vaut critère de clôture du lot.

- **Ce qu'on accepte de payer** : un lot 1 plus lourd que dans 0001. Les deux dettes que 0001 posait
  restent entières : le lot 1 n'est pas une version jetable, et le journal comme les tâches naissent
  dès le lot 1.

- **Ce qui la remettrait en cause** : un scénario de lot qui ne se déroule pas sans emprunter
  largement au lot suivant, signe qu'une frontière est encore mal placée.
