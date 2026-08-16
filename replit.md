# Le jeu des valeurs

Un jeu Web en français canadien. Il explore **le prix qu'on est prêt à payer
pour ce qui compte**. La personne prend des cartes concrètes — ses **limites**
(ce qu'elle refuse de faire), ses **aspirations** (ce qu'elle veut atteindre),
ses **essentiels** (ce qu'elle veut préserver) — et le jeu met une limite en
face d'un enjeu :

> « Serais-tu prêt à franchir cette limite pour obtenir ou préserver cet
> enjeu ? »

Les valeurs restent dessous : chaque carte en porte une ou plusieurs, et le
classement **émerge** des arbitrages plutôt que d'être demandé. À la fin, une
carte de ce qui est passé devant quoi, jusqu'où chaque limite tient — et rien
de plus.

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

- `lib/contenu/` — **tout le matériel du jeu, en code** : lexique des valeurs,
  cartes, règles d'éligibilité, générateur de collisions, modèle de préférence
  et planificateur de parcours
- `lib/contenu/src/lexique.ts` — les trois couches : valeur fine → famille → domaine
- `lib/contenu/src/eligibilite.ts` — la distance entre deux valeurs, et ce qu'on refuse d'opposer
- `lib/contenu/src/collisions.ts` — la génération des questions limite × enjeu
- `lib/contenu/src/ordination.ts` — Bradley–Terry, tensions et points de bascule
- `lib/contenu/src/exploration.ts` — où creuser pendant la deuxième passe
- `lib/contenu/src/data/` — le jeu de 825 cartes importé, laissé tel quel
- `lib/contenu/src/reecritures.ts` — la relecture des libellés importés, par identifiant
- `lib/contenu/src/categories.ts` — les 70 catégories importées vers les valeurs
- `lib/api-spec/openapi.yaml` — source de vérité de tous les contrats API
- `lib/contenu/src/arbitrages.ts` — blocs de comparaison entre cartes et scores
- `lib/db/src/schema/` — sessions, cartes-session, réponses, arbitrages
  (**rien du contenu**)
- `artifacts/api-server/src/lib/constellation-engine.ts` — moteur de résultats
- `artifacts/jeu-des-valeurs/src/pages/` — home, cartes, valeurs, partie, constellation
- `artifacts/jeu-des-valeurs/src/components/bloc-arbitrage.tsx` — l'écran des
  arbitrages, servi depuis `partie.tsx` selon la phase
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
- **Le parcours est piloté par le contenu, pas par les paires de valeurs.** On ne
  pose que des collisions entre **ses** cartes. C'est ce qui empêche le jeu de
  retomber sur « Liberté ou Sécurité ? » posé à froid : la question est toujours
  un acte concret mis en face d'un enjeu concret.
- **Hasard reproductible, pas déterminisme figé.** Chaque partie tire une
  `graine` à sa création (colonne `sessions.graine`) ; tout le tirage de
  situations en découle. Deux parties bâties sur les mêmes cartes ne servent
  donc pas les mêmes duels, alors qu'une partie donnée reste identique à
  elle-même — rafraîchir la page ne rejoue rien. Un `Math.random()` direct
  casserait la seconde propriété, puisque le parcours est recalculé à chaque
  requête de progrès. Aucun LLM nulle part.
- **Le mécanisme est asymétrique.** Limite contre enjeu, jamais limite contre
  limite ni aspiration contre aspiration. Remplir une matrice statistique en
  opposant n'importe quelles cartes ferait un tournoi, pas ce jeu-ci.
- **Jamais de collision circulaire.** Si la limite protège l'autonomie et que
  l'enjeu porte l'autonomie, la question devient « sacrifierais-tu ton autonomie
  pour préserver ton autonomie ? ». Deux cartes lexicalement très différentes
  peuvent protéger la même chose : c'est la distance entre les valeurs
  sous-jacentes qui décide, pas les libellés. Voir `eligibilite.ts`.
- **Le classement émerge, on ne le demande pas.** Bradley–Terry sur les
  collisions jouées : battre une valeur qui gagne souvent pèse plus que battre
  une valeur qui perd partout. Un compte de victoires mettrait à égalité deux
  valeurs dont l'une n'a affronté que des faibles.
- **Un cycle n'est pas une erreur.** A > B, B > C, C > A est humain. Les trois
  forces sortent voisines, et c'est un excellent endroit où creuser ensuite.
- **Un changement de réponse n'est jamais une contradiction.** Une limite
  franchie ici et tenue là dit que le contexte a changé la priorité. C'est
  l'information la plus intéressante du jeu. La stabilité se mesure en revoyant
  un même couple de valeurs sous d'autres cartes — jamais en demandant à la
  personne si elle se trouve cohérente.
- **La première passe reste légère.** La question, quatre réponses, rien
  d'autre. Difficulté, certitude et « qu'est-ce que tu protégeais » cassent le
  rythme quand elles suivent chaque collision : elles n'arrivent qu'à
  l'approfondissement, une fois que la personne a déjà un portrait à elle.
- **Les arbitrages passent avant les collisions.** On compare les cartes de la
  personne à froid, puis les situations les mettent à l'épreuve. L'inverse
  mesurerait ce que les duels viennent de mettre en tête, et l'écart entre le
  dit et le joué — l'observation que cette phase existe pour rendre possible —
  ne voudrait plus rien dire.
- **Deux extrêmes plutôt qu'un classement.** Ordonner quatre cartes est une
  corvée et le milieu du classement ne dit rien. Le plus / le moins se
  choisissent d'un coup d'œil, et des blocs qui se recoupent suffisent à situer
  chaque carte.
- **Une valeur déclarée est une hypothèse, pas une mesure.** `valeursDeclarees`
  fait hériter une valeur du score moyen des cartes qui la portent. C'est
  grossier, et assumé : ça ne sert qu'à repérer un écart franc avec ce qui s'est
  joué, jamais à annoncer un classement de valeurs.
- **Le moteur ne déduit jamais l'intention.** `valeurProtegee` n'existe que si la
  personne l'a nommée elle-même. Rien dans les résultats ne dérive une
  caractéristique sensible, et aucune formulation ne prétend prédire un
  comportement réel.
- **Chaque observation transporte ses sources** (`reponsesSources`), et
  l'interface les rouvre telles quelles sous « D'où ça sort ? ».
  `arbitragesSources` est une liste **séparée** : les deux tables ont des
  identifiants qui se recouvrent, donc les fondre afficherait un bloc à la place
  d'une situation.
- Corrections de réponses versionnées (`version` incrémenté à chaque PATCH).
- Supprimer une session supprime **aussi** ses cartes, ses réponses et ses
  arbitrages, dans une transaction : il n'y a pas de clé étrangère pour le faire
  à notre place. **Toute nouvelle table par session est à ajouter là.**

## Le parcours

1. **Accueil** — présente le jeu et ses règles, reprend une partie existante
2. **Cartes** — 3 familles (🛑 lignes rouges, 🌅 horizons, 💎 trésors). Une main
   de 54 cartes tirée parmi 900, plus la carte libre. Minimum 3 cartes.
3. **Tes mots** — la personne confirme les raisons derrière chaque carte. **Rien
   n'est coché d'avance** : une suggestion du jeu n'est pas une réponse. Minimum
   2 raisons distinctes.
4. **Tes cartes entre elles** — jusqu'à 6 blocs de 4 cartes : laquelle compte le
   plus, laquelle le moins. Hors situation, avant les collisions. Minimum 3 cartes.
5. **Collisions** — « Serais-tu prêt à _[limite]_ pour _[enjeu]_ ? ». Réponses :
   Oui / Non / Ça dépend / Je ne sais pas / Passer, et rien d'autre. La première
   vague sert un exemplaire de chaque couple de valeurs, plafonnée à 24 pour que
   le portrait arrive vite — le nombre de couples croît en n(n−1)/2, et au-delà
   d'une vingtaine on répond à une série plutôt qu'à des questions.
6. **Ton premier portrait** — l'ordination obtenue, montrée telle quelle. C'est
   une porte, pas une fin : « mettre à l'épreuve » ouvre la deuxième passe, et
   la personne teste alors sa propre constellation au lieu de répondre à une
   interminable série de questions.
7. **À l'épreuve** — le moteur choisit les collisions les plus informatives :
   deux valeurs à égalité, un couple qui a déjà changé de réponse, un « ça
   dépend » qui revient, une limite qui n'a jamais cédé, une limite qui a cédé
   devant un enjeu plus léger. C'est ici qu'on demande la difficulté et la
   certitude. Aucun plafond : tout ce qui est admissible finit par se jouer.
8. **Ta carte** — l'ordination, les limites qui n'ont pas plié, les points de
   bascule (jusqu'où une limite tient, à partir de quel enjeu elle cède), les
   tensions ouvertes, et ce que tout ça ne dit pas.

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

Les situations ne s'écrivent plus à la main : elles se fabriquent à partir des
cartes de la personne (`collisions.ts`). Ce qui s'écrit, ce sont les **cartes**
et le **lexique**. Les règles sont en tête de `cartes.ts` et `lexique.ts`. En
résumé :

- une carte nomme un acte, un projet ou un bien concret — pas une valeur ;
- une limite doit être une limite : un geste qu'on refuse, nommé franchement ;
- une aspiration s'obtient, un essentiel se garde — la nuance change le verbe
  de la question qui sera fabriquée ;
- **une carte a le droit de coûter cher** — un renvoi, une plainte, un couple
  qui casse. C'est là que deux valeurs se départagent vraiment ;
- une valeur fine dit ce qu'elle fait _faire_, à la deuxième personne ;
- deux valeurs qu'on ne voudrait jamais voir opposées se déclarent `voisines` ;
  deux valeurs d'une même famille ne se rencontrent que si une `tension` est
  déclarée entre elles ;
- les identifiants de carte sont stables — ne jamais réutiliser un identifiant
  retiré.

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

- **« D'où ça sort ? » ne rouvre pas les blocs d'arbitrage.** Les identifiants
  voyagent déjà (`arbitragesSources`) et sont stockés ; c'est l'écran de
  constellation qui n'affiche encore que les situations.
- **Les 30 dilemmes importés** (`data/dilemmas.json`) et les anciens duels
  écrits à la main (`duels.ts`, `bascules.ts`) ne sont plus lus à l'exécution :
  le parcours ne sert que des collisions. Les fichiers restent comme trace, à
  supprimer quand on aura confirmé qu'on n'y revient pas.
- **Le lexique est à étoffer.** 78 valeurs fines sous 19 familles ; il en
  faudrait plus, et surtout des `voisines` déclarées entre familles — c'est la
  seule chose qui empêche « perdre ma liberté de décision pour préserver mon
  indépendance ».
- **Les cartes du catalogue ne portent que des familles**, pas de valeurs fines.
  Le moteur travaille alors à la maille famille, ce qui marche mais dit moins.
  L'écran « Tes mots » devrait proposer les valeurs fines de la famille suggérée.
- **« Je ne trouve pas ce qui me correspond »** — l'échappatoire à la sélection
  de cartes, avec réponse libre et association confirmée par la personne.
- **Comparaison entre deux profils**, avec consentement.

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
- `constellation-engine.ts` : `VERSION_CALCUL = 3`. Incrémenter à chaque
  changement d'algorithme.
- Les blocs d'arbitrage sont bâtis sur l'identifiant de **carte de session**
  (`cartes_session.id`, converti en texte), jamais sur celui du catalogue
  (`JV1001`). Les deux sont textuels : les mélanger ferait pointer un bloc sur
  une carte que la personne n'a jamais prise, sans erreur visible.
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
