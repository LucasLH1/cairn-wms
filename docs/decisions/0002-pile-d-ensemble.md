# 0002 — Pile d'ensemble

**Statut** : proposée · **Date** : 2026-09-23 · **Remplace** : — · **Remplacée par** : —

## Contexte

La spécification métier est rédigée pour ses vingt-trois modules. La fiche `0001` fixe l'ordre de
réalisation : cinq lots verticaux, le premier étant l'entrepôt minimal. Rien ne dit encore avec quoi
le produit se construit, s'exécute, s'éprouve et se livre. C'est ce que cette fiche propose : **une
pile complète et cohérente**, jugée comme un tout, et non des briques prises une à une.

### Ce qui contraint le choix

**La grille d'évaluation est le module `socle/0.9-exigences-de-fonctionnement.md`** : soixante-trois
exigences `RG-EXI`, chacune rattachée à la règle métier dont elle découle, et une section 5 de ce qui
n'est *pas* exigé. Chaque pile candidate est évaluée exigence par exigence en section « Options ».
Les groupes qui départagent vraiment sont, dans l'ordre de leur poids :

1. **Les modes d'exploitation** (`RG-EXI-059` à `063`). Le produit s'exploite hébergé par l'éditeur
   ou auto-hébergé par le prestataire, sur le modèle de n8n. Un tiers doit pouvoir installer, mettre à
   jour, sauvegarder et restaurer seul ; l'éditeur doit exploiter de nombreuses instances sans
   travail propre à chacune. C'est le critère le plus lourd : il élimine toute pile qui ne se livre
   pas comme une image unique posée à côté d'une base.
2. **Le temps réel** (`001` à `005`) : la file de décisions, la main et les écrans consultés se
   tiennent à jour sans rechargement.
3. **L'intégrité des gestes concurrents** (`006` à `012`) : geste enregistré ou refusé, jamais deux
   fois, jamais à moitié.
4. **Les traitements différés et le rattrapage après arrêt** (`021` à `027`).
5. **L'exécution à blanc des règles** (`030`).
6. **L'impression pilotée par le serveur avec détection d'échec** (`037`, `038`).
7. **Les échanges** par dépôt, courriel et interface directe (`042` à `048`).

**Un critère absent de 0.9 pèse autant que ces groupes** : le code est écrit en totalité par une IA,
et Lucas ne le relit pas. Une erreur qui ne se manifeste pas mécaniquement — à la compilation, à
l'analyse statique, au test, au démarrage — n'est vue par personne. La pile doit donc **rendre les
erreurs visibles sans relecture humaine** : typage statique strict, vérification des frontières
(entrées HTTP, base, fichiers), tests exécutables par module, contrôles automatiques bloquants. Ce
critère fait l'objet de sa propre grille, après les tableaux `RG-EXI`.

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
hypothèse explicite et dit si la recommandation changerait avec une autre réponse.

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
  geste sans patron supplémentaire (`RG-EXI-011`). Supervision OTP : un traitement qui plante
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
  processus dans un conteneur par FrankenPHP/Octane et un superviseur. Livraison : une image
  conteneur + PostgreSQL.
- **En faveur** : le cadre le plus « à piles incluses » des quatre pour une application de gestion —
  files, ordonnanceur, courriel, sessions, autorisations, temps réel, tests sont fournis et
  documentés ensemble. Corpus d'IA large. Rapidité de production des écrans de bureau.
- **En défaveur** : typage dynamique ; Larastan pousse loin mais ne peut pas rendre sûr ce que
  Eloquent construit par magie (attributs, relations, portées) — la classe d'erreurs « propriété mal
  orthographiée, relation absente, colonne renommée » ne se voit qu'à l'exécution ou au test. C'est
  la pile la plus faible sur le critère décisif. Exploitation par un tiers plus lourde : trois ou
  quatre processus par instance à démarrer, superviser et diagnostiquer, là où les trois autres n'en
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

