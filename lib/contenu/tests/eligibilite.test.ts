/**
 * Le garde-fou contre les faux duels.
 *
 * Un faux duel coûte plus cher qu'une question en moins : il apprend à la
 * personne que le jeu ne comprend pas ce qu'elle dit. Ce qui est testé ici,
 * c'est que l'admissibilité ne se réduit **jamais** à « les deux libellés sont
 * différents ».
 */

import { describe, expect, it } from "vitest";
import {
  memeIdeeNiee,
  paireAdmissible,
  pairesAdmissibles,
  duelCartesAdmissible,
  pairesExclues,
} from "../src/eligibilite";
import { valeurs } from "../src/valeurs";
import { famillesValeurs } from "../src/taxonomie";

describe("paireAdmissible", () => {
  it("refuse une valeur contre elle-même", () => {
    const r = paireAdmissible("Autonomie", "Autonomie");
    expect(r.admissible).toBe(false);
    expect(r.raison).toBe("meme_valeur");
  });

  it("refuse deux quasi-synonymes, dans les deux sens", () => {
    expect(paireAdmissible("Autonomie", "Indépendance").raison).toBe(
      "quasi_synonymes",
    );
    expect(paireAdmissible("Indépendance", "Autonomie").raison).toBe(
      "quasi_synonymes",
    );
  });

  it("refuse deux valeurs de la même famille sans tension déclarée", () => {
    const r = paireAdmissible("Vie privée", "Liberté de choix");
    expect(r.admissible).toBe(false);
    expect(r.raison).toBe("meme_famille_sans_tension");
  });

  it("accepte deux valeurs de la même famille qui s'opposent vraiment", () => {
    // Déclarée dans `tensionsInternes` : se garder pour soi contre tout dire.
    expect(paireAdmissible("Vie privée", "Liberté d'expression").admissible).toBe(
      true,
    );
    expect(paireAdmissible("Justice", "Égalité").admissible).toBe(true);
  });

  it("accepte deux familles distinctes", () => {
    expect(paireAdmissible("Autonomie", "Loyauté").admissible).toBe(true);
  });

  it("respecte la liste des paires écartées à la main", () => {
    for (const [a, b] of pairesExclues) {
      const r = paireAdmissible(a, b);
      expect(r.admissible).toBe(false);
    }
  });

  it("laisse passer une valeur écrite par la personne, faute de mieux", () => {
    // La taxonomie ne sait rien d'elle : le doute profite au duel.
    expect(paireAdmissible("Pouvoir dormir la nuit", "Loyauté").admissible).toBe(
      true,
    );
  });
});

describe("une idée et sa négation", () => {
  it("reconnaît le même noyau à une négation près", () => {
    expect(
      memeIdeeNiee("Perdre mon autonomie", "Ne pas perdre mon autonomie"),
    ).toBe(true);
    expect(memeIdeeNiee("Garder mon travail", "Ne plus avoir mon travail")).toBe(
      false,
    );
  });

  it("refuse le duel entre une idée et sa négation, même écrites à la main", () => {
    const r = paireAdmissible(
      "Perdre mon autonomie",
      "Ne pas perdre mon autonomie",
    );
    expect(r.admissible).toBe(false);
    expect(r.raison).toBe("meme_idee_niee");
  });

  it("ne confond pas deux idées différentes", () => {
    expect(memeIdeeNiee("Répéter un secret", "Garder mon travail")).toBe(false);
  });
});

describe("duelCartesAdmissible", () => {
  const carte = (
    id: string,
    label: string,
    valeurs: string[],
  ): { id: string; label: string; valeursConfirmees: string[] } => ({
    id,
    label,
    valeursConfirmees: valeurs,
  });

  it("refuse une carte contre elle-même", () => {
    const c = carte("1", "Mentir", ["Honnêteté"]);
    expect(duelCartesAdmissible(c, c).raison).toBe("meme_carte");
  });

  it("refuse deux cartes qui portent la même valeur", () => {
    const r = duelCartesAdmissible(
      carte("1", "Mentir à un ami", ["Honnêteté"]),
      carte("2", "Cacher une erreur au travail", ["Honnêteté"]),
    );
    expect(r.admissible).toBe(false);
    expect(r.raison).toBe("meme_valeur");
  });

  it("refuse deux cartes dont les valeurs sont quasi synonymes", () => {
    const r = duelCartesAdmissible(
      carte("1", "Ne dépendre de personne", ["Indépendance"]),
      carte("2", "Pouvoir décider de ma propre vie", ["Autonomie"]),
    );
    expect(r.admissible).toBe(false);
  });

  it("refuse une carte sans valeur confirmée", () => {
    const r = duelCartesAdmissible(
      carte("1", "Mentir à un ami", ["Honnêteté"]),
      carte("2", "Quelque chose", []),
    );
    expect(r.admissible).toBe(false);
  });

  it("accepte deux cartes qui portent des valeurs vraiment distinctes", () => {
    expect(
      duelCartesAdmissible(
        carte("1", "Mentir à un ami", ["Honnêteté"]),
        carte("2", "Garder mon travail", ["Sécurité"]),
      ).admissible,
    ).toBe(true);
  });
});

describe("pairesAdmissibles", () => {
  it("part de n(n−1)/2 et retire ce que les règles refusent", () => {
    const liste = ["Autonomie", "Indépendance", "Loyauté", "Sécurité"];
    const paires = pairesAdmissibles(liste);
    const total = (liste.length * (liste.length - 1)) / 2;
    expect(paires.length).toBeLessThan(total);
    expect(
      paires.some(
        ([a, b]) =>
          (a === "Autonomie" && b === "Indépendance") ||
          (a === "Indépendance" && b === "Autonomie"),
      ),
    ).toBe(false);
  });

  it("ne rend jamais deux fois la même paire", () => {
    const paires = pairesAdmissibles(valeurs.map((v) => v.label));
    const cles = paires.map(([a, b]) => [a, b].sort().join("|"));
    expect(new Set(cles).size).toBe(cles.length);
  });
});

describe("cohérence de la taxonomie", () => {
  it("place chaque valeur dans une famille connue", () => {
    const connues = new Set(famillesValeurs.map((f) => f.id));
    for (const valeur of valeurs) {
      expect(connues).toContain(valeur.familleValeur);
    }
  });

  it("ne déclare des tensions internes qu'entre valeurs de la famille", () => {
    const parLabel = new Map(valeurs.map((v) => [v.label, v]));
    for (const famille of famillesValeurs) {
      for (const [a, b] of famille.tensionsInternes) {
        expect(parLabel.get(a)?.familleValeur).toBe(famille.id);
        expect(parLabel.get(b)?.familleValeur).toBe(famille.id);
      }
    }
  });

  it("ne déclare pas de quasi-synonyme inconnu", () => {
    const connues = new Set(valeurs.map((v) => v.label));
    for (const valeur of valeurs) {
      for (const synonyme of valeur.quasiSynonymes ?? []) {
        expect(connues).toContain(synonyme);
      }
    }
  });

  it("n'écarte à la main que des paires réellement existantes", () => {
    const connues = new Set(valeurs.map((v) => v.label));
    for (const [a, b] of pairesExclues) {
      expect(connues).toContain(a);
      expect(connues).toContain(b);
    }
  });
});
