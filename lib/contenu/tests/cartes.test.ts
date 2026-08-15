import { describe, expect, it } from "vitest";
import { cartesParFamille, distribuerCartes } from "../src/catalogue";
import { limitesSaillantesIds } from "../src/limites-simples";

describe("les limites", () => {
  const limites = cartesParFamille("lignes_rouges");

  it("nomment l'acte sans description circonstancielle", () => {
    expect(limites.every((carte) => carte.description === null)).toBe(true);
  });

  it("ne contiennent pas de proposition introduite par « pour »", () => {
    const avecCondition = limites.filter((carte) =>
      /\bpour\b/i.test(carte.label),
    );
    expect(avecCondition).toEqual([]);
  });

  it("utilisent les formulations directes de référence", () => {
    const parId = new Map(limites.map((carte) => [carte.id, carte.label]));

    expect(parId.get("LR082")).toBe("Abandonner ma langue");
    expect(parId.get("LR097")).toBe("Renoncer à mes convictions");
    expect(parId.get("JV1034")).toBe("Signer un faux document");
    expect(parId.get("JV1022")).toBe("Voler");
    expect(parId.get("LR193")).toBe("M'approprier le bien commun");
    expect(parId.get("JV1036")).toBe("Tuer quelqu'un");
    expect(parId.get("JV1037")).toBe("Me prostituer");
    expect(parId.get("JV1049")).toBe(
      "Laisser mon panier d'épicerie au milieu du stationnement",
    );
  });

  it("propose plusieurs limites saillantes dans chaque main", () => {
    for (const graine of [0, 1, 42, 2024]) {
      const saillantes = distribuerCartes(graine).filter(
        (carte) =>
          carte.famille === "lignes_rouges" &&
          limitesSaillantesIds.has(carte.id),
      );

      expect(saillantes.length).toBeGreaterThanOrEqual(3);
    }
  });
});
