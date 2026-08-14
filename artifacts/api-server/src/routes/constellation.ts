import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  sessionsTable,
  cartesSessionTable,
  reponsesCollisionTable,
  dilemmesTable,
} from "@workspace/db";
import {
  GetConstellationParams,
  GetProgresParams,
} from "@workspace/api-zod";
import { and, eq, isNull } from "drizzle-orm";
import { calculerConstellation } from "../lib/constellation-engine";
import type { ReponseSource } from "../lib/constellation-engine";

const router: IRouter = Router();

router.get(
  "/sessions/:sessionId/constellation",
  async (req, res): Promise<void> => {
    const params = GetConstellationParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const [session] = await db
      .select()
      .from(sessionsTable)
      .where(eq(sessionsTable.id, params.data.sessionId));

    if (!session) {
      res.status(404).json({ error: "Session introuvable" });
      return;
    }

    // Récupérer toutes les valeurs confirmées
    const cartes = await db
      .select()
      .from(cartesSessionTable)
      .where(eq(cartesSessionTable.sessionId, params.data.sessionId));

    const valeursConnues = Array.from(
      new Set(cartes.flatMap((c) => c.valeursConfirmees)),
    );

    // Récupérer toutes les réponses
    const reponsesRaw = await db
      .select()
      .from(reponsesCollisionTable)
      .where(
        and(
          eq(reponsesCollisionTable.sessionId, params.data.sessionId),
          isNull(reponsesCollisionTable.invalidatedAt),
        ),
      );

    const reponses: ReponseSource[] = reponsesRaw.map((r) => ({
      id: r.id,
      valeurA: r.valeurA,
      valeurB: r.valeurB,
      contexte: r.contexte ?? null,
      pivotDimension: r.pivotDimension ?? null,
      choix: r.choix,
      facteurDepend: r.facteurDepend ?? null,
      facteurDependLibre: r.facteurDependLibre ?? null,
      difficulte: r.difficulte ?? null,
      certitude: r.certitude ?? null,
      version: r.version,
    }));

    const resultat = calculerConstellation(reponses, valeursConnues);

    // Calculer la version comme max version des réponses (ou 1)
    const versionConstellation =
      reponsesRaw.length > 0
        ? Math.max(...reponsesRaw.map((r) => r.version))
        : 1;

    res.json({
      sessionId: params.data.sessionId,
      version: versionConstellation,
      tendances: resultat.tendances.map((t) => ({
        valeur: t.valeur,
        scoreNet: t.scoreNet,
        importanceApparente: t.importanceApparente,
        incertitude: t.incertitude,
        stabilite: t.stabilite,
        couverture: t.couverture,
        statutProtege: t.statutProtege,
        contextesExplores: t.contextesExplores,
        preferencesParContexte: t.preferencesParContexte,
        totalCollisions: t.totalCollisions,
        victoiresA: t.victoiresA,
        victoiresB: t.victoiresB,
        incertitudes: t.incertitudes,
        abandonnes: t.abandonnes,
        difficulteMoyenne: t.difficulteMoyenne,
        certitudeMoyenne: t.certitudeMoyenne,
        territoireInexplore: t.territoireInexplore,
      })),
      tensions: resultat.tensions.map((t) => ({
        valeurA: t.valeurA,
        valeurB: t.valeurB,
        totalCollisions: t.totalCollisions,
        incertitudes: t.incertitudes,
        difficulteMoyenne: t.difficulteMoyenne,
        probabiliteA: t.probabiliteA,
        incertitude: t.incertitude,
        estForte: t.estForte,
      })),
      observations: resultat.observations.map((o) => ({
        id: o.id,
        texte: o.texte,
        type: o.type,
        valeursConcernees: o.valeursConcernees,
        reponsesSources: o.reponsesSources,
      })),
      couverture: resultat.couverture,
      stabilite: resultat.stabilite,
      versionCalcul: resultat.versionCalcul,
    });
  },
);

