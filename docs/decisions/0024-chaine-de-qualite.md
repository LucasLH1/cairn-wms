# 0024 — Chaîne de qualité et intégration continue

**Statut** : actée · **Date** : 2026-09-25 · **Remplace** : — · **Remplacée par** : —

## Contexte

Tout le code est écrit par l'IA. Les fiches 0011, 0017, 0021 et 0023 reposent sur des vérifications
automatiques qui bloquent en cas d'écart. Le lot 1 se clôt sur des tests de bout en bout des trois
scénarios, rejoués à chaque modification, partant d'une instance vide (`lots/lot-1/README.md`). Le
dépôt est public, sur GitHub, et `main` n'accepte que des fusions par demande de fusion (`CLAUDE.md`).

## Options

### Option A — GitHub Actions, outils standard de l'écosystème

- **Ce que c'est** : l'intégration continue de GitHub, gratuite pour un dépôt public, lançant
  compilateur, analyse de code, tests et construction des images.
- **En faveur** : aucun service de plus ; déjà utilisé sur les projets de Lucas ; publication des images
  sur le registre de GitHub.
- **En défaveur** : dépendance à GitHub pour la chaîne.
- **Ce que ça ferme** : —

### Option B — Chaîne auto-hébergée (Woodpecker, Drone) sur le serveur de Lucas

- **Ce que c'est** : un moteur d'intégration continue sur le serveur privé virtuel.
- **En faveur** : indépendance.
- **En défaveur** : un service de plus à exploiter ; aucun gain pour un dépôt public.
- **Ce que ça ferme** : —

### Pour les tests : Option C — Vitest et Playwright

- **Ce que c'est** : Vitest pour les tests unitaires et d'intégration, Playwright pour les tests de bout
  en bout dans un vrai navigateur.
- **En faveur** : standards de l'écosystème TypeScript ; maîtrise par l'IA très large ; Playwright
  pilote plusieurs navigateurs à la fois, utile pour la main et le temps réel.
- **En défaveur** : —
- **Ce que ça ferme** : —

### Pour les tests : Option D — Jest et Cypress

- **Ce que c'est** : les générations précédentes.
- **En faveur** : très répandus.
- **En défaveur** : plus lents, configuration TypeScript plus lourde ; Cypress gère mal plusieurs
  navigateurs dans un même test.
- **Ce que ça ferme** : —

## Décision

**L'intégration continue tourne sur GitHub Actions à chaque envoi et à chaque demande de fusion. Elle
enchaîne les vérifications ci-dessous ; une seule en échec rend la modification rouge** (options A et C).

1. **Compilation** en mode strict de tout l'espace de travail.
2. **Analyse de code** : ESLint avec les règles strictes et typées de typescript-eslint (`any`,
   conversions non vérifiées, suppressions d'erreur et promesses non attendues interdites) ; mise en
   forme par Prettier.
3. **Frontières** : dependency-cruiser applique les règles de la fiche 0023.
4. **Style** : aucune couleur hors du fichier des jetons (Stylelint) ; aucune valeur arbitraire Tailwind
   dans les classes, par une vérification propre au dépôt (fiche 0011).
5. **Base** : les migrations s'appliquent sur une base vide ; les types générés depuis la base migrée
   sont identiques à ceux du dépôt (fiche 0021).
6. **Tests unitaires et d'intégration** par Vitest, contre un vrai PostgreSQL, jamais une imitation.
7. **Tests de bout en bout** par Playwright : les scénarios du lot 1, joués sur l'instance construite à
   partir des images, depuis une instance vide.
8. **Dépendances** : audit des vulnérabilités ; installation depuis le fichier de verrouillage seul.
9. **Images** : construites à chaque envoi sur `dev`, publiées sur le registre de GitHub quand tout est
   vert.

Règle de travail : une modification rouge sur `dev` se corrige avant toute autre ; aucun lot n'est
déclaré clos tant que la chaîne n'est pas verte. `main` exige une chaîne verte pour toute fusion.

Critère décisif : chaque garde-fou des fiches précédentes devient une vérification qui bloque, sur un
service déjà en place et gratuit pour ce dépôt.

Proposée et actée par Claude le 2026-09-25, sur délégation explicite de Lucas : « Prends les décisions
qu'il faut, je veux passer au dev le plus rapidement possible. » Elle reprend l'objet de l'ancienne
fiche 0005, abandonnée, sans s'appuyer sur son contenu.

## Conséquences

- **Ce qu'on peut faire** : laisser l'IA écrire sans relecture ligne à ligne, la chaîne tenant les
  règles.
- **Ce qu'on ne peut plus faire** : fusionner vers `main` une modification rouge ; désactiver une
  vérification sans fiche.
- **Ce qu'il faut mettre en place** : les flux GitHub Actions, en reprenant la logique des anciens
  (qualité, cloisonnement, image) et non leur contenu ; la protection de `main` exigeant la chaîne
  verte.
- **Ce qu'on accepte de payer** : une chaîne plus longue à chaque envoi, surtout pour les tests de bout
  en bout.
- **Ce qui la remettrait en cause** : une chaîne si lente qu'elle freine le travail ; on découpera alors
  les étapes, sans en retirer.

### Non prouvé

- La mesure de `RG-EXI-072` et `073` sur le serveur de référence n'est pas dans la chaîne : les
  machines de GitHub ne sont pas le serveur de référence. Elle se fait sur une instance installée, à la
  clôture du lot 1.
