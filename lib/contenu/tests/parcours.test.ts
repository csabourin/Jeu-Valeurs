import { describe, expect, it } from "vitest";
import { calculerParcours, type ReponseConnue } from "../src/parcours";
import type { CarteArbitrable, ReponseArbitrage } from "../src/arbitrages";
import { estCollision } from "../src/collisions";

const cartes: CarteArbitrable[] = [
  {
    id: "1",
    famille: "lignes_rouges",
    label: "Mentir à quelqu'un qui me fait confiance",
    valeursConfirmees: ["Dire la vérité"],
  },
  {
    id: "2",
    famille: "lignes_rouges",
    label: "Sacrifier tout mon temps libre",
    valeursConfirmees: ["Avoir du temps à moi"],
  },
  {
    id: "3",
    famille: "horizons",
    label: "Avoir une carrière qui me passionne",
    valeursConfirmees: ["Devenir bon dans mon domaine"],
  },
  {
    id: "4",
    famille: "tresors",
    label: "Ma relation avec mes enfants",
    valeursConfirmees: ["Être là pour mes enfants"],
  },
  {
    id: "5",
    famille: "tresors",
    label: "Ma sécurité financière",
    valeursConfirmees: ["Stabilité financière"],
  },
  // Même valeur que la précédente, sous une autre carte : c'est ce qui donne
  // matière à l'approfondissement, où le couple est revu autrement mis en scène.
  {
    id: "6",
    famille: "tresors",
    label: "Le fonds que j'ai mis des années à bâtir",
    valeursConfirmees: ["Stabilité financière"],
  },
];

const graine = 4242;

/** Répond à tout ce que la phase d'arbitrage propose. */
function passerLesArbitrages(): ReponseArbitrage[] {
  const arbitrages: ReponseArbitrage[] = [];
  for (let tour = 0; tour < 20; tour++) {
    const p = calculerParcours({ reponses: [], cartes, arbitrages, graine });
    if (!p.prochainBloc) break;
    arbitrages.push({
      bloc: p.prochainBloc.bloc,
      carteIds: p.prochainBloc.cartes.map((c) => c.id),
      carteMeilleure: p.prochainBloc.cartes[0].id,
      cartePire: p.prochainBloc.cartes[p.prochainBloc.cartes.length - 1].id,
    });
  }
  return arbitrages;
}

/** Joue jusqu'à ce que la phase demandée soit atteinte, en tranchant toujours. */
function jouer(
  options: { approfondissementDemande?: boolean; tours?: number } = {},
) {
  const arbitrages = passerLesArbitrages();
  const reponses: ReponseConnue[] = [];
  const vues: string[] = [];

  for (let tour = 0; tour < (options.tours ?? 200); tour++) {
    const p = calculerParcours({
      reponses,
      cartes,
      arbitrages,
      graine,
      approfondissementDemande: options.approfondissementDemande ?? false,
    });
    vues.push(p.phase);
    if (!p.prochaine) return { parcours: p, reponses, arbitrages, vues };

    reponses.push({
      dilemmeId: p.prochaine.dilemmeId,
      valeurA: p.prochaine.valeurA,
      valeurB: p.prochaine.valeurB,
      // Toujours « oui » : la limite cède, l'enjeu passe devant.
      choix: "A",
    });
  }

  throw new Error("le parcours ne se termine pas");
}

