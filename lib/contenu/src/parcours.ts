/**
 * Parcours — quelle question vient ensuite.
 *
 * Reproductible, sans être identique d'une partie à l'autre : mêmes valeurs
 * confirmées + mêmes réponses + **même graine** ⇒ même question suivante.
 * Rafraîchir la page ne change donc rien à la partie en cours, alors que deux
 * parties tirent des sélections différentes dans le même contenu.
 *
 * Deux phases, et une frontière nette entre les deux :
 *
 *   1. **ordination** — la première passe. Des duels courts, tirés pour
 *      couvrir le plus de paires de valeurs possible. Aucune question de
 *      relance : ni difficulté, ni certitude, ni « qu'est-ce que tu
 *      protégeais ? ». C'est ce qui la garde jouable.
 *   2. **epreuve** — après le premier portrait, et seulement si la personne le
 *      demande. Le moteur d'exploration choisit les tensions qui apprendraient
 *      quelque chose, rejoue les mêmes tensions sous d'autres cartes, et c'est
 *      là — et là seulement — que le jeu pose ses questions d'approfondissement.
 *
 * Ce qui se compare, ce sont des **valeurs** ; les cartes ne sont que la forme
 * concrète que prend la question. Une réponse enregistre donc toujours les
 * deux étages (voir `comparaisons.ts`).
 */

import { duels, type DuelContenu } from "./duels";
import { series, type SerieBascule } from "./bascules";
import { generateurAleatoire, melanger } from "./hasard";
import { paireAdmissible } from "./eligibilite";
import {
  clePaire,
  calculerCouverture,
  estDecisif,
  type Comparaison,
  type PhaseExperience,
} from "./comparaisons";
import {
  duelsCartesPossibles,
  type CarteDuel,
  type DuelCarteContenu,
} from "./duels-cartes";
import {
  pairesACouvrir,
  tensionsAExplorer,
  facteursLesPlusCites,
  type MotifExploration,
  type TensionAExplorer,
} from "./exploration";
import { ajusterModele } from "./preferences";

/** Combien de duels au maximum dans la première passe. Au-delà, ça devient une corvée. */
export const MAX_PREMIERE_VAGUE = 12;
/** En dessous, l'ordination ne tient pas debout : on ne propose pas encore de portrait. */
export const MIN_PREMIERE_VAGUE = 4;
/** Combien de questions au maximum dans une mise à l'épreuve. */
export const MAX_EPREUVE = 12;
/** Combien de séries de bascule au maximum dans une partie. */
const MAX_SERIES = 3;

export type ChoixConnu = "A" | "B" | "ca_depend" | "je_ne_sais_pas" | "passer";

export interface ReponseConnue {
  dilemmeId: number | null;
  valeurA: string;
  valeurB: string;
  choix: string;
  carteA?: string | null;
  carteB?: string | null;
  contexte?: string | null;
  phase?: PhaseExperience | null;
  facteurDepend?: string | null;
  serieId?: string | null;
  palier?: number | null;
}

export type PhaseParcours = "ordination" | "epreuve" | "termine";

export interface Question {
  type: "duel" | "bascule";
  dilemmeId: number;
  valeurA: string;
  valeurB: string;
  situation: string;
  optionA: string;
  optionB: string;
  /** Duel écrit seulement. */
  contexte: string | null;
  /** Vrai si cette paire a déjà été vue sous une autre forme. */
  estVariante: boolean;
  /** Cartes de session en jeu, quand la question vient des cartes de la personne. */
  carteA: string | null;
  carteB: string | null;
  carteALabel: string | null;
  carteBLabel: string | null;
  /** Phase à enregistrer avec la réponse. */
  phase: PhaseExperience;
  /** Mise à l'épreuve : pourquoi cette tension maintenant. */
  motif: MotifExploration | null;
  motifTexte: string | null;
  /** Vrai quand le jeu a le droit de poser ses questions de relance. */
  approfondir: boolean;
  /** Bascule seulement. */
  serieId: string | null;
  palier: number | null;
  dimension: string | null;
  reglage: string | null;
  amorce: string | null;
}