### Évaluation contre les exigences de 0.9

Chaque pile est évaluée contre les soixante-trois exigences `RG-EXI`. « Satisfaite » signifie que la
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
| `RG-EXI-021` Échéances déclenchées sans utilisateur | Satisfaite | pg-boss : traitements persistants et planification cron dans PostgreSQL, exécutées par le processus serveur. |
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

**Bilan** : 61 satisfaites, 2 partiellement, 0 non.

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
| `RG-EXI-021` Échéances déclenchées sans utilisateur | Satisfaite | Oban : traitements persistants dans PostgreSQL, cron intégré, exécution supervisée par OTP. |
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

**Bilan** : 60 satisfaites, 3 partiellement, 0 non.

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

**Bilan** : 62 satisfaites, 1 partiellement, 0 non.

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
| `RG-EXI-016` Historique en un geste, totaux redescendus | Satisfaite | Idem ; Eloquent pousse aux requêtes N+1, à surveiller par test. |
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
| `RG-EXI-059` Deux modes : hébergé par l'éditeur ou auto-hébergé | Partiellement | Plusieurs processus (serveur HTTP, travailleur de file, ordonnanceur, Reverb) à regrouper dans un conteneur via FrankenPHP/Octane et un superviseur. Faisable, plus lourd à documenter et à exploiter par un tiers. |
| `RG-EXI-060` Installation et mise à jour par le prestataire seul | Partiellement | Idem sur le principe ; le nombre de processus rend la documentation et le diagnostic plus longs. |
| `RG-EXI-061` Sauvegarde et restauration par le prestataire | Satisfaite | Idem. |
| `RG-EXI-062` Instances en série, sans opération propre | Satisfaite | Idem ; trois ou quatre processus par instance, empreinte mémoire plus élevée. |
| `RG-EXI-063` Dépendances d'environnement par paramétrage | Satisfaite | Idem. |

**Bilan** : 57 satisfaites, 6 partiellement, 0 non.

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
| Processus par instance | Un | Un | Un | Trois ou quatre |
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
2. **Les deux modes d'exploitation** (`RG-EXI-059` à `063`). Un processus par instance, une image
   conteneur, et en plus une publication native en service Windows, forme que connaissent les
   services informatiques des prestataires logistiques ; l'agent d'impression sur site, inévitable
   en hébergement par l'éditeur, s'écrit dans le même langage et se livre de la même façon.

La pile A est **la seconde**, de peu. Elle l'emporterait si l'on jugeait qu'un seul langage de la
base à l'écran compte plus que la solidité du typage à l'exécution et que la stabilité de
l'écosystème. C'est un arbitrage que Lucas peut retourner sans que rien d'autre dans cette fiche ne
change. La pile B est la plus élégante en exploitation et en temps réel, mais son typage n'est pas
encore au niveau exigé, son corpus est dix fois plus petit, et deux fonctions requises (courriel
entrant, impression IPP) n'y ont pas de bibliothèque maintenue. La pile D est écartée par son
typage dynamique et par le nombre de processus à exploiter par un tiers.

Décision **proposée**, non validée. Elle n'engage rien tant que Lucas ne l'a pas actée.

### Ce que la pile C satisfait mal

- `RG-EXI-011` — l'atomicité entre le geste et son effet différé passe par une table de sortie
  (outbox), pas par l'ordonnanceur lui-même. Patron courant, à construire et à tester une fois.
- `RG-EXI-037`, `038` — en hébergement par l'éditeur, aucune pile n'atteint l'imprimante du
  prestataire sans un agent sur site. La pile C le rend simple, elle ne le rend pas inutile.
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

### Hypothèses sur les points ouverts de 0.9 §7

L'hébergement n'est plus un point ouvert : les deux modes sont actés (`RG-EXI-059`). Pour chacun
des points restants, l'hypothèse retenue et l'effet d'une autre réponse sur la recommandation.

