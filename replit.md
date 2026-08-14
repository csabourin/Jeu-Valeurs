# Jeu des valeurs

Une aventure introspective interactive en français canadien qui aide les gens à explorer leurs priorités et les circonstances qui changent leurs choix. Jamais un test clinique — un carnet de voyage intérieur.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — serveur API (port géré par le workflow)
- `pnpm --filter @workspace/jeu-des-valeurs run dev` — frontend React/Vite
- `pnpm run typecheck` — vérification TypeScript complète
- `pnpm test` — tests déterministes du moteur
- `pnpm run build` — typecheck + build de tous les packages
- `pnpm --filter @workspace/api-spec run codegen` — régénérer les hooks React Query et les schémas Zod depuis l'OpenAPI
- `pnpm --filter @workspace/db run push` — pousser les changements de schéma BD (dev uniquement)
- Required env: `DATABASE_URL` — chaîne de connexion PostgreSQL

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite, TailwindCSS, shadcn/ui, Framer Motion, wouter
- Typographie: Fraunces (titres) + DM Sans (corps)
- API: Express 5
- BD: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (depuis spec OpenAPI)
- Build: esbuild (bundle CJS)

## Where things live

- `lib/api-spec/openapi.yaml` — source de vérité de tous les contrats API
- `lib/db/src/schema/` — schémas Drizzle (sessions, catalogue, cartes-session, reponses)
- `artifacts/api-server/src/routes/` — routes Express (catalogue, sessions, cartes-session, reponses, constellation)
- `artifacts/api-server/src/lib/constellation-engine.ts` — moteur de calcul déterministe V2
- `lib/db/src/data/` — catalogue canonique du handoff (825 cartes, 30 dilemmes)
- `artifacts/jeu-des-valeurs/src/pages/` — pages React (home, cartes, valeurs, collisions, constellation)
- `artifacts/jeu-des-valeurs/src/components/` — composants UI (shell, cartes, etc.)

## Architecture decisions

- **Moteur déterministe** : aucun LLM. Toutes les tendances sont calculables depuis les réponses brutes stockées.
- **Schémas entity-shaped** dans l'OpenAPI (pas operation-shaped) pour éviter les collisions TS2308 avec Orval.
- `type: number` utilisé partout dans l'OpenAPI (pas `integer`) — Orval génère `zod.int()` pour `integer`, incompatible avec zod 3.x.
- Sessions identifiées par UUID, stockées en PostgreSQL + sauvegardées dans localStorage côté client.
- Corrections de réponses versionnées (champ `version` incrémenté à chaque PATCH) sans écrasement silencieux.
- Les formulations dans la constellation utilisent "Dans les situations explorées jusqu'ici…" — jamais de conclusions absolues.

## Product

Le parcours complet V1 :
1. **Accueil** — présente le jeu et ses limites éthiques, reprend une session existante
2. **Sélection de cartes** — 3 familles : Mes lignes rouges 🛑, Mes horizons 🌅, Mes trésors 💎. Cartes du catalogue ou personnalisées.
3. **Confirmation des valeurs** — chips éditables pour confirmer/modifier/ajouter les valeurs suggérées
4. **Collisions** — dilemmes un par un entre deux valeurs (A / B / Ça dépend / Je ne sais pas / Passer). Si "Ça dépend" → facteur dominant. Sauf "Passer" → difficulté + certitude.
5. **Constellation** — résultat nuancé avec tendances, tensions, territoires inexplorés, observations avec "Pourquoi?" explicable

## User preferences

_Contenu en français canadien partout. Interface chaleureuse, ludique, sobre — jamais clinique._

## Gotchas

- Ne pas utiliser `type: integer` dans l'OpenAPI — génère `zod.int()` incompatible avec zod 3.x. Utiliser `type: number`.
- Le `@import url(...)` Google Fonts doit être la **première ligne** de `index.css`, avant `@import 'tailwindcss'`.
- Les types générés (`CarteCatalogueFamille`, `SessionEtapeCourante`, etc.) sont exportés depuis `@workspace/api-client-react` directement — ne pas importer depuis `/src/generated/api.schemas`.
- Après chaque changement de spec OpenAPI : `pnpm --filter @workspace/api-spec run codegen`.

## Pointers

- Voir le skill `pnpm-workspace` pour la structure du workspace, TypeScript et les détails des packages
- `constellation-engine.ts` : moteur V2, VERSION_CALCUL = 2. Incrémenter à chaque changement d'algorithme.
