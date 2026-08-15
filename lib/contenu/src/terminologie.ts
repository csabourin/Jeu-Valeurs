/**
 * Les mots que le jeu emploie pour dire l'ordre entre deux valeurs.
 *
 * « A passé devant » et « a cédé devant » ne sont pas symétriques : le premier
 * sonne comme une victoire, le second comme un renoncement. Sur un écran de
 * résultats, ça suffit à transformer une observation en jugement.
 *
 * On emploie donc partout — observations, tableaux, infobulles — une paire
 * neutre et immédiatement lisible :
 *
 *   « a été prioritaire sur »   ↔   « a été secondaire face à »
 *
 * Et, là où la place manque, sa version courte :
 *
 *   « a précédé »   ↔   « a suivi »
 *
 * Une seule logique dans toute l'interface : si un écran change de mots, les
 * deux côtés changent ensemble.
 */

export const termes = {
  /** Verbe long, pour une phrase complète. */
  prioritaire: "a été prioritaire sur",
  secondaire: "a été secondaire face à",
  /** Verbe court, pour une colonne ou une puce. */
  precede: "a précédé",
  suit: "a suivi",
  /** Étiquettes de colonne ou de section. */
  colonnePrioritaire: "Prioritaire sur",
  colonneSecondaire: "Secondaire face à",
  /** Ce qu'on dit d'une valeur qu'aucune comparaison n'a fait passer derrière. */
  jamaisSecondaire: "n'a encore jamais été secondaire",
} as const;

export type SensRelation = "prioritaire" | "secondaire";

/**
 * « « Autonomie » a été prioritaire sur « Loyauté » ».
 *
 * `court` sert quand l'interface impose des termes brefs — la logique reste la
 * même, seul le verbe raccourcit.
 */
export function formulerRelation(
  valeur: string,
  sens: SensRelation,
  autre: string,
  court = false,
): string {
  const verbe = court
    ? sens === "prioritaire"
      ? termes.precede
      : termes.suit
    : sens === "prioritaire"
      ? termes.prioritaire
      : termes.secondaire;
  return `« ${valeur} » ${verbe} « ${autre} »`;
}
