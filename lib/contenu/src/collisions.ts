/**
 * Collisions — le cœur du jeu.
 *
 * Le mécanisme est asymétrique, et c'est tout l'intérêt. On n'oppose pas deux
 * cartes au hasard pour remplir une matrice : on met une **limite** — un geste
 * que la personne dit ne pas vouloir franchir — en face d'un **enjeu** — une
 * aspiration qu'elle veut atteindre, ou un essentiel qu'elle veut préserver.
 *
 *                          ENJEU
 *                    ┌───────────────┐
 *                    │  Aspiration   │
 *     Limite ────────┤      OU       │
 *                    │   Essentiel   │
 *                    └───────────────┘
 *
 *     « Serais-tu prêt à franchir cette limite
 *       pour obtenir ou préserver cet enjeu ? »
 *
 * Ce qui est exploré n'est donc pas une préférence, c'est un **prix acceptable**.
 * Deux limites entre elles, ou deux aspirations entre elles, ne se rencontrent
 * jamais : ce serait un tournoi de cartes, pas ce jeu-ci.
 *
 * Les valeurs restent dessous. La carte est le véhicule narratif ; ce que la
 * réponse enregistre, c'est qu'une valeur portée par l'enjeu est passée devant
 * une valeur portée par la limite, ou l'inverse. C'est de ces observations que
 * l'ordination émerge — on ne demande jamais à la personne de classer ses
 * valeurs elle-même.
 *
 * Aucun plafond arbitraire. Toutes les collisions admissibles finissent par
 * être jouables ; elles sont seulement servies par vagues, pour qu'un premier
 * portrait arrive vite au lieu d'attendre la fin d'une longue série.
 */

import type { Famille } from "./cartes";
import { generateurAleatoire, melanger } from "./hasard";
import { peutEntrerEnCollision, type Distance } from "./eligibilite";

/**
 * Les collisions sont numérotées au-dessus de tout contenu écrit à la main :
 * un identifiant enregistré désigne sans ambiguïté une collision, alors que
 * tout voyage dans la même table de réponses.
 */
export const SOCLE_ID_COLLISION = 1_000_000_000;

/**
 * Combien de collisions au maximum avant de montrer le premier portrait.
 *
 * Ce n'est **pas** un plafond sur la partie : tout ce qui reste admissible se
 * joue ensuite, et « mettre à l'épreuve » poursuit jusqu'à épuisement. C'est un
 * seuil de patience. Le nombre de couples croît en n(n−1)/2 : à huit valeurs on
 * est à 28, à quinze à 105 — au-delà d'une vingtaine, la personne répond à une
 * série plutôt qu'à des questions, et le premier portrait arrive trop tard pour
 * lui donner envie de continuer.
 */
export const PLAFOND_PREMIERE_VAGUE = 24;

/** Vrai si cet identifiant de réponse désigne une collision entre deux cartes. */
export function estCollision(dilemmeId: number): boolean {
  return dilemmeId >= SOCLE_ID_COLLISION;
}

/** Les deux familles qui peuvent tenir le rôle d'enjeu. */
export type FamilleEnjeu = "horizons" | "tresors";

export interface CarteJeu {
  id: string;
  famille: Famille;
  label: string;
  /** Les valeurs que la personne a confirmées pour cette carte. */
  valeurs: string[];
}

export interface Collision {
  id: number;
  /** La question, telle qu'elle est posée. */
  situation: string;
  /** Répondre « oui » fait passer l'enjeu devant la limite. */
  optionA: string;
  /** Répondre « non » laisse la limite tenir. */
  optionB: string;
  /** Valeur principale portée par l'enjeu — celle que « oui » fait gagner. */
  valeurA: string;
  /** Valeur principale protégée par la limite — celle que « non » fait tenir. */
  valeurB: string;
  /** Toutes les valeurs en jeu, pour l'agrégation. */
  valeursEnjeu: string[];
  valeursLimite: string[];
  limiteId: string;
  limiteLabel: string;
  enjeuId: string;
  enjeuLabel: string;
  enjeuFamille: FamilleEnjeu;
  /** À quelle distance les deux valeurs principales se trouvent. */
  distance: Distance;
}

