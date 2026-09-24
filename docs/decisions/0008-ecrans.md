# 0008 — Écrans

**Statut** : proposée · **Date** : 2026-09-24 · **Remplace** : — · **Remplacée par** : —

## Contexte

`0002` a retenu Vue 3 et TypeScript pour les écrans ; `0004` les a rangés sous `web/`, un dossier par
partie ; `0005` les soumet à `vue-tsc`, ESLint et Vitest, en TypeScript 6.0 ; `0007` leur fournit un
code d'appel généré. Il reste à arrêter leurs bibliothèques, leur thème et leurs composants.

**La référence visuelle est la maquette validée du lot 1**, `docs/lots/lot-1/maquette.html`. Son
README impose les couleurs, les polices, les composants, le vocabulaire des écrans et les
comportements visibles ; la disposition exacte reste indicative ; la spécification prime en cas de
désaccord.

Les exigences qui pèsent ici :

- **Une seule application, trois surfaces** séparées par les permissions (`RG-SUR-002`) ; **le
  terrain et le bureau partagent le même langage visuel** (`RG-SUR-003`).
- **Écran d'ordinateur seulement** (`RG-EXI-053`) ; **lecture de code-barres reçue quel que soit
  l'écran** (`RG-EXI-033`), le lecteur se branchant comme un clavier (`RG-EXI-078`).
- **Français par défaut, anglais par utilisateur**, libellés du glossaire (`RG-EXI-054`, `079`).
- **Temps réel** sur la main, la file de décisions et les écrans consultés (`RG-EXI-001` à `005`),
  détaillé par la fiche Temps réel (issue `#41`).
- **Raisons de non-prélevabilité** affichées en une phrase (`RG-DIS-004`) ; **refus motivés**
  composés depuis les codes de motif de `0007`.

## Options

### Option A — Une bibliothèque de composants complète et son thème

- **Ce que c'est** : PrimeVue ou équivalent, thème adapté aux couleurs de la maquette.
- **En faveur** : beaucoup de composants prêts.
- **En défaveur** : PrimeVue 5 est passé sous licence commerciale avec clé, contraire à la règle des
  licences permissives de `0002` ; sa dernière version libre, 4.5, n'évoluera plus. Adapter un thème
  complet à la maquette coûte autant que l'écrire, avec un risque d'écart visuel permanent.
- **Ce que ça ferme** : la maîtrise du rendu.

### Option B — Des primitives non stylées et des composants propres, écrits sur les jetons de la maquette

- **Ce que c'est** : Reka UI (MIT, actif, conforme aux motifs d'accessibilité WAI-ARIA) pour le
  comportement des éléments complexes — liste déroulante, dialogue, onglets — ; des composants Cairn
  qui en portent le rendu, écrits sur des jetons CSS relevés dans la maquette.
- **En faveur** : le rendu est exactement celui de la maquette ; le comportement difficile — focus,
  clavier, accessibilité — est éprouvé ; aucune licence contraignante.
- **En défaveur** : une quinzaine de composants à écrire au lot 1.
- **Ce que ça ferme** : rien.

### Option C — Tout écrire à la main, sans primitives

- **Ce que c'est** : B sans Reka UI.
- **En défaveur** : réécrire la gestion du focus et du clavier des dialogues et des listes, là où se
  logent les erreurs que personne ne verra.
- **Ce que ça ferme** : rien, mais coûte sans rien apporter.

## Décision

**Option B.** Critère décisif : la maquette est imposée à l'identique, et seule une couche de
composants propre la reproduit sans écart durable ; les primitives non stylées gardent éprouvé ce
qu'on ne veut pas réécrire.

Proposée, en attente de validation par Lucas.

### Bibliothèques

