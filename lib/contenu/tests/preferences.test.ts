/**
 * L'ordination doit rester honnête sur ce qu'elle sait.
 *
 * Ce qui est testé ici, ce sont les quatre promesses du modèle :
 * tenir compte de la force des adversaires, garder finie la force d'une valeur
 * jamais battue, survivre aux cycles, et dire son incertitude.
 */

import { describe, expect, it } from "vitest";
import { ajusterModele } from "../src/preferences";
import type { Comparaison } from "../src/comparaisons";

function c(
  valeurA: string,
  valeurB: string,
  choix: Comparaison["choix"] = "A",
  cartes: [string | null, string | null] = [null, null],
): Comparaison {
  return {
    valeurA,
    valeurB,
    carteA: cartes[0],
    carteB: cartes[1],
    choix,
    contexte: null,
    phase: "ordination",
  };
}

const force = (o: ReturnType<typeof ajusterModele>, valeur: string) =>
  o.forces.find((f) => f.valeur === valeur)!;

describe("force relative", () => {
  it("classe une valeur qui bat une valeur forte devant une qui bat une faible", () => {
    const o = ajusterModele([
      c("A", "B"), // A > B
      c("B", "C"), // B > C
      c("D", "C"), // D > C
    ]);
    // A a battu B (qui a gagné), D n'a battu que C (qui a perdu partout).
    expect(force(o, "A").force).toBeGreaterThan(force(o, "D").force);
  });

  it("centre les forces sur zéro", () => {
    const o = ajusterModele([c("A", "B"), c("B", "C")]);
    const somme = o.forces.reduce((s, f) => s + f.force, 0);
    expect(Math.abs(somme)).toBeLessThan(1e-6);
  });

  it("garde finie la force d'une valeur jamais secondaire", () => {
    const o = ajusterModele([c("A", "B"), c("A", "B"), c("A", "B")]);
    expect(Number.isFinite(force(o, "A").force)).toBe(true);
    expect(force(o, "A").jamaisSecondaire).toBe(true);
  });
});

describe("réponses indécises", () => {
  it("traite « ça dépend » comme une demi-victoire de chaque côté", () => {
    const o = ajusterModele([c("A", "B", "ca_depend")]);
    expect(force(o, "A").force).toBeCloseTo(force(o, "B").force);
    expect(force(o, "A").indecis).toBe(1);
    expect(force(o, "A").foisPrioritaire).toBe(0);
  });

  it("écarte les questions passées", () => {
    const o = ajusterModele([c("A", "B", "passer")]);
    expect(force(o, "A").comparaisons).toBe(0);
    expect(force(o, "A").niveauConfiance).toBe("territoire_peu_explore");
  });
});

describe("cycles", () => {
  const o = ajusterModele([c("A", "B"), c("B", "C"), c("C", "A")]);

  it("les repère au lieu de les aplatir", () => {
    expect(o.cycles).toHaveLength(1);
    expect(o.ordreNet).toBe(false);
  });

  it("laisse les trois valeurs à égalité", () => {
    expect(force(o, "A").force).toBeCloseTo(force(o, "B").force);
    expect(force(o, "B").force).toBeCloseTo(force(o, "C").force);
    expect(force(o, "A").rang).toBe(force(o, "C").rang);
  });
});

describe("incertitude et niveau de confiance", () => {
  it("part de « territoire peu exploré » quand rien n'a été joué", () => {
    const o = ajusterModele([], ["A", "B"]);
    expect(force(o, "A").niveauConfiance).toBe("territoire_peu_explore");
    expect(force(o, "A").comparaisons).toBe(0);
  });

  it("resserre l'intervalle à mesure que les comparaisons s'accumulent", () => {
    const peu = ajusterModele([c("A", "B")]);
    const beaucoup = ajusterModele(
      Array.from({ length: 6 }, () => c("A", "B")),
    );
    expect(force(beaucoup, "A").incertitude).toBeLessThan(
      force(peu, "A").incertitude,
    );
  });

  it("ne parle de tendance forte qu'après plusieurs comparaisons cohérentes", () => {
    const une = ajusterModele([c("A", "B")]);
    expect(une.forces[0].niveauConfiance).not.toBe("tendance_forte");

    const plusieurs = ajusterModele([
      c("A", "B"),
      c("A", "C"),
      c("A", "D"),
      c("A", "B"),
      c("A", "C"),
    ]);
    expect(force(plusieurs, "A").niveauConfiance).toBe("tendance_forte");
  });
});

describe("relations entre paires", () => {
  it("compte les manifestations distinctes d'une même tension", () => {
    const o = ajusterModele([
      c("A", "B", "A", ["c1", "c2"]),
      c("A", "B", "A", ["c3", "c4"]),
    ]);
    const relation = o.relations[0];
    expect(relation.comparaisons).toBe(2);
    expect(relation.manifestations).toBe(2);
    expect(relation.variable).toBe(false);
  });

  it("signale une paire dont la réponse a changé", () => {
    const o = ajusterModele([
      c("A", "B", "A", ["c1", "c2"]),
      c("A", "B", "B", ["c3", "c4"]),
    ]);
    expect(o.relations[0].variable).toBe(true);
    expect(o.relations[0].prioritaire).toBeNull();
  });

  it("donne une probabilité cohérente avec les forces", () => {
    const o = ajusterModele([c("A", "B"), c("A", "B")]);
    expect(o.relations[0].probabilite).toBeGreaterThan(0.5);
  });
});

describe("valeurs actives sans comparaison", () => {
  it("les fait figurer quand même dans l'ordination", () => {
    const o = ajusterModele([c("A", "B")], ["A", "B", "Z"]);
    expect(o.forces.map((f) => f.valeur)).toContain("Z");
    expect(force(o, "Z").comparaisons).toBe(0);
  });
});
