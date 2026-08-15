/**
 * Arbitrages — Best-Worst Scaling entre les cartes de la personne.
 *
 * Les duels posent des situations écrites d'avance : ils disent ce qui tient
 * quand ça coûte quelque chose. Les arbitrages posent autre chose, et c'est
 * pour ça qu'ils existent : on met quatre de **ses** cartes côte à côte et on
 * demande laquelle compte le plus, laquelle le moins. Hors situation, à froid.
 *
 * L'écart entre les deux est l'information intéressante — pas une faute. Une
 * carte qu'on met devant toutes les autres et qui plie à la première situation
 * concrète, ce n'est pas une contradiction : c'est là que le jeu a quelque
 * chose à montrer. La phase est donc jouée **avant** les duels, sinon la
 * comparaison ne veut plus rien dire : on mesurerait ce que les situations
 * viennent de mettre en tête, pas ce que la personne apportait en entrant.
 *
 * Pourquoi « le plus » et « le moins » plutôt qu'un classement complet :
 * ordonner huit cartes est une corvée et le milieu du classement ne veut rien
 * dire. Les deux extrêmes d'un petit bloc se choisissent d'un coup d'œil, et
 * répétés sur des blocs qui se recoupent, ils suffisent à situer chaque carte.
 *
 * Le contenu ne connaît pas les cartes de session (elles sont en base) : elles
 * arrivent en paramètre. C'est la seule entorse au principe « le contenu est du
 * code », et elle est forcée — ces cartes appartiennent à la personne.
 */

import { generateurAleatoire, melanger } from "./hasard";
import type { Famille } from "./cartes";

/** Combien de cartes par bloc. Quatre : assez pour discriminer, assez peu pour être lu d'un coup. */
export const TAILLE_BLOC = 4;
/** En dessous, il n'y a pas d'arbitrage possible — un bloc de deux serait un duel déguisé. */
export const MIN_CARTES = 3;
/** Plafond de blocs par partie. Au-delà, la phase devient une corvée. */
export const MAX_BLOCS = 6;
/** Nombre de passages visé par carte. Trois suffisent à séparer le haut du bas. */
const APPARITIONS_VISEES = 3;

/** Une carte de la personne, réduite à ce qu'un bloc a besoin d'afficher. */
export interface CarteArbitrable {
  /** Identifiant de la carte de session, en texte. */
  id: string;
  famille: Famille;
  label: string;
  /** Sert aux combats entre cartes après l'arbitrage. */
  valeursConfirmees?: string[];
}

export interface BlocArbitrage {
  /** Rang du bloc dans la partie, à partir de 1. */
  bloc: number;
  cartes: CarteArbitrable[];
}

/** Ce que la personne a répondu sur un bloc. */
export interface ReponseArbitrage {
  bloc: number;
  carteIds: string[];
  /** Null si le bloc a été passé. */
  carteMeilleure: string | null;
  cartePire: string | null;
}

export interface ScoreCarte {
  carteId: string;
  label: string;
  famille: Famille;
  apparitions: number;
  foisMeilleure: number;
  foisPire: number;
  /** (meilleure − pire) / apparitions, dans [-1, 1]. */
  score: number;
}

function cleBloc(ids: string[]): string {
  return [...ids].sort().join("|");
}

/**
 * Les blocs d'une partie.
 *
 * Chaque bloc est tiré d'un sac qui se recharge : sur un tour complet, une
 * carte ne peut pas repasser avant que toutes les autres soient passées, ce
 * qui répartit les apparitions sans avoir à construire un plan d'expérience.
 *
 * Deux blocs identiques sont écartés — reposer les quatre mêmes cartes
 * n'apprend rien et donne l'impression que le jeu tourne en rond. Avec peu de
 * cartes, il existe peu de blocs distincts : la phase raccourcit d'elle-même
 * plutôt que de se répéter.
 */
