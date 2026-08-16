import { describe, expect, it } from "vitest";
import {
  distanceValeurs,
  peutOpposer,
  peutEntrerEnCollision,
} from "../src/eligibilite";
import { situerValeur, valeursFines } from "../src/lexique";

describe("le lexique", () => {
  it("situe une valeur fine sous sa famille et son domaine", () => {
    const noeud = situerValeur("Ne rien devoir à personne");
    expect(noeud.niveau).toBe("fine");
    expect(noeud.famille).toBe("Autonomie");
    expect(noeud.domaine).toBe("ouverture");
  });

  it("situe une famille sans inventer de valeur fine", () => {
    const noeud = situerValeur("Autonomie");
    expect(noeud.niveau).toBe("famille");
    expect(noeud.famille).toBe("Autonomie");
  });

  it("laisse une valeur écrite à la main sans parenté", () => {
    const noeud = situerValeur("Ma passion pour la lutherie");
    expect(noeud.niveau).toBe("libre");
    expect(noeud.famille).toBeNull();
    expect(noeud.domaine).toBeNull();
  });

  it("ne rattache aucune valeur fine à une famille inconnue", () => {
    for (const fine of valeursFines) {
      expect(situerValeur(fine.famille).niveau).toBe("famille");
    }
  });

  it("ne donne jamais deux fois le même libellé", () => {
    const labels = valeursFines.map((v) => v.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("ne déclare que des voisines qui existent", () => {
    const connus = new Set(valeursFines.map((v) => v.label));
    for (const fine of valeursFines) {
      for (const voisine of fine.voisines) {
        expect(connus.has(voisine), `${fine.label} → ${voisine}`).toBe(true);
      }
    }
  });

  it("ne déclare de tension qu'à l'intérieur d'une même famille", () => {
    const parLabel = new Map(valeursFines.map((v) => [v.label, v]));
    for (const fine of valeursFines) {
      for (const tension of fine.tensions) {
        expect(
          parLabel.get(tension)?.famille,
          `${fine.label} → ${tension}`,
        ).toBe(fine.famille);
      }
    }
  });
});

describe("l'éligibilité d'une collision", () => {
  it("refuse la même valeur des deux côtés", () => {
    expect(distanceValeurs("Autonomie", "Autonomie")).toBe("identique");
    expect(peutOpposer("Autonomie", "Autonomie").admissible).toBe(false);
  });

  it("refuse une valeur fine contre sa propre famille", () => {
    // « Sacrifier ton autonomie pour préserver ne rien devoir à personne. »
    expect(distanceValeurs("Ne rien devoir à personne", "Autonomie")).toBe(
      "identique",
    );
    expect(
      peutOpposer("Ne rien devoir à personne", "Autonomie").admissible,
    ).toBe(false);
  });

  it("refuse deux valeurs déclarées voisines, même de familles différentes", () => {
    // Le cas qui a rendu le problème visible : « perdre ma liberté de décision
    // pour préserver mon indépendance personnelle ».
    expect(situerValeur("Liberté de choix").famille).toBe("Liberté");
    expect(situerValeur("Indépendance personnelle").famille).toBe("Autonomie");
    expect(
      distanceValeurs("Liberté de choix", "Indépendance personnelle"),
    ).toBe("voisine");
    expect(
      peutOpposer("Liberté de choix", "Indépendance personnelle").admissible,
    ).toBe(false);
  });

  it("refuse deux valeurs d'une même famille sans tension déclarée", () => {
    const verdict = peutOpposer("Apprendre", "Comprendre les gens");
    expect(verdict.distance).toBe("meme_famille");
    expect(verdict.admissible).toBe(false);
  });

  it("accepte deux valeurs d'une même famille quand la tension est déclarée", () => {
    const verdict = peutOpposer(
      "Traiter tout le monde pareil",
      "Défendre les plus faibles",
    );
    expect(verdict.distance).toBe("meme_famille");
    expect(verdict.admissible).toBe(true);
  });

  it("accepte deux valeurs de familles distinctes", () => {
    const verdict = peutOpposer("Dire la vérité", "Le lien avec mes proches");
    expect(verdict.admissible).toBe(true);
  });

  it("accepte une valeur écrite à la main contre n'importe quoi", () => {
    // Rien ne permet d'affirmer qu'elle est proche d'autre chose.
    expect(
      peutOpposer("Ma passion pour la lutherie", "Autonomie").admissible,
    ).toBe(true);
  });
});

describe("l'éligibilité entre deux cartes", () => {
  it("refuse dès qu'un seul couple de valeurs est circulaire", () => {
    // La limite protège l'honnêteté *et* l'autonomie ; l'enjeu porte
    // l'autonomie. La question redevient « sacrifier X pour préserver X ».
    const verdict = peutEntrerEnCollision(
      ["Dire la vérité", "Ne rien devoir à personne"],
      ["Autonomie"],
    );
    expect(verdict.admissible).toBe(false);
  });

  it("accepte quand aucun couple n'est circulaire", () => {
    const verdict = peutEntrerEnCollision(
      ["Dire la vérité"],
      ["Le lien avec mes proches", "Ma santé"],
    );
    expect(verdict.admissible).toBe(true);
  });

  it("refuse une carte sans valeur nommée", () => {
    expect(peutEntrerEnCollision([], ["Ma santé"]).admissible).toBe(false);
  });

  it("retient la distance du couple le plus proche", () => {
    // Entre deux couples admissibles, c'est le plus serré qui décrit la tension.
    // « Ma santé » est d'un autre domaine, « Prendre soin » du même :
    // c'est cette deuxième proximité qui qualifie la collision.
    const verdict = peutEntrerEnCollision(
      ["Dire la vérité"],
      ["Ma santé", "Prendre soin"],
    );
    expect(verdict.admissible).toBe(true);
    expect(verdict.distance).toBe("meme_domaine");
  });
});
