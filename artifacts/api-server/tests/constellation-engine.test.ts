/**
 * Le moteur de constellation écrit du texte que la personne lit sur elle-même.
 * Ce que ces tests protègent, c'est ce que l'en-tête du moteur promet de ne
 * jamais faire :
 *
 *   • une réponse qui change n'est pas une contradiction — la stabilité ne se
 *     mesure que sur les duels, jamais à l'intérieur d'une série ;
 *   • rien n'est déduit de l'intention : `valeurProtegee` n'existe que si la
 *     personne l'a nommée ;
 *   • chaque observation transporte ses sources, puisque l'interface les
 *     rouvre telles quelles sous « D'où ça sort ? ».
 *
 * Une inversion de signe dans `gagnant`/`perdant` reste invisible en relecture
 * et dit exactement le contraire de la vérité à l'écran : c'est le premier cas
 * couvert.
 */

import { describe, expect, it } from "vitest";
import { series } from "@workspace/contenu";
import {
  calculerConstellation,
  type ReponseSource,
} from "../src/lib/constellation-engine";

const A = "Alpha";
const B = "Beta";

let prochainId = 1;

function reponse(partiel: Partial<ReponseSource> = {}): ReponseSource {
  return {
    id: prochainId++,
    dilemmeId: null,
    valeurA: A,
    valeurB: B,
    choix: "A",
    facteurDepend: null,
    facteurDependLibre: null,
    difficulte: null,
    certitude: null,
    serieId: null,
    palier: null,
    dimension: null,
    valeurProtegee: null,
    version: 1,
    ...partiel,
  };
}

function tendanceDe(resultat: { tendances: { valeur: string }[] }, valeur: string) {
  return resultat.tendances.find((t) => t.valeur === valeur)!;
}

describe("partie vide", () => {
  const resultat = calculerConstellation({ reponses: [], valeursConnues: [A, B] });

  it("ne prétend rien sur des valeurs jamais mises à l'épreuve", () => {
    expect(tendanceDe(resultat, A).territoireInexplore).toBe(true);
    expect(tendanceDe(resultat, A).estProtegee).toBe(false);
    expect(tendanceDe(resultat, A).scoreNet).toBe(0);
  });

  it("ne pénalise pas une partie sans reprise", () => {
    // Sans tension revue, il n'y a rien à comparer : on affiche 1 plutôt que 0.
    expect(resultat.stabilite).toBe(1);
    expect(resultat.couverture).toBe(0);
  });

  it("expose la version de calcul", () => {
    expect(resultat.versionCalcul).toBe(3);
  });

  it("ne classe rien sans arbitrage joué", () => {
    expect(resultat.cartesJugees).toEqual([]);
    expect(resultat.valeursDeclarees).toEqual([]);
  });
});

describe("sens des réponses", () => {
  it("fait gagner valeurA quand le choix est A", () => {
    const resultat = calculerConstellation({ reponses: [reponse({ choix: "A" })], valeursConnues: [A, B] });
    expect(tendanceDe(resultat, A).foisPrivilegiee).toBe(1);
    expect(tendanceDe(resultat, A).foisCedee).toBe(0);
    expect(tendanceDe(resultat, B).foisPrivilegiee).toBe(0);
    expect(tendanceDe(resultat, B).foisCedee).toBe(1);
    expect(tendanceDe(resultat, A).domine).toEqual([B]);
    expect(tendanceDe(resultat, B).cedeDevant).toEqual([A]);
  });

  it("fait gagner valeurB quand le choix est B", () => {
    const resultat = calculerConstellation({ reponses: [reponse({ choix: "B" })], valeursConnues: [A, B] });
    expect(tendanceDe(resultat, B).foisPrivilegiee).toBe(1);
    expect(tendanceDe(resultat, A).foisCedee).toBe(1);
  });

  it("ne compte ni victoire ni défaite pour « ça dépend » et « je ne sais pas »", () => {
    const resultat = calculerConstellation({ reponses: [reponse({ choix: "ca_depend" }), reponse({ choix: "je_ne_sais_pas" })], valeursConnues: [A, B] });
    const t = tendanceDe(resultat, A);
    expect(t.foisPrivilegiee).toBe(0);
    expect(t.foisCedee).toBe(0);
    expect(t.incertitudes).toBe(2);
    expect(t.territoireInexplore).toBe(true);
  });

  it("écarte les situations passées du calcul de difficulté", () => {
    const resultat = calculerConstellation({ reponses: [
        reponse({ choix: "A", difficulte: 4 }),
        reponse({ choix: "passer", difficulte: 1 }),
      ], valeursConnues: [A, B] });
    expect(tendanceDe(resultat, A).difficulteMoyenne).toBe(4);
    expect(tendanceDe(resultat, A).abandonnes).toBe(1);
  });
});

