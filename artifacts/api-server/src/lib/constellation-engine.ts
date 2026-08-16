/**
 * Constellation — ce que les collisions jouées permettent de dire.
 *
 * Le moteur ne prouve jamais qu'une personne est incohérente, et ne conclut
 * jamais qu'une valeur « ne compte pas ». Une limite franchie dans une
 * situation dit qu'à ce moment-là, cet enjeu-là est passé devant — rien de
 * plus. Une limite franchie dans un contexte et pas dans un autre n'est pas une
 * contradiction : c'est l'information la plus intéressante du jeu, puisque
 * quelque chose dans le contexte a changé la priorité.
 *
 * Le classement lui-même vient de `@workspace/contenu` : il émerge des
 * arbitrages par un modèle de Bradley–Terry, et n'est jamais demandé
 * directement à la personne. Ce fichier ne fait que l'habiller de phrases et le
 * croiser avec ce qu'elle a dit à froid pendant les arbitrages.
 */

import {
  planifierCollisions,
  collisionsPossibles,
  observer,
  ordonner,
  mesurerTensions,
  trouverBascules,
  calculerScoresCartes,
  type Famille,
  type ScoreCarte,
  type ReponseArbitrage,
  type CarteJeu,
  type RangValeur,
  type Bascule,
  type Tension,
} from "@workspace/contenu";

/**
 * 4 : le classement vient d'un modèle Bradley–Terry sur les collisions
 * limite × enjeu. Une constellation calculée en version 3 comptait des duels
 * écrits à l'avance et des séries de bascule qui n'existent plus.
 */
const VERSION_CALCUL = 4;

/** Nombre de mises à l'épreuve avant de dire d'une limite qu'elle a tenu. */
const SEUIL_LIMITE_TENUE = 2;
/** Part de réponses non tranchées à partir de laquelle une tension est dite forte. */
const SEUIL_TENSION_FORTE = 0.5;
/** À partir d'où une valeur est dite « mise devant » dans les arbitrages. */
const SEUIL_DECLARE = 0.25;
/** Écart de force en deçà duquel deux valeurs sont présentées comme à égalité. */
const ECART_EGALITE = 0.25;

export interface ReponseSource {
  id: number;
  dilemmeId: number | null;
  valeurA: string;
  valeurB: string;
  choix: string;
  facteurDepend: string | null;
  facteurDependLibre: string | null;
  difficulte: number | null;
  certitude: number | null;
  valeurProtegee: string | null;
  version: number;
}

/** Une carte de la personne, avec les valeurs qu'elle a confirmées dessus. */
export interface CarteJugee {
  carteId: string;
  label: string;
  famille: Famille;
  valeursConfirmees: string[];
}

/** Un bloc d'arbitrage joué, tel qu'il sort de la base. */
export interface ArbitrageSource extends ReponseArbitrage {
  id: number;
}

/**
 * Ce que la personne a dit hors situation, valeur par valeur.
 *
 * Une valeur hérite du score moyen des cartes qui la portent : c'est une
 * hypothèse, pas une mesure — la personne a classé des cartes, pas des valeurs.
 */
export interface ValeurDeclaree {
  valeur: string;
  scoreDeclare: number;
  /** Libellés des cartes qui portent cette valeur. */
  cartes: string[];
}

/** Une valeur dans le classement, telle qu'elle s'affiche. */
export interface TendanceValeur {
  valeur: string;
  /** Force Bradley–Terry — l'ordination proprement dite. */
  force: number;
  rang: number;
  totalCollisions: number;
  foisPrivilegiee: number;
  foisCedee: number;
  incertitudes: number;
  difficulteMoyenne: number | null;
  certitudeMoyenne: number | null;
  territoireInexplore: boolean;
}

export interface TensionObservee {
  valeurA: string;
  valeurB: string;
  totalCollisions: number;
  incertitudes: number;
  estForte: boolean;
  estStable: boolean | null;
}

/**
 * Un point de bascule : jusqu'où une limite tient, et à partir de quel enjeu
 * elle cède.
 */
export interface PointDeBascule {
  limiteId: string;
  limiteLabel: string;
  tientDevant: string | null;
  cedeDevant: string | null;
  jamaisFranchie: boolean;
  toujoursFranchie: boolean;
  ordreInverse: boolean;
}

export type TypeObservation =
  | "tendance"
  | "tension"
  | "territoire_inexplore"
  | "stabilite"
  | "couverture"
  | "point_de_bascule"
  | "limite_tenue"
  | "arbitrage"
  | "ecart_declare";

export interface ObservationConstellation {
  id: string;
  texte: string;
  type: TypeObservation;
  valeursConcernees: string[];
  /** Identifiants dans `reponses_collision`. */
  reponsesSources: number[];
  /**
   * Identifiants dans `arbitrages`. Séparés des précédents : les deux tables
   * ont des identifiants qui se recouvrent, et l'écran « D'où ça sort ? »
   * afficherait un bloc à la place d'une situation.
   */
  arbitragesSources: number[];
}

