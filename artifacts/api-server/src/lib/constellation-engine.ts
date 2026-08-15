/**
 * Moteur de constellation V2 — déterministe, sans LLM.
 *
 * Tout ce qui est affiché à la fin est recalculable à partir des réponses
 * brutes, et chaque observation transporte les identifiants des réponses qui
 * l'appuient : rien n'est affirmé sans pouvoir montrer d'où ça vient.
 *
 * Ce que le moteur refuse de faire, par construction :
 *   • sortir un classement unique des valeurs (on garde le contexte) ;
 *   • traiter une réponse différente comme une contradiction (c'est un
 *     changement de réglage, et c'est l'information intéressante) ;
 *   • déduire ce que la personne voulait protéger — cette information n'existe
 *     que si elle l'a écrite elle-même (`valeurProtegee`).
 *
 * Les formulations restent au conditionnel et bornées à ce qui a été joué.
 */

import {
  planifierDuels,
  planifierCombatsCartes,
  trouverDuel,
  trouverSerie,
  libellesDimension,
  libellesContexte,
  clePaire,
  calculerScoresCartes,
  type Contexte,
  type Dimension,
  type Famille,
  type ScoreCarte,
  type ReponseArbitrage,
} from "@workspace/contenu";

/**
 * 3 : les arbitrages entrent dans le calcul. Une constellation calculée en
 * version 2 n'avait ni classement déclaré ni écart entre le dit et le joué.
 */
const VERSION_CALCUL = 3;

/** Nombre de mises à l'épreuve avant de dire d'une valeur qu'elle n'a pas encore cédé. */
const SEUIL_VALEUR_PROTEGEE = 2;
/** Part de réponses non tranchées à partir de laquelle une tension est dite forte. */
const SEUIL_TENSION_FORTE = 0.5;
/** Écarts nets en deçà desquels on ne parle pas de tendance. */
const SEUIL_TENDANCE = 0.5;
/** À partir d'où une valeur est dite « mise devant » dans les arbitrages. */
const SEUIL_DECLARE = 0.25;
/** Combien de fois une valeur doit avoir été mise à l'épreuve avant de parler d'écart. */
const MIN_COLLISIONS_ECART = 2;

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
  serieId: string | null;
  palier: number | null;
  dimension: string | null;
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

export interface TendanceValeur {
  valeur: string;
  scoreNet: number;
  totalCollisions: number;
  foisPrivilegiee: number;
  foisCedee: number;
  incertitudes: number;
  abandonnes: number;
  difficulteMoyenne: number | null;
  certitudeMoyenne: number | null;
  territoireInexplore: boolean;
  estProtegee: boolean;
  domine: string[];
  cedeDevant: string[];
  contextesFavorables: string[];
}

export interface TensionObservee {
  valeurA: string;
  valeurB: string;
  totalCollisions: number;
  incertitudes: number;
  estForte: boolean;
  estStable: boolean | null;
}

export interface PointDeBascule {
  serieId: string;
  valeurA: string;
  valeurB: string;
  dimension: string;
  choixInitial: "A" | "B";
  paliers: number;
  reglageBascule: string | null;
}

export type TypeObservation =
  | "tendance"
  | "tension"
  | "territoire_inexplore"
  | "stabilite"
  | "couverture"
  | "point_de_bascule"
  | "valeur_protegee"
  | "contexte"
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

/** Qui l'a emporté dans cette réponse, en tenant compte du sens du duel. */
function gagnant(r: ReponseSource): string | null {
  if (r.choix === "A") return r.valeurA;
  if (r.choix === "B") return r.valeurB;
  return null;
}

function perdant(r: ReponseSource): string | null {
  if (r.choix === "A") return r.valeurB;
  if (r.choix === "B") return r.valeurA;
  return null;
}

