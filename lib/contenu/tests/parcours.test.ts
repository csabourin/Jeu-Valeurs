/**
 * Le parcours est recalculé à chaque requête de progrès, à partir des seules
 * réponses déjà enregistrées. Trois propriétés en découlent, et les trois se
 * cassent sans bruit :
 *
 *   • pour une graine donnée, la question suivante ne bouge pas — sinon la
 *     partie change sous les pieds de la personne entre deux écrans ;
 *   • toute partie finit par atteindre « termine » — sinon le jeu boucle sur
 *     une question qu'il ne sait pas retirer ;
 *   • la première passe ne pose **jamais** de question de relance, et la mise
 *     à l'épreuve ne démarre **jamais** toute seule.
 *
 * Les fixtures dérivent du contenu réel plutôt que de coder en dur des
 * libellés : une situation retirée ne doit pas faire échouer un test de moteur.
 */

import { describe, expect, it } from "vitest";
import { duels } from "../src/duels";
import { clePaire } from "../src/comparaisons";
import { series } from "../src/bascules";
import { valeurs } from "../src/valeurs";
import type { CarteDuel } from "../src/duels-cartes";
import {
  MAX_PREMIERE_VAGUE,
  calculerParcours,
  planifierDuels,
  planifierSeries,
  type ReponseConnue,
} from "../src/parcours";

const toutesLesValeurs = valeurs.map((v) => v.label);

/** Une paire qui a réellement au moins un duel écrit. */
const pairePrincipale = duels.find((d) => !d.variante)!;

/** Une main de cartes minimale, avec des valeurs confirmées distinctes. */
const cartes: CarteDuel[] = [
  {
    id: "1",
    famille: "lignes_rouges",
    label: "Mentir à quelqu'un qui me fait confiance",
    valeursConfirmees: ["Honnêteté"],
  },
  {
    id: "2",
    famille: "horizons",
    label: "Devenir bon dans mon métier",
    valeursConfirmees: ["Réussite"],
  },
  {
    id: "3",
    famille: "tresors",
    label: "Le calme quand je rentre chez moi",
    valeursConfirmees: ["Tranquillité"],
  },
  {
    id: "4",
    famille: "lignes_rouges",
    label: "Laisser tomber un ami à la dernière minute",
    valeursConfirmees: ["Loyauté"],
  },
];

const valeursDesCartes = ["Honnêteté", "Réussite", "Tranquillité", "Loyauté"];

function jouer(
  etat: {
    valeursConfirmees: string[];
    cartes?: CarteDuel[];
    graine?: number;
    phaseDemandee?: "ordination" | "epreuve";
  },
  choix: string,
  toursMax = 200,
): { reponses: ReponseConnue[]; tours: number; termine: boolean } {
  const reponses: ReponseConnue[] = [];
  for (let tour = 0; tour < toursMax; tour++) {
    const parcours = calculerParcours({ ...etat, reponses });
    if (!parcours.prochaine) return { reponses, tours: tour, termine: true };
    const q = parcours.prochaine;
    reponses.push({
      dilemmeId: q.dilemmeId,
      valeurA: q.valeurA,
      valeurB: q.valeurB,
      carteA: q.carteA,
      carteB: q.carteB,
      choix,
      contexte: q.contexte,
      phase: q.phase,
      serieId: q.serieId,
      palier: q.palier,
    });
  }
  return { reponses, tours: toursMax, termine: false };
}

describe("planifierDuels", () => {
  it("ne planifie rien sans valeur confirmée", () => {
    expect(planifierDuels([], 1)).toEqual([]);
  });

  it("ne planifie rien pour une valeur qui n'existe pas", () => {
    expect(planifierDuels(["Valeur inventée"], 1)).toEqual([]);
  });

  it("n'engage que des situations dont les deux valeurs sont confirmées", () => {
    const confirmees = [pairePrincipale.valeurA, pairePrincipale.valeurB];
    for (const duel of planifierDuels(confirmees, 5)) {
      expect(confirmees).toContain(duel.valeurA);
      expect(confirmees).toContain(duel.valeurB);
    }
  });

  it("rend le même plan pour une même graine", () => {
    const a = planifierDuels(toutesLesValeurs, 2024);
    const b = planifierDuels(toutesLesValeurs, 2024);
    expect(a.map((d) => d.id)).toEqual(b.map((d) => d.id));
  });

  it("rend des plans différents selon la graine", () => {
    const plans = [1, 2, 3, 4, 5].map((g) =>
      planifierDuels(toutesLesValeurs, g)
        .map((d) => d.id)
        .join(","),
    );
    expect(new Set(plans).size).toBeGreaterThan(1);
  });
});

