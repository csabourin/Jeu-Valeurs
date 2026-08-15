import { describe, expect, it } from "vitest";
import { cartesParFamille } from "../src/catalogue";

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
  });
});