| Rôle | Choix | Version au 2026-09-24 | Licence |
|---|---|---|---|
| Cadre | Vue | 3.5 ; la 3.6, en préversion, attend sa sortie | MIT |
| Construction | Vite | 8.3 | MIT |
| Langage | TypeScript | 6.0 (`0005`) | Apache-2.0 |
| Navigation | Vue Router | 5.3 | MIT |
| État partagé | Pinia | 4.0 | MIT |
| Primitives | Reka UI | 2.10 | MIT |
| Langues | vue-i18n | 11.4 | MIT |
| Temps réel | @microsoft/signalr | 10.0 | MIT |
| Polices | Geist et Geist Mono, par `@fontsource-variable/geist` et `@fontsource-variable/geist-mono`, servies par l'instance | 5.3 | SIL OFL 1.1 |

Écartés : PrimeVue 5 (licence commerciale) ; Headless UI pour Vue, sans version depuis septembre
2024 ; le paquet `geist`, lié à Next.js.

### Thème

Un seul thème, sombre, celui de la maquette ; la spécification n'exige pas de thème clair. Les
valeurs deviennent des propriétés CSS personnalisées, seules sources de couleur, de rayon et de police
des composants. Relevé de la maquette :

| Jeton | Valeur | Usage |
|---|---|---|
| `--bg` | `#080a0e` | Fond de page, avec deux halos radiaux `rgba(60,220,190,.12)` et `rgba(132,110,255,.10)` |
| `--bg-nav` | `#0c1017` | Barre de navigation |
| `--surface` | `rgba(22,29,40,.70)` à `.78`, flou `18px` | Panneaux et cartes |
| `--surface-raised` | `rgba(20,27,38,.95)`, flou `22px` | Fiche d'objet, bandeau de confirmation |
| `--field` | `#161d28` ; creux `#10151d` | Champs, sélecteurs, blocs encastrés |
| `--control` | `#1e2733`, bord `#384454` | Bouton secondaire |
| `--selected` | `#222c39` | Onglet actif |
| `--row-hover` | `#1a212c` | Survol d'une ligne |
| `--border` | `rgba(255,255,255,.11)` ; fort `#35414f` ; lignes `#222c39` à `#2f3a4a` | Bords |
| `--text` | `#e8edf5` ; titres `#f2f5f9` et `#ffffff` | Texte |
| `--text-2` | `#c3ccd9`, `#b0bbc9` | Texte secondaire |
| `--text-3` | `#98a3b6` ; libellés de section `#7c879a` | Métadonnées, en-têtes de colonnes |
| `--accent` | `#6fe3c4` ; texte sur accent `#06231c` ; texte d'accent `#7fe9cd` ; codes `#bfe9dc` | Action principale, sélection, emplacements |
| `--accent-2` | `#4bb9f5` | Dégradé du logo |
| `--ok` | fond `rgba(111,227,196,.14)`, texte `#7fe9cd`, bord `rgba(111,227,196,.40)` | Soldé, étiqueté, libre, terminé |
| `--warn` | fond `rgba(255,196,92,.13)`, texte `#ffd68a`, bord `rgba(255,196,92,.45)` ; priorité `#ffcd77` | Écarts, en attente, rupture |
| `--bad` | fond `rgba(255,120,110,.15)`, texte `#ffb3ab`, bord `rgba(255,120,110,.55)` | Refus, non étiqueté, injoignable |
| `--info` | fond `rgba(120,190,255,.14)`, texte `#8fd3ff`, bord `rgba(120,190,255,.40)` | En cours, réservé, alertes |
| `--hand` | fond `rgba(132,110,255,.18)`, texte `#c3b8ff`, bord `rgba(132,110,255,.45)` | La main, le gel |
| `--mute` | fond `rgba(255,255,255,.08)`, texte `#c3ccd9`, bord `rgba(255,255,255,.16)` | Neutre, vide, annulé |
| Rayons | `7px` pastilles ; `9–11px` boutons et champs ; `12–14px` bandeaux et éléments de liste ; `16px` panneaux ; `18px` fiche d'objet | |
| Ombres | `0 28px 60px -24px #000` menus ; `0 40px 90px -30px #000` fiche d'objet | |
| Police | Geist 400, 500, 600 pour le texte ; Geist Mono 400, 500 pour les codes, quantités, heures et numéros | |
| Tailles | `14px` corps ; `13px` et `12px` secondaire ; `11px` en-têtes de colonnes, capitales espacées de `.07em` à `.1em` ; `16px` titres de panneau ; `21px` titre de page, espacé de `-.02em` | |

