/**
 * Moteur de constellation V1 — déterministe, sans LLM.
 * Les tendances sont versionnées, explicables et entièrement recalculables
 * à partir des réponses brutes.
 */

export interface ReponseSource {
  id: number;
  valeurA: string;
  valeurB: string;
  choix: string;
  facteurDepend: string | null;
  facteurDependLibre: string | null;
  difficulte: number | null;
  certitude: number | null;
  version: number;
}

export interface TendanceValeur {
  valeur: string;
  scoreNet: number;
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
  estForte: boolean;
}

export interface ObservationConstellation {
  id: string;
  texte: string;
  type: "tendance" | "tension" | "territoire_inexplore" | "stabilite" | "couverture";
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

const VERSION_CALCUL = 1;

function labelFacteur(facteur: string | null, libre: string | null): string {
  if (!facteur) return "";
  const labels: Record<string, string> = {
    cout_personnel: "le coût personnel",
    ampleur_impact: "l'ampleur de l'impact",
    proximite_sociale: "la proximité sociale",
    nombre_personnes: "le nombre de personnes touchées",
    certitude: "la certitude",
    reversibilite: "la réversibilité",
    urgence: "l'urgence",
    responsabilite: "la responsabilité",
    autre: libre ? `"${libre}"` : "un autre facteur",
  };
  return labels[facteur] ?? facteur;
}

export function calculerConstellation(
  reponses: ReponseSource[],
  valeursConnues: string[],
): ResultatConstellation {
  // ── 1. Recueillir toutes les valeurs impliquées ───────────────────────────
  const toutesValeurs = new Set<string>(valeursConnues);
  for (const r of reponses) {
    toutesValeurs.add(r.valeurA);
    toutesValeurs.add(r.valeurB);
  }
  const valeurs = Array.from(toutesValeurs);

  // ── 2. Calculer les tendances par valeur ─────────────────────────────────
  const tendancesMap = new Map<string, TendanceValeur>();
  for (const v of valeurs) {
    tendancesMap.set(v, {
      valeur: v,
      scoreNet: 0,
      totalCollisions: 0,
      victoiresA: 0,
      victoiresB: 0,
      incertitudes: 0,
      abandonnes: 0,
      difficulteMoyenne: null,
      certitudeMoyenne: null,
      territoireInexplore: true,
    });
  }

  const difficultesSomme = new Map<string, number>();
  const difficultesCount = new Map<string, number>();
  const certitudesSomme = new Map<string, number>();
  const certitudesCount = new Map<string, number>();

  for (const r of reponses) {
    const tA = tendancesMap.get(r.valeurA);
    const tB = tendancesMap.get(r.valeurB);
    if (!tA || !tB) continue;

    tA.totalCollisions++;
    tB.totalCollisions++;

    if (r.choix === "A") {
      tA.victoiresA++;
      tB.victoiresB++;
      tA.territoireInexplore = false;
      tB.territoireInexplore = false;
    } else if (r.choix === "B") {
      tA.victoiresB++;
      tB.victoiresA++;
      tA.territoireInexplore = false;
      tB.territoireInexplore = false;
    } else if (r.choix === "ca_depend" || r.choix === "je_ne_sais_pas") {
      tA.incertitudes++;
      tB.incertitudes++;
      tA.territoireInexplore = false;
      tB.territoireInexplore = false;
    } else if (r.choix === "passer") {
      tA.abandonnes++;
      tB.abandonnes++;
    }

    // Difficulté et certitude (sauf passer)
    if (r.choix !== "passer") {
      if (r.difficulte != null) {
        difficultesSomme.set(r.valeurA, (difficultesSomme.get(r.valeurA) ?? 0) + r.difficulte);
        difficultesCount.set(r.valeurA, (difficultesCount.get(r.valeurA) ?? 0) + 1);
        difficultesSomme.set(r.valeurB, (difficultesSomme.get(r.valeurB) ?? 0) + r.difficulte);
        difficultesCount.set(r.valeurB, (difficultesCount.get(r.valeurB) ?? 0) + 1);
      }
      if (r.certitude != null) {
        certitudesSomme.set(r.valeurA, (certitudesSomme.get(r.valeurA) ?? 0) + r.certitude);
        certitudesCount.set(r.valeurA, (certitudesCount.get(r.valeurA) ?? 0) + 1);
        certitudesSomme.set(r.valeurB, (certitudesSomme.get(r.valeurB) ?? 0) + r.certitude);
        certitudesCount.set(r.valeurB, (certitudesCount.get(r.valeurB) ?? 0) + 1);
      }
    }
  }

  // Calculer les scores nets et moyennes
  for (const [v, t] of tendancesMap.entries()) {
    const significatifs = t.victoiresA + t.victoiresB;
    if (significatifs > 0) {
      // Score net : (victoires nettes) / (total significatif)
      // Victoire nette de A = choix A quand v est valeurA, ou choix B quand v est valeurB
      // On recalcule les victoires nettes depuis les réponses pour avoir le bon sens
      let victoiresNettes = 0;
      for (const r of reponses) {
        if (r.valeurA === v && r.choix === "A") victoiresNettes++;
        if (r.valeurB === v && r.choix === "B") victoiresNettes++;
        if (r.valeurA === v && r.choix === "B") victoiresNettes--;
        if (r.valeurB === v && r.choix === "A") victoiresNettes--;
      }
      t.scoreNet = victoiresNettes / significatifs;
    }

    const dc = difficultesCount.get(v) ?? 0;
    if (dc > 0) {
      t.difficulteMoyenne = (difficultesSomme.get(v) ?? 0) / dc;
    }
    const cc = certitudesCount.get(v) ?? 0;
    if (cc > 0) {
      t.certitudeMoyenne = (certitudesSomme.get(v) ?? 0) / cc;
    }
  }

  const tendances = Array.from(tendancesMap.values()).sort(
    (a, b) => b.scoreNet - a.scoreNet,
  );

  // ── 3. Détecter les tensions ──────────────────────────────────────────────
  const tensionsMap = new Map<string, TensionObservee>();

  for (const r of reponses) {
    const key = [r.valeurA, r.valeurB].sort().join("|||");
    const existing = tensionsMap.get(key);
    const estIncertaine =
      r.choix === "ca_depend" || r.choix === "je_ne_sais_pas";

    if (existing) {
      existing.totalCollisions++;
      if (estIncertaine) existing.incertitudes++;
    } else {
      tensionsMap.set(key, {
        valeurA: r.valeurA,
        valeurB: r.valeurB,
        totalCollisions: 1,
        incertitudes: estIncertaine ? 1 : 0,
        estForte: false,
      });
    }
  }

  // Une tension est forte si ≥50% des réponses sont incertaines (ca_depend/je_ne_sais_pas)
  const tensions: TensionObservee[] = [];
  for (const t of tensionsMap.values()) {
    if (t.totalCollisions > 0) {
      t.estForte = t.incertitudes / t.totalCollisions >= 0.5;
      tensions.push(t);
    }
  }
  tensions.sort((a, b) => b.incertitudes - a.incertitudes);

  // ── 4. Couverture et stabilité ───────────────────────────────────────────
  const nValeurs = valeurs.length;
  const collisionsPossibles =
    nValeurs >= 2 ? (nValeurs * (nValeurs - 1)) / 2 : 0;
  const reponsesSignificatives = reponses.filter(
    (r) => r.choix !== "passer",
  ).length;
  const couverture =
    collisionsPossibles > 0
      ? Math.min(1, reponsesSignificatives / collisionsPossibles)
      : 0;

  // Stabilité = certitude moyenne globale normalisée (1-5 → 0-1)
  const toutesLescertitudes = reponses
    .filter((r) => r.certitude != null && r.choix !== "passer")
    .map((r) => r.certitude as number);
  const certitudeMoyenneGlobale =
    toutesLescertitudes.length > 0
      ? toutesLescertitudes.reduce((s, c) => s + c, 0) /
        toutesLescertitudes.length
      : null;
  const stabilite =
    certitudeMoyenneGlobale != null ? (certitudeMoyenneGlobale - 1) / 4 : 0.5;

  // ── 5. Générer les observations ──────────────────────────────────────────
  const observations: ObservationConstellation[] = [];
  let obsIdx = 0;

  // Tendances fortes (score net > 0.5 avec au moins 2 collisions significatives)
  for (const t of tendances) {
    const sig = t.victoiresA + t.victoiresB;
    if (sig >= 2 && Math.abs(t.scoreNet) > 0.5) {
      const sens =
        t.scoreNet > 0 ? "semble souvent prioritaire" : "semble souvent céder la place";
      const reponsesSources = reponses
        .filter(
          (r) =>
            (r.valeurA === t.valeur || r.valeurB === t.valeur) &&
            (r.choix === "A" || r.choix === "B"),
        )
        .map((r) => r.id);

      observations.push({
        id: `obs_tendance_${obsIdx++}`,
        texte: `Dans les situations explorées jusqu'ici, « ${t.valeur} » ${sens} face aux autres valeurs.`,
        type: "tendance",
        valeursConcernees: [t.valeur],
        reponsesSources,
      });
    }
  }

  // Tensions fortes
  for (const tension of tensions) {
    if (tension.estForte) {
      const reponsesSources = reponses
        .filter(
          (r) =>
            ((r.valeurA === tension.valeurA && r.valeurB === tension.valeurB) ||
              (r.valeurA === tension.valeurB &&
                r.valeurB === tension.valeurA)) &&
            (r.choix === "ca_depend" || r.choix === "je_ne_sais_pas"),
        )
        .map((r) => r.id);

      observations.push({
        id: `obs_tension_${obsIdx++}`,
        texte: `Dans les situations explorées jusqu'ici, la tension entre « ${tension.valeurA} » et « ${tension.valeurB} » semble particulièrement complexe à trancher.`,
        type: "tension",
        valeursConcernees: [tension.valeurA, tension.valeurB],
        reponsesSources,
      });
    }
  }

  // Facteurs « ça dépend » récurrents
  const facteurCount = new Map<string, { count: number; ids: number[] }>();
  for (const r of reponses) {
    if (r.choix === "ca_depend" && r.facteurDepend) {
      const existing = facteurCount.get(r.facteurDepend);
      if (existing) {
        existing.count++;
        existing.ids.push(r.id);
      } else {
        facteurCount.set(r.facteurDepend, { count: 1, ids: [r.id] });
      }
    }
  }
  for (const [facteur, { count, ids }] of facteurCount.entries()) {
    if (count >= 2) {
      const lib = reponses.find(
        (r) => r.facteurDepend === facteur && r.facteurDependLibre,
      )?.facteurDependLibre ?? null;
      observations.push({
        id: `obs_facteur_${obsIdx++}`,
        texte: `Dans les situations explorées jusqu'ici, ${labelFacteur(facteur, lib)} semble être un facteur déterminant dans vos choix.`,
        type: "tension",
        valeursConcernees: [],
        reponsesSources: ids,
      });
    }
  }

  // Territoires inexplorés
  const valeursInexplorees = tendances
    .filter((t) => t.territoireInexplore)
    .map((t) => t.valeur);
  if (valeursInexplorees.length > 0) {
    observations.push({
      id: `obs_inexplore_${obsIdx++}`,
      texte: `Ces valeurs n'ont pas encore été mises en collision : ${valeursInexplorees.map((v) => `« ${v} »`).join(", ")}. Leur place dans votre constellation reste à découvrir.`,
      type: "territoire_inexplore",
      valeursConcernees: valeursInexplorees,
      reponsesSources: [],
    });
  }

  // Couverture
  if (couverture < 0.3 && collisionsPossibles > 3) {
    observations.push({
      id: `obs_couverture_${obsIdx++}`,
      texte: `Jusqu'ici, ${Math.round(couverture * 100)} % des collisions possibles ont été explorées. Les tendances observées sont provisoires — elles se préciseront avec davantage de dilemmes.`,
      type: "couverture",
      valeursConcernees: [],
      reponsesSources: [],
    });
  }

  // Stabilité
  if (certitudeMoyenneGlobale != null) {
    const niveauStabilite =
      certitudeMoyenneGlobale >= 4
        ? "élevée"
        : certitudeMoyenneGlobale >= 2.5
          ? "modérée"
          : "variable";
    observations.push({
      id: `obs_stabilite_${obsIdx++}`,
      texte: `Dans les situations explorées jusqu'ici, votre niveau de certitude dans vos choix est ${niveauStabilite} (${certitudeMoyenneGlobale.toFixed(1)}/5 en moyenne).`,
      type: "stabilite",
      valeursConcernees: [],
      reponsesSources: reponses
        .filter((r) => r.certitude != null)
        .map((r) => r.id),
    });
  }

  return {
    tendances,
    tensions,
    observations,
    couverture,
    stabilite,
    versionCalcul: VERSION_CALCUL,
  };
}
