import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { reponsesCollisionTable } from "@workspace/db";
import {
  ListReponsesParams,
  CreateReponseParams,
  CreateReponseBody,
  UpdateReponseParams,
  UpdateReponseBody,
} from "@workspace/api-zod";
import { eq, and, isNull } from "drizzle-orm";

const router: IRouter = Router();

function mapReponse(r: typeof reponsesCollisionTable.$inferSelect) {
  return {
    id: r.id,
    sessionId: r.sessionId,
    dilemmeId: r.dilemmeId ?? null,
    valeurA: r.valeurA,
    valeurB: r.valeurB,
    texteDilemme: r.texteDilemme,
    contexte: r.contexte ?? null,
    pivotDimension: r.pivotDimension ?? null,
    choix: r.choix,
    facteurDepend: r.facteurDepend ?? null,
    facteurDependLibre: r.facteurDependLibre ?? null,
    difficulte: r.difficulte ?? null,
    certitude: r.certitude ?? null,
    version: r.version,
    supersedesResponseId: r.supersedesResponseId ?? null,
    invalidatedAt: r.invalidatedAt?.toISOString() ?? null,
    invalidationReason: r.invalidationReason ?? null,
    creeLe: r.creeLe.toISOString(),
    miseAJourLe: r.miseAJourLe.toISOString(),
  };
}

router.get("/sessions/:sessionId/reponses", async (req, res): Promise<void> => {
  const params = ListReponsesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const reponses = await db
    .select()
    .from(reponsesCollisionTable)
    .where(
      and(
        eq(reponsesCollisionTable.sessionId, params.data.sessionId),
        isNull(reponsesCollisionTable.invalidatedAt),
      ),
    );

  res.json(reponses.map(mapReponse));
});

router.post(
  "/sessions/:sessionId/reponses",
  async (req, res): Promise<void> => {
    const params = CreateReponseParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const parsed = CreateReponseBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    // Si choix=passer, difficulté et certitude ignorées
    const isPasser = parsed.data.choix === "passer";
    const texteDilemme = parsed.data.texteDilemme.trim();
    const contexte =
      typeof parsed.data.contexte === "string" && parsed.data.contexte.trim()
        ? parsed.data.contexte.trim()
        : null;

    if (!texteDilemme || texteDilemme.length > 4000) {
      res.status(400).json({
        error: "Le texte exact du dilemme présenté est requis.",
      });
      return;
    }
    if (
      !isPasser &&
      (parsed.data.difficulte == null ||
        parsed.data.certitude == null ||
        parsed.data.difficulte < 1 ||
        parsed.data.difficulte > 5 ||
        parsed.data.certitude < 1 ||
        parsed.data.certitude > 5)
    ) {
      res.status(400).json({
        error: "La difficulté et la certitude doivent être indiquées de 1 à 5.",
      });
      return;
    }
    if (
      parsed.data.choix === "ca_depend" &&
      !parsed.data.facteurDepend
    ) {
      res.status(400).json({ error: "Un facteur de dépendance est requis." });
      return;
    }

    const [reponse] = await db
      .insert(reponsesCollisionTable)
      .values({
        sessionId: params.data.sessionId,
        dilemmeId: parsed.data.dilemmeId ?? null,
        valeurA: parsed.data.valeurA,
        valeurB: parsed.data.valeurB,
        texteDilemme,
        contexte,
        pivotDimension: parsed.data.pivotDimension ?? null,
        choix: parsed.data.choix,
        facteurDepend:
          parsed.data.choix === "ca_depend"
            ? (parsed.data.facteurDepend ?? null)
            : null,
        facteurDependLibre:
          parsed.data.choix === "ca_depend"
            ? (parsed.data.facteurDependLibre ?? null)
            : null,
        difficulte: isPasser ? null : (parsed.data.difficulte ?? null),
        certitude: isPasser ? null : (parsed.data.certitude ?? null),
        version: 1,
      })
      .returning();

    res.status(201).json(mapReponse(reponse));
  },
);

router.patch(
  "/sessions/:sessionId/reponses/:reponseId",
  async (req, res): Promise<void> => {
    const params = UpdateReponseParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const parsed = UpdateReponseBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    // Une correction crée une nouvelle observation et invalide l'ancienne.
    const [existing] = await db
      .select()
      .from(reponsesCollisionTable)
      .where(
        and(
          eq(reponsesCollisionTable.id, params.data.reponseId),
          eq(reponsesCollisionTable.sessionId, params.data.sessionId),
          isNull(reponsesCollisionTable.invalidatedAt),
        ),
      );

    if (!existing) {
      res.status(404).json({ error: "Réponse introuvable" });
      return;
    }

    const newChoix = parsed.data.choix ?? existing.choix;
    const isPasser = newChoix === "passer";

    let facteurDepend = existing.facteurDepend;
    let facteurDependLibre = existing.facteurDependLibre;
    if (newChoix === "ca_depend") {
      if (parsed.data.facteurDepend !== undefined)
        facteurDepend = parsed.data.facteurDepend;
      if (parsed.data.facteurDependLibre !== undefined)
        facteurDependLibre = parsed.data.facteurDependLibre;
    } else {
      facteurDepend = null;
      facteurDependLibre = null;
    }

    if (newChoix === "ca_depend" && !facteurDepend) {
      res.status(400).json({ error: "Un facteur de dépendance est requis." });
      return;
    }

    let difficulte = existing.difficulte;
    let certitude = existing.certitude;
    if (!isPasser) {
      if (parsed.data.difficulte !== undefined)
        difficulte = parsed.data.difficulte;
      if (parsed.data.certitude !== undefined)
        certitude = parsed.data.certitude;
    } else {
      difficulte = null;
      certitude = null;
    }

    if (
      !isPasser &&
      (difficulte == null ||
        certitude == null ||
        difficulte < 1 ||
        difficulte > 5 ||
        certitude < 1 ||
        certitude > 5)
    ) {
      res.status(400).json({
        error: "La difficulté et la certitude doivent être indiquées de 1 à 5.",
      });
      return;
    }

    const reponse = await db.transaction(async (transaction) => {
      const [created] = await transaction
        .insert(reponsesCollisionTable)
        .values({
          sessionId: existing.sessionId,
          dilemmeId: existing.dilemmeId,
          valeurA: existing.valeurA,
          valeurB: existing.valeurB,
          texteDilemme: existing.texteDilemme,
          contexte: existing.contexte,
          pivotDimension: existing.pivotDimension,
          choix: newChoix,
          facteurDepend,
          facteurDependLibre,
          difficulte,
          certitude,
          version: existing.version + 1,
          supersedesResponseId: existing.id,
        })
        .returning();

      await transaction
        .update(reponsesCollisionTable)
        .set({
          invalidatedAt: new Date(),
          invalidationReason: "superseded",
        })
        .where(eq(reponsesCollisionTable.id, existing.id));

      return created;
    });

    res.json(mapReponse(reponse));
  },
);

export default router;