export interface Parcours {
  phase: PhaseParcours;
  prochaine: Question | null;
  /** Duels prévus pour la première passe. */
  comparaisonsPlanifiees: number;
  comparaisonsRepondues: number;
  /** n(n−1)/2 restreint aux paires admissibles. */
  pairesPertinentes: number;
  pairesCouvertes: number;
  /** Tensions que la mise à l'épreuve pourrait encore poser. */
  tensionsRestantes: number;
  seriesPlanifiees: number;
  seriesTerminees: number;
  /** Vrai dès qu'il y a assez de matière pour afficher un premier portrait. */
  premiereOrdinationPrete: boolean;
  /** Vrai s'il reste des paires jamais confrontées à compléter. */
  peutAffiner: boolean;
}

/** Ce que le parcours a besoin de savoir de la partie en cours. */
export interface EtatPartie {
  valeursConfirmees: string[];
  reponses: ReponseConnue[];
  /** Les cartes retenues par la personne, avec leurs valeurs confirmées. */
  cartes?: CarteDuel[];
  graine?: number;
  /**
   * Phase demandée par la personne. Le jeu ne bascule jamais tout seul dans la
   * mise à l'épreuve : elle vient d'un bouton, après le premier portrait.
   */
  phaseDemandee?: PhaseExperience;
}

// ─── Manifestations ──────────────────────────────────────────────────────────

type SourceManifestation = "cartes" | "situation_ecrite";

interface Manifestation {
  id: number;
  valeurA: string;
  valeurB: string;
  situation: string;
  optionA: string;
  optionB: string;
  contexte: string | null;
  carteA: string | null;
  carteB: string | null;
  carteALabel: string | null;
  carteBLabel: string | null;
  source: SourceManifestation;
}

function depuisDuelCarte(d: DuelCarteContenu): Manifestation {
  return {
    id: d.id,
    valeurA: d.valeurA,
    valeurB: d.valeurB,
    situation: d.situation,
    optionA: d.optionA,
    optionB: d.optionB,
    contexte: null,
    carteA: d.carteAId,
    carteB: d.carteBId,
    carteALabel: d.carteALabel,
    carteBLabel: d.carteBLabel,
    source: "cartes",
  };
}

function depuisDuelEcrit(d: DuelContenu): Manifestation {
  return {
    id: d.id,
    valeurA: d.valeurA,
    valeurB: d.valeurB,
    situation: d.situation,
    optionA: d.optionA,
    optionB: d.optionB,
    contexte: d.contexte,
    carteA: null,
    carteB: null,
    carteALabel: null,
    carteBLabel: null,
    source: "situation_ecrite",
  };
}

/**
 * Les situations écrites à la main jouables avec les valeurs de la personne.
 *
 * Une paire que les règles d'admissibilité refusent n'est jamais servie, même
 * si une situation existe pour elle : le contenu peut avoir vieilli, les règles
 * font foi.
 */
export function planifierDuels(
  valeursConfirmees: string[],
  graine = 0,
): DuelContenu[] {
  const connues = new Set(valeursConfirmees);
  if (connues.size === 0) return [];

  const jouables = duels.filter(
    (d) =>
      connues.has(d.valeurA) &&
      connues.has(d.valeurB) &&
      paireAdmissible(d.valeurA, d.valeurB).admissible,
  );

  return melanger(jouables, generateurAleatoire(graine));
}

/**
 * Toutes les formes que peut prendre une comparaison dans cette partie :
 * les duels entre les cartes de la personne, plus les situations écrites dont
 * les deux valeurs lui appartiennent.
 *
 * Une même paire de valeurs a souvent plusieurs manifestations. C'est
 * volontaire : rejouer la tension autrement mesure sa stabilité sans reposer la
 * même question.
 */
function toutesLesManifestations(etat: EtatPartie): Manifestation[] {
  const cartes = etat.cartes ?? [];
  const desCartes = duelsCartesPossibles(cartes).map(depuisDuelCarte);
  const ecrites = planifierDuels(etat.valeursConfirmees, etat.graine ?? 0).map(
    depuisDuelEcrit,
  );
  return [...desCartes, ...ecrites];
}

// ─── Séries de bascule ───────────────────────────────────────────────────────