export interface ResultatConstellation {
  tendances: TendanceValeur[];
  tensions: TensionObservee[];
  bascules: PointDeBascule[];
  cartesJugees: ScoreCarte[];
  valeursDeclarees: ValeurDeclaree[];
  observations: ObservationConstellation[];
  couverture: number;
  stabilite: number;
  versionCalcul: number;
}

function estDecisif(choix: string): boolean {
  return choix === "A" || choix === "B";
}

function moyenne(valeurs: number[]): number | null {
  if (valeurs.length === 0) return null;
  return valeurs.reduce((s, v) => s + v, 0) / valeurs.length;
}

function citer(valeur: string): string {
  return `« ${valeur} »`;
}

function enumerer(valeurs: string[]): string {
  const cites = valeurs.map(citer);
  if (cites.length <= 1) return cites.join("");
  return `${cites.slice(0, -1).join(", ")} et ${cites[cites.length - 1]}`;
}

function versCarteJeu(carte: CarteJugee): CarteJeu {
  return {
    id: carte.carteId,
    famille: carte.famille,
    label: carte.label,
    valeurs: carte.valeursConfirmees,
  };
}

// ─── Tendances ───────────────────────────────────────────────────────────────

/**
 * Le classement, enrichi de ce que les réponses disaient à côté.
 *
 * `ordonner` fournit la force et le rang ; la difficulté et la certitude ne
 * sont recueillies que pendant l'approfondissement, donc souvent absentes.
 */
function calculerTendances(
  classement: RangValeur[],
  reponses: ReponseSource[],
  valeursConnues: string[],
): TendanceValeur[] {
  const parValeur = new Map(classement.map((r) => [r.valeur, r]));
  const toutes = new Set<string>([
    ...valeursConnues,
    ...classement.map((r) => r.valeur),
  ]);

  return Array.from(toutes)
    .map((valeur) => {
      const rang = parValeur.get(valeur);
      const impliquees = reponses.filter(
        (r) => r.valeurA === valeur || r.valeurB === valeur,
      );
      const notees = impliquees.filter((r) => r.choix !== "passer");

      return {
        valeur,
        force: rang?.force ?? 0,
        rang: rang?.rang ?? 0,
        totalCollisions: rang?.confrontations ?? 0,
        foisPrivilegiee: rang?.gagnees ?? 0,
        foisCedee: rang?.perdues ?? 0,
        incertitudes: rang?.indecises ?? 0,
        difficulteMoyenne: moyenne(
          notees.map((r) => r.difficulte).filter((d): d is number => d != null),
        ),
        certitudeMoyenne: moyenne(
          notees.map((r) => r.certitude).filter((c): c is number => c != null),
        ),
        territoireInexplore: rang === undefined,
      };
    })
    .sort((a, b) => b.force - a.force || a.valeur.localeCompare(b.valeur));
}

function versTensionObservee(t: Tension): TensionObservee {
  return {
    valeurA: t.valeurA,
    valeurB: t.valeurB,
    totalCollisions: t.rencontres,
    incertitudes: t.indecises,
    estForte: t.indecises / Math.max(1, t.rencontres) >= SEUIL_TENSION_FORTE,
    estStable: t.stable,
  };
}

function versPointDeBascule(b: Bascule): PointDeBascule {
  return {
    limiteId: b.limiteId,
    limiteLabel: b.limiteLabel,
    tientDevant: b.tientDevant?.enjeuLabel ?? null,
    cedeDevant: b.cedeDevant?.enjeuLabel ?? null,
    jamaisFranchie: b.jamaisFranchie,
    toujoursFranchie: b.toujoursFranchie,
    ordreInverse: b.ordreInverse,
  };
}

// ─── Ce qui a été dit à froid ────────────────────────────────────────────────

function calculerValeursDeclarees(
  scores: ScoreCarte[],
  cartes: CarteJugee[],
): ValeurDeclaree[] {
  const parCarte = new Map(cartes.map((c) => [c.carteId, c]));
  const cumul = new Map<
    string,
    { total: number; n: number; cartes: string[] }
  >();

  for (const score of scores) {
    // Une carte jamais proposée n'a pas de place : elle ne dit rien.
    if (score.apparitions === 0) continue;
    const carte = parCarte.get(score.carteId);
    if (!carte) continue;

    for (const valeur of carte.valeursConfirmees) {
      const entree = cumul.get(valeur) ?? { total: 0, n: 0, cartes: [] };
      entree.total += score.score;
      entree.n += 1;
      entree.cartes.push(carte.label);
      cumul.set(valeur, entree);
    }
  }

  return Array.from(cumul.entries())
    .map(([valeur, { total, n, cartes: labels }]) => ({
      valeur,
      scoreDeclare: total / n,
      cartes: labels.sort(),
    }))
    .sort(
      (a, b) =>
        b.scoreDeclare - a.scoreDeclare || a.valeur.localeCompare(b.valeur),
    );
}

