import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { cartesSessionTable } from "@workspace/db";
import {
  ListCartesSessionParams,
  AddCarteSessionParams,
  AddCarteSessionBody,
  UpdateCarteSessionParams,
  UpdateCarteSessionBody,
  RemoveCarteSessionParams,
} from "@workspace/api-zod";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

function mapCarte(c: typeof cartesSessionTable.$inferSelect) {
  return {
    id: c.id,
    sessionId: c.sessionId,
    catalogueCarteId: c.catalogueCarteId ? Number(c.catalogueCarteId) : null,
    famille: c.famille,
    label: c.label,
    description: c.description ?? null,
    valeursConfirmées: c.valeursConfirmees,
    valeursSuggérées: c.valeursSuggerees,
    estPersonnalisée: c.estPersonnalisee,
    creeLe: c.creeLe.toISOString(),
  };
}

router.get(
  "/sessions/:sessionId/cartes",
  async (req, res): Promise<void> => {
    const params = ListCartesSessionParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const cartes = await db
      .select()
      .from(cartesSessionTable)
      .where(eq(cartesSessionTable.sessionId, params.data.sessionId));

    res.json(cartes.map(mapCarte));
  },
);

router.post(
  "/sessions/:sessionId/cartes",
  async (req, res): Promise<void> => {
    const params = AddCarteSessionParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const parsed = AddCarteSessionBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [carte] = await db
      .insert(cartesSessionTable)
      .values({
        sessionId: params.data.sessionId,
        catalogueCarteId: parsed.data.catalogueCarteId
          ? String(parsed.data.catalogueCarteId)
          : null,
        famille: parsed.data.famille,
        label: parsed.data.label,
        description: parsed.data.description ?? null,
        valeursSuggerees: parsed.data.valeursSuggérées ?? [],
        valeursConfirmees: parsed.data.valeursConfirmées ?? [],
        estPersonnalisee: parsed.data.estPersonnalisée ?? false,
      })
      .returning();

    res.status(201).json(mapCarte(carte));
  },
);

router.patch(
  "/sessions/:sessionId/cartes/:carteSessionId",
  async (req, res): Promise<void> => {
    const params = UpdateCarteSessionParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const parsed = UpdateCarteSessionBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const updates: Record<string, unknown> = {};
    if (parsed.data.label !== undefined) updates.label = parsed.data.label;
    if (parsed.data.description !== undefined)
      updates.description = parsed.data.description;
    if (parsed.data.valeursConfirmées !== undefined)
      updates.valeursConfirmees = parsed.data.valeursConfirmées;

    const [carte] = await db
      .update(cartesSessionTable)
      .set(updates)
      .where(
        and(
          eq(cartesSessionTable.id, params.data.carteSessionId),
          eq(cartesSessionTable.sessionId, params.data.sessionId),
        ),
      )
      .returning();

    if (!carte) {
      res.status(404).json({ error: "Carte introuvable" });
      return;
    }

    res.json(mapCarte(carte));
  },
);

router.delete(
  "/sessions/:sessionId/cartes/:carteSessionId",
  async (req, res): Promise<void> => {
    const params = RemoveCarteSessionParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const [carte] = await db
      .delete(cartesSessionTable)
      .where(
        and(
          eq(cartesSessionTable.id, params.data.carteSessionId),
          eq(cartesSessionTable.sessionId, params.data.sessionId),
        ),
      )
      .returning();

    if (!carte) {
      res.status(404).json({ error: "Carte introuvable" });
      return;
    }

    res.sendStatus(204);
  },
);

export default router;