export function planifierArbitrages(
  cartes: CarteArbitrable[],
  graine = 0,
): BlocArbitrage[] {
  if (cartes.length < MIN_CARTES) return [];

  const taille = Math.min(TAILLE_BLOC, cartes.length);
  const vises = Math.ceil((cartes.length * APPARITIONS_VISEES) / taille);
  const plafond = Math.min(MAX_BLOCS, Math.max(1, vises));

  const suivant = generateurAleatoire(graine ^ 0xb175);
  const blocs: BlocArbitrage[] = [];
  const dejaVus = new Set<string>();

  let sac: CarteArbitrable[] = [];
  // Avec peu de cartes, les blocs distincts s'épuisent avant le plafond. On
  // s'arrête alors sur ce compteur plutôt que de boucler indéfiniment.
  let essaisRates = 0;

  while (blocs.length < plafond && essaisRates < 12) {
    const bloc: CarteArbitrable[] = [];
    const prises = new Set<string>();

    while (bloc.length < taille) {
      if (sac.length === 0) sac = melanger(cartes, suivant);
      const rang = sac.findIndex((c) => !prises.has(c.id));
      // Le sac ne contient que des cartes déjà dans ce bloc : on le recharge.
      // `taille <= cartes.length` garantit qu'un tour frais fournit toujours
      // une carte manquante, donc la boucle avance.
      if (rang === -1) {
        sac = melanger(cartes, suivant);
        continue;
      }
      const [carte] = sac.splice(rang, 1);
      bloc.push(carte);
      prises.add(carte.id);
    }

    const cle = cleBloc(bloc.map((c) => c.id));
    if (dejaVus.has(cle)) {
      essaisRates++;
      continue;
    }
    dejaVus.add(cle);
    blocs.push({ bloc: blocs.length + 1, cartes: bloc });
  }

  return blocs;
}

/**
 * Le score d'une carte : combien de fois mise devant, moins combien de fois
 * mise derrière, rapporté au nombre de fois où elle a été proposée.
 *
 * Une carte passée (ni meilleure ni pire) compte quand même comme apparition :
 * elle a été vue et pas choisie, ce qui est une information. Un bloc entièrement
 * passé, lui, ne compte pour rien — la personne n'a pas répondu.
 */
export function calculerScoresCartes(
  cartes: CarteArbitrable[],
  reponses: ReponseArbitrage[],
): ScoreCarte[] {
  const parId = new Map(cartes.map((c) => [c.id, c]));
  const compte = new Map<
    string,
    { apparitions: number; meilleure: number; pire: number }
  >();

  for (const carte of cartes) {
    compte.set(carte.id, { apparitions: 0, meilleure: 0, pire: 0 });
  }

  for (const reponse of reponses) {
    // Bloc passé : rien à en tirer.
    if (!reponse.carteMeilleure && !reponse.cartePire) continue;

    for (const id of reponse.carteIds) {
      const entree = compte.get(id);
      if (!entree) continue; // carte retirée de la partie depuis
      entree.apparitions++;
      if (id === reponse.carteMeilleure) entree.meilleure++;
      if (id === reponse.cartePire) entree.pire++;
    }
  }

  return cartes
    .map((carte) => {
      const { apparitions, meilleure, pire } = compte.get(carte.id)!;
      return {
        carteId: carte.id,
        label: parId.get(carte.id)!.label,
        famille: carte.famille,
        apparitions,
        foisMeilleure: meilleure,
        foisPire: pire,
        score: apparitions > 0 ? (meilleure - pire) / apparitions : 0,
      };
    })
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
}

/**
 * Où en est la phase d'arbitrage.
 *
 * Un bloc compte comme répondu dès qu'il porte une réponse, passée ou non :
 * sinon un bloc écarté reviendrait sans fin.
 */
export function prochainArbitrage(
  cartes: CarteArbitrable[],
  reponses: ReponseArbitrage[],
  graine = 0,
): { plan: BlocArbitrage[]; repondus: number; prochain: BlocArbitrage | null } {
  const plan = planifierArbitrages(cartes, graine);
  const faits = new Set(reponses.map((r) => r.bloc));
  const prochain = plan.find((b) => !faits.has(b.bloc)) ?? null;
  return {
    plan,
    repondus: plan.filter((b) => faits.has(b.bloc)).length,
    prochain,
  };
}
