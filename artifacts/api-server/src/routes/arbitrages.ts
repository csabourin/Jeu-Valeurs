import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { arbitragesTable } from "@workspace/db";
import {
  ListArbitragesParams,
  CreateArbitrageParams,
  CreateArbitrageBody,
} from "@workspace/api-zod";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

function mapArbitrage(a: typeof arbitragesTable.$inferSelect) {
  return {
    id: a.id,
    sessionId: a.sessionId,
    bloc: a.bloc,
    carteIds: a.carteIds,
    carteMeilleure: a.carteMeilleure ?? null,
    cartePire: a.cartePire ?? null,
    version: a.version,
    creeLe: a.creeLe.toISOString(),
    miseAJourLe: a.miseAJourLe.toISOString(),
  };
}

router.get(
  "/sessions/:sessionId/arbitrages",
  async (req, res): Promise<void> => {
    const params = ListArbitragesParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const arbitrages = await db
      .select()
      .from(arbitragesTable)
      .where(eq(arbitragesTable.sessionId, params.data.sessionId));

    res.json(arbitrages.map(mapArbitrage));
  },
);

router.post(
  "/sessions/:sessionId/arbitrages",
  async (req, res): Promise<void> => {
    const params = CreateArbitrageParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const parsed = CreateArbitrageBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const { bloc, carteIds } = parsed.data;
    const meilleure = parsed.data.carteMeilleure ?? null;
    const pire = parsed.data.cartePire ?? null;

    // Une carte choisie qui ne fait pas partie du bloc rendrait le score
    // ininterprétable : elle gagnerait un point sans jamais avoir été proposée.
    for (const choisie of [meilleure, pire]) {
      if (choisie && !carteIds.includes(choisie)) {
        res.status(400).json({
          error: "La carte choisie ne fait pas partie du bloc",
        });
        return;
      }
    }

    // La même carte en haut et en bas ne veut rien dire.
    if (meilleure && pire && meilleure === pire) {
      res.status(400).json({
        error:
          "Une carte ne peut pas être à la fois la plus et la moins importante",
      });
      return;
    }

    // Rejouer un bloc déjà répondu le ferait compter deux fois dans le score.
    // Le verrou côté écran ne suffit pas : deux onglets ouverts suffisent.
    const [existant] = await db
      .select()
      .from(arbitragesTable)
      .where(
        and(
          eq(arbitragesTable.sessionId, params.data.sessionId),
          eq(arbitragesTable.bloc, bloc),
        ),
      );

    if (existant) {
      res.status(201).json(mapArbitrage(existant));
      return;
    }

    const [arbitrage] = await db
      .insert(arbitragesTable)
      .values({
        sessionId: params.data.sessionId,
        bloc,
        carteIds,
        carteMeilleure: meilleure,
        cartePire: pire,
        version: 1,
      })
      .returning();

    res.status(201).json(mapArbitrage(arbitrage));
  },
);

export default router;
