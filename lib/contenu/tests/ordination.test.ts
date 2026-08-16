import { describe, expect, it } from "vitest";
import {
  observer,
  ordonner,
  mesurerTensions,
  trouverBascules,
  type Observation,
} from "../src/ordination";
import { collisionsPossibles, type CarteJeu } from "../src/collisions";

/** Fabrique une observation brute : `gagnante` est passée devant `perdante`. */
function obs(
  valeurEnjeu: string,
  valeurLimite: string,
  gagnante: string | null,
): Observation {
  return {
    valeurEnjeu,
    valeurLimite,
    gagnante,
    perdante:
      gagnante === null
        ? null
        : gagnante === valeurEnjeu
          ? valeurLimite
          : valeurEnjeu,
    indecise: gagnante === null,
    limiteId: `L-${valeurLimite}`,
    enjeuId: `E-${valeurEnjeu}`,
  };
}

function repeter(n: number, o: () => Observation): Observation[] {
  return Array.from({ length: n }, o);
}

describe("l'ordination Bradley–Terry", () => {
  it("ne classe rien sans observation", () => {
    expect(ordonner([])).toEqual([]);
  });

  it("classe le gagnant devant le perdant", () => {
    const classement = ordonner([
      obs("Ma santé", "Dire la vérité", "Ma santé"),
    ]);

    expect(classement[0].valeur).toBe("Ma santé");
    expect(classement[0].force).toBeGreaterThan(classement[1].force);
    expect(classement[0].gagnees).toBe(1);
    expect(classement[1].perdues).toBe(1);
  });

  it("donne plus de poids à une victoire contre une valeur forte", () => {
    // A bat B huit fois ; B bat C huit fois ; D bat C huit fois.
    // A et D ont le même nombre de victoires, mais A a battu plus fort que D.
    const observations = [
      ...repeter(8, () => obs("A", "B", "A")),
      ...repeter(8, () => obs("B", "C", "B")),
      ...repeter(8, () => obs("D", "C", "D")),
    ];

    const classement = ordonner(observations);
    const force = (v: string) => classement.find((r) => r.valeur === v)!.force;

    expect(force("A")).toBeGreaterThan(force("D"));
  });

  it("ne donne pas une force infinie à une valeur jamais battue", () => {
    const classement = ordonner(repeter(12, () => obs("A", "B", "A")));

    expect(Number.isFinite(classement[0].force)).toBe(true);
    expect(classement[0].force).toBeLessThan(100);
  });

  it("ramène vers le milieu une valeur peu jouée", () => {
    // A gagne une fois, X gagne dix fois : X doit passer devant.
    const observations = [
      obs("A", "B", "A"),
      ...repeter(10, () => obs("X", "Y", "X")),
    ];

    const classement = ordonner(observations);
    const force = (v: string) => classement.find((r) => r.valeur === v)!.force;

    expect(force("X")).toBeGreaterThan(force("A"));
  });

  it("traite un cycle comme une quasi-égalité, pas comme une faute", () => {
    // A > B, B > C, C > A : parfaitement humain.
    const classement = ordonner([
      ...repeter(4, () => obs("A", "B", "A")),
      ...repeter(4, () => obs("B", "C", "B")),
      ...repeter(4, () => obs("C", "A", "C")),
    ]);

    const forces = classement.map((r) => r.force);
    expect(Math.max(...forces) - Math.min(...forces)).toBeLessThan(0.2);
  });

  it("compte les indécises sans attribuer de victoire", () => {
    const classement = ordonner([obs("A", "B", null)]);

    expect(classement.every((r) => r.gagnees === 0)).toBe(true);
    expect(classement.every((r) => r.indecises === 1)).toBe(true);
    expect(classement[0].force).toBeCloseTo(classement[1].force, 6);
  });

  it("fait partager le rang aux ex æquo", () => {
    const classement = ordonner([obs("A", "B", null)]);
    expect(classement[0].rang).toBe(1);
    expect(classement[1].rang).toBe(1);
  });
});

describe("la lecture des réponses", () => {
  const cartes: CarteJeu[] = [
    {
      id: "1",
      famille: "lignes_rouges",
      label: "Mentir à quelqu'un qui me fait confiance",
      valeurs: ["Dire la vérité"],
    },
    {
      id: "2",
      famille: "tresors",
      label: "La sécurité de ma famille",
      valeurs: ["Ma responsabilité envers les miens"],
    },
    {
      id: "3",
      famille: "horizons",
      label: "Voyager davantage",
      valeurs: ["Découvrir des endroits"],
    },
  ];

  const collisions = collisionsPossibles(cartes);

  it("enregistre une victoire de valeur, pas de carte", () => {
    const familiale = collisions.find((c) => c.enjeuId === "2")!;
    const observations = observer(collisions, [
      { dilemmeId: familiale.id, choix: "A" },
    ]);

    expect(observations).toHaveLength(1);
    expect(observations[0].gagnante).toBe("Ma responsabilité envers les miens");
    expect(observations[0].perdante).toBe("Dire la vérité");
  });

  it("ne tire rien d'une question passée", () => {
    expect(
      observer(collisions, [{ dilemmeId: collisions[0].id, choix: "passer" }]),
    ).toHaveLength(0);
  });

  it("garde « ça dépend » comme rencontre sans vainqueur", () => {
    const observations = observer(collisions, [
      { dilemmeId: collisions[0].id, choix: "ca_depend" },
    ]);

    expect(observations[0].indecise).toBe(true);
    expect(observations[0].gagnante).toBeNull();
  });
});

