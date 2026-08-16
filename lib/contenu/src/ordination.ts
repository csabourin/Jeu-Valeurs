/**
 * Ordination — le classement émerge des arbitrages.
 *
 * On ne demande jamais à la personne de classer ses valeurs. Elle répond à des
 * collisions concrètes, et l'ordre se déduit de ses réponses.
 *
 * Pourquoi pas un simple compte de victoires. Parce que battre une valeur qui
 * gagne elle-même presque tout n'a pas le même poids que battre une valeur qui
 * perd partout. Le modèle de **Bradley–Terry** attribue à chaque valeur une
 * force telle que la probabilité que i passe devant j vaut
 *
 *     P(i > j) = force(i) / (force(i) + force(j))
 *
 * et cherche les forces qui rendent les réponses observées les plus probables.
 * Un compte de victoires classerait deux valeurs à égalité alors que l'une n'a
 * affronté que des valeurs faibles.
 *
 * Ce que le modèle ne fait pas, volontairement :
 *
 * — Il ne traite pas les cycles comme des erreurs. A > B, B > C, C > A est
 *   parfaitement possible et parfaitement humain ; les trois forces sortent
 *   simplement voisines, et c'est un excellent endroit où creuser ensuite.
 * — Il ne conclut jamais qu'une valeur « ne compte pas ». Une limite franchie
 *   dans une situation dit qu'à ce moment-là, cet enjeu-là est passé devant.
 *   Rien de plus.
 */

import { cleValeurs, type Collision } from "./collisions";

/** Force du joueur fantôme contre lequel chaque valeur joue quelques tours. */
const FORCE_FANTOME = 1;
/**
 * Tours virtuels *gagnés* contre le fantôme — et autant de perdus. Sans eux,
 * une valeur qui n'a jamais cédé aurait une force infinie et écraserait tout le
 * classement. Une valeur peu jouée est ainsi ramenée vers le milieu,
 * proportionnellement à ce qu'on ignore d'elle.
 *
 * Les deux côtés comptent, sinon le fantôme ne fait que distribuer des
 * victoires : il ne retient plus rien et les forces repartent à l'infini.
 */
const TOURS_FANTOME = 0.5;

const ITERATIONS_MAX = 500;
const CONVERGENCE = 1e-9;

/** Ce qu'une réponse à une collision apprend, réduit au niveau des valeurs. */
export interface Observation {
  valeurEnjeu: string;
  valeurLimite: string;
  /** Null quand la personne n'a pas tranché. */
  gagnante: string | null;
  perdante: string | null;
  indecise: boolean;
  limiteId: string;
  enjeuId: string;
}

export interface RangValeur {
  valeur: string;
  /** Force Bradley–Terry, normalisée pour que la moyenne géométrique vaille 1. */
  force: number;
  /** Rang dans le classement, à partir de 1. Les ex æquo partagent le rang. */
  rang: number;
  confrontations: number;
  gagnees: number;
  perdues: number;
  indecises: number;
}

/** Une réponse enregistrée, réduite à ce dont l'ordination a besoin. */
export interface ReponseCollision {
  dilemmeId: number | null;
  choix: string;
}

function estDecisif(choix: string): boolean {
  return choix === "A" || choix === "B";
}

/**
 * Traduit les réponses en observations sur les valeurs.
 *
 * C'est ici que la carte redevient ce qu'elle est : un véhicule narratif. Ce
 * qu'on garde, c'est qu'une valeur est passée devant une autre — pas qu'une
 * carte a battu une carte.
 */
export function observer(
  collisions: Collision[],
  reponses: ReponseCollision[],
): Observation[] {
  const parId = new Map(collisions.map((c) => [c.id, c]));
  const observations: Observation[] = [];

  for (const reponse of reponses) {
    if (reponse.dilemmeId == null) continue;
    const collision = parId.get(reponse.dilemmeId);
    if (!collision) continue;
    if (reponse.choix === "passer") continue;

    const decisif = estDecisif(reponse.choix);
    // « Oui, je franchirais » (A) fait passer l'enjeu devant la limite.
    const gagnante = decisif
      ? reponse.choix === "A"
        ? collision.valeurA
        : collision.valeurB
      : null;
    const perdante = decisif
      ? reponse.choix === "A"
        ? collision.valeurB
        : collision.valeurA
      : null;

    observations.push({
      valeurEnjeu: collision.valeurA,
      valeurLimite: collision.valeurB,
      gagnante,
      perdante,
      indecise: !decisif,
      limiteId: collision.limiteId,
      enjeuId: collision.enjeuId,
    });
  }

  return observations;
}

