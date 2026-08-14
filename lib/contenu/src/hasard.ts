/**
 * Hasard reproductible.
 *
 * Deux exigences qui semblent s'opposer :
 *   • deux parties différentes ne doivent pas servir les mêmes situations ;
 *   • une même partie doit rester identique à elle-même — rafraîchir la page,
 *     revenir demain, rouvrir sur un autre appareil : même ordre, mêmes duels.
 *
 * La sortie : chaque partie tire une graine à sa création, et tout le tirage en
 * découle. Le hasard vit dans la graine, pas dans l'appel. Un `Math.random()`
 * direct casserait la seconde exigence — le parcours est recalculé à chaque
 * requête de progrès, donc la partie changerait sous les pieds de la personne.
 */

/** Générateur mulberry32 — court, rapide, largement suffisant pour du tirage de contenu. */
export function generateurAleatoire(graine: number): () => number {
  let etat = graine >>> 0;
  return () => {
    etat = (etat + 0x6d2b79f5) >>> 0;
    let t = Math.imul(etat ^ (etat >>> 15), 1 | etat);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Mélange de Fisher-Yates, sans toucher à la liste d'origine. */
export function melanger<T>(liste: readonly T[], suivant: () => number): T[] {
  const copie = [...liste];
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(suivant() * (i + 1));
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie;
}
