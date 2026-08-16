/**
 * Parcours — quelle question vient ensuite.
 *
 * Reproductible, sans être identique d'une partie à l'autre : mêmes cartes +
 * mêmes réponses + **même graine** ⇒ même question suivante. Rafraîchir la page
 * ne change donc rien à la partie en cours, alors que deux parties bâties sur
 * les mêmes cartes ne servent pas la même sélection.
 *
 * Le jeu explore **le prix qu'on est prêt à payer pour ce qui compte**. Tout
 * passe par une seule mécanique, asymétrique : une limite en face d'un enjeu.
 *
 *     « Serais-tu prêt à franchir cette limite
 *       pour obtenir ou préserver cet enjeu ? »
 *
 * Les valeurs restent dessous, et le classement **émerge** des arbitrages : on
 * ne demande jamais à la personne de classer ses valeurs elle-même.
 *
 * Cinq phases :
 *   1. arbitrages — les cartes de la personne comparées entre elles, à froid,
 *                   avant que la moindre situation ait pu déplacer l'ordre ;
 *   2. duels      — la première vague de collisions : un exemplaire de chaque
 *                   couple de valeurs, pour qu'un premier portrait ait un sens ;
 *   3. portrait   — on montre l'ordination obtenue, et on propose de la mettre
 *                   à l'épreuve. C'est une porte, pas une fin ;
 *   4. bascules   — l'approfondissement : les collisions les plus informatives
 *                   d'abord, choisies par le moteur d'exploration ;
 *   5. termine    — plus rien d'admissible à jouer.
 *
 * La première passe reste volontairement légère : la question, quatre réponses,
 * rien d'autre. Les questions sur la difficulté, la certitude ou « qu'est-ce
 * que tu protégeais » cassent le rythme quand elles suivent chaque collision ;
 * elles appartiennent à la phase d'approfondissement, une fois que la personne
 * a déjà quelque chose à elle sous les yeux.
 */

import { generateurAleatoire } from "./hasard";
import {
  prochainArbitrage,
  type BlocArbitrage,
  type CarteArbitrable,
  type ReponseArbitrage,
} from "./arbitrages";
import {
  planifierCollisions,
  type CarteJeu,
  type Collision,
} from "./collisions";
import {
  observer,
  ordonner,
  mesurerTensions,
  trouverBascules,
  type RangValeur,
} from "./ordination";
import { classerExploration } from "./exploration";

export type ChoixConnu = "A" | "B" | "ca_depend" | "je_ne_sais_pas" | "passer";

export interface ReponseConnue {
  dilemmeId: number | null;
  valeurA: string;
  valeurB: string;
  choix: string;
  facteurDepend?: string | null;
}

export type PhaseParcours =
  "arbitrages" | "duels" | "portrait" | "bascules" | "termine";

export interface Question {
  type: "collision";
  dilemmeId: number;
  /** La valeur que « oui » fait passer devant. */
  valeurA: string;
  /** La valeur que « non » fait tenir. */
  valeurB: string;
  situation: string;
  optionA: string;
  optionB: string;
  limiteLabel: string;
  enjeuLabel: string;
  enjeuFamille: "horizons" | "tresors";
  /** Vrai si ce couple de valeurs a déjà été vu à travers d'autres cartes. */
  estReprise: boolean;
  /**
   * Vrai pendant l'approfondissement seulement. C'est le seul moment où l'on
   * pose les questions de difficulté, de certitude et de valeur protégée.
   */
  approfondissement: boolean;
  /** Pourquoi cette collision a été choisie. Vide pendant la première vague. */
  motifs: string[];
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
  /** Taille de la première vague — ce qu'il faut jouer pour voir le portrait. */
  duelsPlanifies: number;
  duelsRepondus: number;
  /** Collisions admissibles au total, première vague comprise. */
  collisionsPossibles: number;
  collisionsRepondues: number;
  /**
   * Le classement tel qu'il se présente à cet instant.
   *
   * Vide tant que la première vague n'est pas finie : le portrait n'existe pas
   * encore, et l'ajuster à chaque réponse coûterait un modèle complet par appel
   * pour un résultat que personne ne regarde.
   */
  classement: RangValeur[];
}

/** Ce que le parcours a besoin de savoir de la partie en cours. */
export interface EtatPartie {
  reponses: ReponseConnue[];
  /** Les cartes retenues par la personne. Vide ⇒ rien à jouer. */
  cartes?: CarteArbitrable[];
  arbitrages?: ReponseArbitrage[];
  graine?: number;
  /**
   * Vrai une fois que la personne a vu son portrait et demandé à le mettre à
   * l'épreuve. Sans ce drapeau, le portrait serait sauté et la deuxième passe
   * ressemblerait à la première qui continue.
   */
  approfondissementDemande?: boolean;
}

