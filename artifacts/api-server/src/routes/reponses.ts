import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  reponsesCollisionTable,
  facteursPossibles,
  type FacteurDepend,
} from "@workspace/db";
import {
  ListReponsesParams,
  CreateReponseParams,
  CreateReponseBody,
  UpdateReponseParams,
  UpdateReponseBody,
} from "@workspace/api-zod";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

/**
 * La colonne `facteur_depend` est une liste fermée ; l'API accepte du texte
 * libre. Un facteur hors liste est rangé sous « autre » plutôt que rejeté : le
 * détail reste lisible dans `facteurDependLibre`.
 */
function versFacteur(valeur: string | null | undefined): FacteurDepend | null {
  if (!valeur) return null;
  return (facteursPossibles as readonly string[]).includes(valeur)
    ? (valeur as FacteurDepend)
    : "autre";
}

function mapReponse(r: typeof reponsesCollisionTable.$inferSelect) {
  return {
    id: r.id,
    sessionId: r.sessionId,
    dilemmeId: r.dilemmeId ?? null,
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
    .where(eq(reponsesCollisionTable.sessionId, params.data.sessionId));

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

    const [reponse] = await db
      .insert(reponsesCollisionTable)
      .values({
        sessionId: params.data.sessionId,
        dilemmeId: parsed.data.dilemmeId ?? null,
        valeurA: parsed.data.valeurA,
        valeurB: parsed.data.valeurB,
        choix: parsed.data.choix,
        facteurDepend:
          parsed.data.choix === "ca_depend"
            ? versFacteur(parsed.data.facteurDepend)
            : null,
        facteurDependLibre:
          parsed.data.choix === "ca_depend"
            ? (parsed.data.facteurDependLibre ?? null)
            : null,
        difficulte: isPasser ? null : (parsed.data.difficulte ?? null),
        certitude: isPasser ? null : (parsed.data.certitude ?? null),
        serieId: parsed.data.serieId ?? null,
        palier: parsed.data.palier ?? null,
        dimension: parsed.data.dimension ?? null,
        // Jamais déduite : seulement ce que la personne a nommé elle-même.
        valeurProtegee: isPasser ? null : (parsed.data.valeurProtegee ?? null),
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

    // Récupérer la réponse actuelle pour incrémenter la version
    const [existing] = await db
      .select()
      .from(reponsesCollisionTable)
      .where(
        and(
          eq(reponsesCollisionTable.id, params.data.reponseId),
          eq(reponsesCollisionTable.sessionId, params.data.sessionId),
        ),
      );

    if (!existing) {
      res.status(404).json({ error: "Réponse introuvable" });
      return;
    }

    const newChoix = parsed.data.choix ?? existing.choix;
    const isPasser = newChoix === "passer";

    const updates: Record<string, unknown> = {
      version: existing.version + 1,
    };

    if (parsed.data.choix !== undefined) updates.choix = parsed.data.choix;
    if (newChoix === "ca_depend") {
      if (parsed.data.facteurDepend !== undefined)
        updates.facteurDepend = versFacteur(parsed.data.facteurDepend);
      if (parsed.data.facteurDependLibre !== undefined)
        updates.facteurDependLibre = parsed.data.facteurDependLibre;
    } else {
      updates.facteurDepend = null;
      updates.facteurDependLibre = null;
    }

    if (!isPasser) {
      if (parsed.data.difficulte !== undefined)
        updates.difficulte = parsed.data.difficulte;
      if (parsed.data.certitude !== undefined)
        updates.certitude = parsed.data.certitude;
      if (parsed.data.valeurProtegee !== undefined)
        updates.valeurProtegee = parsed.data.valeurProtegee;
    } else {
      updates.difficulte = null;
      updates.certitude = null;
      updates.valeurProtegee = null;
    }

    const [reponse] = await db
      .update(reponsesCollisionTable)
      .set(updates)
      .where(
        and(
          eq(reponsesCollisionTable.id, params.data.reponseId),
          eq(reponsesCollisionTable.sessionId, params.data.sessionId),
        ),
      )
      .returning();

    res.json(mapReponse(reponse));
  },
);

export default router;
