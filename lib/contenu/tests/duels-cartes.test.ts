/**
 * Les duels générés à partir des cartes de la personne.
 *
 * Deux garanties, et elles se cassent en silence :
 *
 *   • aucun duel ne mélange « je » et « tu » — c'est exactement le défaut de la
 *     formulation « Serais-**tu** prêt à mentir à quelqu'un qui **me** fait
 *     confiance ? », où on ne sait plus qui parle ;
 *   • aucun duel n'oppose deux cartes qui portent la même valeur.
 */

import { describe, expect, it } from "vitest";
import {
  duelsCartesPossibles,
  duelsCartesPourPaire,
  estDuelCarte,
  pairesJouables,
  type CarteDuel,
} from "../src/duels-cartes";
import { personneCoherente, analyserFormulation } from "../src/formulation";
import { clePaire } from "../src/comparaisons";

const cartes: CarteDuel[] = [
  {
    id: "1",
    famille: "lignes_rouges",
    label: "Mentir à quelqu'un qui me fait confiance",
    valeursConfirmees: ["Honnêteté"],
  },
  {
    id: "2",
    famille: "lignes_rouges",
    label: "Laisser tomber un ami à la dernière minute",
    valeursConfirmees: ["Loyauté"],
  },
  {
    id: "3",
    famille: "horizons",
    label: "Devenir vraiment bon dans mon métier",
    valeursConfirmees: ["Réussite"],
  },
  {
    id: "4",
    famille: "tresors",
    label: "Le calme quand je rentre chez moi",
    valeursConfirmees: ["Tranquillité"],
  },
  // Même valeur que la carte 1 : ne doit jamais l'affronter.
  {
    id: "5",
    famille: "lignes_rouges",
    label: "Cacher une erreur qui a coûté cher",
    valeursConfirmees: ["Honnêteté"],
  },
];

const duels = duelsCartesPossibles(cartes);

describe("génération", () => {
  it("produit au moins un duel par paire de valeurs distinctes", () => {
    expect(duels.length).toBeGreaterThan(0);
    expect(pairesJouables(duels).length).toBeGreaterThan(1);
  });

  it("n'oppose jamais deux cartes qui portent la même valeur", () => {
    for (const duel of duels) {
      expect(duel.valeurA).not.toBe(duel.valeurB);
      const cartesEnJeu = [duel.carteAId, duel.carteBId].sort().join("|");
      expect(cartesEnJeu).not.toBe("1|5");
    }
  });

  it("donne des identifiants stables et distincts", () => {
    const encore = duelsCartesPossibles(cartes);
    expect(duels.map((d) => d.id)).toEqual(encore.map((d) => d.id));
    expect(new Set(duels.map((d) => d.id)).size).toBe(duels.length);
    for (const duel of duels) expect(estDuelCarte(duel.id)).toBe(true);
  });

  it("ne dépend pas de l'ordre des cartes reçues", () => {
    const inverse = duelsCartesPossibles([...cartes].reverse());
    expect(new Set(inverse.map((d) => d.id))).toEqual(
      new Set(duels.map((d) => d.id)),
    );
  });
});

describe("formulation", () => {
  it("ne mélange jamais « je » et « tu » dans un même duel", () => {
    for (const duel of duels) {
      expect(
        personneCoherente([duel.situation, duel.optionA, duel.optionB]),
      ).toBe(true);
    }
  });

  it("ne produit aucun défaut de formulation ferme", () => {
    for (const duel of duels) {
      for (const texte of [duel.situation, duel.optionA, duel.optionB]) {
        const fermes = analyserFormulation(texte).filter(
          (d) => d.gravite === "erreur",
        );
        expect(fermes).toEqual([]);
      }
    }
  });

  it("met l'enjeu du côté A dans un duel limite/enjeu", () => {
    const duel = duels.find((d) => d.forme === "limite_enjeu")!;
    expect(duel.situation.startsWith("Pour ")).toBe(true);
    expect(duel.optionA).toBe("Je le fais.");
    expect(duel.optionB).toBe("Je ne le fais pas.");
  });

  it("n'oppose jamais deux limites ni deux enjeux", () => {
    // Le mécanisme est asymétrique : une limite en face d'un enjeu, et rien
    // d'autre. Opposer deux cartes du même rôle remplirait la matrice plus
    // vite, mais ferait un tournoi de cartes au lieu d'explorer un prix.
    const role = (id: string) => cartes.find((c) => c.id === id)!.famille;
    const estEnjeu = (id: string) =>
      role(id) === "horizons" || role(id) === "tresors";

    expect(duels.length).toBeGreaterThan(0);
    for (const duel of duels) {
      expect(duel.forme).toBe("limite_enjeu");
      // A porte toujours l'enjeu, B toujours la limite.
      expect(estEnjeu(duel.carteAId)).toBe(true);
      expect(role(duel.carteBId)).toBe("lignes_rouges");
    }
  });

  it("ne sert aucune paire que seules deux cartes du même rôle porteraient", () => {
    // Deux limites entre elles : rien à jouer, même si les valeurs seraient
    // parfaitement admissibles l'une à l'autre.
    const deuxLimites: CarteDuel[] = [
      cartes.find((c) => c.id === "1")!,
      cartes.find((c) => c.id === "2")!,
    ];
    expect(duelsCartesPossibles(deuxLimites)).toEqual([]);

    const deuxEnjeux: CarteDuel[] = [
      cartes.find((c) => c.id === "3")!,
      cartes.find((c) => c.id === "4")!,
    ];
    expect(duelsCartesPossibles(deuxEnjeux)).toEqual([]);
  });
});

describe("plusieurs manifestations d'une même tension", () => {
  it("sert la même paire de valeurs par des cartes différentes", () => {
    const main: CarteDuel[] = [
      ...cartes,
      {
        id: "6",
        famille: "horizons",
        label: "Prendre une année pour moi",
        valeursConfirmees: ["Tranquillité"],
      },
    ];
    const tous = duelsCartesPossibles(main);
    const paire = duelsCartesPourPaire(tous, "Honnêteté", "Tranquillité");
    expect(paire.length).toBeGreaterThan(1);
    // Deux formes différentes de la même tension : ce sont bien les cartes qui
    // changent, pas la paire de valeurs.
    const cles = new Set(paire.map((d) => clePaire(d.valeurA, d.valeurB)));
    expect(cles.size).toBe(1);
    expect(new Set(paire.map((d) => d.carteAId + d.carteBId)).size).toBe(
      paire.length,
    );
  });
});

describe("cartes sans valeur confirmée", () => {
  it("les laisse de côté plutôt que de deviner", () => {
    const sansValeur = duelsCartesPossibles([
      cartes[0],
      {
        id: "9",
        famille: "horizons",
        label: "Quelque chose",
        valeursConfirmees: [],
      },
    ]);
    expect(sansValeur).toEqual([]);
  });
});
