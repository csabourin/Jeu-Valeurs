/**
 * Le moteur de résultats écrit du texte que la personne lit sur elle-même.
 * Ce que ces tests protègent, c'est ce que l'en-tête du moteur promet de ne
 * jamais faire :
 *
 *   • une réponse qui change n'est pas une contradiction — la stabilité ne se
 *     mesure que sur les duels, jamais à l'intérieur d'une série ;
 *   • rien n'est déduit de l'intention : `valeurProtegee` n'existe que si la
 *     personne l'a nommée ;
 *   • le classement reste une estimation, avec son incertitude, et les cycles
 *     sont dits plutôt que corrigés ;
 *   • la terminologie est symétrique partout : « prioritaire sur » /
 *     « secondaire face à », jamais « passé devant » / « cédé devant » ;
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
const C = "Gamma";

let prochainId = 1;

function reponse(partiel: Partial<ReponseSource> = {}): ReponseSource {
  return {
    id: prochainId++,
    dilemmeId: null,
    valeurA: A,
    valeurB: B,
    carteA: null,
    carteB: null,
    choix: "A",
    contexte: null,
    phase: "ordination",
    facteurDepend: null,
    facteurDependLibre: null,
    difficulte: null,
    certitude: null,
    serieId: null,
    palier: null,
    dimension: null,
    valeurProtegee: null,
    ceQuiChangerait: null,
    version: 1,
    ...partiel,
  };
}

function tendanceDe(
  resultat: { tendances: { valeur: string }[] },
  valeur: string,
) {
  return resultat.tendances.find((t) => t.valeur === valeur)!;
}

function ligneDe(
  resultat: { ordination: { valeur: string }[] },
  valeur: string,
) {
  return resultat.ordination.find((l) => l.valeur === valeur)!;
}

describe("partie vide", () => {
  const resultat = calculerConstellation({
    reponses: [],
    valeursConnues: [A, B],
  });

  it("ne prétend rien sur des valeurs jamais mises à l'épreuve", () => {
    expect(tendanceDe(resultat, A).territoireInexplore).toBe(true);
    expect(ligneDe(resultat, A).niveauConfiance).toBe(
      "territoire_peu_explore",
    );
    expect(ligneDe(resultat, A).jamaisSecondaire).toBe(false);
  });

  it("ne pénalise pas une partie sans reprise", () => {
    // Sans tension revue, il n'y a rien à comparer : on affiche 1 plutôt que 0.
    expect(resultat.stabilite).toBe(1);
    expect(resultat.couverture.pairesCouvertes).toBe(0);
    expect(resultat.niveauConfianceGlobal).toBe("territoire_peu_explore");
  });

  it("expose la version de calcul", () => {
    expect(resultat.versionCalcul).toBe(4);
  });
});

describe("sens des réponses", () => {
  it("fait passer valeurA devant quand le choix est A", () => {
    const resultat = calculerConstellation({
      reponses: [reponse({ choix: "A" })],
      valeursConnues: [A, B],
    });
    expect(tendanceDe(resultat, A).foisPrivilegiee).toBe(1);
    expect(tendanceDe(resultat, A).foisCedee).toBe(0);
    expect(ligneDe(resultat, A).force).toBeGreaterThan(
      ligneDe(resultat, B).force,
    );
    expect(ligneDe(resultat, A).prioritaireSur).toEqual([B]);
    expect(ligneDe(resultat, B).secondaireFaceA).toEqual([A]);
  });

  it("fait passer valeurB devant quand le choix est B", () => {
    const resultat = calculerConstellation({
      reponses: [reponse({ choix: "B" })],
      valeursConnues: [A, B],
    });
    expect(ligneDe(resultat, B).force).toBeGreaterThan(
      ligneDe(resultat, A).force,
    );
  });

  it("traite « ça dépend » comme un match nul, pas comme un trou", () => {
    const resultat = calculerConstellation({
      reponses: [
        reponse({ choix: "ca_depend" }),
        reponse({ choix: "je_ne_sais_pas" }),
      ],
      valeursConnues: [A, B],
    });
    expect(ligneDe(resultat, A).indecis).toBe(2);
    expect(ligneDe(resultat, A).force).toBeCloseTo(ligneDe(resultat, B).force);
    expect(tendanceDe(resultat, A).incertitudes).toBe(2);
  });

  it("écarte les situations passées du calcul de difficulté", () => {
    const resultat = calculerConstellation({
      reponses: [
        reponse({ choix: "A", difficulte: 4, phase: "epreuve" }),
        reponse({ choix: "passer", difficulte: 1 }),
      ],
      valeursConnues: [A, B],
    });
    expect(tendanceDe(resultat, A).difficulteMoyenne).toBe(4);
    expect(tendanceDe(resultat, A).abandonnes).toBe(1);
  });
});

describe("ordination", () => {
  it("tient compte de la force des valeurs affrontées", () => {
    // Alpha bat Beta, qui bat Gamma : Alpha doit finir devant Beta même si
    // toutes deux n'ont gagné qu'une fois.
    const resultat = calculerConstellation({
      reponses: [
        reponse({ choix: "A", valeurA: A, valeurB: B }),
        reponse({ choix: "A", valeurA: B, valeurB: C }),
      ],
      valeursConnues: [A, B, C],
    });
    expect(ligneDe(resultat, A).rang).toBeLessThan(ligneDe(resultat, B).rang);
    expect(ligneDe(resultat, B).rang).toBeLessThan(ligneDe(resultat, C).rang);
  });

  it("garde finie la force d'une valeur jamais secondaire", () => {
    const resultat = calculerConstellation({
      reponses: [
        reponse({ choix: "A" }),
        reponse({ choix: "A" }),
        reponse({ choix: "A" }),
      ],
      valeursConnues: [A, B],
    });
    expect(Number.isFinite(ligneDe(resultat, A).force)).toBe(true);
    expect(ligneDe(resultat, A).jamaisSecondaire).toBe(true);
  });

  it("dit les cycles au lieu de les corriger", () => {
    const resultat = calculerConstellation({
      reponses: [
        reponse({ choix: "A", valeurA: A, valeurB: B }),
        reponse({ choix: "A", valeurA: B, valeurB: C }),
        reponse({ choix: "A", valeurA: C, valeurB: A }),
      ],
      valeursConnues: [A, B, C],
    });
    expect(resultat.cycles).toHaveLength(1);
    expect(resultat.cycles[0].sort()).toEqual([A, B, C]);
    // Trois valeurs qui tournent en rond ont la même force : aucune ne se
    // détache, et le portrait doit le dire.
    expect(ligneDe(resultat, A).force).toBeCloseTo(ligneDe(resultat, C).force);
    expect(resultat.observations.some((o) => o.type === "cycle")).toBe(true);
  });

  it("élargit l'incertitude quand il y a peu de comparaisons", () => {
    const peu = calculerConstellation({
      reponses: [reponse({ choix: "A" })],
      valeursConnues: [A, B],
    });
    const beaucoup = calculerConstellation({
      reponses: [
        reponse({ choix: "A" }),
        reponse({ choix: "A" }),
        reponse({ choix: "B" }),
        reponse({ choix: "A" }),
      ],
      valeursConnues: [A, B],
    });
    expect(ligneDe(peu, A).incertitude).toBeGreaterThan(
      ligneDe(beaucoup, A).incertitude,
    );
    expect(ligneDe(peu, A).intervalleBas).toBeLessThan(ligneDe(peu, A).force);
    expect(ligneDe(peu, A).intervalleHaut).toBeGreaterThan(
      ligneDe(peu, A).force,
    );
  });
});

describe("valeur qui n'a pas encore cédé", () => {
  it("attend deux mises à l'épreuve avant de le dire", () => {
    const une = calculerConstellation({
      reponses: [reponse({ choix: "A" })],
      valeursConnues: [A, B],
    });
    expect(une.valeursProtegees).toEqual([]);

    const deux = calculerConstellation({
      reponses: [reponse({ choix: "A" }), reponse({ choix: "A" })],
      valeursConnues: [A, B],
    });
    expect(deux.valeursProtegees).toEqual([A]);
  });

  it("retire l'étiquette dès que la valeur a été secondaire une fois", () => {
    const resultat = calculerConstellation({
      reponses: [
        reponse({ choix: "A" }),
        reponse({ choix: "A" }),
        reponse({ choix: "B" }),
      ],
      valeursConnues: [A, B],
    });
    expect(resultat.valeursProtegees).toEqual([]);
  });
});

describe("valeurs fortes et valeurs contextuelles", () => {
  it("ne dit « forte » que si la valeur passe devant plusieurs autres", () => {
    const resultat = calculerConstellation({
      reponses: [
        reponse({ choix: "A", valeurA: A, valeurB: B }),
        reponse({ choix: "A", valeurA: A, valeurB: C }),
      ],
      valeursConnues: [A, B, C],
    });
    expect(resultat.valeursFortes).toContain(A);
  });

  it("range comme contextuelle une valeur qui ne gagne qu'au même endroit", () => {
    const resultat = calculerConstellation({
      reponses: [
        reponse({ choix: "A", dilemmeId: 1, contexte: "amis" }),
        reponse({ choix: "A", dilemmeId: 2, contexte: "amis" }),
      ],
      valeursConnues: [A, B],
    });
    expect(resultat.valeursContextuelles.map((v) => v.valeur)).toContain(A);
    expect(resultat.valeursFortes).not.toContain(A);
  });
});

describe("stabilité", () => {
  it("relève une même tension tranchée différemment en duel", () => {
    const resultat = calculerConstellation({
      reponses: [
        reponse({ choix: "A", dilemmeId: 1 }),
        reponse({ choix: "B", dilemmeId: 2 }),
      ],
      valeursConnues: [A, B],
    });
    expect(resultat.tensions[0].estStable).toBe(false);
    expect(resultat.stabilite).toBe(0);
    expect(resultat.observations.some((o) => o.type === "stabilite")).toBe(
      true,
    );
    expect(
      resultat.tensionsPrincipales.some((t) => t.type === "renversement"),
    ).toBe(true);
  });

  it("ne compte pas un basculement à l'intérieur d'une série", () => {
    // C'est le résultat recherché, pas une incohérence : le jeu a délibérément
    // monté un réglage d'un cran.
    const resultat = calculerConstellation({
      reponses: [
        reponse({ choix: "A", dilemmeId: 1 }),
        reponse({ choix: "B", serieId: "b_test", palier: 2 }),
      ],
      valeursConnues: [A, B],
    });
    expect(resultat.stabilite).toBe(1);
    expect(resultat.observations.some((o) => o.type === "stabilite")).toBe(
      false,
    );
  });

  it("ne conclut rien sur une tension vue une seule fois", () => {
    const resultat = calculerConstellation({
      reponses: [reponse({ choix: "A" })],
      valeursConnues: [A, B],
    });
    expect(resultat.tensions[0].estStable).toBeNull();
  });

  it("compte les manifestations rejouées séparément des paires couvertes", () => {
    const resultat = calculerConstellation({
      reponses: [
        reponse({ choix: "A", dilemmeId: 1, carteA: "c1", carteB: "c2" }),
        reponse({ choix: "A", dilemmeId: 2, carteA: "c3", carteB: "c4" }),
      ],
      valeursConnues: [A, B],
    });
    expect(resultat.couverture.pairesCouvertes).toBe(1);
    expect(resultat.couverture.manifestationsRejouees).toBe(1);
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
      phase: "epreuve",
    });
  }

  it("nomme le cran où le choix a changé", () => {
    const resultat = calculerConstellation({
      reponses: [palier(0, "A"), palier(1, "B")],
      valeursConnues: [serie.valeurA, serie.valeurB],
    });
    expect(resultat.bascules).toHaveLength(1);
    expect(resultat.bascules[0].choixInitial).toBe("A");
    expect(resultat.bascules[0].reglageBascule).toBe(serie.paliers[1].reglage);
    expect(resultat.dimensionsSensibles.some((d) => d.source === "bascule")).toBe(
      true,
    );
  });

  it("dit qu'il n'y a pas eu de bascule quand le choix tient", () => {
    const resultat = calculerConstellation({
      reponses: [palier(0, "A"), palier(1, "A"), palier(2, "A")],
      valeursConnues: [serie.valeurA, serie.valeurB],
    });
    expect(resultat.bascules[0].reglageBascule).toBeNull();
    const texte = resultat.observations.find(
      (o) => o.type === "point_de_bascule",
    )!.texte;
    expect(texte).toContain("n'a pas bougé");
  });

  it("ignore une série d'un seul palier", () => {
    const resultat = calculerConstellation({
      reponses: [palier(0, "A")],
      valeursConnues: [serie.valeurA, serie.valeurB],
    });
    expect(resultat.bascules).toEqual([]);
  });
});

describe("ce que le moteur refuse de déduire", () => {
  it("ne nomme une valeur protégée que si la personne l'a écrite", () => {
    const sans = calculerConstellation({
      reponses: [reponse({ choix: "A" }), reponse({ choix: "A" })],
      valeursConnues: [A, B],
    });
    expect(
      sans.observations.some((o) => o.texte.includes("tu as répondu")),
    ).toBe(false);

    const avec = calculerConstellation({
      reponses: [
        reponse({ choix: "A", valeurProtegee: A, phase: "epreuve" }),
        reponse({ choix: "A", valeurProtegee: A, phase: "epreuve" }),
      ],
      valeursConnues: [A, B],
    });
    expect(
      avec.observations.some((o) =>
        o.texte.includes("le jeu ne l'a pas déduite"),
      ),
    ).toBe(true);
  });

  it("ne parle jamais de contradiction ni d'erreur", () => {
    const resultat = calculerConstellation({
      reponses: [
        reponse({ choix: "A", dilemmeId: 1 }),
        reponse({ choix: "B", dilemmeId: 2 }),
      ],
      valeursConnues: [A, B],
    });
    for (const observation of resultat.observations) {
      const texte = observation.texte.toLowerCase();
      expect(texte).not.toContain("tu te contredis");
      expect(texte).not.toContain("incohérence");
      // Le mot n'est admis que pour être nié : « ce n'est pas une
      // contradiction ». Jamais pour qualifier une réponse.
      if (texte.includes("contradiction")) {
        expect(texte).toContain("pas une contradiction");
      }
    }
  });
});

describe("terminologie", () => {
  it("n'emploie nulle part « passé devant » ni « cédé devant »", () => {
    const resultat = calculerConstellation({
      reponses: [
        reponse({ choix: "A", valeurA: A, valeurB: B, dilemmeId: 1 }),
        reponse({ choix: "A", valeurA: A, valeurB: C, dilemmeId: 2 }),
        reponse({ choix: "B", valeurA: B, valeurB: C, dilemmeId: 3 }),
      ],
      valeursConnues: [A, B, C],
    });
    const textes = [
      ...resultat.observations.map((o) => o.texte),
      ...resultat.tensionsPrincipales.map((t) => t.texte),
      ...resultat.valeursContextuelles.map((v) => v.texte),
    ];
    expect(textes.length).toBeGreaterThan(0);
    for (const texte of textes) {
      expect(texte).not.toContain("passée devant");
      expect(texte).not.toContain("cédé devant");
      expect(texte).not.toContain("a cédé la place");
    }
    expect(textes.some((t) => t.includes("prioritaire sur"))).toBe(true);
  });

  it("présente le classement comme une estimation", () => {
    const resultat = calculerConstellation({
      reponses: [reponse({ choix: "A" }), reponse({ choix: "A" })],
      valeursConnues: [A, B],
    });
    const ordination = resultat.observations.find(
      (o) => o.type === "ordination",
    );
    expect(ordination?.texte).toContain("estimation");
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
      reponse({ choix: "A", valeurProtegee: A, phase: "epreuve" }),
      reponse({ choix: "A", valeurProtegee: A, phase: "epreuve" }),
    ];
    const connus = new Set(reponses.map((r) => r.id));
    const resultat = calculerConstellation({
      reponses,
      valeursConnues: [A, B],
    });

    expect(resultat.observations.length).toBeGreaterThan(0);
    for (const observation of resultat.observations) {
      for (const source of observation.reponsesSources) {
        expect(connus).toContain(source);
      }
    }
  });

  it("donne un identifiant unique à chaque observation", () => {
    const resultat = calculerConstellation({
      reponses: [reponse({ choix: "A" }), reponse({ choix: "A" })],
      valeursConnues: [A, B, C],
    });
    const ids = resultat.observations.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
