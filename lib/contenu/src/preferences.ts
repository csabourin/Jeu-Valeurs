/**
 * PreferenceModel — l'ordination des valeurs, et ce qu'on en sait vraiment.
 *
 * Compter les victoires ne suffit pas : une valeur qui gagne trois fois contre
 * des valeurs faibles n'a pas montré la même chose qu'une valeur qui gagne une
 * fois contre la plus forte. On ajuste donc un modèle de comparaison par paires
 * (Bradley-Terry, estimé par montée MM), qui donne à chaque valeur une force
 * relative tenant compte de la force de ses adversaires.
 *
 * Trois propriétés comptent autant que le classement lui-même :
 *
 *   • **les cycles ne cassent rien.** A > B, B > C, C > A est un résultat
 *     possible et fréquent ; le modèle produit alors des forces proches et le
 *     cycle est signalé tel quel, pas corrigé en douce ;
 *   • **l'incertitude est calculée**, pas décorative. Une valeur vue une fois
 *     reçoit un intervalle large, et l'écran doit le dire ;
 *   • **une réponse indécise compte.** « Ça dépend » et « je ne sais pas »
 *     valent une demi-victoire de chaque côté : les deux valeurs se tiennent,
 *     ce qui est une information, pas un trou.
 *
 * Un a priori (une demi-victoire et une demi-défaite virtuelles contre une
 * valeur moyenne) empêche une valeur jamais battue de partir à l'infini. Sans
 * lui, « n'a jamais cédé » deviendrait « force infinie », ce qui est faux : ça
 * veut seulement dire qu'aucune situation jouée ne l'a fait plier.
 *
 * Le résultat reste une **estimation évolutive**. Rien ici ne prétend au
 * classement définitif des valeurs d'une personne.
 */

import {
  clePaire,
  estDecisif,
  valeurPrioritaire,
  valeurSecondaire,
  cleManifestation,
  type Comparaison,
} from "./comparaisons";

/** Victoires et défaites virtuelles contre une valeur moyenne. */
const A_PRIORI = 0.5;
/** Assez pour converger sur des tailles de jeu réalistes (quelques dizaines de valeurs). */
const ITERATIONS_MAX = 500;
const TOLERANCE = 1e-9;

export type NiveauConfiance =
  | "tendance_forte"
  | "tendance_probable"
  | "encore_incertain"
  | "territoire_peu_explore";

export const libellesConfiance: Record<NiveauConfiance, string> = {
  tendance_forte: "Tendance forte",
  tendance_probable: "Tendance probable",
  encore_incertain: "Encore incertain",
  territoire_peu_explore: "Territoire peu exploré",
};

export interface ForceValeur {
  valeur: string;
  /** Force relative, en échelle logarithmique, centrée sur 0. */
  force: number;
  /** Erreur type sur la force. Grande ⇒ on ne sait pas encore. */
  incertitude: number;
  /** Fourchette plausible de la force (≈ 95 %). */
  intervalle: [number, number];
  /** Rang dans l'ordination, à partir de 1. Les ex æquo partagent leur rang. */
  rang: number;
  comparaisons: number;
  foisPrioritaire: number;
  foisSecondaire: number;
  /** « Ça dépend » et « je ne sais pas ». */
  indecis: number;
  /** Vrai tant qu'aucune comparaison tranchée ne l'a fait passer derrière. */
  jamaisSecondaire: boolean;
  niveauConfiance: NiveauConfiance;
}

export interface RelationPaire {
  valeurA: string;
  valeurB: string;
  comparaisons: number;
  /** Combien de manifestations différentes ont servi cette paire. */
  manifestations: number;
  /** Valeur passée devant le plus souvent, ou null si personne ne se détache. */
  prioritaire: string | null;
  /** P(valeurA passe devant valeurB) selon le modèle ajusté. */
  probabilite: number;
  indecis: number;
  /**
   * Vrai si la paire a reçu des réponses tranchées différentes selon les
   * manifestations. Ce n'est pas une contradiction : quelque chose dans la
   * situation a compté.
   */
  variable: boolean;
}

export interface Ordination {
  forces: ForceValeur[];
  relations: RelationPaire[];
  /** Boucles A > B > C > A observées dans les réponses tranchées. */
  cycles: string[][];
  /** Vrai si aucune boucle et si les forces se séparent nettement. */
  ordreNet: boolean;
  iterations: number;
}

interface Compteurs {
  victoires: number;
  defaites: number;
  indecis: number;
}

/**
 * Ajuste le modèle sur les comparaisons enregistrées.
 *
 * `valeursActives` sert à faire figurer une valeur dans l'ordination même si
 * aucune situation ne l'a encore mise à l'épreuve : elle sort alors avec une
 * force nulle et le niveau « territoire peu exploré », ce qui est exactement
 * ce qu'on sait d'elle.
 */
