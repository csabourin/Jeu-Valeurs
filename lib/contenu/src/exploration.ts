/**
 * ExplorationEngine — quelle tension vaut la peine d'être posée maintenant.
 *
 * Deux régimes, et ils ne cherchent pas la même chose.
 *
 * **Première passe (« ordonner »).** Couvrir. Chaque paire de valeurs actives
 * devrait se rencontrer au moins une fois ; on prend les paires jamais vues,
 * dans un ordre tiré par la graine de la partie. Rien de plus : c'est ce qui
 * garde cette phase rapide.
 *
 * **Mise à l'épreuve (« tester »).** Creuser. Une fois le premier portrait
 * affiché, toutes les comparaisons ne se valent plus. Sont utiles :
 *
 *   • une paire qui a reçu des réponses différentes selon la situation ;
 *   • deux valeurs que le modèle n'arrive pas à départager ;
 *   • une paire où « ça dépend » revient souvent ;
 *   • une paire encore jamais confrontée ;
 *   • une valeur qui n'a encore jamais été secondaire ;
 *   • une valeur qui passe devant presque tout.
 *
 * Le moteur ne choisit que la **tension**. La manifestation — quelles cartes,
 * quelle situation — est choisie ensuite, en évitant de reposer exactement la
 * même question : voir `parcours.ts`.
 */

import {
  calculerCouverture,
  clePaire,
  compterParPaire,
  estDecisif,
  type Comparaison,
} from "./comparaisons";
import { ajusterModele, type Ordination } from "./preferences";
import { generateurAleatoire, melanger } from "./hasard";

export type MotifExploration =
  | "reponses_variables"
  | "forces_proches"
  | "ca_depend_frequent"
  | "paire_jamais_vue"
  | "jamais_secondaire"
  | "domine_presque_tout";

export const libellesMotif: Record<MotifExploration, string> = {
  reponses_variables: "Tu n'as pas répondu pareil les deux fois",
  forces_proches: "Ces deux-là se tiennent de très près",
  ca_depend_frequent: "Ici, tu réponds souvent « ça dépend »",
  paire_jamais_vue: "Ces deux valeurs ne se sont pas encore croisées",
  jamais_secondaire: "Celle-ci n'a encore jamais cédé",
  domine_presque_tout: "Celle-ci passe devant presque tout",
};

const PRIORITE: Record<MotifExploration, number> = {
  reponses_variables: 0,
  forces_proches: 1,
  ca_depend_frequent: 2,
  paire_jamais_vue: 3,
  jamais_secondaire: 4,
  domine_presque_tout: 5,
};

export interface TensionAExplorer {
  valeurA: string;
  valeurB: string;
  motif: MotifExploration;
  /** Plus petit = plus utile à poser maintenant. */
  priorite: number;
  /** Une phrase, affichable telle quelle. */
  explication: string;
}

export interface EtatExploration {
  /** Valeurs confirmées par la personne. */
  valeursActives: string[];
  comparaisons: Comparaison[];
  /** Paires que le contenu et les cartes peuvent réellement servir. */
  pairesJouables: [string, string][];
  graine?: number;
  /** Ordination déjà calculée, si l'appelant l'a sous la main. */
  ordination?: Ordination;
}

function cleDe([a, b]: [string, string]): string {
  return clePaire(a, b);
}

/**
 * Les paires jamais confrontées, dans l'ordre de la partie.
 *
 * C'est tout ce que la première passe a besoin de savoir.
 */
export function pairesACouvrir(etat: EtatExploration): [string, string][] {
  const couverture = calculerCouverture(
    etat.valeursActives,
    etat.comparaisons,
  );
  const manquantes = new Set(couverture.pairesManquantes.map(cleDe));
  const jouables = etat.pairesJouables.filter((paire) =>
    manquantes.has(cleDe(paire)),
  );
  return melanger(jouables, generateurAleatoire((etat.graine ?? 0) ^ 0x0dd1));
}

/**
 * Les tensions à mettre à l'épreuve, de la plus utile à la moins utile.
 *
 * Une même paire peut apparaître pour plusieurs motifs : seule la plus forte
 * raison est gardée, pour que la file ne se remplisse pas de doublons.
 */
