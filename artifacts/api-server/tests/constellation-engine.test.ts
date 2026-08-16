/**
 * Le moteur de constellation écrit du texte que la personne lit sur elle-même.
 * Ce que ces tests protègent, c'est ce que l'en-tête du moteur promet de ne
 * jamais faire :
 *
 *   • une limite franchie ici et tenue là n'est pas une contradiction : c'est
 *     l'information la plus intéressante du jeu ;
 *   • aucune valeur n'est déclarée sans importance parce qu'elle a cédé ;
 *   • rien n'est déduit de l'intention : `valeurProtegee` n'existe que si la
 *     personne l'a nommée ;
 *   • chaque observation transporte ses sources, puisque l'interface les
 *     rouvre telles quelles sous « D'où ça sort ? ».
 *
 * Une inversion de signe entre « oui je franchirais » et « non » reste
 * invisible en relecture et dit exactement le contraire de la vérité à
 * l'écran : c'est le premier cas couvert.
 */

import { describe, expect, it } from "vitest";
import { collisionsPossibles, type CarteJeu } from "@workspace/contenu";
import {
  calculerConstellation,
  type ReponseSource,
  type CarteJugee,
} from "../src/lib/constellation-engine";

const MENSONGE = "Dire la vérité";
const FAMILLE = "Ma responsabilité envers les miens";
const VOYAGE = "Découvrir des endroits";

const cartes: CarteJugee[] = [
  {
    carteId: "1",
    label: "Mentir à quelqu'un qui me fait confiance",
    famille: "lignes_rouges",
    valeursConfirmees: [MENSONGE],
  },
  {
    carteId: "2",
    label: "La sécurité de ma famille",
    famille: "tresors",
    valeursConfirmees: [FAMILLE],
  },
  {
    carteId: "3",
    label: "Voyager davantage",
    famille: "horizons",
    valeursConfirmees: [VOYAGE],
  },
];

const main: CarteJeu[] = cartes.map((c) => ({
  id: c.carteId,
  famille: c.famille,
  label: c.label,
  valeurs: c.valeursConfirmees,
}));

const collisions = collisionsPossibles(main);
const contre = (enjeuId: string) =>
  collisions.find((c) => c.enjeuId === enjeuId)!;

let prochainId = 1;

function reponse(enjeuId: string, choix: string): ReponseSource {
  const collision = contre(enjeuId);
  return {
    id: prochainId++,
    dilemmeId: collision.id,
    valeurA: collision.valeurA,
    valeurB: collision.valeurB,
    choix,
    facteurDepend: null,
    facteurDependLibre: null,
    difficulte: null,
    certitude: null,
    valeurProtegee: null,
    version: 1,
  };
}

const valeursConnues = [MENSONGE, FAMILLE, VOYAGE];

function calculer(reponses: ReponseSource[]) {
  return calculerConstellation({ reponses, valeursConnues, cartes });
}

function tendanceDe(
  resultat: { tendances: { valeur: string }[] },
  valeur: string,
) {
  return resultat.tendances.find((t) => t.valeur === valeur)!;
}

describe("partie vide", () => {
  const resultat = calculer([]);

  it("ne prétend rien sur des valeurs jamais mises à l'épreuve", () => {
    expect(tendanceDe(resultat, MENSONGE).territoireInexplore).toBe(true);
    expect(tendanceDe(resultat, MENSONGE).totalCollisions).toBe(0);
    expect(tendanceDe(resultat, MENSONGE).force).toBe(0);
  });

  it("ne pénalise pas une partie sans reprise", () => {
    expect(resultat.stabilite).toBe(1);
    expect(resultat.couverture).toBe(0);
  });

  it("expose la version de calcul", () => {
    expect(resultat.versionCalcul).toBe(4);
  });
});