export function ajusterModele(
  comparaisons: Comparaison[],
  valeursActives: string[] = [],
): Ordination {
  const noms = new Set<string>(valeursActives);
  for (const c of comparaisons) {
    noms.add(c.valeurA);
    noms.add(c.valeurB);
  }
  const valeurs = Array.from(noms).sort((a, b) => a.localeCompare(b, "fr"));
  const index = new Map(valeurs.map((v, i) => [v, i]));
  const n = valeurs.length;

  const compteurs: Compteurs[] = valeurs.map(() => ({
    victoires: 0,
    defaites: 0,
    indecis: 0,
  }));
  // Nombre de rencontres entre i et j, indécises comprises.
  const rencontres: number[][] = Array.from({ length: n }, () =>
    new Array(n).fill(0),
  );

  const retenues = comparaisons.filter((c) => c.choix !== "passer");

  for (const c of retenues) {
    const i = index.get(c.valeurA);
    const j = index.get(c.valeurB);
    if (i === undefined || j === undefined || i === j) continue;

    rencontres[i][j]++;
    rencontres[j][i]++;

    if (estDecisif(c.choix)) {
      const gagnante = valeurPrioritaire(c);
      const perdante = valeurSecondaire(c);
      if (gagnante && perdante) {
        compteurs[index.get(gagnante)!].victoires++;
        compteurs[index.get(perdante)!].defaites++;
      }
    } else {
      // Les deux se tiennent : une demi-victoire chacune.
      compteurs[i].victoires += 0.5;
      compteurs[i].defaites += 0.5;
      compteurs[j].victoires += 0.5;
      compteurs[j].defaites += 0.5;
      compteurs[i].indecis++;
      compteurs[j].indecis++;
    }
  }

  // ── Montée MM ─────────────────────────────────────────────────────────────
  const p = new Array(n).fill(1);
  let iterations = 0;

  for (; iterations < ITERATIONS_MAX; iterations++) {
    let ecartMax = 0;
    const suivant = new Array(n).fill(1);

    for (let i = 0; i < n; i++) {
      let denominateur = 0;
      for (let j = 0; j < n; j++) {
        if (i === j || rencontres[i][j] === 0) continue;
        denominateur += rencontres[i][j] / (p[i] + p[j]);
      }
      // L'a priori : une demi-victoire et une demi-défaite contre une valeur de
      // force 1. C'est lui qui garde finie la force d'une valeur jamais battue.
      denominateur += (2 * A_PRIORI) / (p[i] + 1);

      const numerateur = compteurs[i].victoires + A_PRIORI;
      suivant[i] = denominateur > 0 ? numerateur / denominateur : 1;
    }

    // Recentrage : moyenne géométrique ramenée à 1, sinon l'échelle dérive.
    const moyenneLog =
      suivant.reduce((somme, valeur) => somme + Math.log(valeur), 0) / n;
    for (let i = 0; i < n; i++) {
      suivant[i] = suivant[i] / Math.exp(moyenneLog);
      ecartMax = Math.max(ecartMax, Math.abs(suivant[i] - p[i]));
      p[i] = suivant[i];
    }

    if (ecartMax < TOLERANCE) break;
  }

  // ── Incertitude ───────────────────────────────────────────────────────────
  // Information de Fisher pour la force logarithmique : chaque rencontre entre
  // deux valeurs proches informe plus qu'une rencontre déséquilibrée.
  const incertitudes = valeurs.map((_, i) => {
    let information = 0;
    for (let j = 0; j < n; j++) {
      if (i === j || rencontres[i][j] === 0) continue;
      information +=
        (rencontres[i][j] * p[i] * p[j]) / Math.pow(p[i] + p[j], 2);
    }
    information += (2 * A_PRIORI * p[i]) / Math.pow(p[i] + 1, 2);
    return information > 0 ? 1 / Math.sqrt(information) : Infinity;
  });

  const forcesBrutes = valeurs.map((valeur, i) => {
    const force = Math.log(p[i]);
    const incertitude = incertitudes[i];
    const total = compteurs[i].victoires + compteurs[i].defaites;
    return {
      valeur,
      force,
      incertitude,
      intervalle: [
        force - 1.96 * incertitude,
        force + 1.96 * incertitude,
      ] as [number, number],
      comparaisons: Math.round(total),
      foisPrioritaire: Math.round(
        compteurs[i].victoires - compteurs[i].indecis * 0.5,
      ),
      foisSecondaire: Math.round(
        compteurs[i].defaites - compteurs[i].indecis * 0.5,
      ),
      indecis: compteurs[i].indecis,
      jamaisSecondaire: false,
      niveauConfiance: "territoire_peu_explore" as NiveauConfiance,
    };
  });

  for (const f of forcesBrutes) {
    f.jamaisSecondaire = f.foisPrioritaire > 0 && f.foisSecondaire === 0;
    f.niveauConfiance = niveauDeConfiance(
      f.force,
      f.incertitude,
      f.foisPrioritaire,
      f.foisSecondaire,
    );
  }

  const triees = forcesBrutes.sort(
    (a, b) => b.force - a.force || a.valeur.localeCompare(b.valeur, "fr"),
  );

  // Deux forces indiscernables partagent leur rang : afficher 3 et 4 pour un
  // écart de 0,001 ferait passer du bruit pour un classement.
  const forces: ForceValeur[] = [];
  for (const [position, f] of triees.entries()) {
    const precedente = forces[position - 1];
    forces.push({
      ...f,
      rang:
        precedente && Math.abs(precedente.force - f.force) < 1e-6
          ? precedente.rang
          : position + 1,
    });
  }

  const relations = calculerRelations(retenues, p, index);
  const cycles = detecterCycles(relations);

  return {
    forces,
    relations,
    cycles,
    ordreNet: cycles.length === 0 && forcesSeparees(forces),
    iterations,
  };
}

