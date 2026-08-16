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

/**
 * Le jeu n'a qu'une forme de duel, et c'est volontaire.
 *
 * Le mécanisme est **asymétrique** : une limite — un geste qu'on refuse — mise
 * en face d'un enjeu — une aspiration à atteindre, un essentiel à préserver.
 *
 *     « Jusqu'où irais-je pour obtenir ou préserver ce qui compte ? »
 *
 * Ce qui est exploré n'est donc pas une préférence, c'est un **prix acceptable**.
 * Opposer deux limites entre elles, ou deux enjeux entre eux, remplirait la
 * matrice n(n−1)/2 plus vite, mais ferait un tournoi de cartes — pas ce jeu-ci.
 * Une paire de valeurs que seule une forme symétrique pourrait couvrir n'est
 * donc jamais posée : elle reste hors de portée, et la couverture le dit.
 */
export type FormeDuelCartes = "limite_enjeu";

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
 * L'énoncé d'un duel : l'enjeu en A, la limite en B.
 *
 * `optionA` protège toujours la valeur de la carte A, `optionB` celle de la
 * carte B — comme partout ailleurs dans le jeu. Dire oui, c'est payer le prix
 * demandé ; dire non, c'est garder la limite.
 */
function formulerDuel(carteA: CarteDuel, carteB: CarteDuel): Enonce {
  const limite = minusculeInitiale(sansPointFinal(carteB.label));
  return {
    situation: `Pour ${formulerEnjeu(carteA)}, il faudrait ${limite}.`,
    optionA: "Je le fais.",
    optionB: "Je ne le fais pas.",
  };
}

/**
 * Ordonne la paire : l'enjeu en A, la limite en B.
 *
 * Rend `null` quand la paire n'est pas une limite contre un enjeu — deux
 * limites, ou deux enjeux. Ce n'est pas un rejet d'éligibilité (les deux cartes
 * peuvent très bien être admissibles l'une à l'autre) : c'est que la question
 * n'existe pas sous cette forme. Le refus vit ici plutôt que dans un filtre
 * ailleurs, pour qu'on ne puisse pas fabriquer un duel symétrique par accident.
 */
function ordonner(
  x: CarteDuel,
  y: CarteDuel,
): { carteA: CarteDuel; carteB: CarteDuel } | null {
  const xEstLimite = x.famille === "lignes_rouges";
  const yEstLimite = y.famille === "lignes_rouges";

  if (xEstLimite && estEnjeu(y)) return { carteA: y, carteB: x };
  if (yEstLimite && estEnjeu(x)) return { carteA: x, carteB: y };
  return null;
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

      // Deux limites, ou deux enjeux : la question n'existe pas sous cette forme.
      const paire = ordonner(x, y);
      if (!paire) continue;

      const { carteA, carteB } = paire;
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
        ...formulerDuel(carteA, carteB),
        forme: "limite_enjeu",
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
