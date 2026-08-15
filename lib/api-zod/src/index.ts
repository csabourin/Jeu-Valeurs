export * from "./generated/api";
export * from "./generated/types";

/**
 * `listCartesProposees` porte des paramètres de **chemin** (`sessionId`) et de
 * **requête** (`parFamille`). Orval nomme les deux d'après l'identifiant de
 * l'opération : un schéma zod `ListCartesProposeesParams` dans `api.ts`, et un
 * type TypeScript du même nom dans `types/`. Les deux `export *` deviennent
 * alors ambigus.
 *
 * On tranche pour le schéma zod, le seul dont le serveur se sert pour valider.
 * Le type des paramètres de requête reste accessible via
 * `ListCartesProposeesQueryParams`.
 */
export { ListCartesProposeesParams } from "./generated/api";
