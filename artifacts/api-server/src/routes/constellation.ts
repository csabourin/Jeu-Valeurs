import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  sessionsTable,
  cartesSessionTable,
  reponsesCollisionTable,
  arbitragesTable,
} from "@workspace/db";
import { GetConstellationParams, GetProgresParams } from "@workspace/api-zod";
import {
  calculerParcours,
  type ReponseConnue,
  type CarteArbitrable,
} from "@workspace/contenu";
import { eq } from "drizzle-orm";
import { calculerConstellation } from "../lib/constellation-engine";
import type {
  ReponseSource,
  ArbitrageSource,
  CarteJugee,
} from "../lib/constellation-engine";

const router: IRouter = Router();

type LigneReponse = typeof reponsesCollisionTable.$inferSelect;
type LigneCarte = typeof cartesSessionTable.$inferSelect;
type LigneArbitrage = typeof arbitragesTable.$inferSelect;

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

  const arbitrages = await db
    .select()
    .from(arbitragesTable)
    .where(eq(arbitragesTable.sessionId, sessionId));

  // Une valeur ne compte que si la personne l'a confirmée. Les suggestions du
  // catalogue ne sont jamais promues automatiquement.
  const valeursConfirmees = Array.from(
    new Set(cartes.flatMap((c) => c.valeursConfirmees)),
  );

  return { session, cartes, reponses, arbitrages, valeursConfirmees };
}

/**
 * Les blocs d'arbitrage sont bâtis sur l'identifiant de carte de session, en
 * texte. Les identifiants de carte du catalogue sont textuels eux aussi
 * (`JV1001`) : mélanger les deux espaces ferait pointer un bloc sur une carte
 * que la personne n'a jamais prise. On ne sort donc jamais de `cartes_session`.
 */
function versCarteArbitrable(c: LigneCarte): CarteArbitrable {
  return {
    id: String(c.id),
    famille: c.famille,
    label: c.label,
    valeursConfirmees: c.valeursConfirmees,
  };
}

function versCarteJugee(c: LigneCarte): CarteJugee {
  return {
    carteId: String(c.id),
    label: c.label,
    famille: c.famille,
    valeursConfirmees: c.valeursConfirmees,
  };
}

function versArbitrageSource(a: LigneArbitrage): ArbitrageSource {
  return {
    id: a.id,
    bloc: a.bloc,
    carteIds: a.carteIds,
    carteMeilleure: a.carteMeilleure ?? null,
    cartePire: a.cartePire ?? null,
  };
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

    const resultat = calculerConstellation({
      reponses: donnees.reponses.map(versReponseSource),
      valeursConnues: donnees.valeursConfirmees,
      cartes: donnees.cartes.map(versCarteJugee),
      arbitrages: donnees.arbitrages.map(versArbitrageSource),
      graine: donnees.session.graine,
    });

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
      cartesJugees: resultat.cartesJugees,
      valeursDeclarees: resultat.valeursDeclarees,
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

  const parcours = calculerParcours({
    valeursConfirmees: donnees.valeursConfirmees,
    reponses: donnees.reponses.map(versReponseConnue),
    cartes: donnees.cartes.map(versCarteArbitrable),
    arbitrages: donnees.arbitrages.map(versArbitrageSource),
    graine: donnees.session.graine,
  });

  res.json({
    sessionId: params.data.sessionId,
    etapeCourante: donnees.session.etapeCourante,
    phase: parcours.phase,
    nombreCartes: donnees.cartes.length,
    nombreValeurs: donnees.valeursConfirmees.length,
    arbitragesPlanifies: parcours.arbitragesPlanifies,
    arbitragesRepondus: parcours.arbitragesRepondus,
    duelsPlanifies: parcours.duelsPlanifies,
    duelsRepondus: parcours.duelsRepondus,
    seriesPlanifiees: parcours.seriesPlanifiees,
    seriesTerminees: parcours.seriesTerminees,
    nombreReponses: donnees.reponses.length,
    prochaineQuestion: parcours.prochaine,
    prochainBloc: parcours.prochainBloc,
  });
});

export default router;
