/**
 * Moteur de constellation V2 — déterministe, sans LLM.
 *
 * Les réponses valides sont la seule source de vérité. Le moteur applique un
 * lissage Beta(1,1) par paire et utilise la certitude comme force de preuve.
 * La difficulté reste un signal de tension distinct.
 */

export interface ReponseSource {
  id: number;
  valeurA: string;
  valeurB: string;
  choix: string;
  contexte?: string | null;
  pivotDimension?: string | null;
  facteurDepend: string | null;
  facteurDependLibre: string | null;
  difficulte: number | null;
  certitude: number | null;
  version: number;
}

export interface TendanceValeur {
  valeur: string;
  scoreNet: number;
  importanceApparente: number;
  incertitude: number;
  stabilite: number;
  couverture: number;
  statutProtege: boolean;
  contextesExplores: string[];
  preferencesParContexte: Array<{
    contexte: string;
    importanceApparente: number;
    preuvesEffectives: number;
  }>;
  totalCollisions: number;
  victoiresA: number;
  victoiresB: number;
  incertitudes: number;
  abandonnes: number;
  difficulteMoyenne: number | null;
  certitudeMoyenne: number | null;
  territoireInexplore: boolean;
}

export interface TensionObservee {
  valeurA: string;
  valeurB: string;
  totalCollisions: number;
  incertitudes: number;
  difficulteMoyenne: number | null;
  probabiliteA: number;
  incertitude: number;
  estForte: boolean;
}

export interface ObservationConstellation {
  id: string;
  texte: string;
  type:
    | "tendance"
    | "tension"
    | "territoire_inexplore"
    | "stabilite"
    | "couverture"
    | "valeur_protegee"
    | "point_bascule";
  valeursConcernees: string[];
  reponsesSources: number[];
}

export interface ResultatConstellation {
  tendances: TendanceValeur[];
  tensions: TensionObservee[];
  observations: ObservationConstellation[];
  couverture: number;
  stabilite: number;
  versionCalcul: number;
}

interface PairEvidence {
  valeurA: string;
  valeurB: string;
  supportA: number;
  supportB: number;
  choixA: number;
  choixB: number;
  incertitudes: number;
  total: number;
  difficulteSomme: number;
  difficulteCount: number;
  reponses: ReponseSource[];
}

interface ValueAccumulator {
  probabilites: Array<{ probabilite: number; poids: number }>;
  pairStabilities: number[];
  opponents: Set<string>;
  contexts: Set<string>;
  wins: number;
  losses: number;
  uncertainties: number;
  passes: number;
  total: number;
  difficultySum: number;
  difficultyCount: number;
  confidenceSum: number;
  confidenceCount: number;
}

const VERSION_CALCUL = 2;

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function normaliserValeur(value: string): string {
  return value.trim().toLocaleLowerCase("fr-CA");
}

function pairKey(valueA: string, valueB: string): string {
  return [normaliserValeur(valueA), normaliserValeur(valueB)]
    .sort((a, b) => a.localeCompare(b, "fr-CA"))
    .join("|||");
}

function confidenceWeight(certitude: number | null): number {
  return clamp((certitude ?? 3) / 5, 0.2, 1);
}

function labelFacteur(facteur: string | null, libre: string | null): string {
  if (!facteur) return "une dimension encore à préciser";
  const labels: Record<string, string> = {
    cout_personnel: "le coût personnel",
    ampleur_impact: "l'importance de la conséquence",
    proximite_sociale: "la proximité sociale",
    nombre_personnes: "la portée ou le nombre de personnes touchées",
    certitude: "la certitude",
    reversibilite: "la réversibilité",
    urgence: "l'urgence",
    responsabilite: "la responsabilité personnelle",
    autre: libre ? `« ${libre} »` : "un autre facteur",
  };
  return labels[facteur] ?? facteur;
}

function canonicalPair(response: ReponseSource): {
  key: string;
  first: string;
  second: string;
  responseFirstIsA: boolean;
} {
  const responseFirstIsA =
    normaliserValeur(response.valeurA).localeCompare(
      normaliserValeur(response.valeurB),
      "fr-CA",
    ) <= 0;
  return {
    key: pairKey(response.valeurA, response.valeurB),
    first: responseFirstIsA ? response.valeurA : response.valeurB,
    second: responseFirstIsA ? response.valeurB : response.valeurA,
    responseFirstIsA,
  };
}