/**
 * Ce qu'on peut dire d'une valeur, en français.
 *
 * Deux signaux, et ils ne mesurent pas la même chose. Le rapport force /
 * incertitude dit à quel point on connaît **l'écart** ; la cohérence dit à quel
 * point les réponses sont allées dans le **même sens**. Une valeur jamais
 * secondaire a une cohérence parfaite et un écart mal connu — c'est le cas où
 * ne regarder que l'incertitude ferait dire « incertain » à une tendance que
 * cinq réponses identiques dessinent clairement.
 */
function niveauDeConfiance(
  force: number,
  incertitude: number,
  prioritaire: number,
  secondaire: number,
): NiveauConfiance {
  const tranchees = prioritaire + secondaire;
  if (tranchees === 0) return "territoire_peu_explore";

  const z = incertitude > 0 ? Math.abs(force) / incertitude : 0;
  const coherence = Math.abs(prioritaire - secondaire) / tranchees;

  if (tranchees >= 3 && (coherence >= 0.8 || z >= 2)) return "tendance_forte";
  if (tranchees >= 2 && (coherence >= 0.5 || z >= 1)) return "tendance_probable";
  return "encore_incertain";
}

/** Vrai si au moins deux valeurs se détachent nettement l'une de l'autre. */
function forcesSeparees(forces: ForceValeur[]): boolean {
  if (forces.length < 2) return false;
  return forces.some(
    (f) => f.niveauConfiance === "tendance_forte" || f.niveauConfiance === "tendance_probable",
  );
}

function calculerRelations(
  comparaisons: Comparaison[],
  p: number[],
  index: Map<string, number>,
): RelationPaire[] {
  const groupes = new Map<string, Comparaison[]>();
  for (const c of comparaisons) {
    const cle = clePaire(c.valeurA, c.valeurB);
    const groupe = groupes.get(cle);
    if (groupe) groupe.push(c);
    else groupes.set(cle, [c]);
  }

  const relations: RelationPaire[] = [];
  for (const groupe of groupes.values()) {
    const [valeurA, valeurB] = clePaire(
      groupe[0].valeurA,
      groupe[0].valeurB,
    ).split(" | ");

    const gagnantes = groupe
      .filter((c) => estDecisif(c.choix))
      .map((c) => valeurPrioritaire(c) as string);
    const pourA = gagnantes.filter((g) => g === valeurA).length;
    const pourB = gagnantes.filter((g) => g === valeurB).length;

    const i = index.get(valeurA);
    const j = index.get(valeurB);
    const probabilite =
      i !== undefined && j !== undefined ? p[i] / (p[i] + p[j]) : 0.5;

    relations.push({
      valeurA,
      valeurB,
      comparaisons: groupe.length,
      manifestations: new Set(
        groupe.map((c) =>
          cleManifestation(c.valeurA, c.valeurB, c.carteA, c.carteB),
        ),
      ).size,
      prioritaire: pourA === pourB ? null : pourA > pourB ? valeurA : valeurB,
      probabilite,
      indecis: groupe.filter((c) => !estDecisif(c.choix)).length,
      variable: pourA > 0 && pourB > 0,
    });
  }

  return relations.sort(
    (a, b) =>
      a.valeurA.localeCompare(b.valeurA, "fr") ||
      a.valeurB.localeCompare(b.valeurB, "fr"),
  );
}

/**
 * Les boucles A > B > C > A.
 *
 * On les cherche pour pouvoir les dire, pas pour les corriger : trois valeurs
 * qui se battent en rond veulent dire que le contexte décide, et c'est
 * exactement ce que la phase de mise à l'épreuve doit aller regarder.
 */
function detecterCycles(relations: RelationPaire[]): string[][] {
  const arcs = new Map<string, Set<string>>();
  for (const r of relations) {
    if (!r.prioritaire) continue;
    const perdante = r.prioritaire === r.valeurA ? r.valeurB : r.valeurA;
    const sortants = arcs.get(r.prioritaire) ?? new Set<string>();
    sortants.add(perdante);
    arcs.set(r.prioritaire, sortants);
  }

  const cycles: string[][] = [];
  const vus = new Set<string>();

  for (const [a, versB] of arcs) {
    for (const b of versB) {
      for (const c of arcs.get(b) ?? []) {
        if (c === a) continue;
        if (!(arcs.get(c) ?? new Set()).has(a)) continue;
        const signature = [a, b, c].sort().join(" | ");
        if (vus.has(signature)) continue;
        vus.add(signature);
        cycles.push([a, b, c]);
      }
    }
  }

  return cycles;
}
