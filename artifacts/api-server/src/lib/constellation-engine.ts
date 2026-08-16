/**
 * ResultsModel — des réponses brutes à un portrait lisible.
 *
 * Le portrait a plusieurs niveaux de lecture, et c'est volontaire : un
 * palmarès ne dirait presque rien.
 *
 *   1. **Ordination** — les valeurs à peu près classées, avec leur incertitude.
 *   2. **Valeurs particulièrement fortes** — prioritaires dans plusieurs
 *      contextes, pas seulement une fois.
 *   3. **Valeurs contextuelles** — importantes seulement dans certaines
 *      situations.
 *   4. **Valeurs actuellement protégées** — aucun compromis observé à ce jour.
 *   5. **Tensions principales** — ce que les relations entre valeurs montrent.
 *   6. **Points de bascule** — les réglages qui semblent déplacer les décisions.
 *   7. **Niveau de confiance** — tendance forte, probable, incertaine, ou
 *      territoire peu exploré.
 *
 * Ce que le moteur refuse de faire, par construction :
 *   • présenter le classement comme une vérité (c'est une estimation, elle
 *     bouge à chaque comparaison) ;
 *   • traiter une réponse différente comme une contradiction (c'est un
 *     changement de contexte, et c'est l'information intéressante) ;
 *   • déduire ce que la personne voulait protéger — cette information n'existe
 *     que si elle l'a écrite elle-même (`valeurProtegee`).
 *
 * Terminologie : partout « a été prioritaire sur » / « a été secondaire face
 * à ». Jamais « a passé devant » / « a cédé devant » — les deux ne pèsent pas
 * pareil à la lecture.
 */

import {
  ajusterModele,
  calculerCouverture,
  clePaire,
  cleManifestation,
  estDecisif,
  libellesConfiance,
  libellesContexte,
  libellesDimension,
  planifierDuels,
  duelsCartesPossibles,
  termes,
  trouverDuel,
  trouverSerie,
  type Comparaison,
  type Contexte,
  type Dimension,
  type Famille,
  type ForceValeur,
  type NiveauConfiance,
  type PhaseExperience,
  type RelationPaire,
} from "@workspace/contenu";

/**
 * 4 : l'ordination remplace le score net brut, et les arbitrages « le plus /
 * le moins » ont disparu du calcul.
 */
const VERSION_CALCUL = 4;

/** Nombre de mises à l'épreuve avant de dire d'une valeur qu'elle n'a pas encore cédé. */
const SEUIL_VALEUR_PROTEGEE = 2;
/** Part de réponses non tranchées à partir de laquelle une tension est dite forte. */
const SEUIL_TENSION_FORTE = 0.5;
/** Combien de contextes distincts avant de parler d'une valeur « forte ». */
const SEUIL_CONTEXTES_FORTE = 2;
/** Au-delà, deux valeurs sont trop proches pour qu'on les sépare. */
const SEUIL_PROBABILITE_SERREE = 0.62;
/** Combien de tensions le portrait met en avant. */
const MAX_TENSIONS_PRINCIPALES = 5;

export interface ReponseSource {
  id: number;
  dilemmeId: number | null;
  valeurA: string;
  valeurB: string;
  carteA: string | null;
  carteB: string | null;
  choix: string;
  contexte: string | null;
  phase: PhaseExperience;
  facteurDepend: string | null;
  facteurDependLibre: string | null;
  difficulte: number | null;
  certitude: number | null;
  serieId: string | null;
  palier: number | null;
  dimension: string | null;
  valeurProtegee: string | null;
  ceQuiChangerait: string | null;
  version: number;
}