function buildPairEvidence(reponses: ReponseSource[]): Map<string, PairEvidence> {
  const pairs = new Map<string, PairEvidence>();

  for (const response of reponses) {
    const canonical = canonicalPair(response);
    const pair = pairs.get(canonical.key) ?? {
      valeurA: canonical.first,
      valeurB: canonical.second,
      supportA: 0,
      supportB: 0,
      choixA: 0,
      choixB: 0,
      incertitudes: 0,
      total: 0,
      difficulteSomme: 0,
      difficulteCount: 0,
      reponses: [],
    };

    pair.reponses.push(response);
    if (response.choix !== "passer") pair.total++;
    if (response.choix === "ca_depend" || response.choix === "je_ne_sais_pas") {
      pair.incertitudes++;
    }
    if (response.choix !== "passer" && response.difficulte != null) {
      pair.difficulteSomme += response.difficulte;
      pair.difficulteCount++;
    }

    if (response.choix === "A" || response.choix === "B") {
      const choseResponseA = response.choix === "A";
      const choseCanonicalA = canonical.responseFirstIsA
        ? choseResponseA
        : !choseResponseA;
      const weight = confidenceWeight(response.certitude);
      if (choseCanonicalA) {
        pair.supportA += weight;
        pair.choixA++;
      } else {
        pair.supportB += weight;
        pair.choixB++;
      }
    }

    pairs.set(canonical.key, pair);
  }

  return pairs;
}

function createAccumulator(): ValueAccumulator {
  return {
    probabilites: [],
    pairStabilities: [],
    opponents: new Set(),
    contexts: new Set(),
    wins: 0,
    losses: 0,
    uncertainties: 0,
    passes: 0,
    total: 0,
    difficultySum: 0,
    difficultyCount: 0,
    confidenceSum: 0,
    confidenceCount: 0,
  };
}

