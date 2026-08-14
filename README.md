# Jeu des valeurs

Application Web francophone d’exploration introspective des valeurs personnelles. Elle observe des arbitrages entre choses importantes et les circonstances qui peuvent les faire varier; elle ne produit ni diagnostic, ni jugement moral, ni classement définitif.

Le projet implémente le paquet de conception **Jeu des valeurs — V1** fourni dans le handoff :

- 250 lignes rouges, 275 horizons et 300 trésors candidats;
- 30 dilemmes de départ et 8 dimensions canoniques de point de bascule;
- sélection, création et reformulation de cartes personnelles;
- confirmation de plusieurs valeurs et valeur principale facultative;
- réponses A / B / Ça dépend / Je ne sais pas / Passer;
- difficulté et certitude conservées comme variables distinctes;
- préférences Beta(1,1), globales et par contexte, pondérées par la certitude;
- sélection adaptative, reprises contextuelles et sondes de pivot à une dimension;
- résultats prudents, recalculables et traçables avec « Pourquoi? »;
- corrections non destructives et suppression complète d’une session.

Les catalogues sont des stimuli candidats non validés psychométriquement. Leurs catégories et valeurs associées sont des hypothèses que la personne doit confirmer, corriger ou reformuler.

## Démarrage local

Prérequis : Node.js 24, pnpm 11 et PostgreSQL 16.

```bash
pnpm install --frozen-lockfile
export DATABASE_URL='postgresql://...'
pnpm --filter @workspace/db run push
```

Dans deux terminaux :

```bash
PORT=3001 pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/jeu-des-valeurs run dev
```

Le serveur amorce automatiquement et de façon idempotente les 825 cartes et les 30 dilemmes canoniques après l’application du schéma.

## Validation

```bash
pnpm test
pnpm run typecheck
pnpm run build
```

La CI GitHub exécute ces vérifications à chaque push et demande de fusion. Aucun crédit Replit n’est requis pour développer ou valider le code.

## Architecture

- `artifacts/jeu-des-valeurs/` — React 19, Vite, Tailwind et composants accessibles;
- `artifacts/api-server/` — API Express 5 et moteur déterministe sans LLM;
- `lib/db/` — schéma PostgreSQL/Drizzle et données canoniques;
- `lib/api-spec/openapi.yaml` — contrat API source;
- `lib/api-client-react/` et `lib/api-zod/` — client et validation générés.

Le moteur utilise uniquement les réponses valides comme source de vérité. Les constellations sont recalculées à la demande et portent une version de calcul. Une correction crée une nouvelle version de réponse et invalide l’ancienne sans l’écraser.

## Principes de sécurité

- aucune inférence de caractéristique sensible;
- aucune prédiction certaine du comportement réel;
- formulations conditionnelles et contextuelles;
- possibilité de passer chaque scénario;
- traçabilité des observations affichées;
- objectifs WCAG 2.1 AA, navigation clavier et réduction des animations;
- données de session supprimables depuis l’interface.

Pour les commandes détaillées et les décisions techniques, voir [`replit.md`](./replit.md).
