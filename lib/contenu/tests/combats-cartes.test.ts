import { describe, expect, it } from "vitest";
import {
  combatsCartesPossibles,
  planifierCombatsCartes,
  type CarteCombat,
} from "../src/combats-cartes";
import { calculerParcours } from "../src/parcours";

const cartes: CarteCombat[] = [
  {
    id: "1",
    famille: "lignes_rouges",
    label: "Voler",
    valeursConfirmees: ["Honnêteté"],
  },
  {
    id: "2",
    famille: "lignes_rouges",
    label: "Signer un faux document",
    valeursConfirmees: ["Honnêteté"],
  },
  {
    id: "3",
    famille: "horizons",
    label: "Nourrir ma famille",
    valeursConfirmees: ["Famille"],
  },
  {
    id: "4",
    famille: "horizons",
    label: "Enrichir ma famille",
    valeursConfirmees: ["Réussite"],
  },
  {
    id: "5",
    famille: "tresors",
    label: "Ma relation avec mes proches",
    valeursConfirmees: ["Loyauté"],
  },
];

describe("les combats entre cartes", () => {
  it("oppose une limite à ce qu'on veut obtenir ou garder", () => {
    const possibles = combatsCartesPossibles(cartes);

    expect(possibles.map((combat) => combat.situation)).toContain(
      "Serais-tu prêt à voler pour nourrir ma famille ?",
    );
    expect(possibles.map((combat) => combat.situation)).toContain(
      "Serais-tu prêt à voler pour garder ma relation avec mes proches ?",
    );
  });

  it("fait du oui la protection de l'enjeu et du non la protection de la limite", () => {
    const combat = combatsCartesPossibles(cartes).find(
      (c) => c.limiteId === "1" && c.enjeuId === "3",
    )!;

    expect(combat.valeurA).toBe("Famille");
    expect(combat.valeurB).toBe("Honnêteté");
    expect(combat.optionA).toContain("Oui");
    expect(combat.optionB).toContain("Non");
  });

  it("reprend immédiatement une même limite avec un nouvel enjeu", () => {
    const plan = planifierCombatsCartes(cartes, 42);
    const premiereBascule = plan.findIndex((combat) => combat.variante);

    expect(premiereBascule).toBeGreaterThan(0);
    expect(plan[premiereBascule - 1].limiteId).toBe(
      plan[premiereBascule].limiteId,
    );
    expect(plan[premiereBascule - 1].enjeuId).not.toBe(
      plan[premiereBascule].enjeuId,
    );
  });

  it("garde des identifiants stables et uniques", () => {
    const a = combatsCartesPossibles(cartes);
    const b = combatsCartesPossibles([...cartes].reverse());

    expect(a.map((c) => c.id)).toEqual(b.map((c) => c.id));
    expect(new Set(a.map((c) => c.id)).size).toBe(a.length);
  });

  it("devient la mécanique principale du parcours", () => {
    const selection = [cartes[0], cartes[2]];
    const depart = calculerParcours({
      valeursConfirmees: ["Honnêteté", "Famille"],
      reponses: [],
      cartes: selection,
      graine: 7,
    });

    expect(depart.phase).toBe("duels");
    expect(depart.prochaine?.situation).toBe(
      "Serais-tu prêt à voler pour nourrir ma famille ?",
    );

    const fin = calculerParcours({
      valeursConfirmees: ["Honnêteté", "Famille"],
      cartes: selection,
      graine: 7,
      reponses: [
        {
          dilemmeId: depart.prochaine!.dilemmeId,
          valeurA: depart.prochaine!.valeurA,
          valeurB: depart.prochaine!.valeurB,
          choix: "B",
        },
      ],
    });
    expect(fin.phase).toBe("termine");
  });
});
