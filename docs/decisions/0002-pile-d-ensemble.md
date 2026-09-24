# 0002 — Pile d'ensemble

**Statut** : abandonnée · **Date** : 2026-09-23 · **Remplace** : — · **Remplacée par** : —

> Choix techniques réinitialisés le 2026-09-24 à la demande de Lucas ; le sujet sera repris dans une
> nouvelle fiche.

> **Actée le 2026-09-23** par Lucas, après deux révisions le même jour.
>
> **Deuxième révision**, avant l'acte : alignement sur `RG-EXI-072` à `079`, qui fixent le serveur
> de référence, le temps de réponse, la perte et la reprise, le fuseau, l'impression, le matériel
> et la langue. Évaluation étendue aux 79 exigences ; les hypothèses correspondantes deviennent des
> valeurs de la spécification ; la reprise en moins de deux heures ajoute un coût (section « Ce
> qu'elle coûte »). Recommandation inchangée.
>
> **Première révision**, avant tout acte, après l'ajout à 0.9 de `RG-EXI-064` à `071` (espace
> technique et état de santé, sobriété, frontière du socle) et de l'orientation à long terme du
> README. Évaluation étendue aux 71 exigences ; hypothèses de volumétrie, de sauvegarde et de licence
> corrigées sur instruction de Lucas ; question du langage unique tranchée par lui. La
> recommandation ne change pas ; son coût augmente (section « Ce qu'elle coûte »).

## Contexte

La spécification métier est rédigée pour ses vingt-trois modules. La fiche `0001` fixe l'ordre de
réalisation : cinq lots verticaux, le premier étant l'entrepôt minimal ; la fiche `0003`,
proposée, en précise le contenu et place l'espace technique au lot 5. Rien ne dit encore avec quoi
le produit se construit, s'exécute, s'éprouve et se livre. C'est ce que cette fiche propose : **une
pile complète et cohérente**, jugée comme un tout, et non des briques prises une à une.

### Ce qui contraint le choix

**La grille d'évaluation est le module `socle/0.9-exigences-de-fonctionnement.md`** : soixante-dix-neuf
exigences `RG-EXI`, chacune rattachée à la règle métier dont elle découle, et une section 5 de ce qui
n'est *pas* exigé. Chaque pile candidate est évaluée exigence par exigence en section « Options ».
Les groupes qui départagent vraiment sont, dans l'ordre de leur poids :

1. **Les modes d'exploitation** (`RG-EXI-059` à `063`). Le produit s'exploite hébergé par l'éditeur
   ou auto-hébergé par le prestataire, sur le modèle de n8n. Un tiers doit pouvoir installer, mettre à
   jour, sauvegarder et restaurer seul ; l'éditeur doit exploiter de nombreuses instances sans
   travail propre à chacune. C'est le critère le plus lourd : il élimine toute pile qui ne se livre
   pas comme une image unique posée à côté d'une base.
2. **L'espace technique et la sobriété** (`RG-EXI-064` à `069`). Installation, mise à jour,
   sauvegarde, restauration et état de santé se conduisent sans ligne de commande, depuis un outil
   qui ne voit aucune donnée métier, **reste vivant quand l'application est arrêtée** (`067`) et
   alerte de lui-même (`068`). Une instance de petit prestataire tient sur **un serveur d'entrée de
   gamme** et s'exploite sans spécialiste (`069`). Ces exigences pèsent sur l'empreinte de chaque
   pile et sur la manière de livrer un second programme à côté de l'application.
3. **Le temps réel** (`001` à `005`) : la file de décisions, la main et les écrans consultés se
   tiennent à jour sans rechargement.
4. **L'intégrité des gestes concurrents** (`006` à `012`) : geste enregistré ou refusé, jamais deux
   fois, jamais à moitié.
5. **Les traitements différés et le rattrapage après arrêt** (`021` à `027`).
6. **L'exécution à blanc des règles** (`030`).
7. **L'impression pilotée par le serveur avec détection d'échec** (`037`, `038`).
8. **Les échanges** par dépôt, courriel et interface directe (`042` à `048`).

**La frontière du socle** (`RG-EXI-070`, `071`) pèse sur la découpe interne du code plus que sur le
choix de la pile : le socle transverse ne doit rien savoir de la logistique, et rien d'un autre
domaine ne s'écrit d'avance. Elle départage néanmoins sur un point : dans quelle pile cette
frontière est-elle **refusée à la compilation** plutôt que signalée par un outil qu'on peut
oublier d'exécuter ? Sans relecture humaine, la différence compte. Réponse : C et B oui, A et D non.

**Un critère absent de 0.9 pèse autant que ces groupes** : le code est écrit en totalité par une IA,
et Lucas ne le relit pas. Une erreur qui ne se manifeste pas mécaniquement — à la compilation, à
l'analyse statique, au test, au démarrage — n'est vue par personne. La pile doit donc **rendre les
erreurs visibles sans relecture humaine** : typage statique strict, vérification des frontières
(entrées HTTP, base, fichiers), tests exécutables par module, contrôles automatiques bloquants. Ce
critère fait l'objet de sa propre grille, après les tableaux `RG-EXI`. Lucas a confirmé qu'il prime
sur l'unicité du langage : un seul langage sert surtout une équipe humaine qui relit ; ici l'IA
écrit tout et personne ne relit, donc le typage à l'exécution l'emporte.

Autres contraintes :

- **Livraison verticale**, module par module : interface de programmation, tests automatiques,
  écrans, essais manuels — jamais tout le serveur puis toute l'interface (`0001`).
- **Tout le code est en anglais** ; les termes métier du code sont les termes anglais du glossaire.
- **La démonstration est le seul critère de clôture** d'un lot (`0001`) : un jeu de données fictif
  et un scénario écran par écran, ce qui exige des tests de bout en bout pilotant le navigateur.

### Ce qui n'est pas une contrainte

- L'existant — un VPS avec Coolify, le domaine cairn-wms.fr, un développement sous Windows et WSL —
  est un actif, pas un critère. Toute pile évaluée s'y déploie.
- Le dashboard `cairn-dashboard`, en Nuxt, TypeScript et SQLite, n'engage en rien la pile de Cairn.
- Laravel, Vue et PostgreSQL ont été évoqués par le passé. Ils sont ici des candidats comme les
  autres, sans avantage d'antériorité.
- Les compétences de Lucas ne sont jamais un critère : le code n'est pas écrit par lui.
- Les contraintes écartées par 0.9 §5 — hors ligne, mobile, déploiement sans interruption,
  multi-prestataires par instance, EDI — ne sont pas réintroduites, même par précaution.

### Ce qu'on ignore au moment de décider

Les points ouverts de 0.9 §7 n'ont pas de réponse. La section « Décision » pose pour chacun une
hypothèse explicite et dit si la recommandation changerait avec une autre réponse. Depuis
`RG-EXI-072` à `079`, sept de ces points ont reçu leur valeur dans 0.9 ; il reste la volumétrie, la
licence et le nom de l'exploitant.

L'orientation à long terme du README — centraliser plus tard d'autres besoins d'une entreprise,
personnel, management, paie — n'est **pas** un critère de choix au-delà de `RG-EXI-069` à `071` :
aucune pile n'est préférée parce qu'elle servirait mieux un domaine qui n'existe pas.

### Candidats écartés avant évaluation détaillée

Pour ne pas diluer la comparaison, quatre piles sont évaluées en détail. Les suivantes ont été
écartées à l'entrée, avec leur raison :

| Écarté | Pourquoi |
|---|---|
| **Python** (Django ou FastAPI) | Typage graduel et facultatif : mypy ne couvre ni tout l'écosystème ni l'ORM ; une erreur de type passe sans bruit. Le critère « erreurs visibles sans relecture » lui est défavorable, sans compensation ailleurs. |
| **Go** | Livraison exemplaire (un binaire), mais système de types pauvre pour un domaine riche : ni types somme, ni nullabilité vérifiée, gestion d'erreurs par convention. L'IA y produit du code verbeux où les cas oubliés ne sont pas signalés par le compilateur. |
| **Rust** | Le typage le plus fort des quatre, mais le coût de production le plus élevé : cycles compilation-correction longs, écosystème métier (courriel, IPP, PDF, ORM) plus mince. Trop cher pour une application de gestion transactionnelle. |
| **Java / Kotlin + Spring** | Comparable à .NET sur le fond ; écarté pour éviter deux candidats jumeaux. .NET est retenu comme représentant de cette famille pour sa cohérence d'outillage (un éditeur, un cycle de support, une chaîne de publication). |
| **Ruby on Rails** | Typage dynamique ; mêmes réserves que Laravel avec un écosystème moins vivant. |
| **SQLite** comme base de production | Un seul écrivain à la fois, pas de signalement natif (`NOTIFY`), pas de `SKIP LOCKED` : contraire à `RG-EXI-008` et `009` dès que deux postes valident en même temps. PostgreSQL est commun aux quatre piles évaluées. |

## Options

Quatre piles complètes. Chacune comprend : langage et exécution, cadre serveur, accès aux données,
temps réel, traitements différés, écrans, tests, forme de livraison. PostgreSQL est commun à toutes.

### Option A — TypeScript de bout en bout

- **Ce que c'est** : Node.js (LTS) et TypeScript en mode strict, côté serveur comme côté écrans.
  Serveur Fastify ; validation de toutes les entrées par schémas Zod, dont le schéma OpenAPI est
  dérivé ; accès aux données par Drizzle ORM (schéma en TypeScript, types inférés, SQL explicite) ;
  traitements différés par pg-boss (traitements différés et cron persistés dans PostgreSQL) ; temps réel par
  WebSocket (`ws`) ; écrans Vue 3 + Vite, types de l'API partagés dans le même dépôt ; tests Vitest
  (unitaires, intégration avec PostgreSQL via Testcontainers) et Playwright (bout en bout) ; ESLint
  en configuration `strict-type-checked`. Livraison : une image conteneur Node + PostgreSQL. C'est,
  presque brique pour brique, la pile de n8n.
- **En faveur** : un seul langage, un seul outillage, un seul univers de types du schéma de base à
  l'écran — la dérive entre l'API et les écrans est une erreur de compilation. Corpus le plus large
  pour l'IA, sur le serveur comme sur Vue. Précédent d'exploitation identique (n8n).
- **En défaveur** : les types TypeScript disparaissent à l'exécution — une réponse HTTP ou une ligne
  de fichier mal formée passe si Zod n'est pas appliqué à *chaque* frontière ; c'est une discipline
  que la configuration peut imposer, pas le langage. Pas de type décimal natif (valeur déclarée,
  valorisation : entiers en centimes ou bibliothèque). Écosystème à forte rotation : ORM, module
  (ESM/CJS), outillage changent tous les deux ou trois ans, et le corpus de l'IA se périme avec eux —
  pour un code que personne ne relit, c'est un risque de patrons incohérents accumulés. Aucune
  bibliothèque IPP maintenue à source publique ; l'empaquetage d'un agent sur site en exécutable Node
  n'est pas encore stable. Au jour de la vérification, TypeScript 7 n'a pas d'API programmatique et
  l'outillage Vue reste sur TypeScript 6 ; Drizzle est en 0.x avec une 1.0 en RC sans date : la pile
  est vivante, mais plusieurs de ses briques changent de majeure le mois même.
- **Ce que ça ferme** : rien d'irréversible sur le métier ; l'ORM et le cadre serveur sont
  remplaçables. Ferme la possibilité d'un agent sur site compilé dans le même langage sans outillage
  d'empaquetage supplémentaire.

### Option B — Elixir et Phoenix

- **Ce que c'est** : Elixir sur la machine virtuelle Erlang (BEAM) ; Phoenix avec LiveView (écrans
  rendus par le serveur, tenus à jour par WebSocket, sans API intermédiaire pour les écrans) ; Ecto
  et Postgrex ; Oban (traitements différés persistés dans PostgreSQL, insérés dans la transaction métier) ;
  Phoenix.PubSub pour le temps réel ; Swoosh pour les courriels sortants ; ExUnit et Wallaby ou
  Playwright pour les tests. Livraison : une release Mix en image conteneur + PostgreSQL. L'interface
  directe (`RG-EXI-043`) est une API JSON Phoenix séparée des écrans.
- **En faveur** : le temps réel et les traitements différés sont dans la nature de la plateforme, pas
  ajoutés ; Oban est le seul des quatre ordonnanceurs à insérer ses traitements différés dans la transaction du
  geste sans patron supplémentaire (`RG-EXI-011`). Arbres de redémarrage OTP : un traitement qui plante
  redémarre. Style fonctionnel qui rend l'exécution à blanc (`030`) naturelle. Empreinte mémoire
  faible par instance.