describe("le parcours", () => {
  it("commence par les arbitrages", () => {
    const p = calculerParcours({ reponses: [], cartes, graine });
    expect(p.phase).toBe("arbitrages");
    expect(p.prochainBloc).not.toBeNull();
    expect(p.prochaine).toBeNull();
  });

  it("passe aux collisions une fois les blocs épuisés", () => {
    const arbitrages = passerLesArbitrages();
    const p = calculerParcours({ reponses: [], cartes, arbitrages, graine });

    expect(p.phase).toBe("duels");
    expect(p.prochainBloc).toBeNull();
    expect(p.prochaine?.type).toBe("collision");
    expect(p.arbitragesRepondus).toBe(p.arbitragesPlanifies);
  });

  it("ne pose que des questions « serais-tu prêt à … pour … ? »", () => {
    const { reponses } = jouer({ approfondissementDemande: true });
    expect(reponses.length).toBeGreaterThan(0);
    for (const r of reponses) {
      expect(estCollision(r.dilemmeId as number)).toBe(true);
    }
  });

  it("rend la même question tant que rien n'a été répondu", () => {
    const arbitrages = passerLesArbitrages();
    const a = calculerParcours({ reponses: [], cartes, arbitrages, graine });
    const b = calculerParcours({ reponses: [], cartes, arbitrages, graine });
    expect(a.prochaine?.dilemmeId).toBe(b.prochaine?.dilemmeId);
  });

  it("ne repose jamais une collision déjà répondue", () => {
    const { reponses } = jouer({ approfondissementDemande: true });
    const ids = reponses.map((r) => r.dilemmeId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("s'arrête sur le portrait avant d'approfondir", () => {
    const { parcours, vues } = jouer();

    expect(parcours.phase).toBe("portrait");
    expect(parcours.prochaine).toBeNull();
    expect(parcours.duelsRepondus).toBe(parcours.duelsPlanifies);
    // Le portrait vient après les collisions, jamais avant.
    expect(vues.indexOf("duels")).toBeLessThan(vues.indexOf("portrait"));
  });

  it("livre un classement dès le portrait", () => {
    const { parcours } = jouer();

    expect(parcours.classement.length).toBeGreaterThan(1);
    for (let i = 1; i < parcours.classement.length; i++) {
      expect(parcours.classement[i - 1].force).toBeGreaterThanOrEqual(
        parcours.classement[i].force,
      );
    }
  });

  it("n'approfondit que si la personne le demande", () => {
    const { reponses, arbitrages } = jouer();

    const sans = calculerParcours({ reponses, cartes, arbitrages, graine });
    const avec = calculerParcours({
      reponses,
      cartes,
      arbitrages,
      graine,
      approfondissementDemande: true,
    });

    expect(sans.phase).toBe("portrait");
    expect(avec.phase).toBe("bascules");
    expect(avec.prochaine?.approfondissement).toBe(true);
  });

  it("ne demande difficulté et certitude que pendant l'approfondissement", () => {
    const arbitrages = passerLesArbitrages();
    const premiere = calculerParcours({
      reponses: [],
      cartes,
      arbitrages,
      graine,
    });
    expect(premiere.prochaine?.approfondissement).toBe(false);
  });

  it("justifie chaque collision d'approfondissement", () => {
    const { reponses, arbitrages } = jouer();
    const p = calculerParcours({
      reponses,
      cartes,
      arbitrages,
      graine,
      approfondissementDemande: true,
    });

    expect(p.prochaine?.motifs.length).toBeGreaterThan(0);
  });

  it("finit par épuiser toutes les collisions admissibles", () => {
    const { parcours } = jouer({ approfondissementDemande: true });

    expect(parcours.phase).toBe("termine");
    expect(parcours.collisionsRepondues).toBe(parcours.collisionsPossibles);
  });

  it("ne propose rien quand aucune collision n'est admissible", () => {
    // Une seule famille de cartes : rien à opposer.
    const p = calculerParcours({
      reponses: [],
      cartes: cartes.filter((c) => c.famille === "lignes_rouges"),
      arbitrages: [],
      graine,
    });

    expect(p.collisionsPossibles).toBe(0);
    expect(p.prochaine).toBeNull();
  });

  it("ne joue rien sans carte", () => {
    const p = calculerParcours({ reponses: [], cartes: [], graine });
    expect(p.phase).toBe("termine");
    expect(p.prochaine).toBeNull();
    expect(p.prochainBloc).toBeNull();
  });
});