function versCarteJeu(carte: CarteArbitrable): CarteJeu {
  return {
    id: carte.id,
    famille: carte.famille,
    label: carte.label,
    valeurs: carte.valeursConfirmees ?? [],
  };
}

function versQuestion(
  collision: Collision,
  options: {
    estReprise: boolean;
    approfondissement: boolean;
    motifs: string[];
  },
): Question {
  return {
    type: "collision",
    dilemmeId: collision.id,
    valeurA: collision.valeurA,
    valeurB: collision.valeurB,
    situation: collision.situation,
    optionA: collision.optionA,
    optionB: collision.optionB,
    limiteLabel: collision.limiteLabel,
    enjeuLabel: collision.enjeuLabel,
    enjeuFamille: collision.enjeuFamille,
    ...options,
  };
}

/**
 * Où en est la partie, et quelle question vient maintenant.
 *
 * Les arbitrages passent avant les collisions : une fois qu'on a joué des
 * situations, on ne classe plus ses cartes à froid, on classe ce que les
 * situations viennent de remuer.
 */
export function calculerParcours({
  reponses,
  cartes = [],
  arbitrages = [],
  graine = 0,
  approfondissementDemande = false,
}: EtatPartie): Parcours {
  const arbitrage = prochainArbitrage(cartes, arbitrages, graine);
  const plan = planifierCollisions(cartes.map(versCarteJeu), graine);
  const toutes = [...plan.premiereVague, ...plan.approfondissement];

  const repondus = new Set(
    reponses
      .filter((r) => r.dilemmeId != null)
      .map((r) => r.dilemmeId as number),
  );

  const restantPremiereVague = plan.premiereVague.filter(
    (c) => !repondus.has(c.id),
  );
  const restantApprofondissement = plan.approfondissement.filter(
    (c) => !repondus.has(c.id),
  );

  // Le modèle ne se calcule qu'une fois la première vague complète : avant, il
  // n'y a pas de portrait à montrer et rien ne s'en sert pour choisir la
  // question suivante.
  const portraitPret =
    arbitrage.prochain === null && restantPremiereVague.length === 0;
  const observations = portraitPret ? observer(toutes, reponses) : [];
  const classement = portraitPret ? ordonner(observations) : [];

  const base = {
    prochainBloc: null,
    arbitragesPlanifies: arbitrage.plan.length,
    arbitragesRepondus: arbitrage.repondus,
    duelsPlanifies: plan.premiereVague.length,
    duelsRepondus: plan.premiereVague.filter((c) => repondus.has(c.id)).length,
    collisionsPossibles: plan.total,
    collisionsRepondues: toutes.filter((c) => repondus.has(c.id)).length,
    classement,
  };

  if (arbitrage.prochain) {
    return {
      ...base,
      phase: "arbitrages",
      prochaine: null,
      prochainBloc: arbitrage.prochain,
    };
  }

  if (restantPremiereVague.length > 0) {
    return {
      ...base,
      phase: "duels",
      prochaine: versQuestion(restantPremiereVague[0], {
        estReprise: false,
        approfondissement: false,
        motifs: [],
      }),
    };
  }

  if (restantApprofondissement.length === 0) {
    return { ...base, phase: "termine", prochaine: null };
  }

  // Le portrait est une porte : la personne voit ce que ses premiers choix
  // dessinent, puis décide si elle veut le mettre à l'épreuve.
  if (!approfondissementDemande) {
    return { ...base, phase: "portrait", prochaine: null };
  }

  const tensions = mesurerTensions(observations);
  const bascules = trouverBascules(toutes, reponses, classement);
  const classees = classerExploration(restantApprofondissement, {
    classement,
    tensions,
    bascules,
  });

  const choisie = classees[0];
  return {
    ...base,
    phase: "bascules",
    prochaine: versQuestion(choisie.collision, {
      estReprise: true,
      approfondissement: true,
      motifs: choisie.motifs,
    }),
  };
}

/**
 * Une graine de partie. Deux parties bâties sur les mêmes cartes n'explorent
 * pas les collisions dans le même ordre.
 */
export function tirerGraine(source = Date.now()): number {
  const suivant = generateurAleatoire(source);
  return Math.floor(suivant() * 0xffffff);
}
