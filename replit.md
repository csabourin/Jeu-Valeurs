# Le jeu des valeurs

Un jeu Web en français canadien. La personne prend des cartes concrètes (lignes
rouges, horizons, trésors), dit ce que chacune protège, puis le jeu les met en
duel deux à deux. Une première passe rapide suffit à dessiner une ordination ;
c'est **après** ce premier portrait que le jeu creuse — il rejoue les tensions
utiles sous d'autres cartes et fait monter un seul réglage à la fois pour
trouver où la réponse bascule.

Le parcours : **découvrir → nommer → ordonner → observer → mettre à l'épreuve →
comprendre**. La partie ludique passe devant ; l'introspection vient une fois
que la personne a quelque chose à examiner.

**Ce n'est pas un test, pas un diagnostic, pas un outil de connaissance de soi
déguisé en jeu.** Cette distinction est un choix de produit, pas une clause de
non-responsabilité : elle décide du vocabulaire, du ton et de ce que le moteur
s'autorise à écrire.

**Le public est adulte, tous niveaux de scolarité confondus.** Le jeu doit se
lire sans avoir fait d'études — phrases courtes, mots de tous les jours, pas de
jargon. C'est une contrainte de **lisibilité**, jamais de contenu : les lignes
rouges nomment franchement ce qu'on ne franchit pas, et les situations ont le
droit de coûter cher. La seule limite est le gore et ce qui peut rouvrir un
trauma. Voir « Écrire du contenu ».

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — serveur API. **À lancer par le
  bouton Run / le workflow, pas depuis le shell** : c'est le workflow qui
  injecte `PORT` (le serveur refuse de démarrer sans, sans valeur par défaut) et
  qui enregistre le service auprès du routeur pour que `/api` l'atteigne. Depuis
  le shell il faut `PORT=8080 pnpm --filter @workspace/api-server run start`, et
  ça entre en conflit avec l'instance du workflow si elle tourne déjà.
- `pnpm --filter @workspace/jeu-des-valeurs run dev` — frontend React/Vite
- `pnpm run typecheck` — vérification TypeScript complète
- `pnpm run test` — tests unitaires (vitest) de tous les packages qui en ont
- `pnpm run build` — typecheck + build de tous les packages
- `pnpm --filter @workspace/scripts run verifier-contenu` — **à lancer après toute
  modification du contenu** : valeurs orthographiées pareil partout, identifiants
  uniques, paliers ordonnés, et toute partie qui se termine
- `pnpm --filter @workspace/api-spec run codegen` — régénérer hooks React Query et schémas Zod
- `pnpm --filter @workspace/db run push` — pousser les changements de schéma BD (dev uniquement)
- Required env: `DATABASE_URL` — chaîne de connexion PostgreSQL
- Le build du frontend exige `PORT` et `BASE_PATH`

### Après avoir tiré des changements

```bash
pnpm install            # lie les paquets du workspace
pnpm --filter db push   # applique les changements de schéma
```

⚠️ La refonte « ordonner / mettre à l'épreuve » ajoute des colonnes à
`reponses_collision` (`carte_a`, `carte_b`, `contexte`, `phase`,
`ce_qui_changerait`) et retire la table `arbitrages`. Le `push` est donc
obligatoire, sinon l'API répond `42P01` / colonne inconnue.

Puis **redémarrer le serveur de dev** : Vite garde en cache les résolutions
ratées, donc un paquet ajouté pendant qu'il tourne reste introuvable
(`Failed to resolve import "@workspace/contenu"`) même après l'install.