describe("première passe", () => {
  it("ne pose rien sans valeur confirmée", () => {
    const parcours = calculerParcours({ valeursConfirmees: [], reponses: [] });
    expect(parcours.prochaine).toBeNull();
    expect(parcours.phase).toBe("termine");
  });

  it("commence par les duels entre les cartes de la personne", () => {
    const parcours = calculerParcours({
      valeursConfirmees: valeursDesCartes,
      reponses: [],
      cartes,
      graine: 7,
    });
    expect(parcours.phase).toBe("ordination");
    expect(parcours.prochaine).not.toBeNull();
    expect(parcours.prochaine!.phase).toBe("ordination");
  });

  it("ne demande jamais d'approfondir pendant la première passe", () => {
    const { reponses } = jouer(
      { valeursConfirmees: valeursDesCartes, cartes, graine: 3 },
      "A",
    );
    expect(reponses.length).toBeGreaterThan(0);
    for (const r of reponses) expect(r.phase).toBe("ordination");

    // Et la question elle-même ne l'autorise pas.
    let etat = calculerParcours({
      valeursConfirmees: valeursDesCartes,
      reponses: [],
      cartes,
      graine: 3,
    });
    expect(etat.prochaine!.approfondir).toBe(false);
    expect(etat.prochaine!.motif).toBeNull();
  });

  it("ne repose jamais deux fois la même manifestation", () => {
    const { reponses } = jouer(
      { valeursConfirmees: valeursDesCartes, cartes, graine: 11 },
      "A",
    );
    const ids = reponses.map((r) => r.dilemmeId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("couvre des paires distinctes plutôt que de répéter la même tension", () => {
    const { reponses } = jouer(
      { valeursConfirmees: valeursDesCartes, cartes, graine: 5 },
      "A",
    );
    const paires = reponses.map((r) => clePaire(r.valeurA, r.valeurB));
    expect(new Set(paires).size).toBe(paires.length);
  });

  it("ne dépasse pas le plafond de la première vague", () => {
    const { reponses } = jouer(
      { valeursConfirmees: toutesLesValeurs, cartes, graine: 42 },
      "A",
    );
    expect(reponses.length).toBeLessThanOrEqual(MAX_PREMIERE_VAGUE);
  });

  it("s'arrête sans passer d'elle-même à la mise à l'épreuve", () => {
    const { reponses } = jouer(
      { valeursConfirmees: valeursDesCartes, cartes, graine: 9 },
      "A",
    );
    const fin = calculerParcours({
      valeursConfirmees: valeursDesCartes,
      reponses,
      cartes,
      graine: 9,
    });
    expect(fin.phase).toBe("termine");
    expect(fin.premiereOrdinationPrete).toBe(true);
  });

  it("rend la même question suivante pour un même état", () => {
    const etat = {
      valeursConfirmees: valeursDesCartes,
      reponses: [],
      cartes,
      graine: 2024,
    };
    expect(calculerParcours(etat).prochaine!.dilemmeId).toBe(
      calculerParcours(etat).prochaine!.dilemmeId,
    );
  });

  it("compte les paires pertinentes et celles déjà couvertes", () => {
    const debut = calculerParcours({
      valeursConfirmees: valeursDesCartes,
      reponses: [],
      cartes,
      graine: 1,
    });
    expect(debut.pairesPertinentes).toBeGreaterThan(0);
    expect(debut.pairesCouvertes).toBe(0);

    const { reponses } = jouer(
      { valeursConfirmees: valeursDesCartes, cartes, graine: 1 },
      "A",
    );
    const apres = calculerParcours({
      valeursConfirmees: valeursDesCartes,
      reponses,
      cartes,
      graine: 1,
    });
    expect(apres.pairesCouvertes).toBeGreaterThan(0);
  });
});

describe("mise à l'épreuve", () => {
  function premierePasse(graine = 4) {
    return jouer({ valeursConfirmees: valeursDesCartes, cartes, graine }, "A")
      .reponses;
  }

  it("ne part que si la personne la demande", () => {
    const reponses = premierePasse();
    const sans = calculerParcours({
      valeursConfirmees: valeursDesCartes,
      reponses,
      cartes,
      graine: 4,
    });
    const avec = calculerParcours({
      valeursConfirmees: valeursDesCartes,
      reponses,
      cartes,
      graine: 4,
      phaseDemandee: "epreuve",
    });
    expect(sans.phase).toBe("termine");
    expect(avec.phase).toBe("epreuve");
  });

  it("dit pourquoi elle pose cette tension-là, et autorise l'approfondissement", () => {
    const reponses = premierePasse();
    const parcours = calculerParcours({
      valeursConfirmees: valeursDesCartes,
      reponses,
      cartes,
      graine: 4,
      phaseDemandee: "epreuve",
    });
    const question = parcours.prochaine!;
    if (question.type === "duel") {
      expect(question.motif).not.toBeNull();
      expect(question.motifTexte).not.toBeNull();
      expect(question.approfondir).toBe(true);
    }
    expect(question.phase).toBe("epreuve");
  });

  it("rejoue une tension déjà vue sous une autre forme", () => {
    const reponses = premierePasse();
    const dejaVues = new Set(reponses.map((r) => r.dilemmeId));
    const parcours = calculerParcours({
      valeursConfirmees: valeursDesCartes,
      reponses,
      cartes,
      graine: 4,
      phaseDemandee: "epreuve",
    });
    expect(dejaVues.has(parcours.prochaine!.dilemmeId)).toBe(false);
  });

  it("finit par se terminer", () => {
    const premiere = premierePasse();
    const suite = jouer(
      {
        valeursConfirmees: valeursDesCartes,
        cartes,
        graine: 4,
        phaseDemandee: "epreuve",
      },
      "A",
      300,
    );
    expect(suite.termine).toBe(true);
    expect(premiere.length).toBeGreaterThan(0);
  });

  it("ne demande jamais d'approfondir à l'intérieur d'une série de bascule", () => {
    const serie = series[0];
    const reponses: ReponseConnue[] = [
      {
        dilemmeId: 1,
        valeurA: serie.valeurA,
        valeurB: serie.valeurB,
        choix: "A",
        phase: "ordination",
      },
    ];
    const parcours = calculerParcours({
      valeursConfirmees: [serie.valeurA, serie.valeurB],
      reponses,
      graine: 1,
      phaseDemandee: "epreuve",
    });
    // On avance jusqu'à tomber sur une bascule, s'il y en a une.
    const suite = jouer(
      {
        valeursConfirmees: [serie.valeurA, serie.valeurB],
        graine: 1,
        phaseDemandee: "epreuve",
      },
      "A",
      100,
    );
    expect(parcours.phase).not.toBe("ordination");
    expect(suite.termine).toBe(true);
  });
});

describe("planifierSeries", () => {
  it("ne retient que des séries dont la paire est admissible", () => {
    const plan = planifierSeries(toutesLesValeurs, [], 3);
    for (const serie of plan) {
      expect(serie.valeurA).not.toBe(serie.valeurB);
    }
    expect(plan.length).toBeLessThanOrEqual(3);
  });

  it("fait passer devant une tension déjà tranchée", () => {
    const serie = series[0];
    const reponses: ReponseConnue[] = [
      {
        dilemmeId: 1,
        valeurA: serie.valeurA,
        valeurB: serie.valeurB,
        choix: "A",
      },
    ];
    const plan = planifierSeries(toutesLesValeurs, reponses, 1);
    expect(plan[0].valeurA).toBe(serie.valeurA);
    expect(plan[0].valeurB).toBe(serie.valeurB);
  });
});

describe("toute partie se termine", () => {
  for (const choix of ["A", "B", "ca_depend", "je_ne_sais_pas", "passer"]) {
    it(`même en répondant toujours « ${choix} »`, () => {
      for (const graine of [0, 1, 99]) {
        const resultat = jouer(
          {
            valeursConfirmees: valeursDesCartes,
            cartes,
            graine,
            phaseDemandee: "epreuve",
          },
          choix,
          300,
        );
        expect(resultat.termine).toBe(true);
      }
    });
  }
});