describe("le sens d'une réponse", () => {
  it("fait gagner l'enjeu quand la limite est franchie", () => {
    const resultat = calculer([reponse("2", "A")]);

    expect(tendanceDe(resultat, FAMILLE).foisPrivilegiee).toBe(1);
    expect(tendanceDe(resultat, FAMILLE).foisCedee).toBe(0);
    expect(tendanceDe(resultat, MENSONGE).foisCedee).toBe(1);
    expect(tendanceDe(resultat, FAMILLE).force).toBeGreaterThan(
      tendanceDe(resultat, MENSONGE).force,
    );
  });

  it("fait tenir la limite quand elle ne se négocie pas", () => {
    const resultat = calculer([reponse("2", "B")]);

    expect(tendanceDe(resultat, MENSONGE).foisPrivilegiee).toBe(1);
    expect(tendanceDe(resultat, FAMILLE).foisCedee).toBe(1);
    expect(tendanceDe(resultat, MENSONGE).force).toBeGreaterThan(
      tendanceDe(resultat, FAMILLE).force,
    );
  });

  it("ne compte « ça dépend » comme victoire de personne", () => {
    const resultat = calculer([reponse("2", "ca_depend")]);

    expect(tendanceDe(resultat, MENSONGE).foisPrivilegiee).toBe(0);
    expect(tendanceDe(resultat, FAMILLE).foisPrivilegiee).toBe(0);
    expect(tendanceDe(resultat, MENSONGE).incertitudes).toBe(1);
  });

  it("ne tire rien d'une question passée", () => {
    const resultat = calculer([reponse("2", "passer")]);
    expect(tendanceDe(resultat, MENSONGE).totalCollisions).toBe(0);
  });
});

describe("ce que le moteur refuse de dire", () => {
  it("ne conclut jamais qu'une valeur ne compte pas", () => {
    // La limite cède deux fois : le pire cas pour elle.
    const resultat = calculer([reponse("2", "A"), reponse("3", "A")]);
    const textes = resultat.observations.map((o) => o.texte.toLowerCase());

    for (const texte of textes) {
      expect(texte).not.toContain("ne compte pas");
      expect(texte).not.toContain("pas important");
      expect(texte).not.toContain("moins important");
    }
  });

  it("ne parle pas de contradiction quand la limite cède ici et tient là", () => {
    const resultat = calculer([reponse("2", "B"), reponse("3", "A")]);

    for (const o of resultat.observations) {
      expect(o.texte.toLowerCase()).not.toContain("contradiction");
      expect(o.texte.toLowerCase()).not.toContain("incohérent");
    }
  });

  it("présente un ordre inversé comme une information de contexte", () => {
    // Tient devant la famille, cède devant le voyage : à rebours du poids des
    // enjeux tel que le reste de la partie l'établit.
    const resultat = calculer([reponse("2", "B"), reponse("3", "A")]);
    const bascule = resultat.bascules.find((b) => b.limiteId === "1");

    expect(bascule).toBeDefined();
    expect(bascule!.tientDevant).not.toBeNull();
    expect(bascule!.cedeDevant).not.toBeNull();
  });

  it("n'invente jamais la valeur protégée", () => {
    const resultat = calculer([reponse("2", "A")]);
    // Rien dans le moteur ne remplit ce champ : il ne vient que de la personne.
    expect(
      resultat.observations.some((o) => o.texte.includes("tu protégeais")),
    ).toBe(false);
  });
});