describe("valeur qui n'a pas encore cédé", () => {
  it("attend deux mises à l'épreuve avant de le dire", () => {
    const une = calculerConstellation({ reponses: [reponse({ choix: "A" })], valeursConnues: [A, B] });
    expect(tendanceDe(une, A).estProtegee).toBe(false);

    const deux = calculerConstellation({ reponses: [reponse({ choix: "A" }), reponse({ choix: "A" })], valeursConnues: [A, B] });
    expect(tendanceDe(deux, A).estProtegee).toBe(true);
  });

  it("retire l'étiquette dès que la valeur a cédé une fois", () => {
    const resultat = calculerConstellation({ reponses: [reponse({ choix: "A" }), reponse({ choix: "A" }), reponse({ choix: "B" })], valeursConnues: [A, B] });
    expect(tendanceDe(resultat, A).estProtegee).toBe(false);
  });
});

describe("stabilité", () => {
  it("relève une même tension tranchée différemment en duel", () => {
    const resultat = calculerConstellation({ reponses: [reponse({ choix: "A", dilemmeId: 1 }), reponse({ choix: "B", dilemmeId: 2 })], valeursConnues: [A, B] });
    expect(resultat.tensions[0].estStable).toBe(false);
    expect(resultat.stabilite).toBe(0);
    expect(resultat.observations.some((o) => o.type === "stabilite")).toBe(true);
  });

  it("ne compte pas un basculement à l'intérieur d'une série", () => {
    // C'est le résultat recherché, pas une incohérence : le jeu a délibérément
    // monté un réglage d'un cran.
    const resultat = calculerConstellation({ reponses: [
        reponse({ choix: "A", dilemmeId: 1 }),
        reponse({ choix: "B", serieId: "b_test", palier: 2 }),
      ], valeursConnues: [A, B] });
    expect(resultat.stabilite).toBe(1);
    expect(resultat.observations.some((o) => o.type === "stabilite")).toBe(false);
  });

  it("ne conclut rien sur une tension vue une seule fois", () => {
    const resultat = calculerConstellation({ reponses: [reponse({ choix: "A" })], valeursConnues: [A, B] });
    expect(resultat.tensions[0].estStable).toBeNull();
  });
});

describe("points de bascule", () => {
  const serie = series[0];

  function palier(rang: number, choix: string): ReponseSource {
    return reponse({
      valeurA: serie.valeurA,
      valeurB: serie.valeurB,
      choix,
      serieId: serie.id,
      palier: serie.paliers[rang].palier,
      dimension: serie.dimension,
    });
  }

  it("nomme le cran où le choix a changé", () => {
    const resultat = calculerConstellation({ reponses: [palier(0, "A"), palier(1, "B")], valeursConnues: [serie.valeurA, serie.valeurB] });
    expect(resultat.bascules).toHaveLength(1);
    expect(resultat.bascules[0].choixInitial).toBe("A");
    expect(resultat.bascules[0].reglageBascule).toBe(serie.paliers[1].reglage);
  });

  it("dit qu'il n'y a pas eu de bascule quand le choix tient", () => {
    const resultat = calculerConstellation({ reponses: [palier(0, "A"), palier(1, "A"), palier(2, "A")], valeursConnues: [serie.valeurA, serie.valeurB] });
    expect(resultat.bascules[0].reglageBascule).toBeNull();
    const texte = resultat.observations.find((o) => o.type === "point_de_bascule")!
      .texte;
    expect(texte).toContain("n'a pas bougé");
  });

  it("ignore une série d'un seul palier", () => {
    const resultat = calculerConstellation({ reponses: [palier(0, "A")], valeursConnues: [serie.valeurA, serie.valeurB] });
    expect(resultat.bascules).toEqual([]);
  });
});

