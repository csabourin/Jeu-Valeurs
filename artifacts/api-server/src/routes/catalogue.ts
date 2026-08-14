import { Router, type IRouter } from "express";
import { cartes, cartesParFamille, valeurs, type Famille } from "@workspace/contenu";
import { ListCartessCatalogueQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

/**
 * Le catalogue vient du code (`@workspace/contenu`), pas de la base.
 *
 * Le contenu du jeu se relit et se corrige comme du code ; la base ne garde que
 * ce qui appartient à la personne. Aucune étape d'amorçage n'est donc requise
 * pour qu'une partie soit jouable.
 */
router.get("/catalogue/cartes", (req, res): void => {
  const parsed = ListCartessCatalogueQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const liste = parsed.data.famille
    ? cartesParFamille(parsed.data.famille as Famille)
    : cartes;

  res.json(
    liste.map((c) => ({
      id: c.id,
      famille: c.famille,
      label: c.label,
      description: c.description,
      valeursSuggérées: c.valeursSuggerees,
      estPersonnalisable: true,
    })),
  );
});

router.get("/catalogue/valeurs", (_req, res): void => {
  res.json(
    valeurs.map((v) => ({
      label: v.label,
      description: v.description,
      famille: v.famille,
    })),
  );
});

export default router;
