/**
 * Comparison — ce qu'une comparaison enregistre, et ce qu'elle couvre.
 *
 * Une comparaison ne dit **jamais** « la carte A a battu la carte B ». Les
 * cartes sont des manifestations ; ce qui se compare, ce sont deux valeurs. La
 * même tension revient plus tard sous d'autres cartes, dans un autre contexte,
 * et c'est en la revoyant qu'on apprend si l'ordre tient.
 *
 * Chaque enregistrement transporte donc les deux étages :
 *
 *   valeur A · valeur B · carte A · carte B · choix · contexte · phase
 *
 * Sans la phase, on mélangerait la première passe — rapide, sans question de
 * relance — avec la mise à l'épreuve, où le jeu creuse. Sans les cartes, on ne
 * pourrait plus montrer ce qui a été joué ni éviter de reposer la même
 * manifestation deux fois.
 */

import { pairesAdmissibles } from "./eligibilite";

export type ChoixComparaison =
  | "A"
  | "B"
  | "ca_depend"
  | "je_ne_sais_pas"
  | "passer";

/**
 * Où en est la personne dans son parcours.
 *
 *   ordination — la première passe : des duels rapides, rien d'autre ;
 *   epreuve    — après le premier portrait : on creuse les tensions utiles.
 */
export const phasesExperience = ["ordination", "epreuve"] as const;
export type PhaseExperience = (typeof phasesExperience)[number];

export interface Comparaison {
  valeurA: string;
  valeurB: string;
  /** Identifiant de carte de session, ou null pour une situation écrite. */
  carteA: string | null;
  carteB: string | null;
  choix: ChoixComparaison;
  /** Où ça se passe, quand la manifestation le précise. */
  contexte: string | null;
  phase: PhaseExperience;
}

/** Clé d'une paire de valeurs, indépendante de l'ordre. */
export function clePaire(a: string, b: string): string {
  return [a, b].sort().join(" | ");
}

/** Clé d'une manifestation : la même paire vue par les deux mêmes cartes. */
export function cleManifestation(
  a: string,
  b: string,
  carteA: string | null,
  carteB: string | null,
): string {
  const cartes = [carteA ?? "", carteB ?? ""].sort().join(" + ");
  return `${clePaire(a, b)} @ ${cartes}`;
}

export function estDecisif(choix: string): boolean {
  return choix === "A" || choix === "B";
}

/** Qui est passée devant dans cette comparaison, ou null si rien n'a été tranché. */
export function valeurPrioritaire(c: {
  valeurA: string;
  valeurB: string;
  choix: string;
}): string | null {
  if (c.choix === "A") return c.valeurA;
  if (c.choix === "B") return c.valeurB;
  return null;
}

/** Qui est passée après, ou null si rien n'a été tranché. */
export function valeurSecondaire(c: {
  valeurA: string;
  valeurB: string;
  choix: string;
}): string | null {
  if (c.choix === "A") return c.valeurB;
  if (c.choix === "B") return c.valeurA;
  return null;
}

export interface Couverture {
  /** n(n−1)/2 restreint aux paires que les règles autorisent. */
  pairesPertinentes: [string, string][];
  pairesVues: [string, string][];
  pairesManquantes: [string, string][];
  /** Part des paires pertinentes déjà confrontées, dans [0, 1]. */
  part: number;
}

/**
 * Ce qui reste à confronter pour que l'ordination tienne debout.
 *
 * Toutes les valeurs actives devraient idéalement se rencontrer. On ne force
 * pas les n(n−1)/2 comparaisons dans une seule session : la première vague en
 * fait assez pour un premier ordre, « Affiner ma constellation » complète le
 * reste plus tard.
 */
export function calculerCouverture(
  valeursActives: string[],
  comparaisons: Pick<Comparaison, "valeurA" | "valeurB">[],
): Couverture {
  const pairesPertinentes = pairesAdmissibles(valeursActives);
  const vues = new Set(comparaisons.map((c) => clePaire(c.valeurA, c.valeurB)));

  const pairesVues = pairesPertinentes.filter(([a, b]) =>
    vues.has(clePaire(a, b)),
  );
  const pairesManquantes = pairesPertinentes.filter(
    ([a, b]) => !vues.has(clePaire(a, b)),
  );

  return {
    pairesPertinentes,
    pairesVues,
    pairesManquantes,
    part:
      pairesPertinentes.length > 0
        ? pairesVues.length / pairesPertinentes.length
        : 0,
  };
}

/**
 * Combien de fois chaque paire a été vue, et sous combien de manifestations
 * différentes. Une paire revue avec les mêmes cartes n'apprend rien de neuf ;
 * revue autrement, elle mesure la stabilité (voir `preferences.ts`).
 */
export function compterParPaire(
  comparaisons: Comparaison[],
): Map<string, { total: number; manifestations: Set<string> }> {
  const compte = new Map<
    string,
    { total: number; manifestations: Set<string> }
  >();
  for (const c of comparaisons) {
    const cle = clePaire(c.valeurA, c.valeurB);
    const entree = compte.get(cle) ?? { total: 0, manifestations: new Set() };
    entree.total++;
    entree.manifestations.add(
      cleManifestation(c.valeurA, c.valeurB, c.carteA, c.carteB),
    );
    compte.set(cle, entree);
  }
  return compte;
}
