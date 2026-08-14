# Le jeu des valeurs

Un jeu Web en français canadien. La personne prend des cartes concrètes (lignes
rouges, horizons, trésors), le jeu les met en duel dans des situations
ordinaires, puis fait monter un seul réglage à la fois pour trouver où sa
réponse bascule. À la fin, une carte de ce qui est passé devant quoi — et rien
de plus.

**Ce n'est pas un test, pas un diagnostic, pas un outil de connaissance de soi
déguisé en jeu.** Cette distinction est un choix de produit, pas une clause de
non-responsabilité : elle décide du vocabulaire, du ton et de ce que le moteur
s'autorise à écrire.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — serveur API (port géré par le workflow)
- `pnpm --filter @workspace/jeu-des-valeurs run dev` — frontend React/Vite
- `pnpm run typecheck` — vérification TypeScript complète
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

### Si `db push` pose des questions

Sur une base qui vient de la branche `codex/spec-v1-alignment`, drizzle-kit
trouve six colonnes disparues (`texte_dilemme`, `contexte`, `pivot_dimension`,
`supersedes_response_id`, `invalidated_at`, `invalidation_reason`) et quatre
colonnes nouvelles, et demande pour chacune s'il s'agit d'un renommage.

Le plus sûr — et le seul qui ne demande aucune touche, donc utilisable depuis un
téléphone — est de retirer les colonnes obsolètes d'abord :

```sql
alter table reponses_collision
  drop column if exists texte_dilemme,
  drop column if exists contexte,
  drop column if exists pivot_dimension,
  drop column if exists supersedes_response_id,
  drop column if exists invalidated_at,
  drop column if exists invalidation_reason;
```

Puis `pnpm --filter db push` s'exécute sans poser une seule question.

