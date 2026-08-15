/**
 * Le hasard reproductible tient deux promesses à la fois, et c'est leur
 * conjonction qui est fragile : une partie reste identique à elle-même, mais
 * deux parties ne servent pas la même sélection. Un `Math.random()` glissé dans
 * `melanger` passerait le second test et casserait le premier en silence.
 */

import { describe, expect, it } from "vitest";
import { generateurAleatoire, melanger } from "../src/hasard";

function tirer(graine: number, combien = 20): number[] {
  const suivant = generateurAleatoire(graine);
  return Array.from({ length: combien }, () => suivant());
}

describe("generateurAleatoire", () => {
  it("rend la même suite pour une même graine", () => {
    expect(tirer(42)).toEqual(tirer(42));
  });

  it("rend des suites différentes pour des graines différentes", () => {
    expect(tirer(42)).not.toEqual(tirer(43));
  });

  it("reste dans [0, 1)", () => {
    for (const valeur of tirer(7, 500)) {
      expect(valeur).toBeGreaterThanOrEqual(0);
      expect(valeur).toBeLessThan(1);
    }
  });

  it("ne se bloque pas sur la graine 0", () => {
    // `etat = graine >>> 0` part de zéro : si l'avance était multiplicative,
    // la suite resterait collée à 0 pour toujours.
    const suite = tirer(0, 10);
    expect(new Set(suite).size).toBeGreaterThan(1);
  });
});

describe("melanger", () => {
  const liste = Array.from({ length: 30 }, (_, i) => i);

  it("ne touche pas à la liste d'origine", () => {
    const copie = [...liste];
    melanger(liste, generateurAleatoire(1));
    expect(liste).toEqual(copie);
  });

  it("garde exactement les mêmes éléments", () => {
    const melangee = melanger(liste, generateurAleatoire(3));
    expect([...melangee].sort((a, b) => a - b)).toEqual(liste);
  });

  it("rend le même ordre pour une même graine", () => {
    expect(melanger(liste, generateurAleatoire(9))).toEqual(
      melanger(liste, generateurAleatoire(9)),
    );
  });

  it("rend un ordre différent pour une autre graine", () => {
    expect(melanger(liste, generateurAleatoire(9))).not.toEqual(
      melanger(liste, generateurAleatoire(10)),
    );
  });

  it("accepte une liste vide ou à un seul élément", () => {
    expect(melanger([], generateurAleatoire(1))).toEqual([]);
    expect(melanger(["a"], generateurAleatoire(1))).toEqual(["a"]);
  });
});