/**
 * État d'une série : où elle en est et si elle doit continuer.
 *
 * Une série s'arrête dès que la réponse change par rapport au premier palier —
 * le point de bascule est trouvé, monter le réglage plus haut n'apprendrait
 * plus rien. Elle s'arrête aussi si la personne passe ou ne sait pas : on ne
 * pousse pas quelqu'un dans une situation qu'il vient d'écarter.
 */
function etatSerie(
  serie: SerieBascule,
  reponses: ReponseConnue[],
): { terminee: boolean; prochainPalier: number | null } {
  const donnees = reponses
    .filter((r) => r.serieId === serie.id && r.palier != null)
    .sort((a, b) => (a.palier as number) - (b.palier as number));

  if (donnees.length === 0) return { terminee: false, prochainPalier: 1 };

  if (
    donnees.some((r) => r.choix === "passer" || r.choix === "je_ne_sais_pas")
  ) {
    return { terminee: true, prochainPalier: null };
  }

  const premier = donnees[0].choix;
  const dernier = donnees[donnees.length - 1];
  if (
    estDecisif(premier) &&
    estDecisif(dernier.choix) &&
    dernier.choix !== premier
  ) {
    return { terminee: true, prochainPalier: null };
  }

  const suivant = (dernier.palier as number) + 1;
  if (suivant > serie.paliers.length)
    return { terminee: true, prochainPalier: null };

  return { terminee: false, prochainPalier: suivant };
}

/**
 * Les séries retenues pour une partie.
 *
 * Une série ne fait bouger qu'un seul réglage : elle mesure indirectement la
 * répétabilité, sans jamais demander « referais-tu le même choix ? ». On ne
 * fait basculer que ce qui a déjà été tranché franchement, et les séries dont
 * la dimension a été nommée dans un « ça dépend » passent devant.
 */
export function planifierSeries(
  valeursConfirmees: string[],
  reponses: ReponseConnue[],
  graine = 0,
): SerieBascule[] {
  const connues = new Set(valeursConfirmees);
  const tranchees = new Set(
    reponses
      .filter((r) => estDecisif(r.choix) && !r.serieId)
      .map((r) => clePaire(r.valeurA, r.valeurB)),
  );
  const facteursCites = new Set(facteursLesPlusCites(reponses));

  const eligibles = series.filter((s) => {
    if (!paireAdmissible(s.valeurA, s.valeurB).admissible) return false;
    const paireTranchee = tranchees.has(clePaire(s.valeurA, s.valeurB));
    const deuxValeursConnues = connues.has(s.valeurA) && connues.has(s.valeurB);
    return paireTranchee || deuxValeursConnues;
  });

  const suivant = generateurAleatoire(graine ^ 0x5eed);
  return melanger(eligibles, suivant)
    .map((serie, rang) => ({
      serie,
      rang,
      priorite:
        (tranchees.has(clePaire(serie.valeurA, serie.valeurB)) ? 0 : 2) +
        (facteursCites.has(serie.dimension) ? -1 : 0),
    }))
    .sort((a, b) => a.priorite - b.priorite || a.rang - b.rang)
    .slice(0, MAX_SERIES)
    .map((e) => e.serie);
}

// ─── Fabrication des questions ───────────────────────────────────────────────

function versQuestion(
  manifestation: Manifestation,
  phase: PhaseExperience,
  options: {
    estVariante: boolean;
    tension?: TensionAExplorer;
  },
): Question {
  return {
    type: "duel",
    dilemmeId: manifestation.id,
    valeurA: manifestation.valeurA,
    valeurB: manifestation.valeurB,
    situation: manifestation.situation,
    optionA: manifestation.optionA,
    optionB: manifestation.optionB,
    contexte: manifestation.contexte,
    estVariante: options.estVariante,
    carteA: manifestation.carteA,
    carteB: manifestation.carteB,
    carteALabel: manifestation.carteALabel,
    carteBLabel: manifestation.carteBLabel,
    phase,
    motif: options.tension?.motif ?? null,
    motifTexte: options.tension?.explication ?? null,
    approfondir: phase === "epreuve",
    serieId: null,
    palier: null,
    dimension: null,
    reglage: null,
    amorce: null,
  };
}

