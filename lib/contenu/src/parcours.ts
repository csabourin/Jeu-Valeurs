/**
 * Parcours — quelle question vient ensuite.
 *
 * Reproductible, sans être identique d'une partie à l'autre : mêmes valeurs
 * confirmées + mêmes réponses + **même graine** ⇒ même question suivante.
 * Rafraîchir la page ne change donc rien à la partie en cours, alors que deux
 * parties tirent des sélections différentes dans le même contenu.
 *
 * Le parcours est piloté par le contenu, pas par les paires : on ne pose que
 * des situations écrites à la main. C'est ce qui garantit qu'aucune question
 * n'arrive sous la forme « Liberté ou Sécurité ? » posée à froid.
 *
 * Trois phases :
 *   1. arbitrages — les cartes de la personne comparées entre elles, à froid,
 *                   avant que la moindre situation ait pu déplacer l'ordre ;
 *   2. duels      — situations concrètes entre deux valeurs de la personne ;
 *   3. bascules   — séries où un seul réglage bouge, servies pour les tensions
 *                   que la personne a tranchées franchement.
 */

import { duels, clePaire, type DuelContenu } from "./duels";
import { series, type SerieBascule } from "./bascules";
import { generateurAleatoire, melanger } from "./hasard";
import {
  prochainArbitrage,
  type BlocArbitrage,
  type CarteArbitrable,
  type ReponseArbitrage,
} from "./arbitrages";

/** Combien de duels au maximum dans une partie. */
const MAX_DUELS = 12;
/** En dessous de ce nombre, on complète avec des duels qui n'engagent qu'une valeur confirmée. */
const MIN_DUELS = 8;
/** Places réservées aux variantes (même conflit, autre forme) en fin de phase. */
const MAX_VARIANTES = 3;
/** Combien de séries de bascule au maximum dans une partie. */
const MAX_SERIES = 3;

export type ChoixConnu = "A" | "B" | "ca_depend" | "je_ne_sais_pas" | "passer";

export interface ReponseConnue {
  dilemmeId: number | null;
  valeurA: string;
  valeurB: string;
  choix: string;
  facteurDepend?: string | null;
  serieId?: string | null;
  palier?: number | null;
}

export type PhaseParcours = "arbitrages" | "duels" | "bascules" | "termine";

export interface Question {
  type: "duel" | "bascule";
  dilemmeId: number;
  valeurA: string;
  valeurB: string;
  situation: string;
  optionA: string;
  optionB: string;
  /** Duel seulement. */
  contexte: string | null;
  /** Vrai si cette paire a déjà été vue sous une autre forme. */
  estVariante: boolean;
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
  /**
   * Servi seulement pendant la phase d'arbitrage. Un bloc n'est pas une
   * `Question` : il ne pose pas de situation et n'oppose pas deux valeurs, donc
   * il voyage à part plutôt que d'ajouter huit champs nullables à `Question`.
   */
  prochainBloc: BlocArbitrage | null;
  arbitragesPlanifies: number;
  arbitragesRepondus: number;
  duelsPlanifies: number;
  duelsRepondus: number;
  seriesPlanifiees: number;
  seriesTerminees: number;
}

/** Ce que le parcours a besoin de savoir de la partie en cours. */
export interface EtatPartie {
  valeursConfirmees: string[];
  reponses: ReponseConnue[];
  /** Les cartes retenues par la personne. Vide ⇒ pas de phase d'arbitrage. */
  cartes?: CarteArbitrable[];
  arbitrages?: ReponseArbitrage[];
  graine?: number;
}

function estDecisif(choix: string): boolean {
  return choix === "A" || choix === "B";
}

/**
 * Répartit les duels pour ne pas enchaîner deux situations sur la même paire :
 * on prend un duel par paire, puis un deuxième, et ainsi de suite.
 *
 * L'ordre des paires et le choix à l'intérieur d'une paire viennent de la
 * graine de la partie : c'est ce qui fait que deux parties bâties sur les mêmes
 * cartes ne servent pas la même sélection.
 */
function repartir(liste: DuelContenu[], suivant: () => number): DuelContenu[] {
  const groupes = new Map<string, DuelContenu[]>();
  for (const d of melanger(liste, suivant)) {
    const cle = clePaire(d.valeurA, d.valeurB);
    const groupe = groupes.get(cle);
    if (groupe) groupe.push(d);
    else groupes.set(cle, [d]);
  }

  const ordonnes = melanger(Array.from(groupes.values()), suivant);

  const resultat: DuelContenu[] = [];
  const profondeurMax = Math.max(0, ...ordonnes.map((g) => g.length));
  for (let rang = 0; rang < profondeurMax; rang++) {
    for (const groupe of ordonnes) {
      const duel = groupe[rang];
      if (duel) resultat.push(duel);
    }
  }
  return resultat;
}

/**
 * L'ordre des duels d'une partie.
 *
 * D'abord les situations dont les deux valeurs ont été confirmées ; on complète
 * au besoin avec des situations qui n'en engagent qu'une (elles font découvrir
 * une valeur voisine) ; les variantes ferment la marche, loin de leur jumelle.
 */