`scripts/post-merge.sh` fait déjà ces deux commandes, mais il ne se déclenche
que sur le `postMerge` de Replit — pas sur un `git pull` lancé à la main.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite, TailwindCSS, shadcn/ui, wouter
- Typographie: Fraunces (titres) + DM Sans (corps)
- API: Express 5 · BD: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod` · Codegen: Orval depuis l'OpenAPI

## Where things live

- `lib/contenu/` — **tout le matériel du jeu et ses règles, en code** :
  taxonomie, valeurs, cartes, duels, séries de bascule, admissibilité des
  confrontations, modèle de préférences et planificateur de parcours
- `lib/contenu/src/data/` — le jeu de 825 cartes importé, laissé tel quel
- `lib/contenu/src/reecritures.ts` — la relecture des libellés importés, par identifiant
- `lib/contenu/src/categories.ts` — les 70 catégories importées vers les valeurs
- `lib/api-spec/openapi.yaml` — source de vérité de tous les contrats API
- `lib/contenu/src/taxonomie.ts` — grandes familles et familles de valeurs
- `lib/contenu/src/eligibilite.ts` — quelles valeurs et quelles cartes ont le
  droit de se confronter (le garde-fou contre les faux duels)
- `lib/contenu/src/comparaisons.ts` — ce qu'une comparaison enregistre, et la
  couverture des n(n−1)/2 paires
- `lib/contenu/src/preferences.ts` — l'ordination (Bradley-Terry) et son
  incertitude
- `lib/contenu/src/exploration.ts` — quelle tension vaut la peine d'être posée
- `lib/contenu/src/duels-cartes.ts` — les duels entre les cartes de la personne
- `lib/contenu/src/formulation.ts` — les règles d'écriture d'une carte, rendues
  vérifiables
- `lib/contenu/src/lexique.ts` — « je ne trouve pas ce qui me correspond »
- `lib/contenu/src/terminologie.ts` — « prioritaire sur » / « secondaire face à »
- `lib/db/src/schema/` — sessions, cartes-session, réponses (**rien du contenu**)
- `artifacts/api-server/src/lib/constellation-engine.ts` — moteur de résultats
  (le portrait à plusieurs niveaux de lecture)
- `artifacts/jeu-des-valeurs/src/pages/` — home, cartes, valeurs, partie, constellation
- `scripts/src/verifier-contenu.ts` — garde-fou du contenu
- `lib/contenu/tests/`, `artifacts/api-server/tests/` — tests unitaires, **hors
  de `src/`** : les deux tsconfig ont `rootDir: "src"`, et `lib/contenu` est
  `composite` + `emitDeclarationOnly` (un test dans `src/` émettrait un `.d.ts`
  parasite dans `dist`)

## Architecture decisions

- **Le contenu est du code, pas des données.** `lib/contenu` est la source de
  vérité ; la base ne garde que ce qui appartient à la personne. Aucune étape
  d'amorçage : une partie est jouable dès le premier démarrage.
- **La relecture est une couche, pas une réécriture des données.** Les 825
  libellés d'origine restent dans `data/*.json` ; `reecritures.ts` associe un
  nouveau libellé à un identifiant. On peut donc comparer avant/après à tout
  moment, et une carte sans réécriture affiche simplement son libellé d'origine.
- **Trois provenances, jamais confondues.** `maison` : écrite ici, avec
  description et valeurs choisies carte par carte. `relue` : importée puis
  relue pour le registre. `importee` : pas encore relue — aucune carte
  aujourd'hui, mais la valeur reste pour qu'un futur import ne se fasse pas
  passer pour du contenu vérifié.
- **On annote 70 catégories, pas 825 cartes.** Une correspondance carte par
  carte serait impossible à relire et à garder cohérente. Le résultat reste une
  hypothèse que la personne confirme ou jette à l'étape suivante.
- **Chaque partie reçoit une main, pas le catalogue.** 900 cartes ne se
  parcourent pas : `distribuerCartes(graine)` en tire 18 par famille, dont 6
  maison garanties pour ancrer le ton. Stable pour une partie donnée.
- **Ce qui se compare, ce sont des valeurs ; les cartes ne sont que la forme de
  la question.** Une réponse enregistre les deux étages (valeur A, valeur B,
  carte A, carte B, contexte, phase). Sans les valeurs, on ne saurait dire que
  « la carte A a battu la carte B » — ce qui n'apprend rien ; sans les cartes,
  on ne pourrait ni remontrer la question, ni éviter de reposer la même.
- **Le parcours est piloté par les cartes de la personne, complété par les
  situations écrites.** Les duels de cartes portent le gros du travail ; une
  paire de valeurs qui a aussi une situation écrite à la main la reçoit comme
  **autre manifestation** de la même tension. C'est ce qui empêche le jeu de
  retomber sur « Liberté ou Sécurité ? » posé à froid.
- **Un faux duel coûte plus cher qu'une question en moins.** `eligibilite.ts`
  refuse de confronter deux valeurs identiques, quasi synonymes, ou de la même
  famille sans tension déclarée — « perdre mon autonomie » contre « ne pas
  perdre mon autonomie » ne mesure rien et apprend à la personne que le jeu ne
  comprend pas ce qu'elle dit. L'admissibilité ne se réduit **jamais** à « les
  deux libellés sont différents ».
- **Le lexique descend plus bas que Schwartz.** Les quatre grandes familles
  restent le cadre théorique ; ce que la personne voit, ce sont 54 valeurs fines
  (« contrôle de mon temps », « protection des proches », « parole tenue »).
  Deux valeurs voisines restent deux valeurs : le moteur sait qu'elles sont
  proches sans les confondre.
- **Hasard reproductible, pas déterminisme figé.** Chaque partie tire une
  `graine` à sa création (colonne `sessions.graine`) ; tout le tirage de
  situations en découle. Deux parties bâties sur les mêmes cartes ne servent
  donc pas les mêmes duels, alors qu'une partie donnée reste identique à
  elle-même — rafraîchir la page ne rejoue rien. Un `Math.random()` direct
  casserait la seconde propriété, puisque le parcours est recalculé à chaque
  requête de progrès. Aucun LLM nulle part.
- **Une bascule ne fait bouger qu'une chose.** Les deux options d'une série sont
  définies au niveau de la série, jamais du palier : seule la situation change.
  C'est ce qui rend le point de bascule interprétable.
- **Un changement de réponse n'est jamais une contradiction.** La stabilité se
  mesure uniquement sur les duels (variantes d'une même tension). Un basculement
  à l'intérieur d'une série est le résultat recherché, pas une incohérence.
- **La première passe ne demande rien d'autre que le choix.** Ni difficulté, ni
  certitude, ni « qu'est-ce que tu protégeais ? ». Ces questions existent, mais
  elles arrivent **après** le premier portrait, en phase de mise à l'épreuve.
  Posées d'entrée, elles transforment un jeu en questionnaire et personne ne se
  rend au bout.
- **La mise à l'épreuve ne démarre jamais toute seule.** C'est un bouton, sur le
  portrait. Le jeu ne pousse personne dans l'introspection avant qu'elle ait vu
  de quoi il parle.
- **L'ordination n'est pas un compte de victoires.** `preferences.ts` ajuste un
  modèle de comparaison par paires (Bradley-Terry, montée MM) : gagner contre
  une valeur forte ne vaut pas gagner contre une valeur faible. Un a priori
  d'une demi-victoire virtuelle garde finie la force d'une valeur jamais
  battue — « n'a jamais cédé » n'est pas « force infinie ». Les cycles A > B,
  B > C, C > A sont **signalés**, jamais corrigés en douce : ils veulent dire
  que la situation décide.
- **L'incertitude est calculée, pas décorative.** Chaque valeur sort avec une
  erreur type (information de Fisher) et un niveau de confiance : tendance
  forte, tendance probable, encore incertain, territoire peu exploré.
- **La répétabilité se mesure sans la demander.** Jamais de « referais-tu le
  même choix ? » : on rejoue la même tension plus tard, avec d'autres cartes ou
  un autre contexte. Même ordre ⇒ tendance plus stable. Ordre différent ⇒ on
  cherche ce qui a changé dans la situation, et **jamais** on ne présente ça
  comme une contradiction.
- **Une seule terminologie, symétrique.** « A été prioritaire sur » / « a été
  secondaire face à » (`terminologie.ts`). « Passé devant » et « cédé devant »
  ne pèsent pas pareil à la lecture : le premier sonne comme une victoire, le
  second comme un renoncement.
- **Le moteur ne déduit jamais l'intention.** `valeurProtegee` n'existe que si la
  personne l'a nommée elle-même. Rien dans les résultats ne dérive une
  caractéristique sensible, et aucune formulation ne prétend prédire un
  comportement réel.
- **Chaque observation transporte ses sources** (`reponsesSources`), et
  l'interface les rouvre telles quelles sous « D'où ça sort ? ».
- Corrections de réponses versionnées (`version` incrémenté à chaque PATCH).
- Supprimer une session supprime **aussi** ses cartes et ses réponses, dans une
  transaction : il n'y a pas de clé étrangère pour le faire à notre place.
  **Toute nouvelle table par session est à ajouter là.**

## Le parcours

1. **Accueil** — présente le jeu et ses règles, reprend une partie existante
2. **Découvrir** (`selection_cartes`) — 3 familles (🛑 lignes rouges,
   🌅 horizons, 💎 trésors). Une main de 54 cartes tirée parmi 900, plus la
   carte libre. « Je ne trouve pas ce qui me correspond » élargit la main
   (jusqu'à 54 par famille), ouvre tout le catalogue, ou laisse écrire sa carte.
   Minimum 3 cartes.
3. **Nommer** (`confirmation_valeurs`) — la personne confirme ce que chaque
   carte protège. **Rien n'est coché d'avance** : une suggestion du jeu n'est
   pas une réponse. Le lexique complet est accessible (recherche par thème,
   valeurs voisines, familles). Un texte libre déclenche des **propositions** de
   valeurs, avec le mot qui les a fait remonter ; « aucune : garde mes mots »
   est une réponse complète. Minimum 2 valeurs distinctes sur 2 cartes.
4. **Ordonner** (`ordination`) — jusqu'à 12 duels courts, choisis pour couvrir
   le plus de paires de valeurs possible. Réponses : A / B / Ça dépend / Je ne
   sais pas / Passer. **Aucune question de relance.** « Ça dépend » demande de
   quoi — c'est ce qui choisira les séries de bascule plus tard.
5. **Observer** (`constellation`) — l'ordination avec son incertitude, les
   valeurs fortes, contextuelles et encore protégées, les tensions principales,
   les points de bascule, et le niveau de confiance de la lecture.
6. **Mettre à l'épreuve** (`epreuve`) — sur demande. Le moteur d'exploration
   choisit les tensions utiles : réponses variables, valeurs au coude à coude,
   « ça dépend » fréquents, paires jamais confrontées, valeurs jamais
   secondaires. La même tension revient sous **d'autres cartes** — jamais la
   même question. C'est ici, et seulement ici, que le jeu demande la difficulté,
   ce que la personne protégeait, et ce qui aurait pu changer sa réponse. Les
   séries de bascule (3 paliers, un seul réglage qui monte) ferment la marche.
7. **Comprendre** — retour au portrait, précisé. Rien n'y est présenté comme
   définitif.

## Relire une carte importée

494 des 825 cartes ont été réécrites ; 331 passaient déjà. Ce que la relecture
cherche :

- des mots de tous les jours, sans jargon moral ;
- court — la carte se lit d'un coup d'œil (le plus long libellé est passé de
  146 à 84 caractères, la moyenne de 61 à 50) ;
- **la même tension** qu'à l'origine, sinon la catégorie et donc les valeurs
  suggérées deviennent fausses.

Ce qu'elle ne fait pas : adoucir. « Faire souffrir un animal pour m'amuser »
reste dur à lire, et doit le rester — une carte tiède ne fait rien découvrir.

⚠️ **Cette passe a été faite sous une consigne erronée.** « Registre 12-14 ans »
visait la lisibilité et a été appliquée comme si le public était des enfants :
des cartes ont perdu leur objet en perdant ce qu'un adulte possède réellement.
`T077` avait transformé « Mon expérience professionnelle » en « Tout ce que
j'ai appris en le faisant » — ce n'est plus la même chose : on peut perdre un
emploi, pas ce qu'on a appris. Les cartes de travail et d'argent (`T054`,
`T077`, `T080`) ont été reprises ; **les 494 réécritures n'ont pas été
réauditées** sous la bonne consigne. Les libellés d'origine sont intacts dans
`data/*.json`, donc rien n'est perdu.

`verifier-contenu` signale les libellés qui gardent du **jargon** (liste dans
`motsJargon` — abstractions comme « instrumentaliser », pas sujets d'adultes),
ceux qui dépassent 100 caractères, et les réécritures qui pointent un
identifiant inexistant.

## Écrire du contenu

Les règles sont en tête de `duels.ts`, `bascules.ts` et `formulation.ts` — les
dernières sont **vérifiables** : `analyserFormulation()` les applique, et
`verifier-contenu` échoue sur les règles fermes. En résumé :

- pas de prudence inutile : « je crois que je ne voudrais jamais… » dit la même
  chose que « je ne veux pas », en trois mots de plus et sans tranchant ;
- pas de double négation — « ne pas refuser d'aider » oblige à relire deux fois.
  « Ne rien voir » ou « sans jamais donner » n'en sont pas : le renfort ne fait
  que soutenir le « ne », et c'est du français ordinaire ;
- une carte, une idée. « Même si », « sauf si », « tout en » empilent deux
  valeurs dans une phrase ;
- une carte se dit au « je », un scénario écrit peut s'adresser au « tu » — mais
  **jamais les deux dans le même duel**. « Serais-tu prêt à mentir à quelqu'un
  qui me fait confiance ? » ne dit plus qui parle.

Et pour les situations écrites :

- une situation se passe quelque part de précis, en une ou deux phrases ;
- `optionA` protège `valeurA`, `optionB` protège `valeurB` — jamais les deux,
  jamais ni l'une ni l'autre ;
- les deux options coûtent quelque chose : pas de bonne réponse ;
- une seule chose change entre les deux options (pas de coût caché d'un côté) ;
- **la situation a le droit de coûter cher** — un renvoi, une plainte, un couple
  qui casse. C'est là que deux valeurs se départagent vraiment ;
- les identifiants sont stables — ne jamais réutiliser un identifiant retiré.

### Pour qui, et la seule limite

Des **adultes, quel que soit leur niveau de scolarité**. C'est une contrainte de
lisibilité — phrases courtes, mots de tous les jours, pas de jargon — et **pas**
une contrainte de contenu. Le vocabulaire de la vie adulte (travail, loyer,
conjoint, police, dettes) est à sa place.

Une ligne rouge doit être une ligne qu'on ne franchit pas : voler, frapper,
trahir, dénoncer, mentir sous serment. Nommées franchement, sinon la famille
entière ne mesure rien — personne n'hésite devant une ligne qu'il n'a jamais eu
envie de franchir.

La seule limite est le **gore et ce qui peut rouvrir un trauma** : on nomme un
acte, on ne décrit pas une scène. « Frapper quelqu'un qui ne peut pas se
défendre » est une carte ; raconter les coups n'en est pas une. La retenue porte
sur le niveau de détail, jamais sur la gravité du sujet.

## Pas encore fait

- **« Affiner ma constellation » et « mettre à l'épreuve » sont la même phase.**
  Les paires jamais confrontées font partie de la file d'exploration (motif
  `paire_jamais_vue`), mais elles n'y passent pas devant les tensions
  intéressantes. Un mode « couverture d'abord » demanderait un paramètre de plus
  sur `/progres` — et `getProgres` porte déjà un paramètre de chemin, ce qui fait
  entrer en collision les deux `GetProgresParams` générés par orval (voir
  `lib/api-zod/src/index.ts`).
- **35 valeurs fines n'ont aucune situation écrite** : elles ne sont jouables
  que par les duels entre cartes. `verifier-contenu` l'affiche à chaque passage.
- **Les 30 dilemmes importés** (`data/dilemmas.json`) ont servi de squelettes
  aux duels 201-230 ; le fichier reste comme trace, il n'est pas lu à
  l'exécution.
- **Comparaison entre deux profils**, avec consentement.
- Reprise fine à l'intérieur d'une série après fermeture de l'onglet (on reprend
  au palier suivant, ce qui est correct, mais l'étape affichée reste large).

## Gotchas

- Ne pas utiliser `type: integer` dans l'OpenAPI — génère `zod.int()`
  incompatible avec zod 3.x. Utiliser `type: number`.
- Un `required:` qui nomme une propriété inexistante (faute de frappe) la rend
  **optionnelle** dans le type généré, sans erreur. Vérifier le diff généré.
- Le `@import url(...)` Google Fonts doit être la **première ligne** de
  `index.css`, avant `@import 'tailwindcss'`.
- Les types générés sont exportés depuis `@workspace/api-client-react` — ne pas
  importer depuis `/src/generated/api.schemas`.
- Après chaque changement de spec OpenAPI : `pnpm --filter @workspace/api-spec run codegen`.
- `artifacts/mockup-sandbox` échoue au build sans `PORT` : c'est indépendant du jeu.
- Les identifiants de carte sont **textuels** (`JV1001`, `LR042`) et ceux des
  situations **numériques**. Les deux espaces sont séparés ; ne pas les mélanger.
- `constellation-engine.ts` : `VERSION_CALCUL = 4`. Incrémenter à chaque
  changement d'algorithme.
- Les duels de cartes sont bâtis sur l'identifiant de **carte de session**
  (`cartes_session.id`, converti en texte), jamais sur celui du catalogue
  (`JV1001`). Les deux sont textuels : les mélanger ferait pointer un duel sur
  une carte que la personne n'a jamais prise, sans erreur visible.
- Les identifiants de duel de cartes commencent à 1 000 000 000
  (`BASE_ID_DUEL_CARTE`) pour ne jamais croiser ceux des situations écrites.
- `paireAdmissible` est **mémoïsée** : le parcours interroge les n(n−1)/2 paires
  à chaque requête de progrès. Sans le cache, une partie à 54 valeurs passait de
  20 ms à 100 ms par question.
- Une opération OpenAPI qui a **à la fois** des paramètres de chemin et de
  requête fait générer deux `<OperationId>Params` par orval (le schéma zod et le
  type TypeScript). Les deux `export *` de `lib/api-zod/src/index.ts` deviennent
  ambigus : il faut réexporter explicitement celui qu'on garde.
- La table `arbitrages` n'existe plus dans le schéma. Sur une base déjà poussée,
  `pnpm --filter db push` proposera de la supprimer : c'est voulu, la phase
  « compte le plus / le moins » a été retirée.
- Après avoir ajouté une dépendance : **commiter le `pnpm-lock.yaml` mis à
  jour**. `.replit` met `CI=true` dans `deployment.postBuild`, donc pnpm passe
  en `--frozen-lockfile` — un lockfile en retard fait échouer le déploiement,
  pas seulement les tests.
- Les tests importent explicitement (`import { describe } from "vitest"`) :
  `tsconfig.base.json` a `types: []`, les globals ne sont pas chargés.
- Une erreur de base de données remonte en JSON via le gestionnaire de
  `app.ts` — Drizzle enveloppe l'erreur PostgreSQL, donc il faut lire
  `err.cause` (le code `42P01` signale un schéma non poussé), jamais
  `err.message` seul.
- Toute mutation dont dépend la suite du jeu doit brancher `onError` sur
  `useSignalerErreur()` : sans ça, un serveur en échec donne un bouton qui ne
  fait rien, sans aucune trace à l'écran.
- **Un champ d'API récent se lit comme s'il pouvait manquer.** Le frontend est
  un paquet statique et l'API un service à part : les deux ne se déploient pas
  au même instant, et un serveur d'une version antérieure répond sans le champ.
  Le contrat OpenAPI a beau le déclarer obligatoire, le type généré ment alors
  sur la réalité, et `champ.filter(...)` fait tomber tout l'écran. Écrire
  `(champ ?? [])` tant que la version qui l'introduit n'est pas déployée
  partout — la section disparaît, le reste s'affiche.
- Après un `git pull`, **redémarrer le serveur API** : il tourne depuis
  `dist/index.mjs`, donc du code tiré mais pas rebâti continue de répondre
  l'ancien contrat.
