import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { cartesCatalogueTable, dilemmesTable } from "@workspace/db";
import { ListCartessCatalogueQueryParams } from "@workspace/api-zod";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/catalogue/cartes", async (req, res): Promise<void> => {
  const parsed = ListCartessCatalogueQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const query = db.select().from(cartesCatalogueTable);
  const cartes = parsed.data.famille
    ? await db
        .select()
        .from(cartesCatalogueTable)
        .where(eq(cartesCatalogueTable.famille, parsed.data.famille))
    : await query;

  res.json(
    cartes.map((c) => ({
      id: c.id,
      famille: c.famille,
      label: c.label,
      description: c.description ?? null,
      valeursSuggérées: c.valeursSuggerees,
      estPersonnalisable: c.estPersonnalisable,
    })),
  );
});

router.get("/catalogue/dilemmes", async (_req, res): Promise<void> => {
  const dilemmes = await db.select().from(dilemmesTable);
  res.json(
    dilemmes.map((d) => ({
      id: d.id,
      valeurA: d.valeurA,
      valeurB: d.valeurB,
      texte: d.texte,
      contexte: d.contexte ?? null,
      familles: d.familles,
    })),
  );
});

export default router;