- **En défaveur** : typage graduel encore partiel — le compilateur signale certaines incohérences,
  pas un contrat de type complet ; Dialyzer reste lent et bruyant. C'est le point faible sur le
  critère « erreurs visibles sans relecture ». Corpus d'IA nettement plus petit : plus
  d'API inventées, plus de patrons approximatifs. LiveView tient l'état des écrans dans un processus
  serveur lié à la connexion : sur un chariot au Wi-Fi capricieux, chaque coupure reconstruit
  l'écran, et la récupération des saisies en cours demande du soin (`RG-EXI-006`). Pas de client
  IMAP maintenu établi (`042`), pas de bibliothèque IPP (`037`, `038`), agent d'impression Windows à
  écrire dans un autre langage. Windows Server hors conteneur n'est pas une cible réaliste.
- **Ce que ça ferme** : un agent sur site dans le même langage ; une part des prestataires dont le
  parc est Windows sans conteneurs.

### Option C — .NET et PostgreSQL, écrans Vue

- **Ce que c'est** : C# sur .NET (LTS), nullabilité activée et avertissements traités en erreurs,
  analyseurs Roslyn ; ASP.NET Core en API minimales ; Entity Framework Core + Npgsql, migrations EF
  jouées au démarrage ; Quartz.NET (déclencheurs persistés dans PostgreSQL, politiques de
  rattrapage explicites) ; SignalR pour le temps réel ; MailKit (IMAP, SMTP) et SSH.NET (SFTP) ;
  schéma OpenAPI produit nativement par ASP.NET Core à partir des types, client TypeScript généré
  depuis ce schéma ; écrans Vue 3 + Vite + TypeScript ; tests xUnit avec hôte de test en mémoire et
  Testcontainers, Playwright pour le bout en bout. Livraison : une image conteneur + PostgreSQL ; en
  plus, publication autonome en un fichier, exécutable en service Windows ou Linux sans conteneur.
  L'agent d'impression sur site est un second exécutable .NET du même dépôt.
- **En faveur** : le typage le plus solide des quatre à l'exécution comme à la compilation — un objet
  reçu, lu en base ou désérialisé est typé et vérifié nul ou non nul ; le type `decimal` est natif.
  Un seul cadre couvre HTTP, injection, configuration, journalisation, authentification, SignalR,
  services en arrière-plan, santé, hôte de test : peu de choix de bibliothèques, donc peu d'occasions
  pour l'IA de mélanger des patrons. Cycle de support prévisible (LTS de trois ans), compatibilité
  ascendante soignée : le corpus de l'IA se périme lentement. Le même langage sert au serveur et à
  l'agent d'impression, et se publie en service Windows, forme familière aux parcs des prestataires.
  MailKit et SharpIpp sont les bibliothèques les mieux tenues des quatre piles pour `042`, `037` et
  `038`.