/** Une carte de la personne, avec les valeurs qu'elle a confirmées dessus. */
export interface CarteJugee {
  carteId: string;
  label: string;
  famille: Famille;
  valeursConfirmees: string[];
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

export interface LigneOrdination extends Omit<ForceValeur, "intervalle"> {
  intervalleBas: number;
  intervalleHaut: number;
  prioritaireSur: string[];
  secondaireFaceA: string[];
  contextes: string[];
}

export interface ValeurContextuelle {
  valeur: string;
  contextes: string[];
  texte: string;
}

export type TypeTension = "renversement" | "indecise" | "serree" | "tranchee";

export interface TensionPrincipale {
  valeurA: string;
  valeurB: string;
  type: TypeTension;
  texte: string;
}

export interface DimensionSensible {
  dimension: string;
  libelle: string;
  occurrences: number;
  source: "ca_depend" | "bascule";
}

export interface Couverture {
  part: number;
  pairesPertinentes: number;
  pairesCouvertes: number;
  comparaisonsRetenues: number;
  manifestationsRejouees: number;
}

export type TypeObservation =
  | "ordination"
  | "valeur_forte"
  | "valeur_contextuelle"
  | "valeur_protegee"
  | "tension"
  | "stabilite"
  | "point_de_bascule"
  | "cycle"
  | "territoire_inexplore"
  | "couverture"
  | "confiance";

export interface ObservationConstellation {
  id: string;
  texte: string;
  type: TypeObservation;
  valeursConcernees: string[];
  /** Identifiants dans `reponses_collision`. */
  reponsesSources: number[];
}

export interface ResultatConstellation {
  ordination: LigneOrdination[];
  relations: RelationPaire[];
  valeursFortes: string[];
  valeursContextuelles: ValeurContextuelle[];
  valeursProtegees: string[];
  tensionsPrincipales: TensionPrincipale[];
  dimensionsSensibles: DimensionSensible[];
  cycles: string[][];
  tendances: TendanceValeur[];
  tensions: TensionObservee[];
  bascules: PointDeBascule[];
  observations: ObservationConstellation[];
  couverture: Couverture;
  stabilite: number;
  niveauConfianceGlobal: NiveauConfiance;
  versionCalcul: number;
}

// ─── Petits outils de langue ─────────────────────────────────────────────────

function citer(valeur: string): string {
  return `« ${valeur} »`;
}

function enumerer(valeurs: string[]): string {
  const cites = valeurs.map(citer);
  if (cites.length <= 1) return cites.join("");
  return `${cites.slice(0, -1).join(", ")} et ${cites[cites.length - 1]}`;
}

function moyenne(valeurs: number[]): number | null {
  if (valeurs.length === 0) return null;
  return valeurs.reduce((s, v) => s + v, 0) / valeurs.length;
}

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

/**
 * Le contexte d'une réponse : celui enregistré avec elle, sinon celui de la
 * situation écrite. Un duel entre deux cartes n'en a pas — il ne se passe nulle
 * part en particulier, et c'est très bien.
 */
function contexteDe(r: ReponseSource): Contexte | null {
  if (r.contexte) return r.contexte as Contexte;
  if (r.dilemmeId == null) return null;
  return trouverDuel(r.dilemmeId)?.contexte ?? null;
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

function versComparaison(r: ReponseSource): Comparaison {
  return {
    valeurA: r.valeurA,
    valeurB: r.valeurB,
    carteA: r.carteA,
    carteB: r.carteB,
    choix: r.choix as Comparaison["choix"],
    contexte: contexteDe(r),
    phase: r.phase,
  };
}

// ─── Tendances : le détail chiffré ───────────────────────────────────────────

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

// ─── Les niveaux de lecture du portrait ──────────────────────────────────────

function construireOrdination(
  forces: ForceValeur[],
  tendances: TendanceValeur[],
): LigneOrdination[] {
  const parValeur = new Map(tendances.map((t) => [t.valeur, t]));
  return forces.map((f) => {
    const tendance = parValeur.get(f.valeur);
    const { intervalle, ...reste } = f;
    return {
      ...reste,
      intervalleBas: intervalle[0],
      intervalleHaut: intervalle[1],
      prioritaireSur: tendance?.domine ?? [],
      secondaireFaceA: tendance?.cedeDevant ?? [],
      contextes: tendance?.contextesFavorables ?? [],
    };
  });
}

/**
 * Les valeurs qui dominent régulièrement, **dans plusieurs contextes**.
 *
 * Une valeur qui gagne trois fois dans la même situation n'est pas forte : elle
 * est contextuelle. La distinction est tout l'intérêt de la section.
 */
function reperer(
  ordination: LigneOrdination[],
  relations: RelationPaire[],
): { fortes: string[]; contextuelles: ValeurContextuelle[] } {
  const fortes: string[] = [];
  const contextuelles: ValeurContextuelle[] = [];

  for (const ligne of ordination) {
    if (ligne.foisPrioritaire === 0) continue;

    const adversaires = relations.filter(
      (r) => r.valeurA === ligne.valeur || r.valeurB === ligne.valeur,
    );
    const gagnees = adversaires.filter((r) => r.prioritaire === ligne.valeur);
    const variables = adversaires.filter((r) => r.variable);

    const largeur =
      ligne.contextes.length >= SEUIL_CONTEXTES_FORTE ||
      ligne.prioritaireSur.length >= SEUIL_CONTEXTES_FORTE;

    if (
      largeur &&
      variables.length === 0 &&
      gagnees.length >= 2 &&
      ligne.foisPrioritaire > ligne.foisSecondaire &&
      // Une valeur qu'on n'arrive pas encore à situer n'est pas « forte » :
      // elle est seulement en avance dans un classement encore flou.
      (ligne.niveauConfiance === "tendance_forte" ||
        ligne.niveauConfiance === "tendance_probable")
    ) {
      fortes.push(ligne.valeur);
      continue;
    }

    // Contextuelle : elle passe devant, mais toujours au même endroit, ou
    // seulement une fois sur deux selon la situation.
    if (ligne.contextes.length === 1 && ligne.foisPrioritaire >= 2) {
      const libelle = libellesContexte[ligne.contextes[0] as Contexte];
      contextuelles.push({
        valeur: ligne.valeur,
        contextes: ligne.contextes,
        texte: `${citer(ligne.valeur)} a été prioritaire seulement dans un type de situation : ${(libelle ?? ligne.contextes[0]).toLowerCase()}. Ailleurs, le jeu ne l'a pas encore mise à l'épreuve.`,
      });
      continue;
    }

    if (variables.length > 0) {
      contextuelles.push({
        valeur: ligne.valeur,
        contextes: ligne.contextes,
        texte: `${citer(ligne.valeur)} a été prioritaire dans certaines situations et secondaire dans d'autres. Ce qui la fait bouger tient à la situation, pas à une hésitation.`,
      });
    }
  }

  return { fortes, contextuelles };
}

function construireTensionsPrincipales(
  relations: RelationPaire[],
  reponses: ReponseSource[],
  bascules: PointDeBascule[],
): TensionPrincipale[] {
  const parPaire = new Map(
    bascules.map((b) => [clePaire(b.valeurA, b.valeurB), b]),
  );

  const classees = relations.map((relation) => {
    const cle = clePaire(relation.valeurA, relation.valeurB);
    const facteurs = reponses
      .filter(
        (r) =>
          clePaire(r.valeurA, r.valeurB) === cle &&
          r.choix === "ca_depend" &&
          r.facteurDepend,
      )
      .map((r) => labelFacteur(r.facteurDepend, r.facteurDependLibre));
    const bascule = parPaire.get(cle);

    let type: TypeTension = "tranchee";
    if (relation.variable) type = "renversement";
    else if (relation.indecis >= Math.max(1, relation.comparaisons / 2))
      type = "indecise";
    else if (
      relation.comparaisons >= 2 &&
      Math.abs(relation.probabilite - 0.5) < SEUIL_PROBABILITE_SERREE - 0.5
    )
      type = "serree";

    const texte = formulerTension(relation, type, facteurs[0], bascule);
    return { relation, type, texte };
  });

  const rang: Record<TypeTension, number> = {
    renversement: 0,
    indecise: 1,
    serree: 2,
    tranchee: 3,
  };

  // Une paire tranchée une seule fois ne « montre » rien que l'ordination ne
  // dise déjà. On ne la remonte que si elle a tenu sur plusieurs situations.
  return classees
    .filter((c) => c.type !== "tranchee" || c.relation.comparaisons >= 2)
    .sort(
      (a, b) =>
        rang[a.type] - rang[b.type] ||
        b.relation.comparaisons - a.relation.comparaisons,
    )
    .slice(0, MAX_TENSIONS_PRINCIPALES)
    .map(({ relation, type, texte }) => ({
      valeurA: relation.valeurA,
      valeurB: relation.valeurB,
      type,
      texte,
    }));
}

function formulerTension(
  relation: RelationPaire,
  type: TypeTension,
  facteur: string | undefined,
  bascule: PointDeBascule | undefined,
): string {
  const { valeurA, valeurB, prioritaire } = relation;
  // Sans majorité, on prend valeurA comme point de vue — mais l'autre valeur se
  // déduit du point de vue retenu, jamais du gagnant : sinon la phrase oppose
  // une valeur à elle-même.
  const devant = prioritaire ?? valeurA;
  const derriere = devant === valeurA ? valeurB : valeurA;

  if (type === "renversement") {
    const declencheur = bascule?.reglageBascule ?? facteur ?? null;
    if (prioritaire) {
      return declencheur
        ? `${citer(devant)} ${termes.prioritaire} ${citer(derriere)} la plupart du temps, mais elle devient secondaire quand ${declencheur} entre en jeu.`
        : `${citer(devant)} ${termes.prioritaire} ${citer(derriere)} la plupart du temps, mais pas toujours : une situation a suffi à inverser l'ordre.`;
    }
    return declencheur
      ? `${citer(devant)} et ${citer(derriere)} se sont départagées dans les deux sens. Ce qui les fait basculer : ${declencheur}.`
      : `${citer(devant)} et ${citer(derriere)} se sont départagées dans les deux sens selon la situation. Ce qui fait pencher d'un côté ou de l'autre reste à trouver.`;
  }

  if (type === "indecise") {
    return `Entre ${citer(valeurA)} et ${citer(valeurB)}, tu as surtout répondu que ça dépend${facteur ? ` — souvent de ${facteur}` : ""}. Les deux comptent pour vrai.`;
  }

  if (type === "serree") {
    return `${citer(valeurA)} et ${citer(valeurB)} se tiennent de très près : rien dans ce qui a été joué ne les sépare nettement.`;
  }

  return `${citer(devant)} ${termes.prioritaire} ${citer(derriere)} dans ${relation.comparaisons > 1 ? `les ${relation.comparaisons} situations jouées` : "la situation jouée"}.`;
}

/**
 * Les réglages qui semblent déplacer les décisions.
 *
 * Deux sources, et elles ne disent pas la même chose : ce que la personne a
 * nommé elle-même dans un « ça dépend », et ce que le jeu a observé en montant
 * un réglage d'un cran.
 */
function calculerDimensionsSensibles(
  reponses: ReponseSource[],
  bascules: PointDeBascule[],
): DimensionSensible[] {
  const comptes = new Map<string, DimensionSensible>();

  const ajouter = (
    dimension: string,
    source: "ca_depend" | "bascule",
  ): void => {
    const cle = `${dimension}|${source}`;
    const deja = comptes.get(cle);
    if (deja) {
      deja.occurrences++;
      return;
    }
    comptes.set(cle, {
      dimension,
      libelle:
        libellesDimension[dimension as Dimension] ??
        labelFacteur(dimension, null),
      occurrences: 1,
      source,
    });
  };

  for (const r of reponses) {
    if (
      r.choix === "ca_depend" &&
      r.facteurDepend &&
      r.facteurDepend !== "autre"
    ) {
      ajouter(r.facteurDepend, "ca_depend");
    }
  }
  for (const b of bascules) {
    if (b.reglageBascule) ajouter(b.dimension, "bascule");
  }

  return Array.from(comptes.values()).sort(
    (a, b) =>
      b.occurrences - a.occurrences || a.libelle.localeCompare(b.libelle),
  );
}

function confianceGlobale(
  ordination: LigneOrdination[],
  couverture: Couverture,
): NiveauConfiance {
  if (couverture.comparaisonsRetenues === 0) return "territoire_peu_explore";
  const fortes = ordination.filter(
    (l) => l.niveauConfiance === "tendance_forte",
  ).length;
  const probables = ordination.filter(
    (l) => l.niveauConfiance === "tendance_probable",
  ).length;
  if (fortes >= 2 && couverture.part >= 0.6) return "tendance_forte";
  if (fortes >= 1 || probables >= 2) return "tendance_probable";
  return "encore_incertain";
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
  ): void {
    this.liste.push({
      id: `obs_${type}_${this.index++}`,
      texte,
      type,
      valeursConcernees,
      reponsesSources,
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

function idsDePaire(
  reponses: ReponseSource[],
  valeurA: string,
  valeurB: string,
): number[] {
  const cle = clePaire(valeurA, valeurB);
  return reponses
    .filter((r) => clePaire(r.valeurA, r.valeurB) === cle)
    .map((r) => r.id);
}

function redigerObservations(
  reponses: ReponseSource[],
  ordination: LigneOrdination[],
  tendances: TendanceValeur[],
  tensions: TensionObservee[],
  tensionsPrincipales: TensionPrincipale[],
  fortes: string[],
  contextuelles: ValeurContextuelle[],
  bascules: PointDeBascule[],
  cycles: string[][],
  couverture: Couverture,
  confiance: NiveauConfiance,
): ObservationConstellation[] {
  const obs = new Observations();

  // Où en est l'ordination — dit avant tout le reste, parce que tout le reste
  // en dépend.
  if (ordination.some((l) => l.comparaisons > 0)) {
    const tete = ordination.filter((l) => l.comparaisons > 0).slice(0, 3);
    obs.ajouter(
      "ordination",
      `Dans ce qui a été joué jusqu'ici, ${enumerer(tete.map((l) => l.valeur))} ${tete.length > 1 ? "arrivent" : "arrive"} en tête. C'est une estimation : elle bouge à chaque comparaison, et elle ne dit rien de ce que le jeu n'a pas posé.`,
      tete.map((l) => l.valeur),
      [],
    );
  }

  // Valeurs qui n'ont pas encore cédé.
  for (const t of tendances.filter((x) => x.estProtegee)) {
    obs.ajouter(
      "valeur_protegee",
      `${citer(t.valeur)} ${termes.jamaisSecondaire} : chaque fois qu'elle a été mise à l'épreuve, tu l'as choisie. Ça ne veut pas dire qu'elle ne cédera jamais — seulement qu'aucune situation jouée jusqu'ici ne l'a fait plier.`,
      [t.valeur],
      idsImpliquant(reponses, t.valeur),
    );
  }

  // Valeurs fortes : régulières, et dans plus d'un contexte.
  for (const valeur of fortes) {
    const ligne = ordination.find((l) => l.valeur === valeur);
    if (!ligne) continue;
    obs.ajouter(
      "valeur_forte",
      `${citer(valeur)} ${termes.prioritaire} ${enumerer(ligne.prioritaireSur)}, dans des situations différentes.`,
      [valeur],
      idsImpliquant(reponses, valeur),
    );
  }

  // Valeurs qui ne comptent que dans certaines situations.
  for (const contextuelle of contextuelles) {
    obs.ajouter(
      "valeur_contextuelle",
      contextuelle.texte,
      [contextuelle.valeur],
      idsImpliquant(reponses, contextuelle.valeur),
    );
  }

  // Les tensions les plus parlantes.
  for (const tension of tensionsPrincipales) {
    obs.ajouter(
      "tension",
      tension.texte,
      [tension.valeurA, tension.valeurB],
      idsDePaire(reponses, tension.valeurA, tension.valeurB),
    );
  }

  // Même tension, autre forme, autre réponse.
  for (const t of tensions.filter((x) => x.estStable === false)) {
    obs.ajouter(
      "stabilite",
      `Tu as rencontré ${citer(t.valeurA)} et ${citer(t.valeurB)} plus d'une fois, sous des formes différentes, et tu n'as pas répondu pareil. Ce n'est pas une contradiction : quelque chose dans la situation a compté.`,
      [t.valeurA, t.valeurB],
      idsDePaire(reponses, t.valeurA, t.valeurB).filter((id) =>
        reponses.some((r) => r.id === id && !r.serieId && estDecisif(r.choix)),
      ),
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

  // Boucles : dites telles quelles, jamais corrigées en douce.
  for (const cycle of cycles) {
    obs.ajouter(
      "cycle",
      `${enumerer(cycle)} tournent en rond : chacune ${termes.precede} la suivante, et la dernière ${termes.precede} la première. Ce n'est pas une erreur — ça veut dire que la situation décide, pas un ordre fixe.`,
      cycle,
      [],
    );
  }

  // Ce que la personne a elle-même nommé.
  const nommees = reponses.filter((r) => r.valeurProtegee);
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
      "valeur_forte",
      `Quand on t'a demandé ce que tu essayais de protéger, tu as répondu ${citer(valeur)} plus d'une fois. C'est toi qui l'as nommée — le jeu ne l'a pas déduite.`,
      [valeur],
      ids,
    );
  }

  // Territoires inexplorés.
  const inexplorees = ordination
    .filter((l) => l.comparaisons === 0)
    .map((l) => l.valeur);
  if (inexplorees.length > 0) {
    obs.ajouter(
      "territoire_inexplore",
      `${enumerer(inexplorees)} ${inexplorees.length > 1 ? "n'ont" : "n'a"} encore rencontré aucune situation dans cette partie. ${inexplorees.length > 1 ? "Leur place" : "Sa place"} reste à découvrir.`,
      inexplorees,
      [],
    );
  }

  // Étendue de ce qui a été joué.
  if (couverture.pairesPertinentes > 0 && couverture.part < 1) {
    obs.ajouter(
      "couverture",
      `${couverture.pairesCouvertes} des ${couverture.pairesPertinentes} paires de valeurs possibles ont été confrontées. Tout ce qui est écrit ici ne parle que de celles-là.`,
      [],
      [],
    );
  }

  obs.ajouter(
    "confiance",
    `Niveau de confiance de cette lecture : ${libellesConfiance[confiance].toLowerCase()}. ${
      confiance === "tendance_forte"
        ? "Les mêmes réponses sont revenues assez souvent pour dessiner quelque chose."
        : "Il y a encore peu de comparaisons derrière ce portrait — mettre la constellation à l'épreuve le précisera."
    }`,
    [],
    [],
  );

  return obs.tout();
}

// ─── Entrée principale ───────────────────────────────────────────────────────

export interface EntreeConstellation {
  reponses: ReponseSource[];
  valeursConnues: string[];
  /** Les cartes retenues par la personne. Sert à savoir ce qui reste jouable. */
  cartes?: CarteJugee[];
  graine?: number;
}

export function calculerConstellation({
  reponses,
  valeursConnues,
  cartes = [],
  graine = 0,
}: EntreeConstellation): ResultatConstellation {
  const duelsSeuls = reponses.filter((r) => !r.serieId);
  const comparaisons = duelsSeuls.map(versComparaison);

  const modele = ajusterModele(comparaisons, valeursConnues);
  const tendances = calculerTendances(reponses, valeursConnues);
  const tensions = calculerTensions(reponses);
  const bascules = calculerBascules(reponses);

  const ordination = construireOrdination(modele.forces, tendances);
  const { fortes, contextuelles } = reperer(ordination, modele.relations);
  const tensionsPrincipales = construireTensionsPrincipales(
    modele.relations,
    reponses,
    bascules,
  );
  const dimensionsSensibles = calculerDimensionsSensibles(reponses, bascules);

  // Ce que le jeu pourrait encore poser : les paires que les cartes ou les
  // situations écrites savent servir.
  const pairesDesCartes = duelsCartesPossibles(
    cartes.map((c) => ({
      id: c.carteId,
      famille: c.famille,
      label: c.label,
      valeursConfirmees: c.valeursConfirmees,
    })),
  ).map((d) => [d.valeurA, d.valeurB] as [string, string]);
  const pairesEcrites = planifierDuels(valeursConnues, graine).map(
    (d) => [d.valeurA, d.valeurB] as [string, string],
  );
  const valeursJouables = Array.from(
    new Set([...pairesDesCartes, ...pairesEcrites].flat()),
  );

  // Le dénominateur se limite à ce que la partie peut réellement poser. Le
  // mécanisme n'oppose qu'une limite à un enjeu : compter des paires hors de
  // portée annoncerait « 12 des 40 » à quelqu'un qui a pourtant tout joué.
  const couvertureBrute = calculerCouverture(
    valeursConnues.length > 0 ? valeursConnues : valeursJouables,
    comparaisons,
    [...pairesDesCartes, ...pairesEcrites],
  );

  const manifestations = new Set(
    comparaisons.map((c) =>
      cleManifestation(c.valeurA, c.valeurB, c.carteA, c.carteB),
    ),
  );
  const couverture: Couverture = {
    part: couvertureBrute.part,
    pairesPertinentes: couvertureBrute.pairesPertinentes.length,
    pairesCouvertes: couvertureBrute.pairesVues.length,
    comparaisonsRetenues: comparaisons.filter((c) => c.choix !== "passer")
      .length,
    manifestationsRejouees: Math.max(
      0,
      manifestations.size - couvertureBrute.pairesVues.length,
    ),
  };

  // Stabilité : parmi les tensions revues sous une autre forme, combien ont
  // reçu la même réponse. Sans reprise, il n'y a rien à mesurer — on affiche 1
  // et l'observation de couverture dit le reste.
  const revues = tensions.filter((t) => t.estStable !== null);
  const stabilite =
    revues.length > 0
      ? revues.filter((t) => t.estStable === true).length / revues.length
      : 1;

  const niveauConfianceGlobal = confianceGlobale(ordination, couverture);

  return {
    ordination,
    relations: modele.relations,
    valeursFortes: fortes,
    valeursContextuelles: contextuelles,
    valeursProtegees: ordination
      .filter(
        (l) => l.jamaisSecondaire && l.foisPrioritaire >= SEUIL_VALEUR_PROTEGEE,
      )
      .map((l) => l.valeur),
    tensionsPrincipales,
    dimensionsSensibles,
    cycles: modele.cycles,
    tendances,
    tensions,
    bascules,
    observations: redigerObservations(
      reponses,
      ordination,
      tendances,
      tensions,
      tensionsPrincipales,
      fortes,
      contextuelles,
      bascules,
      modele.cycles,
      couverture,
      niveauConfianceGlobal,
    ),
    couverture,
    stabilite,
    niveauConfianceGlobal,
    versionCalcul: VERSION_CALCUL,
  };
}