| Point ouvert | Hypothèse retenue | Si la réponse est autre |
|---|---|---|
| **Volumétrie cible** | Par instance : au plus dix sites, une centaine d'utilisateurs simultanés, cinquante mille lignes de flux par jour, un million d'objets sérialisés, cent millions d'événements au bout de cinq ans. Un serveur PostgreSQL suffit. | Dix fois plus : partitionnement des tables d'événements et réplique de lecture, toujours en PostgreSQL. **Recommandation inchangée.** |
| **Temps de réponse** | Un geste du terrain répond en moins de 300 ms côté serveur ; un changement atteint les écrans ouverts en moins de deux secondes. | Des exigences plus strictes ne départagent pas les quatre piles ; seule la pile B, qui fait un aller-retour serveur par frappe, y serait sensible. **Inchangée.** |
| **Licence et distribution** | Source disponible dans un dépôt public, licence de type « usage durable » comme n8n, distribution en image conteneur publique, aucune activation de licence, même périmètre fonctionnel dans les deux modes. | **La forme de distribution diffère selon la pile.** A et D livrent du code lisible (JavaScript transpilé, PHP) : toute restriction ne tient qu'à la licence. B livre du bytecode BEAM, décompilable. C livre des assemblages IL, décompilables aussi, mais l'obfuscation et la compilation native existent. Si Lucas veut un code fermé ou une activation de licence, C est la mieux placée, A et D imposeraient d'accepter un code livré lisible. **Inchangée, renforcée si code fermé.** |
| **Sauvegarde et reprise** | Perte admissible d'une journée (sauvegarde `pg_dump` quotidienne et copie du volume des fichiers conservés), reprise en une demi-journée, documentées pour le prestataire. | Perte admissible de quelques minutes : archivage continu ou réplication PostgreSQL. C'est un choix de base de données, commun aux quatre piles. **Inchangée.** |
| **Fuseau horaire** | Tous les sites d'une instance dans un même fuseau ; néanmoins tous les horodatages sont stockés en UTC (`timestamptz`) et chaque site porte son fuseau dès le lot 1. | Sites multi-fuseaux : la photo quotidienne et les échéances se planifient par site avec son fuseau, ce que les quatre ordonnanceurs savent faire. **Inchangée.** |
| **Aboutissement d'une impression** | Une impression est réussie quand l'imprimante a accepté le travail et n'a pas signalé d'erreur (état de travail IPP ; état `~HS` ZPL après envoi). La sortie physique du papier n'est pas vérifiable sans capteur. En hébergement par l'éditeur, un agent sur site porte cette détection. | Exiger la sortie physique dépend du matériel (imprimantes qui remontent leur état), pas de la pile. **Inchangée** ; la présence d'un agent sur site est de toute façon acquise. |
| **Matériel** | Lecteurs de code-barres en émulation clavier (USB ou Bluetooth HID) ; imprimantes d'étiquettes ZPL en TCP 9100 ; imprimantes de documents IPP ; étiquettes transporteur reçues en PDF ou ZPL. | Un autre langage d'étiquette (EPL, TSPL) ajoute des gabarits ; un lecteur non HID demanderait un pilote côté poste. Ni l'un ni l'autre ne change de pile. **Inchangée.** |
| **Granularité de la langue** | Par utilisateur. | Par instance : plus simple encore. **Sans effet.** |

## Conséquences

- **Ce qu'on peut faire** : une fois la fiche actée, écrire les fiches de détail ci-dessous, puis
  commencer le lot 1 (`0001`) par son premier module vertical. Rien avant.

- **Ce qu'on ne peut plus faire** : évoquer Laravel, Elixir, Node ou tout autre candidat comme une
  option ouverte ; introduire une bibliothèque dans un rôle déjà tenu par le cadre (validation,
  injection, journalisation, temps réel) sans fiche.