describe("les points de bascule", () => {
  const cartes: CarteJeu[] = [
    {
      id: "1",
      famille: "lignes_rouges",
      label: "Mentir à quelqu'un qui me fait confiance",
      valeurs: ["Dire la vérité"],
    },
    {
      id: "2",
      famille: "tresors",
      label: "La sécurité de ma famille",
      valeurs: ["Ma responsabilité envers les miens"],
    },
    {
      id: "3",
      famille: "horizons",
      label: "Voyager davantage",
      valeurs: ["Découvrir des endroits"],
    },
  ];

  const collisions = collisionsPossibles(cartes);
  const pourEnjeu = (id: string) => collisions.find((c) => c.enjeuId === id)!;

  it("situe la frontière entre ce qui fait céder et ce qui ne fait pas céder", () => {
    // La limite tient devant le voyage, cède devant la sécurité des proches.
    const reponses = [
      { dilemmeId: pourEnjeu("3").id, choix: "B" },
      { dilemmeId: pourEnjeu("2").id, choix: "A" },
    ];

    const classement = ordonner(observer(collisions, reponses));
    const [bascule] = trouverBascules(collisions, reponses, classement);

    expect(bascule.limiteLabel).toBe(
      "Mentir à quelqu'un qui me fait confiance",
    );
    expect(bascule.tientDevant?.enjeuLabel).toBe("Voyager davantage");
    expect(bascule.cedeDevant?.enjeuLabel).toBe("La sécurité de ma famille");
    expect(bascule.jamaisFranchie).toBe(false);
    expect(bascule.toujoursFranchie).toBe(false);
  });

  it("signale une limite qui n'a jamais cédé", () => {
    const reponses = [
      { dilemmeId: pourEnjeu("3").id, choix: "B" },
      { dilemmeId: pourEnjeu("2").id, choix: "B" },
    ];

    const classement = ordonner(observer(collisions, reponses));
    const [bascule] = trouverBascules(collisions, reponses, classement);

    expect(bascule.jamaisFranchie).toBe(true);
    expect(bascule.cedeDevant).toBeNull();
  });

  it("relève un ordre inversé sans le traiter comme une faute", () => {
    // Il faut d'autres limites pour établir le poids des enjeux : un ordre ne
    // peut être « inversé » que par rapport à un classement que cette limite-ci
    // n'a pas fabriquée toute seule.
    const main: CarteJeu[] = [
      ...cartes,
      {
        id: "4",
        famille: "lignes_rouges",
        label: "Sacrifier tout mon temps libre",
        valeurs: ["Avoir du temps à moi"],
      },
      {
        id: "5",
        famille: "lignes_rouges",
        label: "Passer outre une règle qu'on m'a donnée",
        valeurs: ["Suivre les règles"],
      },
    ];

    const toutes = collisionsPossibles(main);
    const entre = (limiteId: string, enjeuId: string) =>
      toutes.find((c) => c.limiteId === limiteId && c.enjeuId === enjeuId)!;

    const reponses = [
      // Deux autres limites cèdent devant la sécurité familiale et tiennent
      // devant le voyage : la famille pèse lourd, le voyage pèse peu.
      { dilemmeId: entre("4", "2").id, choix: "A" },
      { dilemmeId: entre("4", "3").id, choix: "B" },
      { dilemmeId: entre("5", "2").id, choix: "A" },
      { dilemmeId: entre("5", "3").id, choix: "B" },
      // Celle-ci fait l'inverse : elle tient devant le lourd, cède devant le léger.
      { dilemmeId: entre("1", "2").id, choix: "B" },
      { dilemmeId: entre("1", "3").id, choix: "A" },
    ];

    const classement = ordonner(observer(toutes, reponses));
    const force = (v: string) => classement.find((r) => r.valeur === v)!.force;
    expect(force("Découvrir des endroits")).toBeLessThan(
      force("Ma responsabilité envers les miens"),
    );

    const bascules = trouverBascules(toutes, reponses, classement);
    const mensonge = bascules.find(
      (b) => b.limiteLabel === "Mentir à quelqu'un qui me fait confiance",
    )!;

    expect(mensonge.ordreInverse).toBe(true);
    // Les deux autres limites suivent le poids des enjeux : rien à signaler.
    expect(bascules.filter((b) => b.ordreInverse)).toHaveLength(1);
  });
});

describe("les tensions", () => {
  it("ne se prononce pas sur la stabilité avant deux réponses tranchées", () => {
    const [tension] = mesurerTensions([obs("A", "B", "A")]);
    expect(tension.stable).toBeNull();
  });

  it("dit stable quand l'ordre tient d'une carte à l'autre", () => {
    const [tension] = mesurerTensions([obs("A", "B", "A"), obs("A", "B", "A")]);
    expect(tension.stable).toBe(true);
  });

  it("dit instable quand la réponse change", () => {
    const [tension] = mesurerTensions([obs("A", "B", "A"), obs("A", "B", "B")]);
    expect(tension.stable).toBe(false);
  });
});
