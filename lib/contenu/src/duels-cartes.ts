/**
 * Duels entre les cartes de la personne.
 *
 * C'est le mécanisme de comparaison principal : deux cartes qu'elle a choisies,
 * une question courte, un choix. Rien d'autre pendant la première passe — pas
 * d'échelle de difficulté, pas de « referais-tu le même choix ? ». Les
 * questions d'approfondissement existent, mais plus tard (`exploration.ts`).
 *
 * ## Ce qui se compare vraiment
 *
 * Une carte est une **manifestation** d'une valeur, jamais la valeur elle-même.
 * Deux cartes qui portent la même valeur ne s'affrontent donc pas, et une même
 * paire de valeurs peut revenir plus tard portée par deux autres cartes : c'est
 * ce qui permet de tester la stabilité sans reposer exactement la même
 * question. L'admissibilité est décidée par `eligibilite.ts`, jamais par « les
 * deux libellés sont différents ».
 *
 * ## La personne grammaticale
 *
 * Les cartes sont écrites au « je ». Les énoncés générés ici le sont donc aussi
 * — ou restent impersonnels. Aucun « tu » ne se glisse dans un duel de cartes :
 * « Serais-**tu** prêt à mentir à quelqu'un qui **me** fait confiance ? » oblige
 * à deviner qui parle. Les situations écrites à la main (`duels.ts`) sont, elles,
 * entièrement au « tu » : chaque duel reste cohérent avec lui-même.
 */

import type { Famille } from "./cartes";
import {
  duelCartesAdmissible,
  valeurPortee,
  type CarteComparable,
} from "./eligibilite";
import { clePaire } from "./comparaisons";

/** À partir d'ici, l'identifiant désigne un duel de cartes, jamais une situation écrite. */
export const BASE_ID_DUEL_CARTE = 1_000_000_000;

export interface CarteDuel extends CarteComparable {
  id: string;
  famille: Famille;
  label: string;
  valeursConfirmees?: string[];
}

export type FormeDuelCartes =
  | "limite_enjeu"
  | "enjeu_enjeu"
  | "limite_limite";

export interface DuelCarteContenu {
  id: number;
  /** Valeur protégée par `optionA`. */
  valeurA: string;
  /** Valeur protégée par `optionB`. */
  valeurB: string;
  situation: string;
  optionA: string;
  optionB: string;
  forme: FormeDuelCartes;
  carteAId: string;
  carteALabel: string;
  carteBId: string;
  carteBLabel: string;
}

export function estDuelCarte(dilemmeId: number): boolean {
  return dilemmeId >= BASE_ID_DUEL_CARTE;
}

function minusculeInitiale(texte: string): string {
  return texte.length > 0
    ? texte[0].toLocaleLowerCase("fr") + texte.slice(1)
    : texte;
}

function sansPointFinal(texte: string): string {
  return texte.replace(/\s*[.!?]+\s*$/, "");
}

/** FNV-1a : identifiant numérique stable à partir des deux cartes de session. */
function empreinte(texte: string): number {
  let resultat = 0x811c9dc5;
  for (let i = 0; i < texte.length; i++) {
    resultat ^= texte.charCodeAt(i);
    resultat = Math.imul(resultat, 0x01000193);
  }
  return resultat >>> 0;
}

function estEnjeu(carte: CarteDuel): boolean {
  return carte.famille === "horizons" || carte.famille === "tresors";
}

/** « garder le calme chez moi » / « devenir bon dans mon métier ». */
function formulerEnjeu(carte: CarteDuel): string {
  const label = minusculeInitiale(sansPointFinal(carte.label));
  return carte.famille === "tresors" ? `garder ${label}` : label;
}

interface Enonce {
  situation: string;
  optionA: string;
  optionB: string;
}

/**
 * L'énoncé d'un duel, selon ce que les deux cartes sont.
 *
 * `optionA` protège toujours la valeur de la carte A, `optionB` celle de la
 * carte B — comme partout ailleurs dans le jeu.
 */