describe("ce que le moteur refuse de déduire", () => {
  it("ne nomme une valeur protégée que si la personne l'a écrite", () => {
    const sans = calculerConstellation({ reponses: [reponse({ choix: "A" }), reponse({ choix: "A" })], valeursConnues: [A, B] });
    expect(sans.observations.some((o) => o.texte.includes("tu as répondu"))).toBe(
      false,
    );

    const avec = calculerConstellation({ reponses: [
        reponse({ choix: "A", valeurProtegee: A }),
        reponse({ choix: "A", valeurProtegee: A }),
      ], valeursConnues: [A, B] });
    expect(
      avec.observations.some((o) => o.texte.includes("le jeu ne l'a pas déduite")),
    ).toBe(true);
  });

  it("ne relève un facteur de « ça dépend » qu'à partir de deux mentions", () => {
    const une = calculerConstellation({ reponses: [reponse({ choix: "ca_depend", facteurDepend: "ampleur_impact" })], valeursConnues: [A, B] });
    expect(une.observations.some((o) => o.texte.includes("ça dépend"))).toBe(false);

    const deux = calculerConstellation({ reponses: [
        reponse({ choix: "ca_depend", facteurDepend: "ampleur_impact" }),
        reponse({ choix: "ca_depend", facteurDepend: "ampleur_impact" }),
      ], valeursConnues: [A, B] });
    expect(deux.observations.some((o) => o.texte.includes("ça dépend"))).toBe(true);
  });
});

describe("arbitrages", () => {
  const cartes = [
    { carteId: "c1", label: "Carte une", famille: "lignes_rouges" as const, valeursConfirmees: [A] },
    { carteId: "c2", label: "Carte deux", famille: "lignes_rouges" as const, valeursConfirmees: [B] },
    { carteId: "c3", label: "Carte trois", famille: "horizons" as const, valeursConfirmees: [B] },
    { carteId: "c4", label: "Carte quatre", famille: "tresors" as const, valeursConfirmees: [B] },
  ];
  const ids = cartes.map((c) => c.carteId);

  const bloc = (
    id: number,
    meilleure: string | null,
    pire: string | null,
    numero = 1,
  ) => ({ id, bloc: numero, carteIds: ids, carteMeilleure: meilleure, cartePire: pire });

  it("classe les cartes de la personne", () => {
    const resultat = calculerConstellation({
      reponses: [],
      valeursConnues: [A, B],
      cartes,
      arbitrages: [bloc(1, "c1", "c4")],
    });
    expect(resultat.cartesJugees[0].carteId).toBe("c1");
    expect(resultat.cartesJugees[0].score).toBe(1);
  });

  it("nomme la carte mise devant", () => {
    const resultat = calculerConstellation({
      reponses: [],
      valeursConnues: [A, B],
      cartes,
      arbitrages: [bloc(1, "c1", "c4")],
    });
    const observation = resultat.observations.find((o) => o.type === "arbitrage");
    expect(observation?.texte).toContain("Carte une");
    expect(observation?.arbitragesSources).toEqual([1]);
  });

  it("ne nomme aucune carte quand deux sont ex æquo en tête", () => {
    // Annoncer « c'est celle-là » sur une égalité serait un tirage au sort
    // présenté comme un résultat.
    const resultat = calculerConstellation({
      reponses: [],
      valeursConnues: [A, B],
      cartes,
      arbitrages: [bloc(1, "c1", "c3"), bloc(2, "c2", "c4", 2)],
    });
    expect(resultat.observations.some((o) => o.type === "arbitrage")).toBe(false);
  });

  it("fait hériter les valeurs du score de leurs cartes", () => {
    const resultat = calculerConstellation({
      reponses: [],
      valeursConnues: [A, B],
      cartes,
      arbitrages: [bloc(1, "c1", "c4")],
    });
    const declaree = resultat.valeursDeclarees.find((v) => v.valeur === A)!;
    expect(declaree.scoreDeclare).toBe(1);
    expect(declaree.cartes).toEqual(["Carte une"]);
  });

  it("ignore un bloc passé", () => {
    const resultat = calculerConstellation({
      reponses: [],
      valeursConnues: [A, B],
      cartes,
      arbitrages: [bloc(1, null, null)],
    });
    expect(resultat.valeursDeclarees).toEqual([]);
    expect(resultat.observations.some((o) => o.type === "arbitrage")).toBe(false);
  });
});