Autrement, `pnpm --filter db push-force` demande les quatre renommages (répondre
Entrée à chaque fois : « create column » est l'option surlignée, et c'est la
bonne — ces colonnes sont nouvelles) et saute la confirmation de suppression.
Attention avec `push` tout court : sa dernière invite propose « No, abort » par
défaut, donc Entrée y annule tout.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite, TailwindCSS, shadcn/ui, wouter
- Typographie: Fraunces (titres) + DM Sans (corps)
- API: Express 5 · BD: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod` · Codegen: Orval depuis l'OpenAPI

## Where things live

- `lib/contenu/` — **tout le matériel du jeu, en code** : valeurs, cartes, duels,
  séries de bascule, et le planificateur de parcours
- `lib/contenu/src/data/` — le jeu de 825 cartes importé, laissé tel quel
- `lib/contenu/src/reecritures.ts` — la relecture 12-14 ans, par identifiant
- `lib/contenu/src/categories.ts` — les 70 catégories importées vers les valeurs
- `lib/api-spec/openapi.yaml` — source de vérité de tous les contrats API
- `lib/db/src/schema/` — sessions, cartes-session, réponses (**rien du contenu**)
- `artifacts/api-server/src/lib/constellation-engine.ts` — moteur de résultats
- `artifacts/jeu-des-valeurs/src/pages/` — home, cartes, valeurs, partie, constellation
- `scripts/src/verifier-contenu.ts` — garde-fou du contenu

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
- **Chaque partie reçoit une main, pas le catalogue.** 885 cartes ne se
  parcourent pas : `distribuerCartes(graine)` en tire 18 par famille, dont 6
  maison garanties pour ancrer le ton. Stable pour une partie donnée.
- **Le parcours est piloté par le contenu, pas par les paires de valeurs.** On ne
  pose que des situations écrites à la main. C'est ce qui empêche le jeu de
  retomber sur « Liberté ou Sécurité ? » posé à froid. Une paire sans situation
  écrite n'est simplement jamais posée.
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
- **Le moteur ne déduit jamais l'intention.** `valeurProtegee` n'existe que si la
  personne l'a nommée elle-même. Rien dans les résultats ne dérive une
  caractéristique sensible, et aucune formulation ne prétend prédire un
  comportement réel.
- **Chaque observation transporte ses sources** (`reponsesSources`), et
  l'interface les rouvre telles quelles sous « D'où ça sort ? ».
- Corrections de réponses versionnées (`version` incrémenté à chaque PATCH).
- Supprimer une session supprime **aussi** ses cartes et ses réponses, dans une
  transaction : il n'y a pas de clé étrangère pour le faire à notre place.

## Le parcours

1. **Accueil** — présente le jeu et ses règles, reprend une partie existante
2. **Cartes** — 3 familles (🛑 lignes rouges, 🌅 horizons, 💎 trésors). Une main
   de 54 cartes tirée parmi 885, plus la carte libre. Minimum 3 cartes.
3. **Tes mots** — la personne confirme les raisons derrière chaque carte. **Rien
   n'est coché d'avance** : une suggestion du jeu n'est pas une réponse. Minimum
   2 raisons distinctes.
4. **Duels** — jusqu'à 12 situations, tirées par la graine parmi toutes celles
   que tes cartes rendent possibles. Réponses : A / B / Ça dépend / Je ne sais
   pas / Passer. Les variantes rejouent une même tension autrement, en fin de
   phase. « Ça dépend » demande de quoi.
5. **Bascules** — jusqu'à 3 séries de 3 paliers, servies pour les tensions déjà
   tranchées franchement. La série s'arrête dès que la réponse change : le point
   de bascule est trouvé. Pas de « ça dépend » ici — c'est le jeu qui tient le
   réglage.
6. **Ta carte** — ce qui n'a pas plié, les points de bascule, les tensions
   ouvertes, le détail chiffré, et ce que tout ça ne dit pas.

## Relire une carte importée

494 des 825 cartes ont été réécrites ; 331 passaient déjà. Ce que la relecture
cherche :

- des mots de tous les jours, sans jargon moral ;
- court — la carte se lit d'un coup d'œil (le plus long libellé est passé de
  146 à 84 caractères, la moyenne de 61 à 50) ;
- **la même tension** qu'à l'origine, sinon la catégorie et donc les valeurs
  suggérées deviennent fausses ;
- ce qu'une personne de 12-14 ans possède vraiment. Un trésor n'est pas une
  carrière : « Mon expérience professionnelle » est devenu « Tout ce que j'ai
  appris en le faisant ».

Ce qu'elle ne fait pas : adoucir. « Faire souffrir un animal pour m'amuser »
reste dur à lire, et doit le rester — une carte tiède ne fait rien découvrir.

`verifier-contenu` signale les libellés qui gardent du vocabulaire adulte
(liste dans `motsTropAdultes`), ceux qui dépassent 100 caractères, et les
réécritures qui pointent un identifiant inexistant.

## Écrire du contenu

Les règles sont en tête de `duels.ts` et `bascules.ts`. En résumé :

- une situation se passe quelque part de précis, en une ou deux phrases ;
- `optionA` protège `valeurA`, `optionB` protège `valeurB` — jamais les deux,
  jamais ni l'une ni l'autre ;
- les deux options coûtent quelque chose : pas de bonne réponse ;
- une seule chose change entre les deux options (pas de coût caché d'un côté) ;
- rien de traumatisant, sexuel, violent ou criminellement grave quand une
  situation ordinaire teste la même tension ;
- vocabulaire lisible vers 12-14 ans, sans être enfantin ni paternaliste ;
- les identifiants sont stables — ne jamais réutiliser un identifiant retiré.

## Pas encore fait

- **Comparaisons par paires / Best-Worst Scaling** entre les cartes de la
  personne (le brief le prévoit ; le parcours n'a que duels et bascules).
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
- `constellation-engine.ts` : `VERSION_CALCUL = 2`. Incrémenter à chaque
  changement d'algorithme.
- Une erreur de base de données remonte en JSON via le gestionnaire de
  `app.ts` — Drizzle enveloppe l'erreur PostgreSQL, donc il faut lire
  `err.cause` (le code `42P01` signale un schéma non poussé), jamais
  `err.message` seul.
- Toute mutation dont dépend la suite du jeu doit brancher `onError` sur
  `useSignalerErreur()` : sans ça, un serveur en échec donne un bouton qui ne
  fait rien, sans aucune trace à l'écran.
