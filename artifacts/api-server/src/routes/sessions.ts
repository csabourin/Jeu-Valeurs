import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  sessionsTable,
  cartesSessionTable,
  reponsesCollisionTable,
  normaliserEtape,
} from "@workspace/db";
import {
  CreateSessionBody,
  GetSessionParams,
  UpdateSessionParams,
  UpdateSessionBody,
  DeleteSessionParams,
} from "@workspace/api-zod";
import { eq } from "drizzle-orm";
import { randomUUID, randomInt } from "crypto";

const router: IRouter = Router();

router.post("/sessions", async (req, res): Promise<void> => {
  const parsed = CreateSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const id = randomUUID();
  // Tirée une seule fois, ici. Tout le tirage de situations de la partie en
  // découle, donc la partie reste stable tant que la ligne existe.
  const graine = randomInt(1, 2 ** 31 - 1);
  const [session] = await db
    .insert(sessionsTable)
    .values({
      id,
      graine,
      etapeCourante: parsed.data.etapeCourante ?? "accueil",
    })
    .returning();

  res.status(201).json({
    id: session.id,
    etapeCourante: normaliserEtape(session.etapeCourante),
    creeLe: session.creeLe.toISOString(),
    miseAJourLe: session.miseAJourLe.toISOString(),
  });
});

router.get("/sessions/:sessionId", async (req, res): Promise<void> => {
  const params = GetSessionParams.safeParse(req.params);
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

  res.json({
    id: session.id,
    etapeCourante: normaliserEtape(session.etapeCourante),
    creeLe: session.creeLe.toISOString(),
    miseAJourLe: session.miseAJourLe.toISOString(),
  });
});

router.patch("/sessions/:sessionId", async (req, res): Promise<void> => {
  const params = UpdateSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.etapeCourante !== undefined) {
    updates.etapeCourante = parsed.data.etapeCourante;
  }

  const [session] = await db
    .update(sessionsTable)
    .set(updates)
    .where(eq(sessionsTable.id, params.data.sessionId))
    .returning();

  if (!session) {
    res.status(404).json({ error: "Session introuvable" });
    return;
  }

  res.json({
    id: session.id,
    etapeCourante: normaliserEtape(session.etapeCourante),
    creeLe: session.creeLe.toISOString(),
    miseAJourLe: session.miseAJourLe.toISOString(),
  });
});

/**
 * Efface tout ce que la session a produit, pas seulement sa ligne.
 *
 * Les cartes et les réponses ne portent qu'un `session_id` — sans clé
 * étrangère, rien ne les emporte automatiquement. L'interface promet une
 * suppression complète : elle doit en être une, et en un seul aller-retour
 * transactionnel pour ne jamais laisser de moitié effacée.
 */
router.delete("/sessions/:sessionId", async (req, res): Promise<void> => {
  const params = DeleteSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { sessionId } = params.data;

  const supprimee = await db.transaction(async (tx) => {
    await tx
      .delete(reponsesCollisionTable)
      .where(eq(reponsesCollisionTable.sessionId, sessionId));
    await tx
      .delete(cartesSessionTable)
      .where(eq(cartesSessionTable.sessionId, sessionId));
    const [session] = await tx
      .delete(sessionsTable)
      .where(eq(sessionsTable.id, sessionId))
      .returning();
    return session;
  });

  if (!supprimee) {
    res.status(404).json({ error: "Session introuvable" });
    return;
  }

  res.sendStatus(204);
});

export default router;