function minusculeInitiale(texte: string): string {
  return texte.length > 0
    ? texte[0].toLocaleLowerCase("fr") + texte.slice(1)
    : texte;
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

/**
 * La question. Une aspiration s'obtient, un essentiel se garde — la nuance
 * change le verbe, et c'est elle qui distingue « pour voyager davantage » de
 * « pour garder ma relation avec mes enfants ».
 */
function redigerSituation(limite: CarteJeu, enjeu: CarteJeu): string {
  const acte = minusculeInitiale(limite.label);
  const but =
    enjeu.famille === "tresors"
      ? `garder ${minusculeInitiale(enjeu.label)}`
      : minusculeInitiale(enjeu.label);
  return `Serais-tu prêt à ${acte} pour ${but} ?`;
}

/** La clé d'un couple de valeurs, indépendante de l'ordre. */
export function cleValeurs(a: string, b: string): string {
  return [a, b].sort().join(" ⇄ ");
}

/**
 * Toutes les collisions admissibles pour cette main de cartes.
 *
 * Sert aussi à la page de résultats, qui doit retrouver le texte d'une question
 * à partir de l'identifiant enregistré — d'où des identifiants stables, qui ne
 * dépendent que des deux cartes et jamais de l'ordre de génération.
 */
export function collisionsPossibles(cartes: CarteJeu[]): Collision[] {
  const limites = cartes
    .filter((c) => c.famille === "lignes_rouges")
    .sort((a, b) => a.id.localeCompare(b.id));
  const enjeux = cartes
    .filter(
      (c): c is CarteJeu & { famille: FamilleEnjeu } =>
        c.famille === "horizons" || c.famille === "tresors",
    )
    .sort((a, b) => a.id.localeCompare(b.id));

  const utilises = new Set<number>();
  const resultat: Collision[] = [];

  for (const limite of limites) {
    for (const enjeu of enjeux) {
      const verdict = peutEntrerEnCollision(limite.valeurs, enjeu.valeurs);
      // Une collision circulaire n'est pas une erreur : c'est du tri normal.
      if (!verdict.admissible) continue;

      let id =
        SOCLE_ID_COLLISION +
        (empreinte(`${limite.id}|${enjeu.id}`) % 900_000_000);
      while (utilises.has(id)) id++;
      utilises.add(id);

      resultat.push({
        id,
        situation: redigerSituation(limite, enjeu),
        optionA: "Oui — je franchirais cette limite.",
        optionB: "Non — cette limite ne se négocie pas.",
        valeurA: enjeu.valeurs[0],
        valeurB: limite.valeurs[0],
        valeursEnjeu: enjeu.valeurs,
        valeursLimite: limite.valeurs,
        limiteId: limite.id,
        limiteLabel: limite.label,
        enjeuId: enjeu.id,
        enjeuLabel: enjeu.label,
        enjeuFamille: enjeu.famille,
        distance: verdict.distance,
      });
    }
  }

  return resultat;
}

export interface PlanCollisions {
  /**
   * La première vague : un exemplaire de chaque couple de valeurs. C'est le
   * minimum pour que chaque valeur soit située par rapport aux autres, donc
   * pour qu'un premier portrait ait un sens.
   */
  premiereVague: Collision[];
  /**
   * Le reste, dans l'ordre. Ce sont les mêmes couples de valeurs vus à travers
   * d'autres cartes : c'est là que se mesure la stabilité, et c'est ce que
   * « Affiner mon classement » sert à poursuivre.
   */
  approfondissement: Collision[];
  /** Toutes les collisions admissibles, premières et suivantes confondues. */
  total: number;
}

/**
 * L'ordre des collisions d'une partie.
 *
 * Deux règles président. D'abord un exemplaire par couple de valeurs, pour que
 * le premier portrait couvre toute la constellation plutôt que d'explorer à
 * fond une seule tension. Ensuite, on évite d'enchaîner deux questions sur la
 * même limite : trois fois de suite « serais-tu prêt à mentir… » donne
 * l'impression que le jeu insiste, et la personne finit par répondre à la
 * série plutôt qu'à la question.
 */
export function planifierCollisions(
  cartes: CarteJeu[],
  graine = 0,
): PlanCollisions {
  const possibles = collisionsPossibles(cartes);
  if (possibles.length === 0) {
    return { premiereVague: [], approfondissement: [], total: 0 };
  }

  const suivant = generateurAleatoire(graine ^ 0xc0b47);
  const melangees = melanger(possibles, suivant);

  // Un seul représentant par couple de valeurs : revoir le même couple sous une
  // autre carte appartient à l'approfondissement, c'est là qu'il mesure la
  // stabilité.
  const couplesVus = new Set<string>();
  const candidates: Collision[] = [];
  const reste: Collision[] = [];

  for (const collision of melangees) {
    const cle = cleValeurs(collision.valeurA, collision.valeurB);
    if (couplesVus.has(cle)) reste.push(collision);
    else {
      couplesVus.add(cle);
      candidates.push(collision);
    }
  }

  // Les collisions qui font entrer une valeur encore jamais vue passent devant.
  // Sans cela, la première vague peut approfondir trois valeurs et en laisser
  // six hors du portrait — et un classement où deux valeurs ne se sont jamais
  // rencontrées, même indirectement, ne veut pas dire grand-chose.
  const valeursVues = new Set<string>();
  const ouvrantes: Collision[] = [];
  const suivantes: Collision[] = [];

  for (const collision of candidates) {
    const nouvelle =
      !valeursVues.has(collision.valeurA) ||
      !valeursVues.has(collision.valeurB);
    valeursVues.add(collision.valeurA);
    valeursVues.add(collision.valeurB);
    (nouvelle ? ouvrantes : suivantes).push(collision);
  }

  const ordonnees = [...ouvrantes, ...suivantes];
  const premiere = ordonnees.slice(0, PLAFOND_PREMIERE_VAGUE);

  return {
    premiereVague: espacerLesLimites(premiere),
    approfondissement: espacerLesLimites([
      ...ordonnees.slice(PLAFOND_PREMIERE_VAGUE),
      ...reste,
    ]),
    total: possibles.length,
  };
}

/**
 * Réordonne pour ne pas enchaîner deux collisions sur la même limite : on prend
 * une collision par limite, puis une deuxième, et ainsi de suite.
 */
function espacerLesLimites(collisions: Collision[]): Collision[] {
  const groupes = new Map<string, Collision[]>();
  for (const c of collisions) {
    const groupe = groupes.get(c.limiteId);
    if (groupe) groupe.push(c);
    else groupes.set(c.limiteId, [c]);
  }

  const ordonnes = Array.from(groupes.values());
  const resultat: Collision[] = [];
  const profondeur = Math.max(0, ...ordonnes.map((g) => g.length));

  for (let rang = 0; rang < profondeur; rang++) {
    for (const groupe of ordonnes) {
      const collision = groupe[rang];
      if (collision) resultat.push(collision);
    }
  }

  return resultat;
}