router.get(
  "/sessions/:sessionId/progres",
  async (req, res): Promise<void> => {
    const params = GetProgresParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const [session] = await db
      .select()
      .from(sessionsTable)
      .where(eq(sessionsTable.id, params.data.sessionId));

    if (!session) {
      res.status(404).json({ error: "Session introuvable" });
      return;
    }

    const cartes = await db
      .select()
      .from(cartesSessionTable)
      .where(eq(cartesSessionTable.sessionId, params.data.sessionId));

    const reponses = await db
      .select()
      .from(reponsesCollisionTable)
      .where(
        and(
          eq(reponsesCollisionTable.sessionId, params.data.sessionId),
          isNull(reponsesCollisionTable.invalidatedAt),
        ),
      );

    const valeursConfirmees = Array.from(
      new Set(cartes.flatMap((c) => c.valeursConfirmees)),
    );

    const n = valeursConfirmees.length;
    const collisionsPossibles = n >= 2 ? (n * (n - 1)) / 2 : 0;

    const dilemmes = await db.select().from(dilemmesTable);

    const normalize = (value: string) =>
      value.trim().toLocaleLowerCase("fr-CA");
    const pairKey = (valueA: string, valueB: string) =>
      [normalize(valueA), normalize(valueB)]
        .sort((a, b) => a.localeCompare(b, "fr-CA"))
        .join("|||");
    const reponsesByPair = new Map<
      string,
      typeof reponses
    >();
    for (const reponse of reponses) {
      const key = pairKey(reponse.valeurA, reponse.valeurB);
      const current = reponsesByPair.get(key) ?? [];
      current.push(reponse);
      reponsesByPair.set(key, current);
    }

    const cardsByValue = new Map<string, typeof cartes>();
    for (const card of cartes) {
      for (const value of card.valeursConfirmees) {
        const current = cardsByValue.get(normalize(value)) ?? [];
        current.push(card);
        cardsByValue.set(normalize(value), current);
      }
    }

    const constellationCourante = calculerConstellation(
      reponses.map((response) => ({
        id: response.id,
        valeurA: response.valeurA,
        valeurB: response.valeurB,
        contexte: response.contexte,
        pivotDimension: response.pivotDimension,
        choix: response.choix,
        facteurDepend: response.facteurDepend,
        facteurDependLibre: response.facteurDependLibre,
        difficulte: response.difficulte,
        certitude: response.certitude,
        version: response.version,
      })),
      valeursConfirmees,
    );
    const tendenciesByValue = new Map(
      constellationCourante.tendances.map((tendency) => [
        normalize(tendency.valeur),
        tendency,
      ]),
    );

    const candidates: Array<{
      valeurA: string;
      valeurB: string;
      score: number;
      previous: typeof reponses;
    }> = [];
    for (let i = 0; i < valeursConfirmees.length; i++) {
      for (let j = i + 1; j < valeursConfirmees.length; j++) {
        const valeurA = valeursConfirmees[i];
        const valeurB = valeursConfirmees[j];
        const previous = reponsesByPair.get(pairKey(valeurA, valeurB)) ?? [];
        const resolved = previous.filter(
          (response) => response.choix === "A" || response.choix === "B",
        );
        const supportA = resolved.reduce(
          (sum, response) =>
            sum +
            (response.choix === "A" ? (response.certitude ?? 3) / 5 : 0),
          0,
        );
        const supportB = resolved.reduce(
          (sum, response) =>
            sum +
            (response.choix === "B" ? (response.certitude ?? 3) / 5 : 0),
          0,
        );
        const probabilityA =
          (supportA + 1) / (supportA + supportB + 2);
        const uncertainty = 1 - Math.abs(probabilityA - 0.5) * 2;
        const averageDifficulty =
          previous.filter((response) => response.difficulte != null).length > 0
            ? previous.reduce(
                (sum, response) => sum + (response.difficulte ?? 0),
                0,
              ) /
              previous.filter((response) => response.difficulte != null).length
            : 0;
        const hasModerator = previous.some(
          (response) =>
            response.choix === "ca_depend" ||
            response.choix === "je_ne_sais_pas",
        );
        const mayRevisit =
          previous.length === 0 ||
          (previous.length === 1 &&
            (hasModerator || averageDifficulty >= 4));
        if (!mayRevisit) continue;

        const lackOfCoverage = 1 / (1 + previous.length);
        const importance =
          ((tendenciesByValue.get(normalize(valeurA))
            ?.importanceApparente ?? 0.5) +
            (tendenciesByValue.get(normalize(valeurB))
              ?.importanceApparente ?? 0.5)) /
          2;
        const personalRelevance =
          cardsByValue.has(normalize(valeurA)) &&
          cardsByValue.has(normalize(valeurB))
            ? 1
            : 0.5;
        const instability =
          resolved.length >= 2
            ? 1 -
              Math.max(
                resolved.filter((response) => response.choix === "A").length,
                resolved.filter((response) => response.choix === "B").length,
              ) /
                resolved.length
            : hasModerator
              ? 1
              : 0.5;
        const score =
          0.3 * uncertainty +
          0.2 * importance +
          0.2 * personalRelevance +
          0.15 * lackOfCoverage +
          0.15 * instability;
        candidates.push({ valeurA, valeurB, score, previous });
      }
    }
    candidates.sort(
      (a, b) =>
        b.score - a.score ||
        pairKey(a.valeurA, a.valeurB).localeCompare(
          pairKey(b.valeurA, b.valeurB),
          "fr-CA",
        ),
    );

    let prochaineDilemme: {
      valeurA: string;
      valeurB: string;
      dilemmeId: number | null;
      texte: string | null;
      contexte: string;
      pivotDimension: string | null;
    } | null = null;

    const stableHash = Array.from(
      `${params.data.sessionId}:${reponses.length}`,
    ).reduce(
      (hash, character) => (hash * 31 + character.codePointAt(0)!) >>> 0,
      2166136261,
    );
    const candidatePool = candidates.slice(0, Math.min(3, candidates.length));
    const selected =
      candidatePool.length > 0
        ? candidatePool[stableHash % candidatePool.length]
        : undefined;
    if (selected) {
      const alreadyUsedDilemmaIds = new Set(
        selected.previous
          .map((response) => response.dilemmeId)
          .filter((id): id is number => id != null),
      );
      const matchingDilemma = dilemmes.find(
        (dilemma) =>
          !alreadyUsedDilemmaIds.has(dilemma.id) &&
          pairKey(dilemma.valeurA, dilemma.valeurB) ===
            pairKey(selected.valeurA, selected.valeurB),
      );
      const cardA = cardsByValue.get(normalize(selected.valeurA))?.[0];
      const cardB = cardsByValue.get(normalize(selected.valeurB))?.[0];
      const lastModeratorResponse = selected.previous.find(
        (response) => response.choix === "ca_depend",
      );
      const lastModerator = lastModeratorResponse?.facteurDepend;
      const factorLabels: Record<string, string> = {
        cout_personnel: "le coût personnel devient nettement plus important",
        ampleur_impact: "la conséquence devient nettement plus importante",
        proximite_sociale: "la personne touchée devient beaucoup plus proche de toi",
        nombre_personnes: "beaucoup plus de personnes sont touchées",
        certitude: "les conséquences deviennent presque certaines",
        reversibilite: "la décision devient difficilement réversible",
        urgence: "la décision doit être prise immédiatement",
        responsabilite: "tu deviens directement responsable de la décision",
      };
      const pivotIntroduction =
        lastModerator && factorLabels[lastModerator]
          ? `Pour tester un point de bascule, garde le reste aussi proche que possible et imagine seulement que ${factorLabels[lastModerator]}. `
          : "";
      const familyPair = [cardA?.famille, cardB?.famille]
        .filter((family): family is NonNullable<typeof family> => !!family)
        .sort()
        .join("|");
      const familyQuestions: Record<string, string> = {
        "horizons|lignes_rouges":
          "Jusqu’où irais-tu pour poursuivre cet horizon sans franchir cette limite?",
        "lignes_rouges|tresors":
          "Jusqu’où irais-tu pour protéger ce trésor sans franchir cette limite?",
        "lignes_rouges|lignes_rouges":
          "Que fais-tu lorsqu’il devient impossible de respecter les deux limites?",
        "horizons|horizons":
          "Quelle direction poursuis-tu lorsque les deux ne sont pas compatibles?",
        "horizons|tresors":
          "Que risques-tu de perdre pour poursuivre ce que tu souhaites?",
        "tresors|tresors":
          "Que protèges-tu lorsque tu ne peux préserver les deux?",
      };
      const coreQuestion =
        familyQuestions[familyPair] ??
        "Laquelle de ces deux priorités protèges-tu dans cette situation?";
      const personalizedText = `Une situation t'oblige à arbitrer entre « ${selected.valeurA} »${cardA ? `, associé ici à « ${cardA.label} »` : ""} et « ${selected.valeurB} »${cardB ? `, associé ici à « ${cardB.label} »` : ""}. ${coreQuestion}`;
      const baseText = matchingDilemma?.texte ?? personalizedText;

      prochaineDilemme = {
        valeurA: selected.valeurA,
        valeurB: selected.valeurB,
        dilemmeId: matchingDilemma?.id ?? null,
        texte: `${pivotIntroduction}${baseText}`,
        contexte:
          lastModeratorResponse?.contexte ??
          matchingDilemma?.contexte ??
          "Exploration personnelle",
        pivotDimension: lastModerator ?? null,
      };
    }

    res.json({
      sessionId: params.data.sessionId,
      etapeCourante: session.etapeCourante,
      nombreCartes: cartes.length,
      nombreValeurs: valeursConfirmees.length,
      nombreCollisions: collisionsPossibles,
      nombreReponses: reponses.length,
      prochaineDilemme,
    });
  },
);

export default router;