/**
 * Le classement des valeurs, par Bradley–Terry.
 *
 * Algorithme MM (minorisation-maximisation) : à chaque tour, la force de i
 * devient ses victoires divisées par la somme, sur tous ses adversaires, du
 * nombre de rencontres rapporté à la somme des deux forces. Il converge sans
 * réglage et ne demande pas de dérivées.
 */
export function ordonner(observations: Observation[]): RangValeur[] {
  const valeurs = new Set<string>();
  for (const o of observations) {
    valeurs.add(o.valeurEnjeu);
    valeurs.add(o.valeurLimite);
  }
  if (valeurs.size === 0) return [];

  const liste = Array.from(valeurs).sort();
  const index = new Map(liste.map((v, i) => [v, i]));
  const n = liste.length;

  const victoires = new Array(n).fill(0);
  const defaites = new Array(n).fill(0);
  const indecises = new Array(n).fill(0);
  // rencontres[i][j] : combien de fois i et j se sont trouvés face à face.
  const rencontres = Array.from({ length: n }, () => new Array(n).fill(0));

  for (const o of observations) {
    const i = index.get(o.valeurEnjeu)!;
    const j = index.get(o.valeurLimite)!;
    if (i === j) continue;

    rencontres[i][j]++;
    rencontres[j][i]++;

    if (o.indecise) {
      indecises[i]++;
      indecises[j]++;
      continue;
    }

    const gagnant = index.get(o.gagnante as string)!;
    const perdant = index.get(o.perdante as string)!;
    victoires[gagnant]++;
    defaites[perdant]++;
  }

  // Les rencontres indécises comptent comme rencontres — elles disent que les
  // deux valeurs sont proches — mais n'attribuent aucune victoire. Le modèle
  // les lit naturellement comme un signe d'égalité.
  let forces = new Array(n).fill(1);

  for (let tour = 0; tour < ITERATIONS_MAX; tour++) {
    const suivantes = new Array(n).fill(0);

    for (let i = 0; i < n; i++) {
      // Le fantôme joue deux fois `TOURS_FANTOME` parties : une moitié gagnée,
      // une moitié perdue.
      let denominateur = (2 * TOURS_FANTOME) / (forces[i] + FORCE_FANTOME);
      for (let j = 0; j < n; j++) {
        if (i === j || rencontres[i][j] === 0) continue;
        denominateur += rencontres[i][j] / (forces[i] + forces[j]);
      }
      const numerateur = victoires[i] + TOURS_FANTOME;
      suivantes[i] = denominateur > 0 ? numerateur / denominateur : forces[i];
    }

    // Normalisation par la moyenne géométrique : les forces restent centrées
    // sur 1, donc lisibles, et le critère d'arrêt ne dérive pas.
    const logMoyenne =
      suivantes.reduce((s, f) => s + Math.log(Math.max(f, 1e-12)), 0) / n;
    const facteur = Math.exp(-logMoyenne);
    for (let i = 0; i < n; i++) suivantes[i] *= facteur;

    let ecart = 0;
    for (let i = 0; i < n; i++) {
      ecart = Math.max(ecart, Math.abs(suivantes[i] - forces[i]));
    }
    forces = suivantes;
    if (ecart < CONVERGENCE) break;
  }

  const classement = liste
    .map((valeur, i) => ({
      valeur,
      force: forces[i],
      rang: 0,
      confrontations: victoires[i] + defaites[i] + indecises[i],
      gagnees: victoires[i],
      perdues: defaites[i],
      indecises: indecises[i],
    }))
    .sort((a, b) => b.force - a.force || a.valeur.localeCompare(b.valeur));

  // Les ex æquo partagent le rang : deux valeurs que rien ne départage ne
  // doivent pas être présentées comme 3e et 4e.
  let rang = 0;
  let precedente: number | null = null;
  classement.forEach((entree, position) => {
    if (precedente === null || Math.abs(entree.force - precedente) > 1e-6) {
      rang = position + 1;
      precedente = entree.force;
    }
    entree.rang = rang;
  });

  return classement;
}

export interface Bascule {
  limiteId: string;
  limiteLabel: string;
  /** L'enjeu le plus fort devant lequel la limite a tenu. */
  tientDevant: { enjeuId: string; enjeuLabel: string; force: number } | null;
  /** L'enjeu le plus faible devant lequel la limite a cédé. */
  cedeDevant: { enjeuId: string; enjeuLabel: string; force: number } | null;
  /** Aucune des collisions jouées n'a fait franchir cette limite. */
  jamaisFranchie: boolean;
  /** Toutes les collisions jouées l'ont fait franchir. */
  toujoursFranchie: boolean;
  /**
   * La limite a cédé devant un enjeu plus faible que celui devant lequel elle
   * a tenu. Ce n'est pas une incohérence à corriger : c'est le signe que le
   * contexte, et non le poids de l'enjeu, a fait la différence. C'est
   * exactement là que la deuxième passe a quelque chose à chercher.
   */
  ordreInverse: boolean;
}