### Composants

Relevés de la maquette, écrits comme composants Cairn :

- **Coque** : barre de navigation par surface, avec pastilles de compte ; en-tête avec fil d'Ariane,
  titre, sélecteur de donneur d'ordre, champ de recherche et de scan permanent, horloge.
- **Champ de scan** : toujours focalisé, repris après chaque geste ; `Entrée` valide ; en mission,
  il répond à la question posée, hors mission il ouvre l'objet lu (`RG-SUR-060`). Il annonce la
  saisie attendue.
- **Bandeaux** : alerte système en tête de page ; message de refus ou de succès, en une phrase, avec
  son code de couleur ; message éphémère en bas à droite. Le composant ne porte que le mot du
  glossaire : *alerte*.
- **Tableau** : grille à colonnes déclarées, en-têtes en capitales, ligne sélectionnée marquée d'un
  trait d'accent à gauche, cellules en texte, en police à chasse fixe ou en pastille, sous-ligne
  secondaire ; l'export reprend ses filtres et ses colonnes.
- **Pastille d'état**, six variantes : `ok`, `warn`, `bad`, `info`, `hand`, `mute`.
- **Boutons**, quatre variantes : principal, secondaire, main, désactivé.
- **Onglets** et **filtres en puces**.
- **Carte** : titre, pastille, deux lignes, grand chiffre ; chronomètre d'occupation de quai.
- **File de décisions** : liste ordonnée à gauche, détail de l'élément à droite, avec la main, le
  motif et l'arbitrage ; onglet des éléments traités avec leur cause de sortie.
- **En-tête de mission** : type, objet, lieu, saisie attendue, champ de quantité.
- **Fiche d'objet** : dialogue avec identité, pastilles, informations, contenu, historique et
  actions ; ouverte depuis tout écran par un scan hors mission.
- **Éditeur de règles** : lecture de la version publiée, brouillon modifiable avec les champs
  modifiés soulignés, publication explicite (`RG-SUR-121`, `122`).

Le **bloc de simulation** de la maquette est un outil de maquette ; il n'est pas réalisé.

### Structure

- Une application monopage, routes par surface, gardées par les permissions de l'utilisateur ; la
  garde ne fait que masquer, le serveur refuse (`RG-EXI-012`).
- `web/src/foundation/` et `web/src/logistics/`, séparés par la règle d'imports de `0005`.
- Les libellés ne sont jamais écrits dans les composants : ils viennent des catalogues de langue,
  français et anglais, dont les clés suivent les termes du glossaire ; un contrôle refuse une clé
  sans traduction.

## Conséquences

- **Ce qu'on peut faire** : écrire les écrans du lot 1 en reproduisant la maquette.
- **Ce qu'on ne peut plus faire** : écrire une couleur, une taille ou une police en dur dans un
  composant ; introduire une bibliothèque de composants stylée ; écrire un libellé hors catalogue.
- **Ce qu'il faut mettre en place** : la feuille des jetons, la quinzaine de composants, les deux
  catalogues de langue du lot 1.
- **Ce qu'on accepte de payer** : des composants propres à écrire et à tenir ; un seul thème.
- **Ce qui la remettrait en cause** : un besoin d'écrans sur tablette ou téléphone, aujourd'hui
  écarté (`RG-EXI-053`) ; une exigence de thème clair ou de contraste renforcé.