// ─── Observations ────────────────────────────────────────────────────────────

class Observations {
  private readonly liste: ObservationConstellation[] = [];
  private index = 0;

  ajouter(
    type: TypeObservation,
    texte: string,
    valeursConcernees: string[],
    reponsesSources: number[],
    arbitragesSources: number[] = [],
  ): void {
    this.liste.push({
      id: `obs_${type}_${this.index++}`,
      texte,
      type,
      valeursConcernees,
      reponsesSources,
      arbitragesSources,
    });
  }

  tout(): ObservationConstellation[] {
    return this.liste;
  }
}

function idsImpliquant(reponses: ReponseSource[], valeur: string): number[] {
  return reponses
    .filter(
      (r) =>
        estDecisif(r.choix) && (r.valeurA === valeur || r.valeurB === valeur),
    )
    .map((r) => r.id);
}

function redigerObservations(
  reponses: ReponseSource[],
  tendances: TendanceValeur[],
  tensions: TensionObservee[],
  bascules: PointDeBascule[],
  scoresCartes: ScoreCarte[],
  valeursDeclarees: ValeurDeclaree[],
  arbitrages: ArbitrageSource[],
  couverture: number,
  collisionsPlanifiees: number,
): ObservationConstellation[] {
  const obs = new Observations();
  const idsArbitrages = arbitrages
    .filter((a) => a.carteMeilleure || a.cartePire)
    .map((a) => a.id);

  const jouees = tendances.filter((t) => !t.territoireInexplore);

  // Le haut du classement. Formulé comme une observation sur ce qui est passé
  // devant, jamais comme un jugement sur ce qui compterait « vraiment ».
  const haut = jouees.slice(0, 3).filter((t) => t.foisPrivilegiee > 0);
  for (const t of haut) {
    obs.ajouter(
      "tendance",
      `Dans les situations jouées jusqu'ici, ${citer(t.valeur)} est passée devant ce qui lui était opposé ${t.foisPrivilegiee} fois sur ${t.totalCollisions}.`,
      [t.valeur],
      idsImpliquant(reponses, t.valeur),
    );
  }

  // Les quasi-égalités : deux valeurs que rien ne départage encore.
  for (let i = 1; i < jouees.length; i++) {
    const precedente = jouees[i - 1];
    const courante = jouees[i];
    if (Math.abs(precedente.force - courante.force) >= ECART_EGALITE) continue;
    if (precedente.totalCollisions === 0 || courante.totalCollisions === 0)
      continue;

    obs.ajouter(
      "tension",
      `${citer(precedente.valeur)} et ${citer(courante.valeur)} se tiennent de très près : rien dans ce que tu as joué ne permet encore de les départager.`,
      [precedente.valeur, courante.valeur],
      [
        ...idsImpliquant(reponses, precedente.valeur),
        ...idsImpliquant(reponses, courante.valeur),
      ],
    );
    break;
  }

  // Les limites qui ont tenu.
  for (const b of bascules) {
    if (!b.jamaisFranchie) continue;
    const fois = reponses.filter((r) => r.choix === "B").length;
    if (fois < SEUIL_LIMITE_TENUE) continue;

    obs.ajouter(
      "limite_tenue",
      `${citer(b.limiteLabel)} n'a cédé devant aucun des enjeux rencontrés. Ça ne veut pas dire qu'elle ne céderait jamais — seulement qu'aucune situation jouée ne l'a fait bouger.`,
      [],
      [],
    );
  }

  // Les points de bascule : là où la limite devient franchissable.
  for (const b of bascules) {
    if (b.tientDevant === null || b.cedeDevant === null) continue;

    const texte = b.ordreInverse
      ? `${citer(b.limiteLabel)} a tenu devant ${citer(b.tientDevant)}, mais a cédé devant ${citer(b.cedeDevant)}. Ce n'est pas une contradiction : quelque chose dans la situation, et pas seulement le poids de l'enjeu, a changé la priorité.`
      : `${citer(b.limiteLabel)} tient devant ${citer(b.tientDevant)}, et cède devant ${citer(b.cedeDevant)}. C'est entre les deux que passe ta limite.`;

    obs.ajouter("point_de_bascule", texte, [], []);
  }

  // Une tension revue sous une autre carte, et qui a changé de réponse.
  for (const t of tensions) {
    if (t.estStable !== false) continue;
    obs.ajouter(
      "stabilite",
      `Entre ${citer(t.valeurA)} et ${citer(t.valeurB)}, tu n'as pas répondu pareil selon la situation. C'est le genre d'écart qui en dit plus qu'une réponse constante.`,
      [t.valeurA, t.valeurB],
      [],
    );
    break;
  }

  // La carte mise devant les autres, hors situation.
  const meilleure = scoresCartes.find((c) => c.apparitions > 0);
  if (meilleure && meilleure.score > 0) {
    obs.ajouter(
      "arbitrage",
      `Quand tu compares tes cartes à froid, ${citer(meilleure.label)} passe devant les autres.`,
      [],
      [],
      idsArbitrages,
    );
  }

  // L'écart entre ce qui est dit à froid et ce qui est joué en situation.
  for (const declaree of valeursDeclarees) {
    if (declaree.scoreDeclare < SEUIL_DECLARE) continue;
    const tendance = tendances.find((t) => t.valeur === declaree.valeur);
    if (!tendance || tendance.territoireInexplore) continue;
    if (tendance.foisCedee <= tendance.foisPrivilegiee) continue;

    obs.ajouter(
      "ecart_declare",
      `Tu places ${citer(declaree.valeur)} haut quand tu classes tes cartes à froid, et en situation elle a plutôt cédé. L'écart n'est pas une faute : c'est souvent là que le jeu a quelque chose à montrer.`,
      [declaree.valeur],
      idsImpliquant(reponses, declaree.valeur),
      idsArbitrages,
    );
    break;
  }

  // Territoires inexplorés.
  const inexplorees = tendances
    .filter((t) => t.territoireInexplore)
    .map((t) => t.valeur);
  if (inexplorees.length > 0) {
    obs.ajouter(
      "territoire_inexplore",
      `${enumerer(inexplorees)} ${inexplorees.length > 1 ? "n'ont" : "n'a"} encore rencontré aucune situation dans cette partie. ${inexplorees.length > 1 ? "Leur place" : "Sa place"} reste à découvrir.`,
      inexplorees,
      [],
    );
  }

  // Étendue de ce qui a été joué.
  if (collisionsPlanifiees > 0 && couverture < 1) {
    obs.ajouter(
      "couverture",
      `Tu as joué ${Math.round(couverture * 100)} % des collisions possibles entre tes cartes. Tout ce qui est écrit ici ne parle que de celles-là.`,
      [],
      [],
    );
  }

  return obs.tout();
}