/**
 * Les points de bascule, limite par limite.
 *
 * La question posée est : **quelle importance doit avoir l'enjeu pour que cette
 * limite devienne franchissable ?** On range donc les enjeux qu'une limite a
 * rencontrés selon la force que l'ordination leur reconnaît, et on cherche la
 * frontière entre ceux qui l'ont fait céder et ceux devant lesquels elle a
 * tenu.
 */
export function trouverBascules(
  collisions: Collision[],
  reponses: ReponseCollision[],
  classement: RangValeur[],
): Bascule[] {
  const forceParValeur = new Map(classement.map((r) => [r.valeur, r.force]));
  const parId = new Map(collisions.map((c) => [c.id, c]));
  const parLimite = new Map<
    string,
    { label: string; joues: { collision: Collision; franchie: boolean }[] }
  >();

  for (const reponse of reponses) {
    if (reponse.dilemmeId == null || !estDecisif(reponse.choix)) continue;
    const collision = parId.get(reponse.dilemmeId);
    if (!collision) continue;

    const groupe = parLimite.get(collision.limiteId) ?? {
      label: collision.limiteLabel,
      joues: [],
    };
    groupe.joues.push({ collision, franchie: reponse.choix === "A" });
    parLimite.set(collision.limiteId, groupe);
  }

  const bascules: Bascule[] = [];

  for (const [limiteId, groupe] of parLimite) {
    const force = (c: Collision) => forceParValeur.get(c.valeurA) ?? 0;

    const franchies = groupe.joues.filter((j) => j.franchie);
    const tenues = groupe.joues.filter((j) => !j.franchie);

    // Le plus fort devant lequel elle a tenu, le plus faible devant lequel elle
    // a cédé : c'est entre les deux que passe la frontière.
    const tientDevant = tenues.length
      ? tenues.reduce((a, b) =>
          force(a.collision) >= force(b.collision) ? a : b,
        )
      : null;
    const cedeDevant = franchies.length
      ? franchies.reduce((a, b) =>
          force(a.collision) <= force(b.collision) ? a : b,
        )
      : null;

    const decrire = (j: { collision: Collision } | null) =>
      j
        ? {
            enjeuId: j.collision.enjeuId,
            enjeuLabel: j.collision.enjeuLabel,
            force: force(j.collision),
          }
        : null;

    bascules.push({
      limiteId,
      limiteLabel: groupe.label,
      tientDevant: decrire(tientDevant),
      cedeDevant: decrire(cedeDevant),
      jamaisFranchie: franchies.length === 0,
      toujoursFranchie: tenues.length === 0,
      ordreInverse:
        tientDevant !== null &&
        cedeDevant !== null &&
        force(cedeDevant.collision) < force(tientDevant.collision),
    });
  }

  return bascules.sort((a, b) => a.limiteLabel.localeCompare(b.limiteLabel));
}

/**
 * Une tension : un couple de valeurs revu plusieurs fois, à travers des cartes
 * différentes. C'est la mesure naturelle de la stabilité — on ne demande pas à
 * la personne si elle pense être cohérente, on regarde si l'ordre tient quand
 * la mise en scène change.
 */
export interface Tension {
  valeurA: string;
  valeurB: string;
  rencontres: number;
  indecises: number;
  /** Null tant que le couple n'a pas été tranché au moins deux fois. */
  stable: boolean | null;
}

export function mesurerTensions(observations: Observation[]): Tension[] {
  const groupes = new Map<string, Observation[]>();
  for (const o of observations) {
    const cle = cleValeurs(o.valeurEnjeu, o.valeurLimite);
    const groupe = groupes.get(cle);
    if (groupe) groupe.push(o);
    else groupes.set(cle, [o]);
  }

  const tensions: Tension[] = [];
  for (const groupe of groupes.values()) {
    const tranchees = groupe.filter((o) => !o.indecise);
    const [valeurA, valeurB] = [
      groupe[0].valeurEnjeu,
      groupe[0].valeurLimite,
    ].sort();

    tensions.push({
      valeurA,
      valeurB,
      rencontres: groupe.length,
      indecises: groupe.length - tranchees.length,
      stable:
        tranchees.length >= 2
          ? tranchees.every((o) => o.gagnante === tranchees[0].gagnante)
          : null,
    });
  }

  return tensions.sort(
    (a, b) =>
      b.rencontres - a.rencontres ||
      a.valeurA.localeCompare(b.valeurA) ||
      a.valeurB.localeCompare(b.valeurB),
  );
}
