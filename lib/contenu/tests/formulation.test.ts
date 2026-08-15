/**
 * Les règles d'écriture d'une carte.
 *
 * Un filet trop large est pire qu'un filet absent : il pousse à réécrire des
 * cartes justes en cartes vagues. La moitié de ces tests protège donc ce qui
 * doit **passer** — le français ordinaire n'est pas un défaut.
 */

import { describe, expect, it } from "vitest";
import {
  analyserFormulation,
  compterNegations,
  formulationAcceptable,
  personneCoherente,
  personneDominante,
} from "../src/formulation";
import { cartes } from "../src/catalogue";

const codes = (texte: string) => analyserFormulation(texte).map((d) => d.code);

describe("prudence inutile", () => {
  it("refuse « je crois que je ne voudrais jamais… »", () => {
    expect(codes("Je crois que je ne voudrais jamais faire ça")).toContain(
      "prudence_inutile",
    );
    expect(codes("Il me semble que je refuserais")).toContain(
      "prudence_inutile",
    );
  });

  it("laisse passer « ce que je crois », qui est le sujet de la carte", () => {
    expect(codes("Vivre d'accord avec ce que je crois vraiment")).not.toContain(
      "prudence_inutile",
    );
    expect(codes("Ma liberté de dire ce que je pense")).not.toContain(
      "prudence_inutile",
    );
  });
});

describe("double négation", () => {
  it("refuse deux négations empilées dans la même proposition", () => {
    expect(compterNegations("Ne pas refuser d'aider quelqu'un")).toBe(2);
    expect(codes("Ne pas refuser d'aider quelqu'un")).toContain(
      "double_negation",
    );
  });

  it("compte « ne … rien » et « sans jamais » pour une seule négation", () => {
    // C'est du français ordinaire : le renfort ne fait que soutenir le « ne ».
    expect(compterNegations("Faire semblant de ne rien voir")).toBe(1);
    expect(compterNegations("Compter sur mon monde sans jamais l'aider.")).toBe(
      1,
    );
    expect(codes("Faire semblant de ne rien voir")).not.toContain(
      "double_negation",
    );
  });

  it("compte séparément deux propositions", () => {
    expect(
      compterNegations(
        "Prendre quelque chose qui ne m'appartient pas quand personne ne regarde",
      ),
    ).toBe(1);
  });

  it("ne prend pas « n'importe quoi » pour une négation", () => {
    expect(compterNegations("Pouvoir refuser n'importe quel travail.")).toBe(1);
  });
});

describe("personne grammaticale", () => {
  it("reconnaît qui parle", () => {
    expect(personneDominante("Garder mon travail")).toBe("je");
    expect(personneDominante("Tu dis ce que tu sais.")).toBe("tu");
    expect(personneDominante("Il faut choisir.")).toBe("neutre");
  });

  it("refuse le mélange à l'intérieur d'une même phrase", () => {
    const melange = "Serais-tu prêt à mentir à quelqu'un qui me fait confiance ?";
    expect(personneDominante(melange)).toBe("melangee");
    expect(codes(melange)).toContain("personne_melangee");
  });

  it("ne prend pas le verbe « tenir » pour un pronom possessif", () => {
    expect(personneDominante("Pouvoir vivre près de l'endroit auquel je tiens")).toBe(
      "je",
    );
  });

  it("accepte un duel entièrement au « je » ou entièrement au « tu »", () => {
    expect(
      personneCoherente([
        "Pour garder mon travail, il faudrait mentir.",
        "Je le fais.",
        "Je ne le fais pas.",
      ]),
    ).toBe(true);
    expect(
      personneCoherente([
        "Ton ami a brisé quelque chose.",
        "Tu dis que c'est lui.",
        "Tu dis que tu ne sais pas.",
      ]),
    ).toBe(true);
  });

  it("refuse un duel qui change de personne en cours de route", () => {
    expect(
      personneCoherente([
        "Ton ami te demande de te taire.",
        "Je parle.",
        "Je me tais.",
      ]),
    ).toBe(false);
  });
});

describe("une seule idée par carte", () => {
  it("signale deux idées empilées", () => {
    expect(codes("Ne jamais aider mon monde tout en comptant sur lui.")).toContain(
      "idees_multiples",
    );
  });

  it("signale une condition empilée sur autre chose", () => {
    expect(
      codes(
        "Rester loyal même si mon ami ment et que ça coûte cher à quelqu'un.",
      ),
    ).toContain("conditions_multiples");
  });

  it("laisse passer une carte courte et directe", () => {
    expect(analyserFormulation("Mentir à quelqu'un qui me fait confiance")).toEqual(
      [],
    );
  });
});

describe("le catalogue respecte ses propres règles", () => {
  it("ne contient aucune carte qui casse une règle ferme", () => {
    const fautives = cartes.filter((c) => !formulationAcceptable(c.label));
    expect(fautives.map((c) => `${c.id} · ${c.label}`)).toEqual([]);
  });
});