// ─── Entrée principale ───────────────────────────────────────────────────────

export interface EntreeConstellation {
  reponses: ReponseSource[];
  valeursConnues: string[];
  /** Les cartes retenues par la personne. Vide ⇒ pas de classement déclaré. */
  cartes?: CarteJugee[];
  arbitrages?: ArbitrageSource[];
  graine?: number;
}

export function calculerConstellation({
  reponses,
  valeursConnues,
  cartes = [],
  arbitrages = [],
  graine = 0,
}: EntreeConstellation): ResultatConstellation {
  const main = cartes.map(versCarteJeu);
  const collisions = collisionsPossibles(main);

  const observations = observer(collisions, reponses);
  const classement = ordonner(observations);

  const tendances = calculerTendances(classement, reponses, valeursConnues);
  const tensions = mesurerTensions(observations).map(versTensionObservee);
  const bascules = trouverBascules(collisions, reponses, classement).map(
    versPointDeBascule,
  );

  const cartesJugees = calculerScoresCartes(
    cartes.map((c) => ({ id: c.carteId, famille: c.famille, label: c.label })),
    arbitrages,
  );
  const valeursDeclarees = calculerValeursDeclarees(cartesJugees, cartes);

  // La couverture se mesure sur ce que le parcours sert réellement, pas sur la
  // matrice entière : sinon elle annoncerait 4 % à quelqu'un qui a tout joué.
  const plan = planifierCollisions(main, graine);
  const collisionsPlanifiees = plan.total;
  const collisionsJouees = observations.length;
  const couverture =
    collisionsPlanifiees > 0
      ? Math.min(1, collisionsJouees / collisionsPlanifiees)
      : 0;

  // Stabilité : parmi les couples revus sous une autre carte, combien ont reçu
  // la même réponse. Sans reprise, il n'y a rien à mesurer — on affiche 1 et
  // l'observation de couverture dit le reste.
  const revues = tensions.filter((t) => t.estStable !== null);
  const stabilite =
    revues.length > 0
      ? revues.filter((t) => t.estStable === true).length / revues.length
      : 1;

  return {
    tendances,
    tensions,
    bascules,
    cartesJugees,
    valeursDeclarees,
    observations: redigerObservations(
      reponses,
      tendances,
      tensions,
      bascules,
      cartesJugees,
      valeursDeclarees,
      arbitrages,
      couverture,
      collisionsPlanifiees,
    ),
    couverture,
    stabilite,
    versionCalcul: VERSION_CALCUL,
  };
}