- **En défaveur** : deux langages (C# et TypeScript), donc deux chaînes de construction, deux
  exécuteurs de tests, deux outils d'analyse ; la cohérence entre API et écrans passe par la
  génération du client depuis le schéma OpenAPI — mécanique, mais une étape de plus. Quartz.NET a
  son propre magasin : l'atomicité geste + effet différé (`011`) demande une table de sortie
  (outbox), patron courant mais à construire. EF Core n'expose pas `FOR UPDATE` : les verrous de
  ligne s'écrivent en SQL. Corpus d'IA très large sur C#, un peu moins sur la combinaison
  .NET + Vue qu'en TypeScript pur.
- **Ce que ça ferme** : le partage direct des types entre serveur et écrans ; l'atomicité native
  des traitements différés avec la transaction métier (remplacée par la table de sortie).

### Option D — Laravel et Vue

- **Ce que c'est** : PHP et Laravel ; Eloquent ; files sur base de données et ordonnanceur Laravel
  (deux processus : travailleur et cron) ; Reverb pour le WebSocket (troisième processus) ; écrans
  Vue 3 par Inertia ; tests Pest, analyse statique Larastan au niveau maximal ; regroupement des
  processus dans un conteneur par FrankenPHP/Octane et un gestionnaire de processus. Livraison : une image
  conteneur + PostgreSQL.
- **En faveur** : le cadre le plus « à piles incluses » des quatre pour une application de gestion —
  files, ordonnanceur, courriel, sessions, autorisations, temps réel, tests sont fournis et
  documentés ensemble. Corpus d'IA large. Rapidité de production des écrans de bureau.
- **En défaveur** : typage dynamique ; Larastan pousse loin mais ne peut pas rendre sûr ce que
  Eloquent construit par magie (attributs, relations, portées) — la classe d'erreurs « propriété mal
  orthographiée, relation absente, colonne renommée » ne se voit qu'à l'exécution ou au test. C'est
  la pile la plus faible sur le critère décisif. Exploitation par un tiers plus lourde : trois ou
  quatre processus par instance à démarrer, relancer et diagnostiquer, là où les trois autres n'en
  ont qu'un. PHP n'est pas fait pour un agent résident sur site. Pas de type décimal natif. Sous Windows sans
  conteneur, l'extension `pcntl` manque : ni délai d'exécution des traitements, ni Horizon ; Laravel ne documente aucun
  déploiement Windows. Le client IMAP PHP de référence est dormant depuis seize mois.
- **Ce que ça ferme** : l'agent d'impression dans le même langage ; l'exploitation en un seul
  processus.

### État vérifié des technologies citées

Vérifié en ligne le 2026-09-23 sur les registres (npm, NuGet, hex.pm), les calendriers de support
officiels et les dépôts, plutôt que de mémoire. Seules figurent ici les briques qui pèsent dans la
comparaison ; les dates sont celles de publication.

**Commun aux quatre piles**

| Technologie | État au 2026-09-23 | Source |
|---|---|---|
| PostgreSQL | 18.6 (2026-08-13) ; 18 supporté jusqu'en 2030-11, 17 jusqu'en 2029-11 ; 14 finit le 2026-11-12. `LISTEN/NOTIFY` et `FOR UPDATE SKIP LOCKED` documentés dans la version courante. Licence PostgreSQL. | <https://www.postgresql.org/support/versioning/> · <https://www.postgresql.org/docs/current/sql-select.html> |
| Coolify | 4.3.23 (2026-09-18), releases quasi quotidiennes, Apache-2.0. Une instance = une ressource configurée séparément ; le déploiement d'une même image en N exemplaires n'est pas automatisé (discussion ouverte). Sauvegardes PostgreSQL planifiées par `pg_dump`, vers S3, avec rétention. | <https://github.com/coollabsio/coolify/releases> · <https://coolify.io/docs/databases/backups> · <https://github.com/coollabsio/coolify/discussions/2468> |
| Docker | Engine 29.8.1, Compose 5.5.1, Apache-2.0. **Docker Desktop** (Windows) n'est gratuit que sous 250 salariés *et* 10 M$ de chiffre d'affaires : un prestataire au-dessus paie par utilisateur. | <https://docs.docker.com/engine/release-notes/> · <https://www.docker.com/pricing/faq/> |
| Impression | ZPL sur TCP 9100 confirmé comme voie officielle Zebra, port 9200 pour l'état ; la fermeture du socket ne prouve pas l'impression. CUPS 2.4.19 (2026-04) ; CUPS 2.5 en retard de quinze mois, CUPS 3 non assemblé. | <https://developer.zebra.com/content/concurrent-tcp-and-weblink-connections-printer> · <https://github.com/OpenPrinting/cups/releases> |
| n8n (modèle d'exploitation cité) | 2.40.5 (2026-09-21) ; pile Node/TypeScript/Vue ; image Docker + paquet npm ; SQLite par défaut ou PostgreSQL. Licence « Sustainable Use » (non OSI) : le modèle d'exploitation est transposable, pas la licence telle quelle. | <https://docs.n8n.io/deploy/host-n8n/install-options/install-with-docker.md> · <https://docs.n8n.io/n8n-community-license/community-license.md> |

**Pile A — TypeScript**

| Technologie | État au 2026-09-23 | Source |
|---|---|---|
| Node.js | 24.21.0 LTS actif (maintenance à partir du 2026-10-20, fin 2028-04) ; 26 passe LTS le 2026-10-28. Exécutables autonomes (SEA) : « développement actif », API non stabilisée. MIT. | <https://endoflife.date/nodejs> · <https://nodejs.org/api/single-executable-applications.html> |
| TypeScript | 7.0.2 (2026-07-08), port natif en Go ; sans API programmatique stable avant 7.1, l'outillage Vue reste sur TypeScript 6. Deux majeures en six mois. Apache-2.0. | <https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/> |
| Fastify / NestJS | Fastify 5.12.5 (2026-09-16), v6 en alpha ; NestJS 12.1.0 (2026-09-23), majeure de quatre semaines. MIT. | <https://github.com/fastify/fastify/releases> · <https://github.com/nestjs/nest/releases> |
| Drizzle ORM / Prisma | Drizzle 0.45.3 (2026-09-21), 1.0 en RC depuis avril sans date ; Prisma 8 en RC, `latest` pointe sur la RC. Apache-2.0. | <https://github.com/drizzle-team/drizzle-orm/releases> · <https://www.prisma.io/docs/orm/release-status> |
| pg-boss | 12.33.7 (2026-09-23) : cron, relances, file de rebut, dépendances ; mainteneur unique financé par parrainage. MIT. | <https://github.com/timgit/pg-boss> |
| Zod / ws | Zod 4.6.5 (2026-09-13) ; ws 8.21.3 (2026-08-07). MIT. | <https://github.com/colinhacks/zod/releases> · <https://github.com/websockets/ws/releases> |
| Vue / Vite / Vitest / Playwright | Vue 3.5.43, 3.6 en RC (Vapor) ; Vite 8.3.0 (Rolldown) ; Vitest 5.0.1, majeure de trois semaines, Node ≥ 22.12 ; Playwright 1.63.0. MIT / Apache-2.0. | <https://github.com/vuejs/core/releases> · <https://vite.dev/blog/announcing-vite8> · <https://github.com/vitest-dev/vitest/releases> |
| Courriel | imapflow 2.0.6 (2026-09-22), mailparser 3.9.28, nodemailer 10.0.10 : vivants, même auteur pour les trois. MIT. | <https://github.com/postalsys/imapflow/releases> · <https://github.com/nodemailer/nodemailer/releases> |
| IPP | `ipp` mort depuis 2018 ; `@sealsystems/ipp` une publication par an et dépôt disparu ; deux forks TypeScript de moins de cinq mois. Aucune bibliothèque à la fois maintenue, diffusée et à source publique. | <https://registry.npmjs.org/ipp> · <https://registry.npmjs.org/@sealsystems/ipp> |

**Pile B — Elixir**

| Technologie | État au 2026-09-23 | Source |
|---|---|---|
| Elixir / OTP | Elixir 1.20.4 (2026-08-28), OTP 29.1.1 (2026-09-22). Depuis 1.20, tout programme est typé graduellement par inférence ; **pas de signatures explicites avant 1.22 (mai 2027)** ; Dialyzer reste le seul outil exploitant des contrats déclarés. Apache-2.0. | <https://elixir-lang.org/blog/2026/06/03/elixir-v1-20-0-released/> · <https://elixir.hexdocs.pm/gradual-set-theoretic-types.html> · <https://endoflife.date/erlang> |
| Phoenix / LiveView | Phoenix 1.8.14 (2026-09-14) ; LiveView 1.2.12 (2026-09-16), 1.0 depuis décembre 2024 ; récupération des formulaires après coupure documentée (`phx-auto-recover`). MIT. | <https://hex.pm/packages/phoenix_live_view> · <https://phoenix-live-view.hexdocs.pm/form-bindings.html> |
| Ecto / Postgrex | Ecto 3.14.2 (2026-08-14), Postgrex 0.22.4. Apache-2.0. | <https://hex.pm/packages/ecto> |
| Oban | 2.24.1 (2026-09-03) : traitements persistés, cron, relances, secours des traitements orphelins au redémarrage ; Oban Web désormais Apache-2.0 ; Oban Pro payant, non requis. | <https://hex.pm/packages/oban> · <https://oban.pro/pricing> |
| Courriel | Swoosh 1.28.1 (envoi). **IMAP : rien d'établi** — Yugo 1.0.4 (un mainteneur, une étoile), `imap` 0.1.2 naissant. | <https://hex.pm/packages/swoosh> · <https://hex.pm/packages/yugo> |
| SFTP / IPP | SFTP : `ssh_sftp` livré avec OTP, suffisant. IPP : Hippy 0.3.0 (2024-04), auto-déclaré alpha ; rien d'autre. | <https://www.erlang.org/doc/apps/ssh/ssh_sftp.html> · <https://hex.pm/packages/hippy> |
| Livraison | Releases Mix en image `hexpm/elixir` ; Windows : installateur officiel et service par `erlsrv`, runtime Visual C++ requis, cible de second rang dans les CI de l'écosystème. | <https://mix.hexdocs.pm/Mix.Tasks.Release.html> · <https://www.erlang.org/doc/apps/erts/erlsrv_cmd.html> |
| Tests / adoption | ExUnit ; phoenix_test_playwright 0.18.0 (2026-09-15), portage Playwright direct dormant. Usage déclaré 2,7 % (Stack Overflow 2025) contre 43,6 % TypeScript et 27,8 % C#. | <https://hex.pm/packages/phoenix_test_playwright> · <https://survey.stackoverflow.co/2025/technology> |

**Pile C — .NET**

| Technologie | État au 2026-09-23 | Source |
|---|---|---|
| .NET | 10.0.12 (2026-09-08), **LTS jusqu'au 2028-11-14** ; .NET 8 et 9 finissent le 2026-11-10 ; .NET 11 (STS) en RC. C# 14. MIT. | <https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core> · <https://endoflife.date/dotnet> |
| ASP.NET Core / SignalR | Intégrés à .NET 10 : validation native des API minimales, OpenAPI 3.1 produit par le serveur, SignalR (WebSocket, SSE, repli) avec reconnexion. | <https://learn.microsoft.com/en-us/aspnet/core/release-notes/aspnetcore-10.0> · <https://learn.microsoft.com/en-us/aspnet/core/signalr/introduction?view=aspnetcore-10.0> |
| EF Core / Npgsql | EF Core 10.0.12, supporté jusqu'en 2028-11 ; Npgsql 10.0.3 et fournisseur EF 10.0.3 (2026-09-14). Licence PostgreSQL. | <https://learn.microsoft.com/en-us/ef/core/what-is-new/> · <https://www.nuget.org/packages/Npgsql.EntityFrameworkCore.PostgreSQL> |
| Ordonnanceurs | Quartz.NET 4.1.1 (2026-09-19), majeure 4.0 du 2026-09-03 avec ruptures et migration de schéma ; branche 3.22 encore servie. Hangfire 1.8.25 LGPL, fournisseur PostgreSQL communautaire. TickerQ 10.4.0, jeune. | <https://github.com/quartznet/quartznet/releases> · <https://www.hangfire.io/pricing/> |
| MailKit / SSH.NET | MailKit 4.18.0 (2026-09-13), releases mensuelles ; SSH.NET 2026.0.0 (2026-08-09). MIT. | <https://github.com/jstedfast/MailKit> · <https://github.com/sshnet/SSH.NET> |
| IPP | SharpIpp inerte depuis 2022 ; **SharpIppNext** 4.2.4 (2026-08-30), fork maintenu, mainteneur unique, petit projet. MIT. | <https://github.com/danielklecha/SharpIppNext> |
| PDF | QuestPDF 2026.9.0 : **non libre** ; licence communautaire sous 1 M$ de chiffre d'affaires, secteur public exclu ; Professional 1 999 $/an. | <https://www.questpdf.com/license/community.html> · <https://www.questpdf.com/pricing.html> |
| Tests | xUnit v3 4.0.1 (2026-09-12) ; Testcontainers 4.15.0 (2026-09-06). | <https://github.com/xunit/xunit/releases> · <https://github.com/testcontainers/testcontainers-dotnet/releases> |
| Livraison | Publication en un fichier auto-contenu documentée (Linux, Windows) ; service Windows documenté. Images `mcr.microsoft.com/dotnet/aspnet:10.0` (Ubuntu, Alpine, chiseled), multi-architecture. | <https://learn.microsoft.com/en-us/dotnet/core/deploying/single-file/overview> · <https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/windows-service?view=aspnetcore-10.0> · <https://github.com/dotnet/dotnet-docker/blob/main/README.aspnet.md> |
| Écrans et contrat | Vue 3.5.43, Vite 8.3.0 (voir pile A) ; générateurs de client : Kiota 1.35.0 (2026-09-04) actif, openapi-typescript 7.13.0 (2026-02), NSwag 14.7.1 (2026-04). | <https://github.com/microsoft/kiota/releases> · <https://github.com/openapi-ts/openapi-typescript/releases> |

**Pile D — Laravel**

| Technologie | État au 2026-09-23 | Source |
|---|---|---|
| PHP | 8.5.11 (2026-09-22) ; 8.4 en correctifs jusqu'au 2026-12-31 ; 8.2 finit le 2026-12-31. | <https://www.php.net/supported-versions.php> |
| Laravel | 13.33.0 (2026-09-22) ; **pas de LTS** : 18 mois de correctifs, 24 de sécurité ; Laravel 12 déjà en sécurité seule. MIT. | <https://laravel.com/docs/releases> · <https://endoflife.date/laravel> |
| Reverb / Horizon / files | Reverb 1.12.0, limité à ~1 024 connexions sans `ext-uv` ; Horizon exige Redis et `pcntl` ; la file `database` utilise `SKIP LOCKED` ; les délais d'exécution exigent `pcntl`, **absent sous Windows**. | <https://laravel.com/docs/reverb> · <https://laravel.com/docs/horizon> · <https://www.php.net/manual/en/pcntl.installation.php> |
| Inertia / Vue / Pest / Larastan | Inertia 3.7.1 (v2 hors correctifs dans trois jours) ; Pest 5.2.1 (PHP ≥ 8.4) ; PHPStan 2.2.15 niveau 10, Larastan 3.12.2. MIT. | <https://github.com/inertiajs/inertia/releases> · <https://phpstan.org/user-guide/rule-levels> |
| FrankenPHP / Octane | FrankenPHP 1.12.7 (dépôt de l'organisation PHP), binaires Linux, macOS, Windows ; Octane 2.20.0. Laravel ne documente aucun déploiement Windows ; solutions communautaires seulement. MIT. | <https://github.com/php/frankenphp/releases> · <https://laravel.com/docs/deployment> |
| Courriel / SFTP / IPP / PDF | webklex/php-imap 6.2.0, **sans commit depuis mai 2025** ; phpseclib 4.0.1 vivant ; IPP : obray/ipp 1.6.0, mainteneur unique ; dompdf 3.1.6 LGPL avec CVE régulières. | <https://github.com/Webklex/php-imap/releases> · <https://github.com/nateobray/IPP> · <https://github.com/dompdf/dompdf/releases> |

**Ajouts de la révision** — outils cités pour `RG-EXI-064` à `071` et pour les hypothèses corrigées.

| Technologie | État au 2026-09-23 | Source |
|---|---|---|
| Références de projet .NET | Déclaratives, mais **transitives par défaut** en projet SDK ; `DisableTransitiveProjectReferences=true` rend chaque frontière étanche. | <https://learn.microsoft.com/en-us/dotnet/core/project-sdk/msbuild-props> |
| ArchUnitNET / NetArchTest | ArchUnitNET 0.13.4 (2026-08-20), Apache-2.0, actif, tests d'architecture sur le code compilé. NetArchTest sans version depuis 2021 : écarté. | <https://github.com/TNG/ArchUnitNET> · <https://github.com/BenMorris/NetArchTest> |
| dependency-cruiser / eslint-plugin-boundaries | 18.4.0 et 7.2.0, MIT, actifs. Avec TypeScript 7 sans API : le premier retombe sur un analyseur JavaScript dégradé, le second dépend d'un analyseur limité à TypeScript < 6.1. | <https://github.com/sverweij/dependency-cruiser/issues/1069> · <https://registry.npmjs.org/@typescript-eslint/parser> |
| Boundary / parapluie Mix | Boundary 0.11.0 (2026-09-17), MIT, contrôle à la compilation, 0.x, mainteneur unique. Parapluie : appel vers une application sœur non déclarée signalé par le compilateur. | <https://hexdocs.pm/boundary/Boundary.html> · <https://hexdocs.pm/mix/Mix.Tasks.New.html> |
| Deptrac | 4.7.2 (2026-09-15), MIT ; `qossmic/deptrac` abandonné au profit de `deptrac/deptrac`. | <https://repo.packagist.org/p2/deptrac/deptrac.json> |
| pgBackRest / WAL-G | pgBackRest 2.59.1 (2026-08-17), MIT ; WAL-G 3.0.9 (2026-08-20), Apache-2.0 : archivage continu et restauration à un instant donné. | <https://pgbackrest.org/news.html> · <https://github.com/wal-g/wal-g/blob/master/docs/PostgreSQL.md> |
| Partitionnement | Partitionnement déclaratif par plage de dates documenté en PostgreSQL 18 ; pg_partman 5.5.0 (2026-07-22), licence PostgreSQL, superutilisateur requis à l'installation. | <https://www.postgresql.org/docs/18/ddl-partitioning.html> · <https://github.com/pgpartman/pg_partman> |
| Pilotage de Docker | Docker.DotNet d'origine dormant depuis 2023 ; Docker.DotNet.Enhanced 4.3.3 (2026-06-28), fork maintenu par Testcontainers, MIT. dockerode 5.0.1 (2026-06-24), Apache-2.0. | <https://github.com/testcontainers/Docker.DotNet> · <https://registry.npmjs.org/dockerode> |

### Évaluation contre les exigences de 0.9

Chaque pile est évaluée contre les soixante-dix-neuf exigences `RG-EXI`. « Satisfaite » signifie que la
pile fournit ce qu'il faut, ou que l'exigence relève de la conception et que la pile ne s'y oppose
pas ; « partiellement » qu'il manque une brique ou qu'un patron supplémentaire est à construire.
Aucune exigence n'est marquée « non » : les quatre piles peuvent toutes réaliser le produit ; elles
se départagent par le nombre de choses à construire soi-même et par la grille hors 0.9 qui suit.

### Pile A — TypeScript de bout en bout

| Exigence | Verdict | Justification |
|---|---|---|
| `RG-EXI-001` Visibilité sans rechargement | Satisfaite | WebSocket (`ws`) + diffusion en mémoire, l'instance étant un processus unique ; le modèle d'abonnement par unité de travail est à construire. |
| `RG-EXI-002` Main exclusive | Satisfaite | Contrainte d'unicité PostgreSQL sur la ligne de main, prise en transaction ; Drizzle expose `for update`. |
| `RG-EXI-003` État de la main tenu à jour | Satisfaite | Diffusion des prises, demandes et libérations sur le canal de l'unité de travail. |
| `RG-EXI-004` File de décisions en continu | Satisfaite | Événements de création et de sortie d'élément diffusés ; la file est une vue abonnée. |
| `RG-EXI-005` Condition levée signalée avant validation | Satisfaite | Même canal que 001 ; l'écran bloque la validation à réception du message. |
| `RG-EXI-006` Geste enregistré ou refusé, jamais indéterminé | Satisfaite | Transaction PostgreSQL + clé d'idempotence stockée ; aucune bibliothèque ne l'apporte, c'est un patron à imposer partout. |
| `RG-EXI-007` Geste reçu deux fois enregistré une fois | Satisfaite | Clé d'idempotence unique en base, rejouée par le client après coupure ; générique. |
| `RG-EXI-008` Jamais deux réservations | Satisfaite | Contrainte d'unicité ou verrou de ligne PostgreSQL ; Drizzle laisse écrire le SQL exact. |
| `RG-EXI-009` Gestes concurrents : un seul réussit | Satisfaite | Verrou de ligne `SELECT … FOR UPDATE` ou niveau `SERIALIZABLE` avec reprise ; à imposer par convention. |
| `RG-EXI-010` Mouvements et événements immuables | Satisfaite | Droits PostgreSQL (`INSERT` seul sur les tables d'événements) ; indépendant de la pile. |
| `RG-EXI-011` Geste et effets enregistrés ensemble | Satisfaite | pg-boss accepte une connexion de transaction : la mise en file d'un effet différé est atomique avec le geste. |
| `RG-EXI-012` Droits contrôlés à chaque geste | Satisfaite | Autorisation côté serveur par intergiciel ; la pile ne l'impose pas, la convention si. |
| `RG-EXI-013` Événement horodaté, auteur, poste | Satisfaite | Conception : table d'événements en ajout seul ; la pile n'intervient pas. |
| `RG-EXI-014` Refus tracés | Satisfaite | Idem ; l'intergiciel d'autorisation écrit l'événement de refus. |
| `RG-EXI-015` Conservation sans purge | Satisfaite | PostgreSQL ; partitionnement par période si la volumétrie l'exige. |
| `RG-EXI-016` Historique en un geste, totaux redescendus | Satisfaite | Index PostgreSQL sur les clés d'objet et de période ; requêtes SQL explicites avec Drizzle. |
| `RG-EXI-017` Relevé figé et photo inchangés | Satisfaite | Conception : tables figées en écriture après clôture, droits en base. |
| `RG-EXI-018` Anonymisation sans suppression d'événement | Satisfaite | Conception : les événements référencent le tiers par identifiant, les données identifiantes vivent sur le tiers ; l'anonymisation ne touche que lui. |
| `RG-EXI-019` Consultations tracées | Satisfaite | Conception. |
| `RG-EXI-020` Double horodatage des événements externes | Satisfaite | Conception ; `timestamptz` PostgreSQL. |
| `RG-EXI-021` Échéances déclenchées sans utilisateur | Satisfaite | pg-boss : traitements persistants et planification cron dans PostgreSQL, exécutés par le processus serveur. |
| `RG-EXI-022` Échéance manquée traitée à la reprise, retard tracé | Satisfaite | Une planification cron manquée n'est pas rejouée par pg-boss : la conception doit stocker l'échéance en base et balayer les échéances dépassées au réveil. Le retard se calcule à ce moment. |
| `RG-EXI-023` Photo quotidienne à l'heure du site, échec remonté | Satisfaite | Cron pg-boss avec fuseau par traitement ; l'échec est un état persistant lisible pour produire l'anomalie. |
| `RG-EXI-024` Délais en heures ouvrées par site | Satisfaite | Bibliothèque de calcul à écrire ; `Temporal` (ou date-fns-tz) pour les fuseaux. |
| `RG-EXI-025` Libérations automatiques au seuil | Satisfaite | Balayage périodique persistant ; générique. |
| `RG-EXI-026` Absence d'échange détectée | Satisfaite | Balayage périodique des échéances d'échange ; générique. |
| `RG-EXI-027` Échec automatique jamais silencieux, relançable | Satisfaite | pg-boss conserve les échecs et permet la relance ; l'alerte système est à produire depuis cet état. |
| `RG-EXI-028` Comportement par paramétrage, sans développement | Satisfaite | Conception : moteur de règles piloté par la donnée. Le typage strict aide à garder le moteur générique. |
| `RG-EXI-029` Plusieurs versions d'une règle en service | Satisfaite | Conception : versions immuables en base, référence de version portée par l'objet. |
| `RG-EXI-030` Exécution à blanc sans effet | Satisfaite | Conception : la décision d'une règle est une fonction pure de son entrée, séparée de l'application des effets. Le typage rend cette séparation vérifiable à la compilation. |
| `RG-EXI-031` Décision explicable attachée à l'événement | Satisfaite | Conception : la fonction de décision rend aussi sa trace ; stockée en JSONB. |
| `RG-EXI-032` Champs personnalisés comme critères | Satisfaite | JSONB PostgreSQL indexable ; Drizzle le type. |
| `RG-EXI-033` Scan reçu quel que soit l'écran | Satisfaite | Lecteur en émulation clavier ; l'interface capte la saisie globalement. Générique. |
| `RG-EXI-034` Code émis porteur du type | Satisfaite | Conception. |
| `RG-EXI-035` Identifiants uniques, stables, jamais réattribués | Satisfaite | Séquences et contraintes PostgreSQL. |
| `RG-EXI-036` Recherche unique, multi-identifiants | Satisfaite | Index PostgreSQL (trigram, texte intégral) ; requête SQL explicite. |
| `RG-EXI-037` Impression automatique vers l'imprimante du poste ou de la zone | Partiellement | En auto-hébergement le serveur atteint les imprimantes du réseau local (TCP 9100 pour ZPL, IPP). En hébergement par l'éditeur il faut un agent d'impression sur site : l'empaquetage Node en exécutable (SEA) est encore en développement actif, non stable. |
| `RG-EXI-038` Échec d'impression détecté | Partiellement | IPP rend l'état du travail ; TCP 9100 ne rend rien, seul l'état ZPL (`~HS`) le complète. Aucune bibliothèque IPP Node n'est à la fois maintenue, diffusée et à source publique : à écrire. |
| `RG-EXI-039` Étiquettes, documents de flux, de restitution | Satisfaite | Étiquettes en ZPL par gabarit ; documents PDF par bibliothèque Node ou navigateur sans tête. |
| `RG-EXI-040` Étiquette transporteur au colisage | Satisfaite | L'étiquette vient de l'interface du transporteur (PDF ou ZPL) et repart telle quelle vers l'imprimante ; générique. |
| `RG-EXI-041` Réimpression marquée | Satisfaite | Conception du gabarit. |
| `RG-EXI-042` Réception par dépôt et par courriel, expéditeurs déclarés | Satisfaite | Dépôt : lecture d'un répertoire monté ou SFTP (`ssh2`). Courriel : `imapflow` + `mailparser`, maintenus. |
| `RG-EXI-043` Interface directe unique, adaptée par profil | Satisfaite | API HTTP avec schéma OpenAPI dérivé des schémas Zod ; le profil est de la donnée. |
| `RG-EXI-044` Fichier traité une seule fois, flux rejoué sans double | Satisfaite | Empreinte du fichier et référence externe uniques en base ; générique. |
| `RG-EXI-045` Envoi sur fait, conservé, rejouable sans double | Satisfaite | Table de sortie transactionnelle + traitement pg-boss ; clé d'idempotence côté destinataire. |
| `RG-EXI-046` Import manuel contrôlé avant création | Satisfaite | Conception : passe de contrôle pure puis passe d'écriture. |
| `RG-EXI-047` Transporteurs : suivi, sans interface possible | Satisfaite | Clients HTTP générés depuis les schémas des transporteurs quand ils en publient ; saisie manuelle sinon. |
| `RG-EXI-048` Courriels émis et tracés | Satisfaite | nodemailer ; l'événement d'envoi est écrit par le code appelant. |
| `RG-EXI-049` Une instance par prestataire, sans développement | Satisfaite | Une image, une base par instance, tout le reste en configuration. |
| `RG-EXI-050` Rien hors périmètre, quel que soit le chemin | Satisfaite | Conception : filtrage par périmètre imposé dans la couche d'accès aux données, pas dans les écrans. |
| `RG-EXI-051` Systèmes cloisonnés comme les personnes | Satisfaite | Conception : jeton d'interface porteur du donneur d'ordre, même filtrage. |
| `RG-EXI-052` Objet hors périmètre : existence seule | Satisfaite | Conception. |
| `RG-EXI-053` Écran d'ordinateur seulement | Satisfaite | Vue 3 sur navigateur ; aucune contrainte mobile à porter. |
| `RG-EXI-054` Français par défaut, bascule en anglais | Satisfaite | vue-i18n ; libellés du glossaire dans un catalogue. |
| `RG-EXI-055` Session suit la personne, multi-postes | Satisfaite | Session côté serveur en base ; l'état de travail est dans les données, pas dans le poste. |
| `RG-EXI-056` Export tel qu'affiché | Satisfaite | L'écran transmet ses filtres et colonnes ; le serveur produit le fichier. Générique. |
| `RG-EXI-057` Mise à jour sans perte, sans changement de version de parcours | Satisfaite | Migrations SQL versionnées (Drizzle), additives par convention ; jouées au démarrage. |
| `RG-EXI-058` Remise en état depuis les sauvegardes | Satisfaite | `pg_dump`/`pg_restore` + volume des fichiers conservés ; générique. |
| `RG-EXI-059` Deux modes : hébergé par l'éditeur ou auto-hébergé | Satisfaite | Une image conteneur (serveur Node) + PostgreSQL : le modèle exact de n8n, qui est lui-même en Node/TypeScript. |
| `RG-EXI-060` Installation et mise à jour par le prestataire seul | Satisfaite | Compose de deux services, migrations au démarrage : mise à jour = changer l'étiquette de l'image. |
| `RG-EXI-061` Sauvegarde et restauration par le prestataire | Satisfaite | `pg_dump` planifié + copie du volume de fichiers ; à documenter. Générique. |
| `RG-EXI-062` Instances en série, sans opération propre | Satisfaite | Même image, base par instance, variables d'environnement ; Coolify sait le faire. Empreinte : un processus Node par instance. |
| `RG-EXI-063` Dépendances d'environnement par paramétrage | Satisfaite | Conception : messagerie, dépôts, imprimantes, transporteurs sont des objets de paramétrage, jamais des constantes. |
| `RG-EXI-064` Espace technique sans ligne de commande | Satisfaite | Application web distincte, dans le même langage, pilotant les conteneurs par l'API Docker (dockerode) et la base par ses outils. |
| `RG-EXI-065` Espace technique multi-instances chez l'éditeur | Satisfaite | Conception : inventaire des instances et mise à jour en série portés par l'espace technique lui-même. Coolify ne déploie pas une même image en série (vérifié), il ne suffit pas. |
| `RG-EXI-066` Aucune donnée métier dans l'espace technique | Satisfaite | Conception : rôle PostgreSQL propre à l'espace technique, sans droit de lecture sur les tables métier ; l'état de santé lit des compteurs exposés par l'application. La sauvegarde lit tout mais ne montre rien : elle tourne sous un rôle distinct et produit des fichiers, jamais un affichage. |
| `RG-EXI-067` Espace technique vivant quand l'application est arrêtée | Satisfaite | Processus et conteneur distincts de l'application ; ne partage avec elle que la base et le moteur de conteneurs. |
| `RG-EXI-068` Dégradation signalée d'elle-même | Satisfaite | L'espace technique émet lui-même ses courriels (nodemailer), sans dépendre de l'application. |
| `RG-EXI-069` Sobriété : serveur d'entrée de gamme, exploitation sans spécialiste | Satisfaite | Trois processus (application, espace technique, PostgreSQL) sur un petit serveur ; empreinte modérée, à mesurer au lot 1. |
| `RG-EXI-070` Socle indépendant de la logistique | Partiellement | Paquets distincts d'un même dépôt et références de projet TypeScript ; le sens des dépendances est vérifié par un outil et non par le compilateur. Aggravé à ce jour : TypeScript 7 n'a pas d'API, eslint-plugin-boundaries plafonne à TypeScript 6.0, dependency-cruiser retombe sur un analyseur dégradé. |
| `RG-EXI-071` Aucun autre domaine anticipé | Satisfaite | Conception : discipline de périmètre, portée par les fiches et non par la pile. |
| `RG-EXI-072` Serveur de référence : deux processeurs, 4 Go, 40 Go | Satisfaite | Trois processus (application, espace technique, PostgreSQL) ; tient sur le papier, à mesurer au lot 1 comme l'exige la règle. |
| `RG-EXI-073` 300 ms par geste hors réseau, 2 s vers les écrans | Satisfaite | Un geste = une requête et une transaction ; diffusion WebSocket immédiate après validation. |
| `RG-EXI-074` Éditeur : perte de quelques minutes, reprise en moins de deux heures | Satisfaite | Commun aux quatre : archivage continu (pgBackRest ou WAL-G), sauvegarde de base régulière pour borner la relecture des journaux, restauration testée. Voir le coût ci-dessous. |
| `RG-EXI-075` Auto-hébergement : sauvegarde quotidienne, restauration en moins de deux heures | Satisfaite | L'espace technique lance la restauration, relance l'application et vérifie son état de santé ; durée à mesurer au lot 5. |
| `RG-EXI-076` Un seul fuseau par instance, déclaré par site | Satisfaite | Horodatages en `timestamptz`, fuseau porté par le site ; aucune conversion entre sites à gérer. |
| `RG-EXI-077` Impression réussie = travail accepté sans erreur | Satisfaite | État du travail IPP, état de l'imprimante ZPL après envoi ; aucune vérification du papier. |
| `RG-EXI-078` Lecteurs clavier, imprimantes réseau courantes, format du transporteur | Satisfaite | Lecteurs en émulation clavier : rien côté serveur. Étiquettes transporteur reçues en ZPL : transmises telles quelles ; reçues en PDF : converties en image pour l'imprimante d'étiquettes, par l'agent d'impression. |
| `RG-EXI-079` Langue par utilisateur | Satisfaite | Préférence portée par l'utilisateur, appliquée par vue-i18n. |

**Bilan** : 76 satisfaites, 3 partiellement, 0 non.

### Pile B — Elixir et Phoenix

| Exigence | Verdict | Justification |
|---|---|---|
| `RG-EXI-001` Visibilité sans rechargement | Satisfaite | Natif : Phoenix.PubSub et LiveView poussent tout changement aux écrans abonnés sans code de transport. |
| `RG-EXI-002` Main exclusive | Satisfaite | Même mécanisme ; `Ecto.Query.lock/2` et contraintes déclarées dans le changeset. |
| `RG-EXI-003` État de la main tenu à jour | Satisfaite | Idem, par PubSub ; le détenteur voit les demandes dans son propre processus LiveView. |
| `RG-EXI-004` File de décisions en continu | Satisfaite | LiveView réévalue la file sur chaque message PubSub ; le cas d'usage le plus naturel de la pile. |
| `RG-EXI-005` Condition levée signalée avant validation | Satisfaite | Idem ; en LiveView le serveur retire lui-même le bouton. |
| `RG-EXI-006` Geste enregistré ou refusé, jamais indéterminé | Satisfaite | Idem ; `Ecto.Multi` rend la transaction explicite et testable. |
| `RG-EXI-007` Geste reçu deux fois enregistré une fois | Satisfaite | Idem. |
| `RG-EXI-008` Jamais deux réservations | Satisfaite | Idem ; contraintes déclarées et remontées en erreurs de changeset typées. |
| `RG-EXI-009` Gestes concurrents : un seul réussit | Satisfaite | Idem ; la concurrence côté serveur est isolée par processus BEAM, ce qui simplifie le raisonnement. |
| `RG-EXI-010` Mouvements et événements immuables | Satisfaite | Idem. |
| `RG-EXI-011` Geste et effets enregistrés ensemble | Satisfaite | Oban insère ses traitements dans la même transaction Ecto : l'atomicité est native. |
| `RG-EXI-012` Droits contrôlés à chaque geste | Satisfaite | Idem, par plug. |
| `RG-EXI-013` Événement horodaté, auteur, poste | Satisfaite | Idem. |
| `RG-EXI-014` Refus tracés | Satisfaite | Idem. |
| `RG-EXI-015` Conservation sans purge | Satisfaite | Idem. |
| `RG-EXI-016` Historique en un geste, totaux redescendus | Satisfaite | Idem, Ecto. |
| `RG-EXI-017` Relevé figé et photo inchangés | Satisfaite | Idem. |
| `RG-EXI-018` Anonymisation sans suppression d'événement | Satisfaite | Idem. |
| `RG-EXI-019` Consultations tracées | Satisfaite | Conception. |
| `RG-EXI-020` Double horodatage des événements externes | Satisfaite | Idem. |
| `RG-EXI-021` Échéances déclenchées sans utilisateur | Satisfaite | Oban : traitements persistants dans PostgreSQL, cron intégré, exécution relancée par OTP en cas d'échec. |
| `RG-EXI-022` Échéance manquée traitée à la reprise, retard tracé | Satisfaite | Même conception ; Oban ne rejoue pas non plus un cron manqué, mais un traitement planifié (`scheduled_at`) survit à l'arrêt et part à la reprise. |
| `RG-EXI-023` Photo quotidienne à l'heure du site, échec remonté | Satisfaite | Cron Oban avec fuseau ; erreurs conservées en base. |
| `RG-EXI-024` Délais en heures ouvrées par site | Satisfaite | Idem ; calendriers Elixir natifs et fuseaux via tzdata. |
| `RG-EXI-025` Libérations automatiques au seuil | Satisfaite | Idem. |
| `RG-EXI-026` Absence d'échange détectée | Satisfaite | Idem. |
| `RG-EXI-027` Échec automatique jamais silencieux, relançable | Satisfaite | Oban conserve échecs et tentatives ; la relance est native, et Oban Web (tableau de bord, désormais Apache-2.0) les montre. |
| `RG-EXI-028` Comportement par paramétrage, sans développement | Satisfaite | Idem ; le style fonctionnel se prête bien à un moteur de règles pur. |
| `RG-EXI-029` Plusieurs versions d'une règle en service | Satisfaite | Idem. |
| `RG-EXI-030` Exécution à blanc sans effet | Satisfaite | Idem ; c'est le style naturel d'Elixir, et un rejeu en transaction annulée est trivial. |
| `RG-EXI-031` Décision explicable attachée à l'événement | Satisfaite | Idem. |
| `RG-EXI-032` Champs personnalisés comme critères | Satisfaite | Idem ; `:map` Ecto. |
| `RG-EXI-033` Scan reçu quel que soit l'écran | Satisfaite | Idem ; en LiveView, la frappe remonte au serveur, ce qui ajoute un aller-retour par scan. |
| `RG-EXI-034` Code émis porteur du type | Satisfaite | Conception. |
| `RG-EXI-035` Identifiants uniques, stables, jamais réattribués | Satisfaite | Idem. |
| `RG-EXI-036` Recherche unique, multi-identifiants | Satisfaite | Idem. |
| `RG-EXI-037` Impression automatique vers l'imprimante du poste ou de la zone | Partiellement | Même partage ; un agent Elixir sur un poste Windows de prestataire n'est pas réaliste : l'agent serait écrit dans un autre langage. |
| `RG-EXI-038` Échec d'impression détecté | Partiellement | Idem, sans bibliothèque IPP maintenue. |
| `RG-EXI-039` Étiquettes, documents de flux, de restitution | Satisfaite | Idem ; ChromicPDF pour les documents. |
| `RG-EXI-040` Étiquette transporteur au colisage | Satisfaite | Idem. |
| `RG-EXI-041` Réimpression marquée | Satisfaite | Idem. |
| `RG-EXI-042` Réception par dépôt et par courriel, expéditeurs déclarés | Partiellement | Dépôt : `ssh` d'OTP. Courriel : pas de client IMAP Elixir maintenu établi ; à confirmer, sinon relais par un outil externe. |
| `RG-EXI-043` Interface directe unique, adaptée par profil | Satisfaite | API Phoenix JSON ; schéma OpenAPI par OpenApiSpex. |
| `RG-EXI-044` Fichier traité une seule fois, flux rejoué sans double | Satisfaite | Idem. |
| `RG-EXI-045` Envoi sur fait, conservé, rejouable sans double | Satisfaite | Idem ; insertion Oban dans la transaction du fait. |
| `RG-EXI-046` Import manuel contrôlé avant création | Satisfaite | Idem. |
| `RG-EXI-047` Transporteurs : suivi, sans interface possible | Satisfaite | Idem, `Req` + clients écrits à la main. |
| `RG-EXI-048` Courriels émis et tracés | Satisfaite | Swoosh. |
| `RG-EXI-049` Une instance par prestataire, sans développement | Satisfaite | Idem. |
| `RG-EXI-050` Rien hors périmètre, quel que soit le chemin | Satisfaite | Idem. |
| `RG-EXI-051` Systèmes cloisonnés comme les personnes | Satisfaite | Idem. |
| `RG-EXI-052` Objet hors périmètre : existence seule | Satisfaite | Conception. |
| `RG-EXI-053` Écran d'ordinateur seulement | Satisfaite | LiveView sur navigateur. |
| `RG-EXI-054` Français par défaut, bascule en anglais | Satisfaite | Gettext intégré à Phoenix. |
| `RG-EXI-055` Session suit la personne, multi-postes | Satisfaite | Idem ; l'état d'un écran LiveView vit dans un processus serveur lié à la connexion, à reconstruire depuis la base à la reconnexion. |
| `RG-EXI-056` Export tel qu'affiché | Satisfaite | Idem. |
| `RG-EXI-057` Mise à jour sans perte, sans changement de version de parcours | Satisfaite | Migrations Ecto jouées par la release au démarrage. |
| `RG-EXI-058` Remise en état depuis les sauvegardes | Satisfaite | Idem. |
| `RG-EXI-059` Deux modes : hébergé par l'éditeur ou auto-hébergé | Satisfaite | Une release Mix en image conteneur + PostgreSQL. Hors conteneur, Windows Server n'est pas une cible de production réaliste. |
| `RG-EXI-060` Installation et mise à jour par le prestataire seul | Satisfaite | Idem. |
| `RG-EXI-061` Sauvegarde et restauration par le prestataire | Satisfaite | Idem. |
| `RG-EXI-062` Instances en série, sans opération propre | Satisfaite | Idem ; un processus BEAM par instance. |
| `RG-EXI-063` Dépendances d'environnement par paramétrage | Satisfaite | Idem. |
| `RG-EXI-064` Espace technique sans ligne de commande | Satisfaite | Release Elixir distincte ; pilotage des conteneurs par l'API HTTP de Docker, sans client établi. |
| `RG-EXI-065` Espace technique multi-instances chez l'éditeur | Satisfaite | Idem. |
| `RG-EXI-066` Aucune donnée métier dans l'espace technique | Satisfaite | Idem. |
| `RG-EXI-067` Espace technique vivant quand l'application est arrêtée | Satisfaite | Idem ; seconde machine virtuelle BEAM, économe. |
| `RG-EXI-068` Dégradation signalée d'elle-même | Satisfaite | Idem, Swoosh. |
| `RG-EXI-069` Sobriété : serveur d'entrée de gamme, exploitation sans spécialiste | Satisfaite | La plus économe en mémoire des quatre ; seul bémol, Windows hors conteneur en second rang. |
| `RG-EXI-070` Socle indépendant de la logistique | Satisfaite | Bibliothèque Boundary, contrôlée par le compilateur Mix ; ou applications d'un projet parapluie, dont l'appel vers une sœur non déclarée est un avertissement, erreur avec `--warnings-as-errors`. Boundary est en 0.x, à mainteneur unique. |
| `RG-EXI-071` Aucun autre domaine anticipé | Satisfaite | Idem. |
| `RG-EXI-072` Serveur de référence : deux processeurs, 4 Go, 40 Go | Satisfaite | La marge la plus confortable des quatre. |
| `RG-EXI-073` 300 ms par geste hors réseau, 2 s vers les écrans | Satisfaite | Idem ; l'aller-retour serveur par interaction LiveView est du réseau, exclu de la mesure. |
| `RG-EXI-074` Éditeur : perte de quelques minutes, reprise en moins de deux heures | Satisfaite | Idem. |
| `RG-EXI-075` Auto-hébergement : sauvegarde quotidienne, restauration en moins de deux heures | Satisfaite | Idem. |
| `RG-EXI-076` Un seul fuseau par instance, déclaré par site | Satisfaite | Idem. |
| `RG-EXI-077` Impression réussie = travail accepté sans erreur | Satisfaite | Idem. |
| `RG-EXI-078` Lecteurs clavier, imprimantes réseau courantes, format du transporteur | Satisfaite | Idem. |
| `RG-EXI-079` Langue par utilisateur | Satisfaite | Idem, par Gettext. |

**Bilan** : 76 satisfaites, 3 partiellement, 0 non.

### Pile C — .NET et PostgreSQL, écrans Vue

| Exigence | Verdict | Justification |
|---|---|---|
| `RG-EXI-001` Visibilité sans rechargement | Satisfaite | SignalR intégré : groupes par unité de travail, reconnexion automatique, concentrateurs typés. |
| `RG-EXI-002` Main exclusive | Satisfaite | Même mécanisme ; le verrou de ligne passe par SQL explicite, EF Core n'a pas de `FOR UPDATE` natif. |
| `RG-EXI-003` État de la main tenu à jour | Satisfaite | Idem, par groupe SignalR. |
| `RG-EXI-004` File de décisions en continu | Satisfaite | Idem, la file est un composant Vue abonné à un groupe SignalR par périmètre. |
| `RG-EXI-005` Condition levée signalée avant validation | Satisfaite | Idem. |
| `RG-EXI-006` Geste enregistré ou refusé, jamais indéterminé | Satisfaite | Idem ; transaction EF Core et filtre d'idempotence en intergiciel. |
| `RG-EXI-007` Geste reçu deux fois enregistré une fois | Satisfaite | Idem. |
| `RG-EXI-008` Jamais deux réservations | Satisfaite | Idem ; contrainte EF Core ou SQL explicite, l'exception Npgsql est typée. |
| `RG-EXI-009` Gestes concurrents : un seul réussit | Satisfaite | Idem ; `SERIALIZABLE` et reprise sur `PostgresException` 40001. |
| `RG-EXI-010` Mouvements et événements immuables | Satisfaite | Idem. |
| `RG-EXI-011` Geste et effets enregistrés ensemble | Partiellement | Quartz.NET a son propre magasin : un effet différé exige une table de sortie (outbox) lue par un service en arrière-plan. Patron connu, à construire. |
| `RG-EXI-012` Droits contrôlés à chaque geste | Satisfaite | Idem, par politiques d'autorisation intégrées à ASP.NET Core. |
| `RG-EXI-013` Événement horodaté, auteur, poste | Satisfaite | Idem. |
| `RG-EXI-014` Refus tracés | Satisfaite | Idem. |
| `RG-EXI-015` Conservation sans purge | Satisfaite | Idem. |
| `RG-EXI-016` Historique en un geste, totaux redescendus | Satisfaite | Idem, EF Core ou SQL. |
| `RG-EXI-017` Relevé figé et photo inchangés | Satisfaite | Idem. |
| `RG-EXI-018` Anonymisation sans suppression d'événement | Satisfaite | Idem. |
| `RG-EXI-019` Consultations tracées | Satisfaite | Conception. |
| `RG-EXI-020` Double horodatage des événements externes | Satisfaite | Idem. |
| `RG-EXI-021` Échéances déclenchées sans utilisateur | Satisfaite | Quartz.NET (branche 3.x maintenue ; la 4.0 vient de sortir avec ruptures) avec magasin ADO.NET sur PostgreSQL ; déclencheurs persistants. |
| `RG-EXI-022` Échéance manquée traitée à la reprise, retard tracé | Satisfaite | Quartz.NET a des politiques de « misfire » explicites : le déclencheur manqué s'exécute à la reprise et le retard est connu. Le plus direct des quatre. |
| `RG-EXI-023` Photo quotidienne à l'heure du site, échec remonté | Satisfaite | Déclencheur cron Quartz.NET avec fuseau ; écouteur d'échec. |
| `RG-EXI-024` Délais en heures ouvrées par site | Satisfaite | Idem ; NodaTime ou `TimeZoneInfo`. |
| `RG-EXI-025` Libérations automatiques au seuil | Satisfaite | Idem. |
| `RG-EXI-026` Absence d'échange détectée | Satisfaite | Idem. |
| `RG-EXI-027` Échec automatique jamais silencieux, relançable | Satisfaite | Écouteurs Quartz.NET + journalisation ; la relance est à écrire. |
| `RG-EXI-028` Comportement par paramétrage, sans développement | Satisfaite | Idem. |
| `RG-EXI-029` Plusieurs versions d'une règle en service | Satisfaite | Idem. |
| `RG-EXI-030` Exécution à blanc sans effet | Satisfaite | Idem ; même garantie de séparation par le compilateur. |
| `RG-EXI-031` Décision explicable attachée à l'événement | Satisfaite | Idem. |
| `RG-EXI-032` Champs personnalisés comme critères | Satisfaite | Idem ; `jsonb` via Npgsql, typage moins fin. |
| `RG-EXI-033` Scan reçu quel que soit l'écran | Satisfaite | Idem, côté Vue. |
| `RG-EXI-034` Code émis porteur du type | Satisfaite | Conception. |
| `RG-EXI-035` Identifiants uniques, stables, jamais réattribués | Satisfaite | Idem. |
| `RG-EXI-036` Recherche unique, multi-identifiants | Satisfaite | Idem. |
| `RG-EXI-037` Impression automatique vers l'imprimante du poste ou de la zone | Satisfaite | Même partage ; l'agent est un exécutable .NET autonome (service Windows ou Linux) dans le même langage que le serveur. IPP par SharpIppNext, fork maintenu mais petit. |
| `RG-EXI-038` Échec d'impression détecté | Satisfaite | Idem ; SharpIppNext rend l'état des travaux IPP, et l'agent .NET interroge l'état ZPL. |
| `RG-EXI-039` Étiquettes, documents de flux, de restitution | Satisfaite | Idem ; QuestPDF (licence communautaire sous seuil de revenu) ou navigateur sans tête. |
| `RG-EXI-040` Étiquette transporteur au colisage | Satisfaite | Idem. |
| `RG-EXI-041` Réimpression marquée | Satisfaite | Idem. |
| `RG-EXI-042` Réception par dépôt et par courriel, expéditeurs déclarés | Satisfaite | Dépôt : SSH.NET. Courriel : MailKit, référence du domaine. |
| `RG-EXI-043` Interface directe unique, adaptée par profil | Satisfaite | API HTTP ; schéma OpenAPI produit nativement par ASP.NET Core, à partir des types. |
| `RG-EXI-044` Fichier traité une seule fois, flux rejoué sans double | Satisfaite | Idem. |
| `RG-EXI-045` Envoi sur fait, conservé, rejouable sans double | Satisfaite | Idem ; table de sortie lue par un service hébergé. |
| `RG-EXI-046` Import manuel contrôlé avant création | Satisfaite | Idem. |
| `RG-EXI-047` Transporteurs : suivi, sans interface possible | Satisfaite | Idem, clients générés (Kiota) ou `HttpClient` typé. |
| `RG-EXI-048` Courriels émis et tracés | Satisfaite | MailKit. |
| `RG-EXI-049` Une instance par prestataire, sans développement | Satisfaite | Idem. |
| `RG-EXI-050` Rien hors périmètre, quel que soit le chemin | Satisfaite | Idem ; les filtres de requête globaux EF Core aident. |
| `RG-EXI-051` Systèmes cloisonnés comme les personnes | Satisfaite | Idem. |
| `RG-EXI-052` Objet hors périmètre : existence seule | Satisfaite | Conception. |
| `RG-EXI-053` Écran d'ordinateur seulement | Satisfaite | Vue 3 sur navigateur. |
| `RG-EXI-054` Français par défaut, bascule en anglais | Satisfaite | vue-i18n côté écrans, ressources .NET côté serveur : deux catalogues à tenir. |
| `RG-EXI-055` Session suit la personne, multi-postes | Satisfaite | Idem. |
| `RG-EXI-056` Export tel qu'affiché | Satisfaite | Idem. |
| `RG-EXI-057` Mise à jour sans perte, sans changement de version de parcours | Satisfaite | Migrations EF Core jouées au démarrage ; la convention « additif seulement » se vérifie par relecture de la migration générée. |
| `RG-EXI-058` Remise en état depuis les sauvegardes | Satisfaite | Idem. |
| `RG-EXI-059` Deux modes : hébergé par l'éditeur ou auto-hébergé | Satisfaite | Une image conteneur + PostgreSQL ; hors conteneur, publication autonome en un fichier, y compris en service Windows, ce qui correspond aux parcs informatiques des prestataires. |
| `RG-EXI-060` Installation et mise à jour par le prestataire seul | Satisfaite | Idem ; ou installateur natif Windows si le prestataire refuse les conteneurs. |
| `RG-EXI-061` Sauvegarde et restauration par le prestataire | Satisfaite | Idem. |
| `RG-EXI-062` Instances en série, sans opération propre | Satisfaite | Idem ; un processus .NET par instance. |
| `RG-EXI-063` Dépendances d'environnement par paramétrage | Satisfaite | Idem. |
| `RG-EXI-064` Espace technique sans ligne de commande | Satisfaite | Second exécutable ASP.NET du même dépôt ; pilote conteneurs (Docker.DotNet.Enhanced, le fork maintenu ; l'original est dormant depuis 2023) ou services Windows (API de contrôle des services), déploie et restaure. |
| `RG-EXI-065` Espace technique multi-instances chez l'éditeur | Satisfaite | Idem. |
| `RG-EXI-066` Aucune donnée métier dans l'espace technique | Satisfaite | Idem. |
| `RG-EXI-067` Espace technique vivant quand l'application est arrêtée | Satisfaite | Idem ; exécutable autonome distinct, service Windows ou conteneur, qui survit à l'arrêt de l'application. |
| `RG-EXI-068` Dégradation signalée d'elle-même | Satisfaite | Idem, MailKit. |
| `RG-EXI-069` Sobriété : serveur d'entrée de gamme, exploitation sans spécialiste | Satisfaite | Trois processus aussi ; empreinte mémoire d'un processus .NET supérieure à celle de B, à mesurer au lot 1. Le service Windows natif épargne Docker à qui n'en a pas l'usage — Docker Desktop est payant au-delà de 250 salariés ou 10 M$. |
| `RG-EXI-070` Socle indépendant de la logistique | Satisfaite | Projets .NET distincts : un projet n'utilise un type d'un autre que s'il le référence, donc le socle ne peut pas voir la logistique — le compilateur refuse. Les références étant transitives par défaut, `DisableTransitiveProjectReferences` est à activer pour que chaque frontière soit étanche. Tests d'architecture (ArchUnitNET) pour les règles internes à un projet. |
| `RG-EXI-071` Aucun autre domaine anticipé | Satisfaite | Idem. |
| `RG-EXI-072` Serveur de référence : deux processeurs, 4 Go, 40 Go | Satisfaite | Tient sur le papier ; c'est la marge la plus étroite de C, à mesurer au lot 1 comme l'exige la règle. Un échec de la mesure rouvrirait la fiche. |
| `RG-EXI-073` 300 ms par geste hors réseau, 2 s vers les écrans | Satisfaite | Idem ; SignalR diffuse après validation de la transaction. |
| `RG-EXI-074` Éditeur : perte de quelques minutes, reprise en moins de deux heures | Satisfaite | Idem. |
| `RG-EXI-075` Auto-hébergement : sauvegarde quotidienne, restauration en moins de deux heures | Satisfaite | Idem ; même programme .NET, en conteneur ou en service Windows. |
| `RG-EXI-076` Un seul fuseau par instance, déclaré par site | Satisfaite | Idem ; `DateTimeOffset` et fuseaux IANA natifs sous Linux comme sous Windows. |
| `RG-EXI-077` Impression réussie = travail accepté sans erreur | Satisfaite | Idem. |
| `RG-EXI-078` Lecteurs clavier, imprimantes réseau courantes, format du transporteur | Satisfaite | Idem ; conversion PDF faite dans l'agent .NET. |
| `RG-EXI-079` Langue par utilisateur | Satisfaite | Idem, par vue-i18n et par les ressources .NET. |

**Bilan** : 78 satisfaites, 1 partiellement, 0 non.

### Pile D — Laravel et Vue

| Exigence | Verdict | Justification |
|---|---|---|
| `RG-EXI-001` Visibilité sans rechargement | Satisfaite | Reverb + Echo : fonctionne, mais Reverb est un processus serveur de plus à exploiter. |
| `RG-EXI-002` Main exclusive | Satisfaite | Même mécanisme ; `lockForUpdate()` natif dans le constructeur de requêtes. |
| `RG-EXI-003` État de la main tenu à jour | Satisfaite | Idem, par canal privé Reverb. |
| `RG-EXI-004` File de décisions en continu | Satisfaite | Idem, via Echo. |
| `RG-EXI-005` Condition levée signalée avant validation | Satisfaite | Idem. |
| `RG-EXI-006` Geste enregistré ou refusé, jamais indéterminé | Satisfaite | Idem ; `DB::transaction` et intergiciel. |
| `RG-EXI-007` Geste reçu deux fois enregistré une fois | Satisfaite | Idem. |
| `RG-EXI-008` Jamais deux réservations | Satisfaite | Idem ; `lockForUpdate()` et contrainte unique. |
| `RG-EXI-009` Gestes concurrents : un seul réussit | Satisfaite | Idem. |
| `RG-EXI-010` Mouvements et événements immuables | Satisfaite | Idem ; Eloquent rend facile une modification par inadvertance, à bloquer par les droits en base. |
| `RG-EXI-011` Geste et effets enregistrés ensemble | Satisfaite | File sur base de données dans la même transaction (`dispatch` avec `afterCommit` ou table de sortie). |
| `RG-EXI-012` Droits contrôlés à chaque geste | Satisfaite | Idem, par policies et gates. |
| `RG-EXI-013` Événement horodaté, auteur, poste | Satisfaite | Idem. |
| `RG-EXI-014` Refus tracés | Satisfaite | Idem. |
| `RG-EXI-015` Conservation sans purge | Satisfaite | Idem. |
| `RG-EXI-016` Historique en un geste, totaux redescendus | Satisfaite | Idem ; Eloquent pousse aux requêtes N+1, à détecter par test. |
| `RG-EXI-017` Relevé figé et photo inchangés | Satisfaite | Idem. |
| `RG-EXI-018` Anonymisation sans suppression d'événement | Satisfaite | Idem. |
| `RG-EXI-019` Consultations tracées | Satisfaite | Conception. |
| `RG-EXI-020` Double horodatage des événements externes | Satisfaite | Idem. |
| `RG-EXI-021` Échéances déclenchées sans utilisateur | Satisfaite | Ordonnanceur Laravel (cron chaque minute) + file sur base de données ; deux processus à exploiter. |
| `RG-EXI-022` Échéance manquée traitée à la reprise, retard tracé | Satisfaite | Même conception que A ; le cron système manqué n'est pas rejoué, le balayage l'est. |
| `RG-EXI-023` Photo quotidienne à l'heure du site, échec remonté | Satisfaite | `schedule()->timezone()` ; table `failed_jobs`. |
| `RG-EXI-024` Délais en heures ouvrées par site | Satisfaite | Idem ; Carbon. |
| `RG-EXI-025` Libérations automatiques au seuil | Satisfaite | Idem. |
| `RG-EXI-026` Absence d'échange détectée | Satisfaite | Idem. |
| `RG-EXI-027` Échec automatique jamais silencieux, relançable | Satisfaite | `failed_jobs` et `queue:retry` natifs ; alerte à produire. |
| `RG-EXI-028` Comportement par paramétrage, sans développement | Satisfaite | Idem. |
| `RG-EXI-029` Plusieurs versions d'une règle en service | Satisfaite | Idem. |
| `RG-EXI-030` Exécution à blanc sans effet | Partiellement | Idem sur le principe ; Eloquent mêle volontiers lecture, décision et écriture, la séparation tient à la discipline, que Larastan ne vérifie pas. |
| `RG-EXI-031` Décision explicable attachée à l'événement | Satisfaite | Idem. |
| `RG-EXI-032` Champs personnalisés comme critères | Satisfaite | Idem ; casts JSON. |
| `RG-EXI-033` Scan reçu quel que soit l'écran | Satisfaite | Idem, côté Vue. |
| `RG-EXI-034` Code émis porteur du type | Satisfaite | Conception. |
| `RG-EXI-035` Identifiants uniques, stables, jamais réattribués | Satisfaite | Idem. |
| `RG-EXI-036` Recherche unique, multi-identifiants | Satisfaite | Idem. |
| `RG-EXI-037` Impression automatique vers l'imprimante du poste ou de la zone | Partiellement | Même partage ; PHP n'est pas fait pour un agent résident, qui serait écrit dans un autre langage. |
| `RG-EXI-038` Échec d'impression détecté | Partiellement | Idem ; une seule bibliothèque IPP PHP vivante (obray/ipp), à mainteneur unique. |
| `RG-EXI-039` Étiquettes, documents de flux, de restitution | Satisfaite | Idem ; dompdf ou Browsershot. |
| `RG-EXI-040` Étiquette transporteur au colisage | Satisfaite | Idem. |
| `RG-EXI-041` Réimpression marquée | Satisfaite | Idem. |
| `RG-EXI-042` Réception par dépôt et par courriel, expéditeurs déclarés | Partiellement | Dépôt : phpseclib, vivant. Courriel : webklex/php-imap, sans commit depuis seize mois, et l'extension `imap` de PHP est incompatible avec FrankenPHP. |
| `RG-EXI-043` Interface directe unique, adaptée par profil | Satisfaite | API HTTP ; schéma OpenAPI à générer ou à écrire. |
| `RG-EXI-044` Fichier traité une seule fois, flux rejoué sans double | Satisfaite | Idem. |
| `RG-EXI-045` Envoi sur fait, conservé, rejouable sans double | Satisfaite | Idem ; file en base. |
| `RG-EXI-046` Import manuel contrôlé avant création | Satisfaite | Idem. |
| `RG-EXI-047` Transporteurs : suivi, sans interface possible | Satisfaite | Idem, clients à la main. |
| `RG-EXI-048` Courriels émis et tracés | Satisfaite | Mail Laravel. |
| `RG-EXI-049` Une instance par prestataire, sans développement | Satisfaite | Idem, avec plusieurs processus par instance. |
| `RG-EXI-050` Rien hors périmètre, quel que soit le chemin | Satisfaite | Idem ; les scopes globaux Eloquent aident. |
| `RG-EXI-051` Systèmes cloisonnés comme les personnes | Satisfaite | Idem. |
| `RG-EXI-052` Objet hors périmètre : existence seule | Satisfaite | Conception. |
| `RG-EXI-053` Écran d'ordinateur seulement | Satisfaite | Vue 3 via Inertia. |
| `RG-EXI-054` Français par défaut, bascule en anglais | Satisfaite | vue-i18n et fichiers de langue Laravel : deux catalogues. |
| `RG-EXI-055` Session suit la personne, multi-postes | Satisfaite | Idem. |
| `RG-EXI-056` Export tel qu'affiché | Satisfaite | Idem. |
| `RG-EXI-057` Mise à jour sans perte, sans changement de version de parcours | Satisfaite | Migrations Laravel jouées au démarrage du conteneur. |
| `RG-EXI-058` Remise en état depuis les sauvegardes | Satisfaite | Idem. |
| `RG-EXI-059` Deux modes : hébergé par l'éditeur ou auto-hébergé | Partiellement | Plusieurs processus (serveur HTTP, travailleur de file, ordonnanceur, Reverb) à regrouper dans un conteneur via FrankenPHP/Octane et un gestionnaire de processus. Faisable, plus lourd à documenter et à exploiter par un tiers. |
| `RG-EXI-060` Installation et mise à jour par le prestataire seul | Partiellement | Idem sur le principe ; le nombre de processus rend la documentation et le diagnostic plus longs. |
| `RG-EXI-061` Sauvegarde et restauration par le prestataire | Satisfaite | Idem. |
| `RG-EXI-062` Instances en série, sans opération propre | Satisfaite | Idem ; trois ou quatre processus par instance, empreinte mémoire plus élevée. |
| `RG-EXI-063` Dépendances d'environnement par paramétrage | Satisfaite | Idem. |
| `RG-EXI-064` Espace technique sans ligne de commande | Partiellement | Application PHP distincte ; elle doit démarrer, arrêter et diagnostiquer les trois ou quatre processus de l'instance, et ne sait pas piloter un service Windows sans outil tiers. |
| `RG-EXI-065` Espace technique multi-instances chez l'éditeur | Satisfaite | Idem. |
| `RG-EXI-066` Aucune donnée métier dans l'espace technique | Satisfaite | Idem. |
| `RG-EXI-067` Espace technique vivant quand l'application est arrêtée | Partiellement | Idem sur le principe, à condition de ne pas le servir par le même serveur PHP que l'application : un processus de plus à exploiter. |
| `RG-EXI-068` Dégradation signalée d'elle-même | Satisfaite | Idem, courriel Laravel. |
| `RG-EXI-069` Sobriété : serveur d'entrée de gamme, exploitation sans spécialiste | Partiellement | Quatre à cinq processus par instance, espace technique compris : plus de mémoire et plus de choses à suivre pour un exploitant non spécialiste. |
| `RG-EXI-070` Socle indépendant de la logistique | Partiellement | Paquets Composer ou espaces de noms ; l'autochargeur rend tout visible, seul un outil d'analyse (Deptrac, désormais maintenu sous `deptrac/deptrac`) signale une dépendance interdite. |
| `RG-EXI-071` Aucun autre domaine anticipé | Satisfaite | Idem. |
| `RG-EXI-072` Serveur de référence : deux processeurs, 4 Go, 40 Go | Partiellement | Quatre à cinq processus PHP et PostgreSQL sur quatre gigaoctets : faisable, marge faible. |
| `RG-EXI-073` 300 ms par geste hors réseau, 2 s vers les écrans | Satisfaite | Idem, avec Octane pour éviter le démarrage du cadre à chaque requête. |
| `RG-EXI-074` Éditeur : perte de quelques minutes, reprise en moins de deux heures | Satisfaite | Idem. |
| `RG-EXI-075` Auto-hébergement : sauvegarde quotidienne, restauration en moins de deux heures | Partiellement | Idem, mais quatre à cinq processus à arrêter et relancer dans l'ordre. |
| `RG-EXI-076` Un seul fuseau par instance, déclaré par site | Satisfaite | Idem. |
| `RG-EXI-077` Impression réussie = travail accepté sans erreur | Satisfaite | Idem. |
| `RG-EXI-078` Lecteurs clavier, imprimantes réseau courantes, format du transporteur | Satisfaite | Idem. |
| `RG-EXI-079` Langue par utilisateur | Satisfaite | Idem. |

**Bilan** : 67 satisfaites, 12 partiellement, 0 non.

### Grille hors 0.9 — les erreurs se voient-elles sans relecture ?

| Critère | A — TypeScript | B — Elixir | C — .NET + Vue | D — Laravel |
|---|---|---|---|---|
| Typage à la compilation | Fort en mode strict ; `any` et `as` restent des trous que seul ESLint ferme | Graduel : inférence de tout le programme depuis 1.20, mais sans signatures explicites avant 1.22 (mai 2027) | Fort : nullabilité vérifiée, génériques, analyseurs Roslyn, avertissements en erreurs | Faible : dynamique ; Larastan au niveau maximal comble une partie |
| Typage à l'exécution (entrées HTTP, base, fichiers) | Effacé : dépend de Zod à chaque frontière | Pattern matching : une forme inattendue plante bruyamment, ce qui est une visibilité | Conservé : désérialisation typée, `decimal` natif, exception typée sur contrainte de base | Effacé : casts Eloquent, validation par règles de chaînes |
| Frontière API ↔ écrans | Types partagés dans le même dépôt : une dérive est une erreur de compilation | Pas de frontière pour les écrans (LiveView) ; l'API directe est à part | Client généré depuis le schéma OpenAPI produit par le serveur : une dérive casse la construction des écrans | Inertia transmet des tableaux non typés ; dérive vue à l'exécution |
| Tests d'un module (API contre une vraie base) | Vitest + Testcontainers | ExUnit + bac à sable Ecto, très rapide | xUnit + hôte de test en mémoire + Testcontainers | Pest + base de test |
| Tests de bout en bout par le navigateur | Playwright, première classe | phoenix_test_playwright ; le portage Playwright direct est dormant | Playwright, première classe | Playwright ou Dusk |
| Corpus de l'IA | Le plus large (TypeScript 44 % d'usage, Vue) | Le plus étroit (Elixir 2,7 %) : plus d'API inventées | Large (C# 28 %) ; combinaison .NET + Vue courante | Large (PHP, Laravel) |
| Nombre de choix de bibliothèques à figer | Élevé : cadre, ORM, validation, file, WebSocket, courriel, chacun avec des concurrents | Faible : Phoenix, Ecto, Oban couvrent presque tout | Faible : un cadre couvre HTTP, injection, SignalR, hôte, tests ; ORM et ordonnanceur à figer | Faible : Laravel couvre presque tout |
| Rotation de l'écosystème | Forte : deux majeures TypeScript en six mois, ORM et outillage changeants | Modérée ; le langage évolue vite sur les types | Faible : LTS de trois ans, compatibilité ascendante | Modérée : une majeure Laravel par an, support court |
| Processus par instance, espace technique compris (`067`) | Deux | Deux | Deux | Quatre ou cinq |
| Frontière du socle (`070`) | Signalée par un outil, aujourd'hui dégradé par l'absence d'API de TypeScript 7 | **Refusée à la compilation** par Boundary ou par un parapluie compilé avec les avertissements en erreurs | **Refusée par le compilateur** : références de projet déclaratives, non transitives par réglage ; ArchUnitNET en complément | Signalée par un outil (Deptrac) ; l'autochargeur rend tout visible |
| Empreinte sur un serveur d'entrée de gamme (`069`) | Modérée | La plus faible | Modérée à plus élevée, à mesurer au lot 1 | La plus élevée |
| Service Windows natif, sans conteneur | Possible, peu courant | Supporté (erlsrv), cible de second rang | Supporté et documenté, forme familière | Peu réaliste |
| Agent d'impression sur site dans le même langage | Empaquetage Node en exécutable, possible | Non réaliste | Oui, exécutable autonome | Non |
| Type décimal natif | Non | `Decimal` par bibliothèque standard de fait | Oui | Non |

## Décision

**Le produit se construit sur la pile C : .NET (LTS) et C# pour le serveur et l'agent d'impression,
PostgreSQL pour les données, Vue 3 et TypeScript pour les écrans, avec un contrat OpenAPI produit
par le serveur et un client d'écrans généré depuis ce contrat.**

Le critère décisif est la conjonction des deux exigences les plus lourdes de cette fiche :

1. **Les erreurs doivent se voir sans relecture humaine.** C'est la seule pile des quatre où le
   typage tient à la compilation *et* à l'exécution, avec un type décimal natif, un nombre réduit
   de bibliothèques à figer, et un écosystème qui se périme lentement — trois conditions pour qu'un
   code écrit par une IA et jamais relu reste cohérent sur plusieurs années.
2. **Les deux modes d'exploitation et leur espace technique** (`RG-EXI-059` à `069`). Une image
   conteneur, et en plus une publication native en service Windows, forme que connaissent les
   services informatiques des prestataires et qui épargne Docker à qui n'en a pas l'usage. Les deux
   programmes qui doivent vivre à côté de l'application — l'agent d'impression sur site, inévitable
   en hébergement par l'éditeur, et l'espace technique, qui doit survivre à l'arrêt de l'application
   (`067`) — s'écrivent dans le même langage, se testent avec les mêmes outils et se livrent de la
   même façon.

La frontière du socle (`070`) renforce le choix : avec la pile B, c'est la seule où le socle **ne
peut pas** référencer la logistique, parce que la compilation le refuse, plutôt que ne le doit pas,
parce qu'un outil le signale. En .NET, la règle tient à la déclaration même des projets, sans
bibliothèque tierce.

La pile A reste **la seconde**. Son seul avantage décisif était l'unicité du langage, que Lucas a
écarté comme critère ; elle perd en outre sur la frontière du socle, tenue par un outil que TypeScript 7
a momentanément affaibli. La pile B est la plus sobre en mémoire (`069`) et la plus élégante en exploitation
et en temps réel, mais son typage n'est pas
encore au niveau exigé, son corpus est dix fois plus petit, et deux fonctions requises (courriel
entrant, impression IPP) n'y ont pas de bibliothèque maintenue. La pile D est écartée par son
typage dynamique et par le nombre de processus à exploiter par un tiers, que l'espace technique
porte à quatre ou cinq par instance — à rebours de la sobriété de `069`.

Décision **actée** le 2026-09-23 par Lucas, qui a confirmé le critère décisif : un langage unique
sert surtout une équipe humaine qui relit ; ici l'IA écrit tout et personne ne relit, donc le
typage à l'exécution prime.

### Ce que la pile C satisfait mal

- `RG-EXI-011` — l'atomicité entre le geste et son effet différé passe par une table de sortie
  (outbox), pas par l'ordonnanceur lui-même. Patron courant, à construire et à tester une fois.
- `RG-EXI-037`, `038` — en hébergement par l'éditeur, aucune pile n'atteint l'imprimante du
  prestataire sans un agent sur site. La pile C le rend simple, elle ne le rend pas inutile.
- `RG-EXI-069` — aucune exigence n'est manquée, mais c'est la marge la plus étroite : un processus
  .NET occupe plus de mémoire qu'une machine BEAM, et l'image d'exécution est plus lourde qu'en Node.
  Le serveur de référence est fixé par `RG-EXI-072` ; la règle impose de le mesurer au lot 1.
- `RG-EXI-054` — deux catalogues de libellés (écrans en Vue, messages du serveur en .NET) à tenir
  alignés sur le glossaire ; un contrôle automatique devra le vérifier.

### Ce qu'elle coûte

- Deux langages et deux chaînes de construction (dotnet, node) dans le même dépôt ; deux exécuteurs
  de tests ; deux analyseurs. La cohérence entre les deux est mécanique (client généré) mais c'est
  une étape de plus dans chaque livraison de module.
- Les verrous de ligne PostgreSQL s'écrivent en SQL explicite, EF Core ne les expose pas.
- Quartz.NET vient de publier une majeure 4.0 avec ruptures ; la fiche des traitements différés
  devra choisir entre la branche 3.x, encore maintenue, la 4.x, ou un autre ordonnanceur.
- SharpIppNext, seule bibliothèque IPP .NET maintenue, est un petit projet à mainteneur unique.
  IPP est un protocole simple ; l'écrire soi-même reste possible.
- QuestPDF, bibliothèque PDF la plus courante en .NET, n'est pas libre : sa licence gratuite dépend
  du chiffre d'affaires de l'entité qui déploie et exclut le secteur public. Comme le produit est
  installé chez des prestataires, la fiche d'impression devra soit vérifier que l'usage transitif
  est couvert, soit retenir un navigateur sans tête ou une bibliothèque libre.
- Image conteneur d'exécution plus lourde qu'en Node (de l'ordre de la centaine de mégaoctets).

**Ce que les exigences de la révision ajoutent au coût** — elles s'imposent aux quatre piles, et la
pile C les paie ainsi :

- **Un troisième programme à livrer** : l'espace technique, exécutable .NET autonome distinct de
  l'application et de l'agent d'impression, avec sa propre mise à jour — il met à jour l'application,
  mais quelqu'un doit le mettre à jour lui-même sans ligne de commande (`064`, `067`).
- **Deux modes de pilotage** : l'espace technique doit savoir conduire une instance en conteneurs et
  une instance en service Windows. C'est le prix du service Windows retenu pour la sobriété.
- **Un cloisonnement en base à construire dès le départ** : rôle PostgreSQL distinct pour l'espace
  technique, sans lecture des tables métier ; compteurs d'état de santé exposés par l'application ;
  rôle de sauvegarde qui lit tout mais n'affiche rien (`066`).
- **Une émission d'alertes indépendante de l'application** : l'espace technique envoie lui-même ses
  courriels de dégradation (`068`), donc porte sa propre configuration de messagerie.
- **Une flotte d'instances outillée par le produit, pas par Coolify** : Coolify ne déploie pas une
  même image en série, l'espace technique doit le faire (`065`).
- **Une découpe du dépôt en projets dès le premier module** : socle, logistique, espace technique,
  agent d'impression, avec des références à sens unique rendues non transitives et des tests
  d'architecture ArchUnitNET (`070`).
  Discipline de départ, pas de travail supplémentaire ensuite.
- **L'archivage continu de PostgreSQL** en hébergement par l'éditeur (hypothèse de sauvegarde
  ci-dessous, par pgBackRest ou WAL-G) et le **partitionnement du journal** (hypothèse de volumétrie) : communs aux quatre
  piles, mais EF Core ne gère pas les partitions — leurs migrations s'écrivent en SQL, ou sont
  confiées à pg_partman, qui demande un superutilisateur à l'installation.
- **Une reprise en moins de deux heures** (`RG-EXI-074`, `075`), au lieu de la demi-journée
  supposée à la première révision. Commun aux quatre piles, et c'est un coût d'exploitation plus
  que de pile :
  - chez l'éditeur, l'archivage continu ne suffit plus seul : la durée de restauration est bornée
    par la taille de la base et par la quantité de journaux à relire depuis la dernière sauvegarde
    de base. Il faut des sauvegardes de base fréquentes, un stockage de sauvegarde proche des
    serveurs, et, pour les plus grosses instances, une réplique en attente prête à prendre le
    relais — un second serveur par instance concernée ;
  - la restauration doit être **exercée**, pas supposée : l'espace technique rejoue régulièrement
    une restauration sur une instance jetable et en mesure la durée, sans quoi le délai de deux
    heures n'est qu'une promesse. Un échec ou un dépassement est une dégradation signalée d'elle-même
    (`RG-EXI-068`) ;
  - en auto-hébergement, la restauration par l'espace technique doit tenir en deux heures sur le
    serveur de référence : sauvegarde logique quotidienne acceptable à la volumétrie d'un petit
    prestataire, à mesurer au lot 5 ; au-delà, l'espace technique propose l'archivage continu ;
  - la détection compte dans les deux heures : l'état de santé doit signaler la panne à qui exploite
    l'instance dans les premières minutes.
- **Des dépendances à licence permissive seulement** (hypothèse de licence) : QuestPDF sort de la
  liste des candidats pour les documents PDF.

### Valeurs de référence et hypothèses restantes

Sept points ouverts de 0.9 §7 ont reçu leur valeur, désormais exigée (`RG-EXI-072` à `079`) et
évaluée dans les tableaux ci-dessus :

| Point | Valeur de la spécification | Effet sur la pile |
|---|---|---|
| Serveur de référence | Deux processeurs, quatre gigaoctets, quarante gigaoctets ; instance de petit prestataire et espace technique compris ; mesuré au lot 1 (`072`) | Marge la plus étroite de C ; B la plus large, D la plus faible. **Recommandation inchangée**, sous réserve de la mesure. |
| Temps de réponse | Geste en moins de 300 ms hors réseau ; changement sur les écrans en moins de deux secondes (`073`) | Ne départage pas. |
| Perte et reprise, chez l'éditeur | Quelques minutes de perte ; reprise en moins de deux heures (`074`) | Commun aux quatre ; coût d'exploitation détaillé dans « Ce qu'elle coûte ». |
| Perte et reprise, en auto-hébergement | Sauvegarde quotidienne au minimum ; restauration par l'espace technique en moins de deux heures (`075`) | Commun ; D paie un redémarrage à plusieurs processus. |
| Fuseau | Un seul par instance, déclaré par site, horodatages non ambigus (`076`) | Ne départage pas. |
| Aboutissement d'une impression | Travail accepté sans erreur ; papier non vérifié (`077`) | Ne départage pas ; identique à l'hypothèse de la première version. |
| Matériel | Lecteurs clavier, imprimantes réseau courantes, étiquette dans le format du transporteur (`078`) | Ne départage pas ; l'agent d'impression convertit les étiquettes PDF. |
| Langue | Bascule par utilisateur (`079`) | Ne départage pas. |

Trois points restent ouverts dans 0.9 §7. L'hypothèse retenue, et l'effet d'une autre réponse :

| Point ouvert | Hypothèse retenue | Si la réponse est autre |
|---|---|---|
| **Volumétrie cible** | Borne haute par instance : au plus dix sites, une centaine d'utilisateurs simultanés, cinquante mille lignes de flux par jour, un million d'objets sérialisés. À plusieurs événements par ligne, le journal atteint **plusieurs centaines de millions d'événements en cinq ans** : son partitionnement par période est prévu dès la fiche base de données, pas ajouté après coup. Un petit prestataire, qui doit tenir sur un serveur d'entrée de gamme (`069`), est très en deçà de cette borne. | Dix fois plus : réplique de lecture en plus du partitionnement, toujours en PostgreSQL. **Recommandation inchangée.** |
| **Licence et distribution** | La commercialisation n'est pas un objectif à ce stade. Seule hypothèse : **la réalisation ne ferme aucune option** — code livré lisible ou non, activation de licence ou non, périmètre identique ou non selon le mode. Deux conséquences : toutes les dépendances sont sous licence permissive (MIT, Apache, BSD, PostgreSQL), sans condition liée à la taille de qui déploie ; l'activation, si elle vient un jour, se branche dans l'espace technique sans toucher l'application. | **Les piles ne gardent pas toutes les options ouvertes au même degré.** Toutes permettent un code lisible et une activation. Un code *non* lisible : C livre des assemblages IL, décompilables, mais la compilation native et l'obfuscation existent ; B livre du bytecode BEAM, dont les informations de débogage se retirent ; A et D livrent du JavaScript et du PHP, et ne peuvent fermer le code que par obfuscation. **Inchangée** : C est celle qui ferme le moins d'options. |
| **Nom de l'exploitant** | Hors pile. Dans le code, l'exploitant d'une instance reste `Provider` tant que le glossaire ne dit pas autre chose (`RG-EXI-071` interdit de l'anticiper). | **Sans effet** sur la pile ; un renommage futur est un changement de glossaire et de code. |

## Conséquences

- **Ce qu'on peut faire** : une fois la fiche actée, écrire les fiches de détail ci-dessous, puis
  commencer le lot 1 (`0001`, précisé par `0003` si elle est actée) par son premier module
  vertical. Rien avant.

- **Ce qu'on ne peut plus faire** : évoquer Laravel, Elixir, Node ou tout autre candidat comme une
  option ouverte ; introduire une bibliothèque dans un rôle déjà tenu par le cadre (validation,
  injection, journalisation, temps réel) sans fiche.

- **Ce qu'il faut mettre en place** — les fiches de détail, dans l'ordre de leurs dépendances. Aucune
  ne s'écrit avant l'acte de 0002. Elles prennent leur numéro à la rédaction ; `0003` est déjà
  prise par la précision du découpage en lots. À l'acte, elles sont portées par les issues `#36` à
  `#46`, et le jeu de données et le scénario du lot 1 par `#47` ; la découpe interne est la fiche
  `0004`.

  | Fiche | Objet | Dépend de |
  |---|---|---|
  | Découpe interne et frontière du socle | Projets du dépôt (socle, logistique, espace technique, agent d'impression, écrans), sens des références, tests d'architecture, ce qui relève du socle au sens de `RG-EXI-070`. Première à écrire : elle fixe où va chaque ligne de code | 0002 |
  | Chaîne de qualité et intégration continue | Réglages du compilateur et des analyseurs traités en erreurs, règles ESLint, tests d'architecture bloquants, seuils de tests, ce qui bloque une fusion. C'est là que « les erreurs se voient » devient mécanique | 0002, découpe interne |
  | Base de données et journal d'événements | Version PostgreSQL, conventions de schéma, journal en ajout seul **partitionné par période dès l'origine**, droits par rôle (application, espace technique, sauvegarde), anonymisation, migrations additives, clés d'idempotence | 0002 |
  | Interface de programmation et contrat | API minimales, production du schéma OpenAPI, génération du client TypeScript, idempotence des gestes, autorisation par périmètre à chaque geste, authentification des systèmes des donneurs d'ordre | base de données |
  | Écrans | Vue 3, bibliothèque de composants, surfaces terrain et bureau, capture du scan, catalogue de libellés du glossaire et bascule de langue | contrat |
  | Temps réel | SignalR : groupes par unité de travail et par périmètre, abonnement des écrans, reconnexion, ce qui est diffusé et ce qui ne l'est pas | contrat, écrans |
  | Traitements différés | Ordonnanceur (Quartz.NET 3.x, 4.x ou autre), table de sortie transactionnelle, rattrapage après arrêt et trace du retard, planification par site et fuseau | base de données |
  | Impression | Agent sur site (.NET autonome), ZPL et IPP, détection d'échec et objet non étiqueté, production des PDF par une bibliothèque à licence permissive, gabarits | 0002, réponse sur le matériel |
  | Échanges | Dépôt de fichiers (répertoire, SFTP), courriel entrant et sortant (MailKit), interface directe et profils, anti-doublon, transporteurs | base de données, contrat |
  | Installation et mise à jour des instances | Image conteneur et service Windows, migrations au démarrage, mise à jour en série de la flotte chez l'éditeur, ce que le prestataire fait seul | découpe interne, base de données |
  | Espace technique et état de santé | Programme distinct de l'application, pilotage des conteneurs et des services Windows, sauvegarde quotidienne et archivage continu, restauration, indicateurs dénombrés sans donnée métier, alertes émises d'elles-mêmes, vue de flotte, sa propre mise à jour. Réalisé au lot 5 si `0003` est actée, mais ses conditions — rôles en base, compteurs exposés, processus séparé — se posent dès le lot 1 | installation, base de données |
  | Jeu de données de test et scénario du lot 1 | Exigés par `0001` ; hors pile, mais nécessaires avant le premier module | 0001 (ou 0003), base de données |

  Et, à l'acte : `docs/decisions/README.md` passe 0002 à `actée`, `#24` est fermée, une entrée de
  journal le relate. `status.yml` ne change pas : aucun module ne change d'état à l'acte d'une
  fiche.

- **Ce qu'on accepte de payer** : deux langages ; trois programmes .NET à livrer (application,
  agent d'impression, espace technique) ; deux modes de pilotage des instances ; la table de sortie
  pour les effets différés ; le SQL explicite pour les verrous et les partitions ; la dépendance à
  deux petits projets (SharpIppNext, et un ordonnanceur en transition) ; une empreinte mémoire à
  mesurer contre le serveur de référence.

- **Ce qui la remettrait en cause** :
  - une mesure du lot 1 montrant que l'application, l'espace technique et PostgreSQL ne tiennent pas
    ensemble sur le serveur de référence (`RG-EXI-072`) ;
  - la découverte, au lot 1, que la génération du client depuis le schéma OpenAPI laisse passer des
    dérives entre API et écrans — ce serait le signe que le partage direct des types (pile A) vaut
    plus que prévu ;
  - une volumétrie hors de l'hypothèse ci-dessus, qui ne changerait pas la
    pile mais rouvrirait la fiche base de données ;
  - un prestataire dont le parc refuse à la fois les conteneurs et Windows : cas non couvert.
