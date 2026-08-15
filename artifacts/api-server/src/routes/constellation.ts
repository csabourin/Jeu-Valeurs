import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  sessionsTable,
  cartesSessionTable,
  reponsesCollisionTable,
  normaliserEtape,
} from "@workspace/db";
import { GetConstellationParams, GetProgresParams } from "@workspace/api-zod";
import {
  calculerParcours,
  type CarteDuel,
  type PhaseExperience,
  type ReponseConnue,
} from "@workspace/contenu";
import { eq } from "drizzle-orm";
import { calculerConstellation } from "../lib/constellation-engine";
import type { ReponseSource, CarteJugee } from "../lib/constellation-engine";

const router: IRouter = Router();

type LigneReponse = typeof reponsesCollisionTable.$inferSelect;
type LigneCarte = typeof cartesSessionTable.$inferSelect;

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

/**
 * Les duels de cartes sont bâtis sur l'identifiant de **carte de session**, en
 * texte. Les identifiants du catalogue sont textuels eux aussi (`JV1001`) :
 * mélanger les deux espaces ferait pointer un duel sur une carte que la
 * personne n'a jamais prise. On ne sort donc jamais de `cartes_session`.
 */
function versCarteDuel(c: LigneCarte): CarteDuel {
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

function versReponseConnue(r: LigneReponse): ReponseConnue {
  return {
    dilemmeId: r.dilemmeId,
    valeurA: r.valeurA,
    valeurB: r.valeurB,
    carteA: r.carteA,
    carteB: r.carteB,
    choix: r.choix,
    contexte: r.contexte,
    phase: r.phase,
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
    carteA: r.carteA ?? null,
    carteB: r.carteB ?? null,
    choix: r.choix,
    contexte: r.contexte ?? null,
    phase: r.phase ?? "ordination",
    facteurDepend: r.facteurDepend ?? null,
    facteurDependLibre: r.facteurDependLibre ?? null,
    difficulte: r.difficulte ?? null,
    certitude: r.certitude ?? null,
    serieId: r.serieId ?? null,
    palier: r.palier ?? null,
    dimension: r.dimension ?? null,
    valeurProtegee: r.valeurProtegee ?? null,
    ceQuiChangerait: r.ceQuiChangerait ?? null,
    version: r.version,
  };
}

/**
 * La mise à l'épreuve ne démarre jamais toute seule : elle vient d'un bouton,
 * enregistré comme étape de session.
 */
function phaseDemandee(etape: string): PhaseExperience {
  return normaliserEtape(etape) === "epreuve" ? "epreuve" : "ordination";
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
      graine: donnees.session.graine,
    });

    // La version suit les corrections : une réponse rectifiée fait avancer la
    // constellation, sans jamais écraser silencieusement ce qui la précède.
    const version =
      donnees.reponses.length > 0
        ? Math.max(...donnees.reponses.map((r) => r.version))
        : 1;

    res.json({ sessionId: params.data.sessionId, version, ...resultat });
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
    cartes: donnees.cartes.map(versCarteDuel),
    graine: donnees.session.graine,
    phaseDemandee: phaseDemandee(donnees.session.etapeCourante),
  });

  res.json({
    sessionId: params.data.sessionId,
    etapeCourante: normaliserEtape(donnees.session.etapeCourante),
    phase: parcours.phase,
    nombreCartes: donnees.cartes.length,
    nombreValeurs: donnees.valeursConfirmees.length,
    comparaisonsPlanifiees: parcours.comparaisonsPlanifiees,
    comparaisonsRepondues: parcours.comparaisonsRepondues,
    pairesPertinentes: parcours.pairesPertinentes,
    pairesCouvertes: parcours.pairesCouvertes,
    tensionsRestantes: parcours.tensionsRestantes,
    seriesPlanifiees: parcours.seriesPlanifiees,
    seriesTerminees: parcours.seriesTerminees,
    nombreReponses: donnees.reponses.length,
    premiereOrdinationPrete: parcours.premiereOrdinationPrete,
    peutAffiner: parcours.peutAffiner,
    prochaineQuestion: parcours.prochaine,
  });
});

export default router;