function contexteDe(r: ReponseSource): Contexte | null {
  if (r.dilemmeId == null) return null;
  return trouverDuel(r.dilemmeId)?.contexte ?? null;
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

function labelFacteur(facteur: string | null, libre: string | null): string {
  if (!facteur) return "un facteur non nommé";
  if (facteur === "autre") return libre ? `« ${libre} »` : "un autre facteur";
  const connu = libellesDimension[facteur as Dimension];
  if (connu) return connu;
  const autres: Record<string, string> = {
    responsabilite: "ta part de responsabilité",
  };
  return autres[facteur] ?? facteur;
}

// ─── Tendances par valeur ────────────────────────────────────────────────────

function calculerTendances(
  reponses: ReponseSource[],
  valeursConnues: string[],
): TendanceValeur[] {
  const toutes = new Set<string>(valeursConnues);
  for (const r of reponses) {
    toutes.add(r.valeurA);
    toutes.add(r.valeurB);
  }

  return Array.from(toutes)
    .map((valeur) => {
      const impliquees = reponses.filter(
        (r) => r.valeurA === valeur || r.valeurB === valeur,
      );
      const decisives = impliquees.filter((r) => estDecisif(r.choix));

      const gagnees = decisives.filter((r) => gagnant(r) === valeur);
      const perdues = decisives.filter((r) => perdant(r) === valeur);

      const domine = Array.from(
        new Set(gagnees.map((r) => perdant(r) as string)),
      ).sort();
      const cedeDevant = Array.from(
        new Set(perdues.map((r) => gagnant(r) as string)),
      ).sort();
      const contextesFavorables = Array.from(
        new Set(
          gagnees
            .map((r) => contexteDe(r))
            .filter((c): c is Contexte => c !== null),
        ),
      ).sort();

      const notees = impliquees.filter((r) => r.choix !== "passer");
      const total = gagnees.length + perdues.length;

      return {
        valeur,
        scoreNet: total > 0 ? (gagnees.length - perdues.length) / total : 0,
        totalCollisions: impliquees.length,
        foisPrivilegiee: gagnees.length,
        foisCedee: perdues.length,
        incertitudes: impliquees.filter(
          (r) => r.choix === "ca_depend" || r.choix === "je_ne_sais_pas",
        ).length,
        abandonnes: impliquees.filter((r) => r.choix === "passer").length,
        difficulteMoyenne: moyenne(
          notees.map((r) => r.difficulte).filter((d): d is number => d != null),
        ),
        certitudeMoyenne: moyenne(
          notees.map((r) => r.certitude).filter((c): c is number => c != null),
        ),
        territoireInexplore: total === 0,
        estProtegee:
          gagnees.length >= SEUIL_VALEUR_PROTEGEE && perdues.length === 0,
        domine,
        cedeDevant,
        contextesFavorables,
      };
    })
    .sort(
      (a, b) => b.scoreNet - a.scoreNet || a.valeur.localeCompare(b.valeur),
    );
}

// ─── Tensions ────────────────────────────────────────────────────────────────

/**
 * La stabilité se mesure sur les duels seulement.
 *
 * Une réponse qui change à l'intérieur d'une série de bascule n'est pas une
 * instabilité : c'est le résultat recherché, puisque le jeu a délibérément
 * monté un réglage d'un cran.
 */
function calculerTensions(reponses: ReponseSource[]): TensionObservee[] {
  const duelsSeuls = reponses.filter((r) => !r.serieId);
  const groupes = new Map<string, ReponseSource[]>();

  for (const r of duelsSeuls) {
    const cle = clePaire(r.valeurA, r.valeurB);
    const groupe = groupes.get(cle);
    if (groupe) groupe.push(r);
    else groupes.set(cle, [r]);
  }

  const tensions: TensionObservee[] = [];
  for (const groupe of groupes.values()) {
    const incertitudes = groupe.filter(
      (r) => r.choix === "ca_depend" || r.choix === "je_ne_sais_pas",
    ).length;
    const gagnants = groupe
      .filter((r) => estDecisif(r.choix))
      .map((r) => gagnant(r) as string);

    tensions.push({
      valeurA: groupe[0].valeurA,
      valeurB: groupe[0].valeurB,
      totalCollisions: groupe.length,
      incertitudes,
      estForte: incertitudes / groupe.length >= SEUIL_TENSION_FORTE,
      estStable:
        gagnants.length >= 2 ? gagnants.every((g) => g === gagnants[0]) : null,
    });
  }

  return tensions.sort(
    (a, b) =>
      b.incertitudes - a.incertitudes ||
      a.valeurA.localeCompare(b.valeurA) ||
      a.valeurB.localeCompare(b.valeurB),
  );
}

// ─── Points de bascule ───────────────────────────────────────────────────────

function calculerBascules(reponses: ReponseSource[]): PointDeBascule[] {
  const groupes = new Map<string, ReponseSource[]>();
  for (const r of reponses) {
    if (!r.serieId || r.palier == null || !estDecisif(r.choix)) continue;
    const groupe = groupes.get(r.serieId);
    if (groupe) groupe.push(r);
    else groupes.set(r.serieId, [r]);
  }

  const bascules: PointDeBascule[] = [];
  for (const [serieId, groupe] of groupes) {
    if (groupe.length < 2) continue;
    const serie = trouverSerie(serieId);
    if (!serie) continue;

    const ordonnees = [...groupe].sort(
      (a, b) => (a.palier as number) - (b.palier as number),
    );
    const initial = ordonnees[0].choix as "A" | "B";
    const bascule = ordonnees.find((r) => r.choix !== initial);

    bascules.push({
      serieId,
      valeurA: serie.valeurA,
      valeurB: serie.valeurB,
      dimension: serie.dimension,
      choixInitial: initial,
      paliers: ordonnees.length,
      reglageBascule: bascule
        ? (serie.paliers.find((p) => p.palier === bascule.palier)?.reglage ??
          null)
        : null,
    });
  }

  return bascules.sort((a, b) => a.serieId.localeCompare(b.serieId));
}

// ─── Ce qui a été dit hors situation ─────────────────────────────────────────

/**
 * Des scores de cartes vers des scores de valeurs.
 *
 * Une carte porte les valeurs que la personne a confirmées dessus ; sa place
 * dans le classement déteint donc sur chacune d'elles, à parts égales. C'est
 * grossier, et assumé : on ne s'en sert que pour repérer un écart franc avec
 * ce qui s'est joué en situation, jamais pour annoncer un classement de valeurs.
 */
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
      const entree = cumul.get(valeur);
      if (entree) {
        entree.total += score.score;
        entree.n++;
        entree.cartes.push(carte.label);
      } else {
        cumul.set(valeur, { total: score.score, n: 1, cartes: [carte.label] });
      }
    }
  }

  return Array.from(cumul, ([valeur, { total, n, cartes: labels }]) => ({
    valeur,
    scoreDeclare: total / n,
    cartes: labels.sort(),
  })).sort(
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
  duelsPlanifies: number,
): ObservationConstellation[] {
  const obs = new Observations();
  const idsArbitrages = arbitrages
    .filter((a) => a.carteMeilleure || a.cartePire)
    .map((a) => a.id);

  // Valeurs qui n'ont pas encore cédé.
  for (const t of tendances.filter((x) => x.estProtegee)) {
    obs.ajouter(
      "valeur_protegee",
      `${citer(t.valeur)} n'a pas encore cédé : chaque fois qu'elle a été mise à l'épreuve, tu l'as choisie. Ça ne veut pas dire qu'elle ne cédera jamais — seulement qu'aucune situation jouée jusqu'ici ne l'a fait plier.`,
      [t.valeur],
      idsImpliquant(reponses, t.valeur),
    );
  }

  // Tendances nettes, dans un sens comme dans l'autre.
  for (const t of tendances) {
    const total = t.foisPrivilegiee + t.foisCedee;
    if (total < 2 || Math.abs(t.scoreNet) <= SEUIL_TENDANCE) continue;
    if (t.estProtegee) continue; // déjà dit, en mieux

    const texte =
      t.scoreNet > 0
        ? `Dans les situations jouées jusqu'ici, ${citer(t.valeur)} est passée devant ${enumerer(t.domine)}.`
        : `Dans les situations jouées jusqu'ici, ${citer(t.valeur)} a plutôt cédé la place à ${enumerer(t.cedeDevant)}.`;

    obs.ajouter(
      "tendance",
      texte,
      [t.valeur],
      idsImpliquant(reponses, t.valeur),
    );
  }

  // La carte mise devant les autres, hors situation.
  const jugees = scoresCartes.filter((s) => s.apparitions > 0);
  const devant = jugees.filter((s) => s.score === jugees[0]?.score);
  if (jugees.length >= 2 && devant.length === 1 && devant[0].score > 0) {
    obs.ajouter(
      "arbitrage",
      `Quand tes cartes étaient côte à côte, sans situation autour, c'est ${citer(devant[0].label)} que tu as mise devant le plus souvent.`,
      [],
      [],
      idsArbitrages,
    );
  }

  // L'écart entre ce qui a été dit à froid et ce qui s'est joué en situation.
  //
  // C'est l'observation que la phase d'arbitrage existe pour rendre possible.
  // Elle ne dit jamais que la personne s'est trompée quelque part : les deux
  // réponses sont vraies, elles répondent simplement à deux questions
  // différentes — ce qui compte, et ce qui l'emporte quand ça coûte.
  for (const declaree of valeursDeclarees) {
    if (declaree.scoreDeclare < SEUIL_DECLARE) continue;
    const tendance = tendances.find((t) => t.valeur === declaree.valeur);
    if (!tendance) continue;
    if (tendance.foisPrivilegiee + tendance.foisCedee < MIN_COLLISIONS_ECART)
      continue;
    if (tendance.scoreNet > -SEUIL_TENDANCE) continue;

    obs.ajouter(
      "ecart_declare",
      `Cartes en main, ${citer(declaree.valeur)} passait devant. Dans les situations, c'est ${enumerer(tendance.cedeDevant)} qui l'a emporté. Les deux sont vraies : mises côte à côte, tes cartes ne pèsent pas le même poids qu'au moment de choisir.`,
      [declaree.valeur],
      idsImpliquant(reponses, declaree.valeur),
      idsArbitrages,
    );
  }

  // Une valeur qui ne gagne que dans un seul contexte.
  //
  // On ne compte que les victoires en duel : les paliers de bascule ne portent
  // pas de contexte, et les inclure ferait dire « seulement avec tes amis » à
  // une valeur qui a aussi gagné ailleurs, sans étiquette.
  for (const t of tendances) {
    if (t.contextesFavorables.length !== 1) continue;
    const victoiresSituees = reponses.filter(
      (r) =>
        estDecisif(r.choix) &&
        gagnant(r) === t.valeur &&
        contexteDe(r) !== null,
    );
    if (victoiresSituees.length < 2) continue;
    const contexte = libellesContexte[t.contextesFavorables[0] as Contexte];
    if (!contexte) continue;
    obs.ajouter(
      "contexte",
      `Chaque fois que ${citer(t.valeur)} est passée devant dans une situation située, c'était la même : ${contexte.toLowerCase()}. Ailleurs, le jeu ne l'a pas encore mise à l'épreuve.`,
      [t.valeur],
      victoiresSituees.map((r) => r.id),
    );
  }

  // Points de bascule.
  for (const b of bascules) {
    const serie = trouverSerie(b.serieId);
    if (!serie) continue;
    const dimension =
      libellesDimension[b.dimension as Dimension] ?? b.dimension;
    const choixDepart = b.choixInitial === "A" ? serie.optionA : serie.optionB;
    const sources = reponses
      .filter((r) => r.serieId === b.serieId)
      .map((r) => r.id);

    const texte = b.reglageBascule
      ? `Entre ${citer(b.valeurA)} et ${citer(b.valeurB)}, tu répondais « ${choixDepart} ». On montait ${dimension} — ton choix a changé à ce cran-ci : ${b.reglageBascule}.`
      : `Entre ${citer(b.valeurA)} et ${citer(b.valeurB)}, on montait ${dimension} jusqu'au dernier cran et ton choix n'a pas bougé. Si un point de bascule existe, il est plus loin que ce que le jeu est allé.`;

    obs.ajouter("point_de_bascule", texte, [b.valeurA, b.valeurB], sources);
  }

  // Tensions difficiles à trancher.
  for (const t of tensions.filter((x) => x.estForte)) {
    const sources = reponses
      .filter(
        (r) =>
          clePaire(r.valeurA, r.valeurB) === clePaire(t.valeurA, t.valeurB) &&
          (r.choix === "ca_depend" || r.choix === "je_ne_sais_pas"),
      )
      .map((r) => r.id);
    obs.ajouter(
      "tension",
      `${citer(t.valeurA)} contre ${citer(t.valeurB)} fait partie des tensions que tu as le moins tranchées. Ce n'est pas une hésitation : les deux ont l'air de compter pour vrai.`,
      [t.valeurA, t.valeurB],
      sources,
    );
  }

  // Même conflit, autre forme.
  for (const t of tensions.filter((x) => x.estStable === false)) {
    const sources = reponses
      .filter(
        (r) =>
          !r.serieId &&
          clePaire(r.valeurA, r.valeurB) === clePaire(t.valeurA, t.valeurB) &&
          estDecisif(r.choix),
      )
      .map((r) => r.id);
    obs.ajouter(
      "stabilite",
      `Tu as rencontré ${citer(t.valeurA)} contre ${citer(t.valeurB)} deux fois, dans deux situations différentes, et tu n'as pas répondu pareil. Ce n'est pas une contradiction : quelque chose dans la situation a compté.`,
      [t.valeurA, t.valeurB],
      sources,
    );
  }

  // Facteurs invoqués de façon répétée dans les « ça dépend ».
  const parFacteur = new Map<string, { ids: number[]; libre: string | null }>();
  for (const r of reponses) {
    if (r.choix !== "ca_depend" || !r.facteurDepend) continue;
    const entree = parFacteur.get(r.facteurDepend);
    if (entree) {
      entree.ids.push(r.id);
      entree.libre = entree.libre ?? r.facteurDependLibre;
    } else {
      parFacteur.set(r.facteurDepend, {
        ids: [r.id],
        libre: r.facteurDependLibre,
      });
    }
  }
  for (const [facteur, { ids, libre }] of parFacteur) {
    if (ids.length < 2) continue;
    obs.ajouter(
      "tension",
      `Quand tu réponds « ça dépend », c'est souvent ${labelFacteur(facteur, libre)} qui décide.`,
      [],
      ids,
    );
  }

  // Ce que la personne a elle-même nommé.
  const nommees = reponses.filter((r) => r.valeurProtegee);
  if (nommees.length >= 2) {
    const comptes = new Map<string, number[]>();
    for (const r of nommees) {
      const cle = r.valeurProtegee as string;
      const ids = comptes.get(cle);
      if (ids) ids.push(r.id);
      else comptes.set(cle, [r.id]);
    }
    for (const [valeur, ids] of comptes) {
      if (ids.length < 2) continue;
      obs.ajouter(
        "tendance",
        `Quand on t'a demandé ce que tu essayais de protéger, tu as répondu ${citer(valeur)} plus d'une fois. C'est toi qui l'as nommée — le jeu ne l'a pas déduite.`,
        [valeur],
        ids,
      );
    }
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
  if (duelsPlanifies > 0 && couverture < 1) {
    obs.ajouter(
      "couverture",
      `Tu as joué ${Math.round(couverture * 100)} % des situations prévues pour tes cartes. Tout ce qui est écrit ici ne parle que de celles-là.`,
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
  const tendances = calculerTendances(reponses, valeursConnues);
  const tensions = calculerTensions(reponses);
  const bascules = calculerBascules(reponses);

  const cartesJugees = calculerScoresCartes(
    cartes.map((c) => ({ id: c.carteId, famille: c.famille, label: c.label })),
    arbitrages,
  );
  const valeursDeclarees = calculerValeursDeclarees(cartesJugees, cartes);

  const combatsPlanifies = planifierCombatsCartes(
    cartes.map((carte) => ({
      id: carte.carteId,
      famille: carte.famille,
      label: carte.label,
      valeursConfirmees: carte.valeursConfirmees,
    })),
    graine,
  );
  const duelsPlanifies =
    combatsPlanifies.length || planifierDuels(valeursConnues, graine).length;
  const duelsRepondus = reponses.filter(
    (r) => !r.serieId && r.choix !== "passer",
  ).length;
  const couverture =
    duelsPlanifies > 0 ? Math.min(1, duelsRepondus / duelsPlanifies) : 0;

  // Stabilité : parmi les tensions revues sous une autre forme, combien ont
  // reçu la même réponse. Sans reprise, il n'y a rien à mesurer — on ne
  // pénalise pas, on affiche 1 et l'observation de couverture dit le reste.
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
      duelsPlanifies,
    ),
    couverture,
    stabilite,
    versionCalcul: VERSION_CALCUL,
  };
}