- **Ce qu'il faut mettre en place** — les fiches de détail, dans l'ordre de leurs dépendances. Aucune
  ne s'écrit avant l'acte de 0002.

  | Fiche | Objet | Dépend de |
  |---|---|---|
  | 0003 — Base de données et schéma d'événements | Version PostgreSQL, conventions de schéma, tables d'événements en ajout seul et droits associés, anonymisation, règles de migration additive, clés d'idempotence | 0002 |
  | 0004 — Chaîne de qualité et intégration continue | Réglages du compilateur et des analyseurs traités en erreurs, règles ESLint, seuils de tests, ce qui bloque une fusion, exécution en intégration continue. Conditionne toutes les autres : c'est là que « les erreurs se voient » devient mécanique | 0002 |
  | 0005 — Interface de programmation et contrat | API minimales, production du schéma OpenAPI, génération du client TypeScript, idempotence des gestes, autorisation par périmètre à chaque geste, authentification des systèmes des donneurs d'ordre | 0002, 0003 |
  | 0006 — Écrans | Vue 3, bibliothèque de composants, deux surfaces terrain et bureau, capture du scan, catalogue de libellés du glossaire et bascule de langue | 0005 |
  | 0007 — Temps réel | SignalR : groupes par unité de travail et par périmètre, modèle d'abonnement des écrans, reconnexion, ce qui est diffusé et ce qui ne l'est pas | 0005, 0006 |
  | 0008 — Traitements différés | Ordonnanceur (Quartz.NET 3.x, 4.x ou autre), table de sortie transactionnelle, rattrapage après arrêt et trace du retard, planification par site et fuseau | 0003 |
  | 0009 — Impression | Agent sur site (.NET autonome), protocoles ZPL et IPP, détection d'échec et objet non étiqueté, production des documents PDF et question de licence de QuestPDF, gabarits d'étiquettes | 0002, réponse sur le matériel |
  | 0010 — Échanges | Dépôt de fichiers (répertoire, SFTP), courriel entrant et sortant (MailKit), interface directe et profils, anti-doublon, transporteurs | 0003, 0005 |
  | 0011 — Installation et mise à jour des instances | Image conteneur, Compose de référence, migrations au démarrage, service Windows, sauvegarde et restauration documentées pour le prestataire, flotte d'instances chez l'éditeur (Coolify), procédure de mise à jour | 0002, 0003 |
  | Licence et distribution | Décision de Lucas, pas technique : forme de livraison, licence, activation, périmètre par offre. Conditionne 0011 et le caractère public du dépôt | — |
  | Jeu de données de test et scénario du lot 1 | Exigés par `0001` ; hors pile, mais nécessaires avant le premier module | 0001, 0003 |

  Et, à l'acte : `docs/decisions/README.md` passe 0002 à `actée`, `#24` est fermée, une entrée de
  journal le relate. `status.yml` ne change pas : aucun module ne change d'état à l'acte d'une
  fiche.

- **Ce qu'on accepte de payer** : deux langages ; la table de sortie pour les effets différés ; le
  SQL explicite pour les verrous ; la dépendance à deux petits projets (SharpIppNext, et un
  ordonnanceur en transition) ; la question de licence sur la production de PDF.

- **Ce qui la remettrait en cause** :
  - un arbitrage de Lucas en faveur d'un langage unique (→ pile A) ;
  - une exigence de code fermé qu'aucune des piles ne satisferait sans obfuscation lourde ;
  - la découverte, au lot 1, que la génération du client depuis le schéma OpenAPI laisse passer des
    dérives entre API et écrans — ce serait le signe que le partage direct des types (pile A) vaut
    plus que prévu ;
  - une volumétrie ou un temps de réponse hors des hypothèses ci-dessus, qui ne changerait pas la
    pile mais rouvrirait la fiche base de données ;
  - un prestataire dont le parc refuse à la fois les conteneurs et Windows : cas non couvert.