describe("les sources", () => {
  it("attache à chaque observation les réponses qui la fondent", () => {
    const reponses = [reponse("2", "A"), reponse("3", "A")];
    const resultat = calculer(reponses);
    const ids = new Set(reponses.map((r) => r.id));

    const tendance = resultat.observations.find((o) => o.type === "tendance");
    expect(tendance).toBeDefined();
    expect(tendance!.reponsesSources.length).toBeGreaterThan(0);
    for (const id of tendance!.reponsesSources) {
      expect(ids.has(id)).toBe(true);
    }
  });

  it("garde séparés les identifiants des deux tables", () => {
    const resultat = calculerConstellation({
      reponses: [reponse("2", "A")],
      valeursConnues,
      cartes,
      arbitrages: [
        {
          id: 900,
          bloc: 1,
          carteIds: ["1", "2", "3"],
          carteMeilleure: "2",
          cartePire: "3",
        },
      ],
    });

    const arbitrage = resultat.observations.find((o) => o.type === "arbitrage");
    expect(arbitrage).toBeDefined();
    expect(arbitrage!.arbitragesSources).toEqual([900]);
    expect(arbitrage!.reponsesSources).toEqual([]);
  });
});

describe("la couverture et la stabilité", () => {
  it("compte ce qui a été joué sur ce qui était possible", () => {
    const resultat = calculer([reponse("2", "A")]);
    expect(resultat.couverture).toBeCloseTo(1 / collisions.length, 6);
  });

  it("reste à 1 tant qu'aucun couple n'a été revu", () => {
    const resultat = calculer([reponse("2", "A"), reponse("3", "A")]);
    expect(resultat.stabilite).toBe(1);
  });

  it("mesure la stabilité sur un couple revu sous une autre carte", () => {
    // Deux essentiels portent la même valeur : le couple revient, autrement mis
    // en scène. C'est ainsi qu'on mesure la stabilité — sans jamais demander à
    // la personne si elle se trouve cohérente.
    const avecReprise: CarteJugee[] = [
      ...cartes,
      {
        carteId: "4",
        label: "Le toit au-dessus de la tête des miens",
        famille: "tresors",
        valeursConfirmees: [FAMILLE],
      },
    ];

    const main2 = avecReprise.map((c) => ({
      id: c.carteId,
      famille: c.famille,
      label: c.label,
      valeurs: c.valeursConfirmees,
    }));
    const toutes = collisionsPossibles(main2);
    const premiere = toutes.find((c) => c.enjeuId === "2")!;
    const seconde = toutes.find((c) => c.enjeuId === "4")!;

    const construire = (id: number, choix: string): ReponseSource => ({
      id: prochainId++,
      dilemmeId: id,
      valeurA: FAMILLE,
      valeurB: MENSONGE,
      choix,
      facteurDepend: null,
      facteurDependLibre: null,
      difficulte: null,
      certitude: null,
      valeurProtegee: null,
      version: 1,
    });

    const stable = calculerConstellation({
      reponses: [construire(premiere.id, "A"), construire(seconde.id, "A")],
      valeursConnues,
      cartes: avecReprise,
    });
    expect(stable.stabilite).toBe(1);

    const instable = calculerConstellation({
      reponses: [construire(premiere.id, "A"), construire(seconde.id, "B")],
      valeursConnues,
      cartes: avecReprise,
    });
    expect(instable.stabilite).toBe(0);
    expect(instable.observations.some((o) => o.type === "stabilite")).toBe(
      true,
    );
  });
});

describe("les points de bascule", () => {
  it("situe jusqu'où une limite tient", () => {
    const resultat = calculer([reponse("3", "B"), reponse("2", "A")]);
    const bascule = resultat.bascules.find((b) => b.limiteId === "1")!;

    expect(bascule.tientDevant).toBe("Voyager davantage");
    expect(bascule.cedeDevant).toBe("La sécurité de ma famille");
    expect(bascule.jamaisFranchie).toBe(false);
  });

  it("signale une limite qui n'a jamais cédé sans en faire une vertu", () => {
    const resultat = calculer([reponse("2", "B"), reponse("3", "B")]);
    const bascule = resultat.bascules.find((b) => b.limiteId === "1")!;

    expect(bascule.jamaisFranchie).toBe(true);

    const dite = resultat.observations.find((o) => o.type === "limite_tenue");
    expect(dite?.texte).toContain(
      "Ça ne veut pas dire qu'elle ne céderait jamais",
    );
  });
});