function versQuestionBascule(
  serie: SerieBascule,
  palier: number,
): Question | null {
  const p = serie.paliers.find((x) => x.palier === palier);
  if (!p) return null;
  return {
    type: "bascule",
    dilemmeId: p.id,
    valeurA: serie.valeurA,
    valeurB: serie.valeurB,
    situation: p.situation,
    optionA: serie.optionA,
    optionB: serie.optionB,
    contexte: null,
    estVariante: false,
    carteA: null,
    carteB: null,
    carteALabel: null,
    carteBLabel: null,
    phase: "epreuve",
    motif: null,
    motifTexte: null,
    // Dans une série, c'est le jeu qui tient le réglage : on ne demande rien
    // d'autre que le choix, sinon on casse la comparaison entre paliers.
    approfondir: false,
    serieId: serie.id,
    palier: p.palier,
    dimension: serie.dimension,
    reglage: p.reglage,
    amorce: serie.amorce,
  };
}

/** Les réponses converties en comparaisons, pour les modules qui raisonnent en valeurs. */
export function versComparaisons(reponses: ReponseConnue[]): Comparaison[] {
  return reponses
    .filter((r) => !r.serieId)
    .map((r) => ({
      valeurA: r.valeurA,
      valeurB: r.valeurB,
      carteA: r.carteA ?? null,
      carteB: r.carteB ?? null,
      choix: r.choix as Comparaison["choix"],
      contexte: r.contexte ?? null,
      phase: (r.phase ?? "ordination") as PhaseExperience,
    }));
}

// ─── Entrée principale ───────────────────────────────────────────────────────

/**
 * Où en est la partie, et quelle question vient maintenant.
 */
export function calculerParcours(etat: EtatPartie): Parcours {
  const {
    valeursConfirmees,
    reponses,
    graine = 0,
    phaseDemandee = "ordination",
  } = etat;

  const manifestations = toutesLesManifestations(etat);
  const repondus = new Set(
    reponses
      .filter((r) => r.dilemmeId != null)
      .map((r) => r.dilemmeId as number),
  );
  const comparaisons = versComparaisons(reponses);

  // Ce que le jeu peut effectivement poser : une paire sans manifestation
  // n'est jamais proposée, même si les deux valeurs sont actives.
  const pairesJouables = pairesDepuisManifestations(manifestations);

  const couverture = calculerCouverture(
    valeursConfirmees,
    comparaisons,
    pairesJouables,
  );
  const reponduesOrdination = comparaisons.filter(
    (c) => c.phase === "ordination",
  ).length;
  const planifiees = Math.min(MAX_PREMIERE_VAGUE, pairesJouables.length);

  const seriesPlan = planifierSeries(valeursConfirmees, reponses, graine);
  const etatsSeries = seriesPlan.map((s) => ({
    serie: s,
    ...etatSerie(s, reponses),
  }));
  const seriesTerminees = etatsSeries.filter((e) => e.terminee).length;

  const ordination = ajusterModele(comparaisons, valeursConfirmees);
  const tensions = tensionsAExplorer({
    valeursActives: valeursConfirmees,
    comparaisons,
    pairesJouables,
    graine,
    ordination,
  });

  const base = {
    comparaisonsPlanifiees: planifiees,
    comparaisonsRepondues: reponduesOrdination,
    pairesPertinentes: couverture.pairesPertinentes.length,
    pairesCouvertes: couverture.pairesVues.length,
    tensionsRestantes: tensions.length,
    seriesPlanifiees: seriesPlan.length,
    seriesTerminees,
    premiereOrdinationPrete:
      reponduesOrdination >= Math.min(MIN_PREMIERE_VAGUE, planifiees) &&
      reponduesOrdination > 0,
    peutAffiner: couverture.pairesManquantes.some(([a, b]) =>
      pairesJouables.some(([x, y]) => clePaire(x, y) === clePaire(a, b)),
    ),
  };

  // ── Première passe ────────────────────────────────────────────────────────
  if (phaseDemandee === "ordination") {
    if (reponduesOrdination < planifiees) {
      for (const [a, b] of pairesACouvrir({
        valeursActives: valeursConfirmees,
        comparaisons,
        pairesJouables,
        graine,
      })) {
        const choisie = choisirManifestation(
          manifestations,
          a,
          b,
          repondus,
          comparaisons,
          graine,
        );
        if (choisie) {
          return {
            ...base,
            phase: "ordination",
            prochaine: versQuestion(choisie, "ordination", {
              estVariante: false,
            }),
          };
        }
      }
    }
    // Plus rien à couvrir : la première passe est finie, le portrait peut
    // s'afficher. La suite ne part que si la personne la demande.
    return { ...base, phase: "termine", prochaine: null };
  }

  // ── Mise à l'épreuve ──────────────────────────────────────────────────────
  const reponduesEpreuve =
    comparaisons.filter((c) => c.phase === "epreuve").length +
    reponses.filter((r) => r.serieId).length;

  if (reponduesEpreuve < MAX_EPREUVE) {
    for (const tension of tensions) {
      const choisie = choisirManifestation(
        manifestations,
        tension.valeurA,
        tension.valeurB,
        repondus,
        comparaisons,
        graine,
      );
      if (!choisie) continue;
      const dejaVue = comparaisons.some(
        (c) =>
          clePaire(c.valeurA, c.valeurB) ===
          clePaire(tension.valeurA, tension.valeurB),
      );
      return {
        ...base,
        phase: "epreuve",
        prochaine: versQuestion(choisie, "epreuve", {
          estVariante: dejaVue,
          tension,
        }),
      };
    }

    // Les séries de bascule ferment la marche : elles ne mesurent plus l'ordre,
    // mais l'endroit précis où il change.
    for (const etatCourant of etatsSeries) {
      if (etatCourant.terminee || etatCourant.prochainPalier == null) continue;
      const question = versQuestionBascule(
        etatCourant.serie,
        etatCourant.prochainPalier,
      );
      if (question) return { ...base, phase: "epreuve", prochaine: question };
    }
  }

  return { ...base, phase: "termine", prochaine: null };
}