export function tensionsAExplorer(etat: EtatExploration): TensionAExplorer[] {
  const ordination =
    etat.ordination ?? ajusterModele(etat.comparaisons, etat.valeursActives);
  const jouables = new Map(etat.pairesJouables.map((p) => [cleDe(p), p]));
  const candidates = new Map<string, TensionAExplorer>();

  const proposer = (
    valeurA: string,
    valeurB: string,
    motif: MotifExploration,
    explication: string,
  ): void => {
    const cle = clePaire(valeurA, valeurB);
    const paire = jouables.get(cle);
    // On ne propose que ce que le jeu peut effectivement poser : une tension
    // sans manifestation disponible serait une promesse impossible à tenir.
    if (!paire) return;
    const deja = candidates.get(cle);
    if (deja && deja.priorite <= PRIORITE[motif]) return;
    candidates.set(cle, {
      valeurA: paire[0],
      valeurB: paire[1],
      motif,
      priorite: PRIORITE[motif],
      explication,
    });
  };

  // ── Réponses variables, et « ça dépend » qui revient ──────────────────────
  const parPaire = compterParPaire(etat.comparaisons);
  for (const relation of ordination.relations) {
    if (relation.variable) {
      proposer(
        relation.valeurA,
        relation.valeurB,
        "reponses_variables",
        `Entre « ${relation.valeurA} » et « ${relation.valeurB} », ta réponse a changé d'une situation à l'autre. Ce n'est pas une contradiction — voyons ce qui la fait bouger.`,
      );
    }
    if (relation.indecis >= 1 && relation.indecis >= relation.comparaisons / 2) {
      proposer(
        relation.valeurA,
        relation.valeurB,
        "ca_depend_frequent",
        `« ${relation.valeurA} » et « ${relation.valeurB } » : tu réponds souvent que ça dépend. De quoi, exactement ?`,
      );
    }
  }

  // ── Deux valeurs que le modèle n'arrive pas à départager ──────────────────
  const classees = ordination.forces.filter((f) => f.comparaisons > 0);
  for (let i = 0; i + 1 < classees.length; i++) {
    const haut = classees[i];
    const bas = classees[i + 1];
    const ecart = Math.abs(haut.force - bas.force);
    const marge = Math.max(haut.incertitude, bas.incertitude);
    if (ecart <= marge) {
      proposer(
        haut.valeur,
        bas.valeur,
        "forces_proches",
        `« ${haut.valeur} » et « ${bas.valeur} » sont au coude à coude dans ton ordination. Une comparaison de plus pourrait les séparer.`,
      );
    }
  }

  // ── Paires jamais confrontées ────────────────────────────────────────────
  const couverture = calculerCouverture(etat.valeursActives, etat.comparaisons);
  for (const [a, b] of couverture.pairesManquantes) {
    proposer(
      a,
      b,
      "paire_jamais_vue",
      `« ${a} » et « ${b} » ne se sont pas encore croisées.`,
    );
  }

  // ── Valeurs jamais secondaires, ou qui passent devant presque tout ───────
  const autresValeurs = (valeur: string): string[] =>
    ordination.forces.map((f) => f.valeur).filter((v) => v !== valeur);

  for (const force of ordination.forces) {
    if (force.jamaisSecondaire && force.comparaisons >= 2) {
      for (const autre of autresValeurs(force.valeur)) {
        if (parPaire.has(clePaire(force.valeur, autre))) continue;
        proposer(
          force.valeur,
          autre,
          "jamais_secondaire",
          `« ${force.valeur} » n'a encore jamais été secondaire. Reste à voir devant quoi.`,
        );
      }
    }

    const adversaires = ordination.relations.filter(
      (r) => r.valeurA === force.valeur || r.valeurB === force.valeur,
    );
    const gagnees = adversaires.filter(
      (r) => r.prioritaire === force.valeur,
    ).length;
    if (adversaires.length >= 3 && gagnees === adversaires.length) {
      for (const autre of autresValeurs(force.valeur)) {
        if (parPaire.has(clePaire(force.valeur, autre))) continue;
        proposer(
          force.valeur,
          autre,
          "domine_presque_tout",
          `« ${force.valeur} » est passée devant tout ce qu'elle a rencontré. Voyons jusqu'où.`,
        );
      }
    }
  }

  // À priorité égale, la graine décide : deux parties identiques sur le papier
  // n'explorent pas les mêmes tensions.
  const liste = melanger(
    Array.from(candidates.values()),
    generateurAleatoire((etat.graine ?? 0) ^ 0x3e57),
  );
  return liste.sort((a, b) => a.priorite - b.priorite);
}

/**
 * Les facteurs cités le plus souvent quand la personne répond « ça dépend ».
 *
 * Sert à choisir quelle série de bascule servir : si quelqu'un dit que ça
 * dépend de la proximité, la série où seule la proximité bouge est la bonne.
 */
export function facteursLesPlusCites(
  reponses: { choix: string; facteurDepend?: string | null }[],
): string[] {
  const comptes = new Map<string, number>();
  for (const r of reponses) {
    if (r.choix !== "ca_depend" || !r.facteurDepend) continue;
    comptes.set(r.facteurDepend, (comptes.get(r.facteurDepend) ?? 0) + 1);
  }
  return Array.from(comptes.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([facteur]) => facteur);
}

/** Combien de comparaisons tranchées, hors séries de bascule. */
export function comparaisonsTranchees(comparaisons: Comparaison[]): number {
  return comparaisons.filter((c) => estDecisif(c.choix)).length;
}
