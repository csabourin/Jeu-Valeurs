import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  sessionsTable,
  cartesSessionTable,
  reponsesCollisionTable,
} from "@workspace/db";
import { GetConstellationParams, GetProgresParams } from "@workspace/api-zod";
import { calculerParcours, type ReponseConnue } from "@workspace/contenu";
import { eq } from "drizzle-orm";
import { calculerConstellation } from "../lib/constellation-engine";
import type { ReponseSource } from "../lib/constellation-engine";

const router: IRouter = Router();

type LigneReponse = typeof reponsesCollisionTable.$inferSelect;

async function chargerSession(sessionId: string) {
  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.id, sessionId));
  if (!session) return null;

  const cartes = await db
    .select()
    .from(cartesSessionTable)
    .where(eq(cartesSessionTable.sessionId, sessionId));

  const reponses = await db
    .select()
    .from(reponsesCollisionTable)
    .where(eq(reponsesCollisionTable.sessionId, sessionId));

  // Une valeur ne compte que si la personne l'a confirmée. Les suggestions du
  // catalogue ne sont jamais promues automatiquement.
  const valeursConfirmees = Array.from(
    new Set(cartes.flatMap((c) => c.valeursConfirmees)),
  );

  return { session, cartes, reponses, valeursConfirmees };
}

function versReponseConnue(r: LigneReponse): ReponseConnue {
  return {
    dilemmeId: r.dilemmeId,
    valeurA: r.valeurA,
    valeurB: r.valeurB,
    choix: r.choix,
    facteurDepend: r.facteurDepend,
    serieId: r.serieId,
    palier: r.palier,
  };
}

function versReponseSource(r: LigneReponse): ReponseSource {
  return {
    id: r.id,
    dilemmeId: r.dilemmeId,
    valeurA: r.valeurA,
    valeurB: r.valeurB,
    choix: r.choix,
    facteurDepend: r.facteurDepend ?? null,
    facteurDependLibre: r.facteurDependLibre ?? null,
    difficulte: r.difficulte ?? null,
    certitude: r.certitude ?? null,
    serieId: r.serieId ?? null,
    palier: r.palier ?? null,
    dimension: r.dimension ?? null,
    valeurProtegee: r.valeurProtegee ?? null,
    version: r.version,
  };
}

router.get(
  "/sessions/:sessionId/constellation",
  async (req, res): Promise<void> => {
    const params = GetConstellationParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const donnees = await chargerSession(params.data.sessionId);
    if (!donnees) {
      res.status(404).json({ error: "Session introuvable" });
      return;
    }

    const resultat = calculerConstellation(
      donnees.reponses.map(versReponseSource),
      donnees.valeursConfirmees,
    );

    // La version suit les corrections : une réponse rectifiée fait avancer la
    // constellation, sans jamais écraser silencieusement ce qui la précède.
    const version =
      donnees.reponses.length > 0
        ? Math.max(...donnees.reponses.map((r) => r.version))
        : 1;

    res.json({
      sessionId: params.data.sessionId,
      version,
      tendances: resultat.tendances,
      tensions: resultat.tensions,
      bascules: resultat.bascules,
      observations: resultat.observations,
      couverture: resultat.couverture,
      stabilite: resultat.stabilite,
      versionCalcul: resultat.versionCalcul,
    });
  },
);

router.get("/sessions/:sessionId/progres", async (req, res): Promise<void> => {
  const params = GetProgresParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const donnees = await chargerSession(params.data.sessionId);
  if (!donnees) {
    res.status(404).json({ error: "Session introuvable" });
    return;
  }

  const parcours = calculerParcours(
    donnees.valeursConfirmees,
    donnees.reponses.map(versReponseConnue),
  );

  res.json({
    sessionId: params.data.sessionId,
    etapeCourante: donnees.session.etapeCourante,
    phase: parcours.phase,
    nombreCartes: donnees.cartes.length,
    nombreValeurs: donnees.valeursConfirmees.length,
    duelsPlanifies: parcours.duelsPlanifies,
    duelsRepondus: parcours.duelsRepondus,
    seriesPlanifiees: parcours.seriesPlanifiees,
    seriesTerminees: parcours.seriesTerminees,
    nombreReponses: donnees.reponses.length,
    prochaineQuestion: parcours.prochaine,
  });
});

export default router;
