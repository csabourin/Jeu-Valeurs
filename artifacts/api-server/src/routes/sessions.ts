import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sessionsTable } from "@workspace/db";
import {
  CreateSessionBody,
  GetSessionParams,
  UpdateSessionParams,
  UpdateSessionBody,
  DeleteSessionParams,
} from "@workspace/api-zod";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

const router: IRouter = Router();

router.post("/sessions", async (req, res): Promise<void> => {
  const parsed = CreateSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const id = randomUUID();
  const [session] = await db
    .insert(sessionsTable)
    .values({ id, etapeCourante: parsed.data.etapeCourante ?? "accueil" })
    .returning();

  res.status(201).json({
    id: session.id,
    etapeCourante: session.etapeCourante,
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
    etapeCourante: session.etapeCourante,
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
    etapeCourante: session.etapeCourante,
    creeLe: session.creeLe.toISOString(),
    miseAJourLe: session.miseAJourLe.toISOString(),
  });
});

router.delete("/sessions/:sessionId", async (req, res): Promise<void> => {
  const params = DeleteSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [session] = await db
    .delete(sessionsTable)
    .where(eq(sessionsTable.id, params.data.sessionId))
    .returning();

  if (!session) {
    res.status(404).json({ error: "Session introuvable" });
    return;
  }

  res.sendStatus(204);
});

export default router;
