/**
 * La couverture répond à une question que la carte finale pose à voix haute :
 * « tu as joué X des Y paires possibles ». Les deux nombres se cassent en
 * silence, et dans des directions opposées :
 *
 *   • compter des paires que le mécanisme ne peut pas servir fait plafonner la
 *     couverture sous 100 % pour toujours ;
 *   • oublier une paire déjà jouée parce qu'aucune carte ne la sert plus fait
 *     disparaître du décompte une réponse que la personne a bel et bien donnée.
 */

import { describe, expect, it } from "vitest";
import { calculerCouverture, clePaire } from "../src/comparaisons";

const HONNETETE = "Honnêteté";
const REUSSITE = "Réussite";
const TRANQUILLITE = "Tranquillité";

const actives = [HONNETETE, REUSSITE, TRANQUILLITE];

function vue(a: string, b: string) {
  return { valeurA: a, valeurB: b };
}

describe("la couverture", () => {
  it("compte toutes les paires admissibles quand rien ne restreint", () => {
    const sans = calculerCouverture(actives, []);
    expect(sans.pairesPertinentes.length).toBeGreaterThan(0);
    expect(sans.part).toBe(0);
  });

  it("ne compte pas une paire que le mécanisme ne peut jamais servir", () => {
    // Seule Honnêteté ⇄ Réussite est jouable : la troisième valeur n'est portée
    // que par des cartes d'un même rôle, donc sa paire ne sortira jamais.
    const couverture = calculerCouverture(
      actives,
      [vue(HONNETETE, REUSSITE)],
      [[HONNETETE, REUSSITE]],
    );

    expect(couverture.pairesPertinentes).toHaveLength(1);
    expect(couverture.pairesVues).toHaveLength(1);
    expect(couverture.pairesManquantes).toHaveLength(0);
    // Tout ce qui pouvait être joué l'a été : la carte doit pouvoir dire 100 %.
    expect(couverture.part).toBe(1);
  });

  it("garde au décompte une paire déjà jouée que plus rien ne sert", () => {
    // La personne a retiré la carte depuis, ou la réponse venait d'une
    // situation écrite qui n'est plus au plan. Sa réponse existe quand même.
    const couverture = calculerCouverture(
      actives,
      [vue(HONNETETE, TRANQUILLITE)],
      [[HONNETETE, REUSSITE]],
    );

    const cles = couverture.pairesPertinentes.map(([a, b]) => clePaire(a, b));
    expect(cles).toContain(clePaire(HONNETETE, TRANQUILLITE));
    expect(couverture.pairesVues).toHaveLength(1);
    expect(couverture.pairesManquantes).toHaveLength(1);
  });

  it("ne divise jamais par zéro", () => {
    expect(calculerCouverture(actives, [], []).part).toBe(0);
    expect(calculerCouverture([], [], []).part).toBe(0);
  });
});