function pairesDepuisManifestations(
  manifestations: Manifestation[],
): [string, string][] {
  const vues = new Map<string, [string, string]>();
  for (const m of manifestations) {
    const cle = clePaire(m.valeurA, m.valeurB);
    if (!vues.has(cle)) vues.set(cle, [m.valeurA, m.valeurB]);
  }
  return Array.from(vues.values());
}

/**
 * Quelle forme donner à une tension.
 *
 * On écarte ce qui a déjà été joué, puis on préfère une manifestation d'une
 * autre nature que celles déjà servies pour cette paire : revoir la même
 * tension sous une autre forme est exactement ce qui permet de mesurer sa
 * stabilité. À égalité, la graine décide.
 */
function choisirManifestation(
  manifestations: Manifestation[],
  valeurA: string,
  valeurB: string,
  repondus: Set<number>,
  comparaisons: Comparaison[],
  graine: number,
): Manifestation | null {
  const cible = clePaire(valeurA, valeurB);
  const candidates = manifestations.filter(
    (m) => clePaire(m.valeurA, m.valeurB) === cible && !repondus.has(m.id),
  );
  if (candidates.length === 0) return null;

  const cartesDejaVues = new Set(
    comparaisons
      .filter((c) => clePaire(c.valeurA, c.valeurB) === cible)
      .flatMap((c) => [c.carteA, c.carteB])
      .filter((id): id is string => id !== null),
  );
  const sourcesVues = new Set(
    comparaisons
      .filter((c) => clePaire(c.valeurA, c.valeurB) === cible)
      .map((c) => (c.carteA ? "cartes" : "situation_ecrite")),
  );

  const melangees = melanger(candidates, generateurAleatoire(graine ^ 0x4a17));
  const note = (m: Manifestation): number => {
    let points = 0;
    if (!sourcesVues.has(m.source)) points -= 2;
    if (m.carteA && !cartesDejaVues.has(m.carteA)) points -= 1;
    if (m.carteB && !cartesDejaVues.has(m.carteB)) points -= 1;
    return points;
  };

  return melangees.sort((a, b) => note(a) - note(b))[0] ?? null;
}