function formulerDuel(
  carteA: CarteDuel,
  carteB: CarteDuel,
  forme: FormeDuelCartes,
): Enonce {
  if (forme === "limite_enjeu") {
    // A est l'enjeu, B la limite : dire oui protège l'enjeu, dire non protège
    // la limite.
    const limite = minusculeInitiale(sansPointFinal(carteB.label));
    return {
      situation: `Pour ${formulerEnjeu(carteA)}, il faudrait ${limite}.`,
      optionA: "Je le fais.",
      optionB: "Je ne le fais pas.",
    };
  }

  if (forme === "limite_limite") {
    return {
      situation: "Une des deux limites va céder. Laquelle est-ce que je garde ?",
      optionA: `Je garde cette limite : ${sansPointFinal(carteA.label)}`,
      optionB: `Je garde cette limite : ${sansPointFinal(carteB.label)}`,
    };
  }

  return {
    situation: "Il faut choisir : un des deux passe en premier.",
    optionA: `Je choisis : ${sansPointFinal(carteA.label)}`,
    optionB: `Je choisis : ${sansPointFinal(carteB.label)}`,
  };
}

/**
 * Ordonne la paire pour que la carte A soit toujours celle dont l'option A
 * protège la valeur — et, dans un duel limite/enjeu, que l'enjeu soit en A.
 */
function ordonner(
  x: CarteDuel,
  y: CarteDuel,
): { carteA: CarteDuel; carteB: CarteDuel; forme: FormeDuelCartes } {
  const xEstLimite = x.famille === "lignes_rouges";
  const yEstLimite = y.famille === "lignes_rouges";

  if (xEstLimite && yEstLimite) {
    return { carteA: x, carteB: y, forme: "limite_limite" };
  }
  if (xEstLimite && estEnjeu(y)) {
    return { carteA: y, carteB: x, forme: "limite_enjeu" };
  }
  if (yEstLimite && estEnjeu(x)) {
    return { carteA: x, carteB: y, forme: "limite_enjeu" };
  }
  return { carteA: x, carteB: y, forme: "enjeu_enjeu" };
}

/**
 * Tous les duels de cartes possibles, admissibilité comprise.
 *
 * Sert aussi à la page de résultats : un identifiant enregistré doit pouvoir
 * retrouver le texte exact de la question qui a été posée.
 */
export function duelsCartesPossibles(cartes: CarteDuel[]): DuelCarteContenu[] {
  const triees = [...cartes].sort((a, b) => a.id.localeCompare(b.id));
  const utilises = new Set<number>();
  const resultat: DuelCarteContenu[] = [];

  for (let i = 0; i < triees.length; i++) {
    for (let j = i + 1; j < triees.length; j++) {
      const x = triees[i];
      const y = triees[j];
      if (!duelCartesAdmissible(x, y).admissible) continue;

      const { carteA, carteB, forme } = ordonner(x, y);
      const valeurA = valeurPortee(carteA);
      const valeurB = valeurPortee(carteB);
      if (!valeurA || !valeurB) continue;

      let id =
        BASE_ID_DUEL_CARTE +
        (empreinte(`${carteA.id}|${carteB.id}`) % 900_000_000);
      // Une collision d'empreinte ferait passer deux duels pour le même.
      while (utilises.has(id)) id++;
      utilises.add(id);

      resultat.push({
        id,
        valeurA,
        valeurB,
        ...formulerDuel(carteA, carteB, forme),
        forme,
        carteAId: carteA.id,
        carteALabel: carteA.label,
        carteBId: carteB.id,
        carteBLabel: carteB.label,
      });
    }
  }

  return resultat;
}

/** Les duels de cartes qui servent une paire de valeurs donnée. */
export function duelsCartesPourPaire(
  duels: DuelCarteContenu[],
  valeurA: string,
  valeurB: string,
): DuelCarteContenu[] {
  const cible = clePaire(valeurA, valeurB);
  return duels.filter((d) => clePaire(d.valeurA, d.valeurB) === cible);
}

/** Les paires de valeurs que les cartes de la personne rendent jouables. */
export function pairesJouables(duels: DuelCarteContenu[]): [string, string][] {
  const vues = new Map<string, [string, string]>();
  for (const duel of duels) {
    const cle = clePaire(duel.valeurA, duel.valeurB);
    if (!vues.has(cle)) vues.set(cle, [duel.valeurA, duel.valeurB]);
  }
  return Array.from(vues.values());
}
