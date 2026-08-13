import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  sessionsTable,
  cartesSessionTable,
  reponsesCollisionTable,
} from "@workspace/db";
import {
  GetConstellationParams,
  GetProgresParams,
} from "@workspace/api-zod";
import { eq } from "drizzle-orm";
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
      .where(eq(reponsesCollisionTable.sessionId, params.data.sessionId));

    const reponses: ReponseSource[] = reponsesRaw.map((r) => ({
      id: r.id,
      valeurA: r.valeurA,
      valeurB: r.valeurB,
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
      .where(eq(reponsesCollisionTable.sessionId, params.data.sessionId));

    const valeursConfirmees = Array.from(
      new Set(cartes.flatMap((c) => c.valeursConfirmees)),
    );

    const n = valeursConfirmees.length;
    const collisionsPossibles = n >= 2 ? (n * (n - 1)) / 2 : 0;

    // Trouver la prochaine paire non répondue
    const reponsesSet = new Set(
      reponses.map((r) => [r.valeurA, r.valeurB].sort().join("|||")),
    );

    let prochaineDilemme: {
      valeurA: string;
      valeurB: string;
      dilemmeId: number | null;
      texte: string | null;
    } | null = null;

    for (let i = 0; i < valeursConfirmees.length && !prochaineDilemme; i++) {
      for (
        let j = i + 1;
        j < valeursConfirmees.length && !prochaineDilemme;
        j++
      ) {
        const vA = valeursConfirmees[i];
        const vB = valeursConfirmees[j];
        const key = [vA, vB].sort().join("|||");
        if (!reponsesSet.has(key)) {
          prochaineDilemme = {
            valeurA: vA,
            valeurB: vB,
            dilemmeId: null,
            texte: null,
          };
        }
      }
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