export function calculerConstellation(
  reponses: ReponseSource[],
  valeursConnues: string[],
): ResultatConstellation {
  const toutesValeurs = new Set(valeursConnues.map((value) => value.trim()));
  for (const response of reponses) {
    toutesValeurs.add(response.valeurA.trim());
    toutesValeurs.add(response.valeurB.trim());
  }
  const valeurs = Array.from(toutesValeurs).filter(Boolean);
  const accumulators = new Map(
    valeurs.map((value) => [value, createAccumulator()] as const),
  );
  const pairEvidence = buildPairEvidence(reponses);

  for (const response of reponses) {
    const accumulatorA = accumulators.get(response.valeurA);
    const accumulatorB = accumulators.get(response.valeurB);
    if (!accumulatorA || !accumulatorB) continue;

    for (const [current, opponent] of [
      [accumulatorA, response.valeurB],
      [accumulatorB, response.valeurA],
    ] as const) {
      current.total++;
      current.opponents.add(opponent);
      if (response.contexte) current.contexts.add(response.contexte);
      if (response.choix === "passer") current.passes++;
      if (
        response.choix === "ca_depend" ||
        response.choix === "je_ne_sais_pas"
      ) {
        current.uncertainties++;
      }
      if (response.choix !== "passer" && response.difficulte != null) {
        current.difficultySum += response.difficulte;
        current.difficultyCount++;
      }
      if (response.choix !== "passer" && response.certitude != null) {
        current.confidenceSum += response.certitude;
        current.confidenceCount++;
      }
    }

    if (response.choix === "A") {
      accumulatorA.wins++;
      accumulatorB.losses++;
    } else if (response.choix === "B") {
      accumulatorB.wins++;
      accumulatorA.losses++;
    }
  }

  const tensions: TensionObservee[] = [];
  for (const pair of pairEvidence.values()) {
    const probabilityA =
      (pair.supportA + 1) / (pair.supportA + pair.supportB + 2);
    const uncertainty = 1 - Math.abs(probabilityA - 0.5) * 2;
    const effectiveEvidence = pair.supportA + pair.supportB;
    const evidenceWeight = clamp(effectiveEvidence / 2, 0.25, 1);
    const repeatedChoices = pair.choixA + pair.choixB;
    const pairStability =
      repeatedChoices < 2
        ? 0.5
        : Math.max(pair.choixA, pair.choixB) / repeatedChoices;

    accumulators.get(pair.valeurA)?.probabilites.push({
      probabilite: probabilityA,
      poids: evidenceWeight,
    });
    accumulators.get(pair.valeurB)?.probabilites.push({
      probabilite: 1 - probabilityA,
      poids: evidenceWeight,
    });
    accumulators.get(pair.valeurA)?.pairStabilities.push(pairStability);
    accumulators.get(pair.valeurB)?.pairStabilities.push(pairStability);

    const difficulteMoyenne =
      pair.difficulteCount > 0
        ? pair.difficulteSomme / pair.difficulteCount
        : null;
    tensions.push({
      valeurA: pair.valeurA,
      valeurB: pair.valeurB,
      totalCollisions: pair.total,
      incertitudes: pair.incertitudes,
      difficulteMoyenne,
      probabiliteA: probabilityA,
      incertitude: uncertainty,
      estForte:
        pair.total > 0 &&
        (uncertainty >= 0.6 || (difficulteMoyenne ?? 0) >= 4),
    });
  }

  const possibleOpponents = Math.max(0, valeurs.length - 1);
  const tendances: TendanceValeur[] = valeurs.map((value) => {
    const accumulator = accumulators.get(value) ?? createAccumulator();
    const weightedProbabilityTotal = accumulator.probabilites.reduce(
      (sum, item) => sum + item.probabilite * item.poids,
      0,
    );
    const probabilityWeight = accumulator.probabilites.reduce(
      (sum, item) => sum + item.poids,
      0,
    );
    const importanceApparente =
      probabilityWeight > 0 ? weightedProbabilityTotal / probabilityWeight : 0.5;
    const stability =
      accumulator.pairStabilities.length > 0
        ? accumulator.pairStabilities.reduce((sum, item) => sum + item, 0) /
          accumulator.pairStabilities.length
        : 0.5;
    const coverage =
      possibleOpponents > 0
        ? accumulator.opponents.size / possibleOpponents
        : 0;
    const preferencesParContexte = Array.from(accumulator.contexts)
      .map((context) => {
        let support = 0;
        let opposition = 0;
        for (const response of reponses) {
          if (
            response.contexte !== context ||
            (response.choix !== "A" && response.choix !== "B")
          ) {
            continue;
          }
          const weight = confidenceWeight(response.certitude);
          const valueWon =
            (response.valeurA === value && response.choix === "A") ||
            (response.valeurB === value && response.choix === "B");
          const valueLost =
            (response.valeurA === value && response.choix === "B") ||
            (response.valeurB === value && response.choix === "A");
          if (valueWon) support += weight;
          if (valueLost) opposition += weight;
        }
        return {
          contexte: context,
          importanceApparente: (support + 1) / (support + opposition + 2),
          preuvesEffectives: support + opposition,
        };
      })
      .sort((a, b) => a.contexte.localeCompare(b.contexte, "fr-CA"));

    return {
      valeur: value,
      scoreNet: importanceApparente * 2 - 1,
      importanceApparente,
      incertitude: 1 - Math.abs(importanceApparente - 0.5) * 2,
      stabilite: stability,
      couverture: coverage,
      statutProtege:
        accumulator.wins >= 3 &&
        accumulator.losses === 0 &&
        accumulator.opponents.size >= 2 &&
        accumulator.contexts.size >= 2,
      contextesExplores: Array.from(accumulator.contexts).sort((a, b) =>
        a.localeCompare(b, "fr-CA"),
      ),
      preferencesParContexte,
      totalCollisions: accumulator.total,
      victoiresA: accumulator.wins,
      victoiresB: accumulator.losses,
      incertitudes: accumulator.uncertainties,
      abandonnes: accumulator.passes,
      difficulteMoyenne:
        accumulator.difficultyCount > 0
          ? accumulator.difficultySum / accumulator.difficultyCount
          : null,
      certitudeMoyenne:
        accumulator.confidenceCount > 0
          ? accumulator.confidenceSum / accumulator.confidenceCount
          : null,
      territoireInexplore:
        accumulator.wins +
          accumulator.losses +
          accumulator.uncertainties ===
        0,
    };
  });

  tendances.sort(
    (a, b) =>
      b.importanceApparente - a.importanceApparente ||
      a.valeur.localeCompare(b.valeur, "fr-CA"),
  );
  tensions.sort(
    (a, b) =>
      Number(b.estForte) - Number(a.estForte) ||
      b.incertitude - a.incertitude,
  );

  const exploredPairKeys = new Set(
    reponses
      .filter((response) => response.choix !== "passer")
      .map((response) => pairKey(response.valeurA, response.valeurB)),
  );
  const collisionsPossibles =
    valeurs.length >= 2 ? (valeurs.length * (valeurs.length - 1)) / 2 : 0;
  const couverture =
    collisionsPossibles > 0
      ? clamp(exploredPairKeys.size / collisionsPossibles)
      : 0;
  const repeatedPairs = Array.from(pairEvidence.values()).filter(
    (pair) => pair.choixA + pair.choixB >= 2,
  );
  const stabilite =
    repeatedPairs.length > 0
      ? repeatedPairs.reduce(
          (sum, pair) =>
            sum +
            Math.max(pair.choixA, pair.choixB) /
              (pair.choixA + pair.choixB),
          0,
        ) / repeatedPairs.length
      : 0.5;

  const observations: ObservationConstellation[] = [];
  let observationIndex = 0;

  for (const tendency of tendances) {
    const meaningfulEvidence = tendency.victoiresA + tendency.victoiresB;
    const sourceIds = reponses
      .filter(
        (response) =>
          (response.valeurA === tendency.valeur ||
            response.valeurB === tendency.valeur) &&
          (response.choix === "A" || response.choix === "B"),
      )
      .map((response) => response.id);

    if (meaningfulEvidence >= 2 && Math.abs(tendency.scoreNet) >= 0.25) {
      observations.push({
        id: `obs_tendance_${observationIndex++}`,
        texte:
          tendency.scoreNet > 0
            ? `Dans les situations explorées jusqu'ici, « ${tendency.valeur} » semble souvent prendre le dessus. Cette estimation reste provisoire.`
            : `Dans les situations explorées jusqu'ici, « ${tendency.valeur} » semble parfois céder devant d'autres priorités. Cela ne diminue pas son importance hors de ces contextes.`,
        type: "tendance",
        valeursConcernees: [tendency.valeur],
        reponsesSources: sourceIds,
      });
    }

    if (tendency.statutProtege) {
      observations.push({
        id: `obs_protegee_${observationIndex++}`,
        texte: `Nous n'avons pas encore observé de compromis concernant « ${tendency.valeur} » dans les contextes suffisamment variés explorés jusqu'ici.`,
        type: "valeur_protegee",
        valeursConcernees: [tendency.valeur],
        reponsesSources: sourceIds,
      });
    }
  }

  for (const tension of tensions.filter((item) => item.estForte)) {
    const sourceIds = pairEvidence
      .get(pairKey(tension.valeurA, tension.valeurB))
      ?.reponses.map((response) => response.id) ?? [];
    observations.push({
      id: `obs_tension_${observationIndex++}`,
      texte: `Dans les situations explorées jusqu'ici, l'arbitrage entre « ${tension.valeurA} » et « ${tension.valeurB} » semble difficile ou encore très ouvert.`,
      type: "tension",
      valeursConcernees: [tension.valeurA, tension.valeurB],
      reponsesSources: sourceIds,
    });
  }

  const pivotCandidates = new Map<
    string,
    { count: number; ids: number[]; libre: string | null }
  >();
  for (const response of reponses) {
    const factor =
      response.choix === "ca_depend"
        ? response.facteurDepend
        : response.pivotDimension;
    if (!factor) continue;
    const current = pivotCandidates.get(factor) ?? {
      count: 0,
      ids: [],
      libre: null,
    };
    current.count++;
    current.ids.push(response.id);
    current.libre ??= response.facteurDependLibre;
    pivotCandidates.set(factor, current);
  }
  for (const [factor, candidate] of pivotCandidates) {
    observations.push({
      id: `obs_pivot_${observationIndex++}`,
      texte: `Tes réponses suggèrent actuellement que ${labelFacteur(factor, candidate.libre)} pourrait constituer un point de bascule à explorer, sans présumer du seuil exact.`,
      type: "point_bascule",
      valeursConcernees: [],
      reponsesSources: candidate.ids,
    });
  }

  const unexploredValues = tendances
    .filter((tendency) => tendency.territoireInexplore)
    .map((tendency) => tendency.valeur);
  if (unexploredValues.length > 0) {
    observations.push({
      id: `obs_inexplore_${observationIndex++}`,
      texte: `Ces valeurs restent des territoires inexplorés : ${unexploredValues.map((value) => `« ${value} »`).join(", ")}.`,
      type: "territoire_inexplore",
      valeursConcernees: unexploredValues,
      reponsesSources: [],
    });
  }

  if (collisionsPossibles > 0) {
    observations.push({
      id: `obs_couverture_${observationIndex++}`,
      texte: `Jusqu'ici, ${Math.round(couverture * 100)} % des paires possibles ont été explorées. Les tendances pourraient changer dans d'autres contextes.`,
      type: "couverture",
      valeursConcernees: [],
      reponsesSources: reponses
        .filter((response) => response.choix !== "passer")
        .map((response) => response.id),
    });
  }

  observations.push({
    id: `obs_stabilite_${observationIndex++}`,
    texte:
      repeatedPairs.length > 0
        ? `Lorsque certaines tensions ont été revisitées, les choix sont demeurés semblables dans ${Math.round(stabilite * 100)} % des observations comparables. Le contexte peut néanmoins faire varier cette tendance.`
        : "La stabilité n'a pas encore pu être testée : aucune même paire de valeurs n'a été revisitée dans un autre contexte.",
    type: "stabilite",
    valeursConcernees: [],
    reponsesSources: repeatedPairs.flatMap((pair) =>
      pair.reponses.map((response) => response.id),
    ),
  });

  return {
    tendances,
    tensions,
    observations,
    couverture,
    stabilite,
    versionCalcul: VERSION_CALCUL,
  };
}