export function planifierDuels(
  valeursConfirmees: string[],
  graine = 0,
): DuelContenu[] {
  const connues = new Set(valeursConfirmees);
  if (connues.size === 0) return [];

  const suivant = generateurAleatoire(graine);

  const deuxValeurs = duels.filter(
    (d) => connues.has(d.valeurA) && connues.has(d.valeurB),
  );
  const uneValeur = duels.filter(
    (d) => connues.has(d.valeurA) !== connues.has(d.valeurB),
  );

  const variantesPossibles = repartir(
    deuxValeurs.filter((d) => d.variante),
    suivant,
  );
  const principaux = repartir(
    deuxValeurs.filter((d) => !d.variante),
    suivant,
  );
  const complement = repartir(uneValeur, suivant);

  const plafondPrincipaux = MAX_DUELS - Math.min(variantesPossibles.length, MAX_VARIANTES);
  let plan = principaux.slice(0, plafondPrincipaux);

  if (plan.length < MIN_DUELS) {
    plan = plan.concat(complement.slice(0, MIN_DUELS - plan.length));
  }

  // Une variante ne part que si sa jumelle est effectivement dans la partie :
  // sinon l'écran annonce « déjà croisé, autrement » à propos d'une tension
  // jamais vue, et le calcul de stabilité n'aurait rien à comparer.
  const pairesRetenues = new Set(plan.map((d) => clePaire(d.valeurA, d.valeurB)));
  const variantes = variantesPossibles
    .filter((d) => pairesRetenues.has(clePaire(d.valeurA, d.valeurB)))
    .slice(0, MAX_VARIANTES);

  return plan.slice(0, MAX_DUELS - variantes.length).concat(variantes);
}

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

  if (donnees.some((r) => r.choix === "passer" || r.choix === "je_ne_sais_pas")) {
    return { terminee: true, prochainPalier: null };
  }

  const premier = donnees[0].choix;
  const dernier = donnees[donnees.length - 1];
  if (estDecisif(premier) && estDecisif(dernier.choix) && dernier.choix !== premier) {
    return { terminee: true, prochainPalier: null };
  }

  const suivant = (dernier.palier as number) + 1;
  if (suivant > serie.paliers.length) return { terminee: true, prochainPalier: null };

  return { terminee: false, prochainPalier: suivant };
}

/**
 * Les séries retenues pour une partie.
 *
 * On ne fait basculer que ce qui a été tranché : une série n'a de sens que si
 * la personne a déjà pris position franchement sur cette tension. Les séries
 * dont la dimension a été nommée dans un « ça dépend » passent devant — c'est
 * exactement le réglage que la personne a dit surveiller.
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
  const facteursCites = new Set(
    reponses
      .filter((r) => r.choix === "ca_depend" && r.facteurDepend)
      .map((r) => r.facteurDepend as string),
  );

  const eligibles = series.filter((s) => {
    const paireTranchee = tranchees.has(clePaire(s.valeurA, s.valeurB));
    const deuxValeursConnues = connues.has(s.valeurA) && connues.has(s.valeurB);
    return paireTranchee || deuxValeursConnues;
  });

  // À priorité égale, c'est la graine qui départage — deux parties identiques
  // sur le papier n'explorent pas les mêmes bascules.
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

function versQuestionDuel(duel: DuelContenu): Question {
  return {
    type: "duel",
    dilemmeId: duel.id,
    valeurA: duel.valeurA,
    valeurB: duel.valeurB,
    situation: duel.situation,
    optionA: duel.optionA,
    optionB: duel.optionB,
    contexte: duel.contexte,
    estVariante: duel.variante === true,
    serieId: null,
    palier: null,
    dimension: null,
    reglage: null,
    amorce: null,
  };
}

function versQuestionBascule(serie: SerieBascule, palier: number): Question | null {
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
    serieId: serie.id,
    palier: p.palier,
    dimension: serie.dimension,
    reglage: p.reglage,
    amorce: serie.amorce,
  };
}

/**
 * Où en est la partie, et quelle question vient maintenant.
 *
 * Les arbitrages passent avant les duels : une fois qu'on a joué douze
 * situations, on ne classe plus ses cartes à froid, on classe ce que les
 * situations viennent de remuer.
 */
export function calculerParcours({
  valeursConfirmees,
  reponses,
  cartes = [],
  arbitrages = [],
  graine = 0,
}: EtatPartie): Parcours {
  const arbitrage = prochainArbitrage(cartes, arbitrages, graine);
  const plan = planifierDuels(valeursConfirmees, graine);
  const repondus = new Set(
    reponses.filter((r) => r.dilemmeId != null).map((r) => r.dilemmeId as number),
  );

  const duelRestant = plan.find((d) => !repondus.has(d.id));
  const duelsRepondus = plan.filter((d) => repondus.has(d.id)).length;

  const seriesPlan = planifierSeries(valeursConfirmees, reponses, graine);
  const etats = seriesPlan.map((s) => ({ serie: s, ...etatSerie(s, reponses) }));
  const seriesTerminees = etats.filter((e) => e.terminee).length;

  const base = {
    prochainBloc: null,
    arbitragesPlanifies: arbitrage.plan.length,
    arbitragesRepondus: arbitrage.repondus,
    duelsPlanifies: plan.length,
    duelsRepondus,
    seriesPlanifiees: seriesPlan.length,
    seriesTerminees,
  };

  if (arbitrage.prochain) {
    return {
      ...base,
      phase: "arbitrages",
      prochaine: null,
      prochainBloc: arbitrage.prochain,
    };
  }

  if (duelRestant) {
    return {
      ...base,
      phase: "duels",
      prochaine: versQuestionDuel(duelRestant),
    };
  }

  for (const etat of etats) {
    if (etat.terminee || etat.prochainPalier == null) continue;
    const question = versQuestionBascule(etat.serie, etat.prochainPalier);
    if (question) return { ...base, phase: "bascules", prochaine: question };
  }

  return { ...base, phase: "termine", prochaine: null };
}