describe("écart entre le dit et le joué", () => {
  const cartes = [
    { carteId: "c1", label: "Carte une", famille: "lignes_rouges" as const, valeursConfirmees: [A] },
    { carteId: "c2", label: "Carte deux", famille: "lignes_rouges" as const, valeursConfirmees: [B] },
    { carteId: "c3", label: "Carte trois", famille: "horizons" as const, valeursConfirmees: [B] },
    { carteId: "c4", label: "Carte quatre", famille: "tresors" as const, valeursConfirmees: [B] },
  ];
  const arbitrages = [
    {
      id: 1,
      bloc: 1,
      carteIds: cartes.map((c) => c.carteId),
      carteMeilleure: "c1",
      cartePire: "c4",
    },
  ];

  it("relève une valeur mise devant à froid mais qui cède en situation", () => {
    const resultat = calculerConstellation({
      reponses: [reponse({ choix: "B" }), reponse({ choix: "B" })],
      valeursConnues: [A, B],
      cartes,
      arbitrages,
    });
    const ecart = resultat.observations.find((o) => o.type === "ecart_declare");
    expect(ecart).toBeDefined();
    expect(ecart!.valeursConcernees).toEqual([A]);
    // Les deux tables sont citées séparément : l'écart vient justement de leur
    // confrontation.
    expect(ecart!.arbitragesSources).toEqual([1]);
    expect(ecart!.reponsesSources.length).toBeGreaterThan(0);
  });

  it("ne parle pas de contradiction", () => {
    const resultat = calculerConstellation({
      reponses: [reponse({ choix: "B" }), reponse({ choix: "B" })],
      valeursConnues: [A, B],
      cartes,
      arbitrages,
    });
    const ecart = resultat.observations.find((o) => o.type === "ecart_declare")!;
    expect(ecart.texte).toContain("Les deux sont vraies");
    expect(ecart.texte.toLowerCase()).not.toContain("contradiction");
  });

  it("se tait quand la valeur n'a pas assez été mise à l'épreuve", () => {
    const resultat = calculerConstellation({
      reponses: [reponse({ choix: "B" })],
      valeursConnues: [A, B],
      cartes,
      arbitrages,
    });
    expect(resultat.observations.some((o) => o.type === "ecart_declare")).toBe(false);
  });

  it("se tait quand le dit et le joué concordent", () => {
    const resultat = calculerConstellation({
      reponses: [reponse({ choix: "A" }), reponse({ choix: "A" })],
      valeursConnues: [A, B],
      cartes,
      arbitrages,
    });
    expect(resultat.observations.some((o) => o.type === "ecart_declare")).toBe(false);
  });
});

describe("traçabilité", () => {
  it("ne cite que des réponses réellement jouées", () => {
    // L'interface rouvre ces réponses telles quelles sous « D'où ça sort ? » :
    // un identifiant inventé y afficherait du vide.
    const reponses = [
      reponse({ choix: "A", dilemmeId: 1 }),
      reponse({ choix: "B", dilemmeId: 2 }),
      reponse({ choix: "ca_depend", facteurDepend: "ampleur_impact" }),
      reponse({ choix: "ca_depend", facteurDepend: "ampleur_impact" }),
      reponse({ choix: "A", valeurProtegee: A }),
      reponse({ choix: "A", valeurProtegee: A }),
    ];
    const connus = new Set(reponses.map((r) => r.id));
    const resultat = calculerConstellation({ reponses: reponses, valeursConnues: [A, B] });

    expect(resultat.observations.length).toBeGreaterThan(0);
    for (const observation of resultat.observations) {
      for (const source of observation.reponsesSources) {
        expect(connus).toContain(source);
      }
    }
  });

  it("donne un identifiant unique à chaque observation", () => {
    const resultat = calculerConstellation({ reponses: [reponse({ choix: "A" }), reponse({ choix: "A" })], valeursConnues: [A, B, "Gamma"] });
    const ids = resultat.observations.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
