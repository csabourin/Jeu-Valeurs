/**
 * Le parcours est recalculé à chaque requête de progrès, à partir des seules
 * réponses déjà enregistrées. Deux propriétés en découlent, et les deux se
 * cassent sans bruit :
 *
 *   • pour une graine donnée, le plan ne bouge pas — sinon la partie change
 *     sous les pieds de la personne entre deux écrans ;
 *   • toute partie finit par atteindre « termine » — sinon le jeu boucle sur
 *     une question qu'il ne sait pas retirer.
 *
 * Les fixtures dérivent du contenu réel plutôt que de coder en dur des
 * libellés : une situation retirée ne doit pas faire échouer un test de moteur.
 */

import { describe, expect, it } from "vitest";
import { duels, clePaire } from "../src/duels";
import { series } from "../src/bascules";
import { valeurs } from "../src/valeurs";
import {
  calculerParcours,
  planifierDuels,
  planifierSeries,
  type ReponseConnue,
} from "../src/parcours";

const MAX_DUELS = 12;
const MAX_SERIES = 3;

const toutesLesValeurs = valeurs.map((v) => v.label);

/** Une paire qui a réellement au moins un duel écrit. */
const pairePrincipale = duels.find((d) => !d.variante)!;

describe("planifierDuels", () => {
  it("ne planifie rien sans valeur confirmée", () => {
    expect(planifierDuels([], 1)).toEqual([]);
  });

  it("ne planifie rien pour une valeur qui n'existe pas", () => {
    expect(planifierDuels(["Valeur inventée"], 1)).toEqual([]);
  });

  it("ne dépasse jamais le plafond de duels", () => {
    for (const graine of [0, 1, 42, 12345]) {
      expect(planifierDuels(toutesLesValeurs, graine).length).toBeLessThanOrEqual(
        MAX_DUELS,
      );
    }
  });

  it("ne sert jamais deux fois la même situation", () => {
    for (const graine of [0, 7, 99]) {
      const plan = planifierDuels(toutesLesValeurs, graine);
      expect(new Set(plan.map((d) => d.id)).size).toBe(plan.length);
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

  it("n'engage que des situations touchant une valeur confirmée", () => {
    const confirmees = [pairePrincipale.valeurA, pairePrincipale.valeurB];
    for (const duel of planifierDuels(confirmees, 5)) {
      const touche =
        confirmees.includes(duel.valeurA) || confirmees.includes(duel.valeurB);
      expect(touche).toBe(true);
    }
  });

  it("ne garde une variante que si sa jumelle est dans la partie", () => {
    // Sinon l'écran annonce « déjà croisé, autrement » pour une tension jamais
    // vue, et la stabilité n'a rien à comparer.
    for (const graine of [0, 3, 77, 2024]) {
      const plan = planifierDuels(toutesLesValeurs, graine);
      const pairesPrincipales = new Set(
        plan
          .filter((d) => !d.variante)
          .map((d) => clePaire(d.valeurA, d.valeurB)),
      );
      for (const variante of plan.filter((d) => d.variante)) {
        expect(pairesPrincipales).toContain(
          clePaire(variante.valeurA, variante.valeurB),
        );
      }
    }
  });

  it("place les variantes en fin de parcours, loin de leur jumelle", () => {
    const plan = planifierDuels(toutesLesValeurs, 2024);
    const premiereVariante = plan.findIndex((d) => d.variante);
    if (premiereVariante === -1) return; // aucune variante tirée pour cette graine
    for (const duel of plan.slice(premiereVariante)) {
      expect(duel.variante).toBe(true);
    }
  });
});

describe("planifierSeries", () => {
  it("ne dépasse jamais le plafond de séries", () => {
    const plan = planifierSeries(toutesLesValeurs, [], 1);
    expect(plan.length).toBeLessThanOrEqual(MAX_SERIES);
  });

  it("rend le même plan pour une même graine", () => {
    const a = planifierSeries(toutesLesValeurs, [], 88).map((s) => s.id);
    const b = planifierSeries(toutesLesValeurs, [], 88).map((s) => s.id);
    expect(a).toEqual(b);
  });

  it("fait passer devant une tension déjà tranchée franchement", () => {
    const serie = series[0];
    const tranchee: ReponseConnue[] = [
      {
        dilemmeId: 1,
        valeurA: serie.valeurA,
        valeurB: serie.valeurB,
        choix: "A",
        serieId: null,
        palier: null,
      },
    ];
    // Aucune valeur confirmée : seule la tension tranchée rend la série éligible.
    const plan = planifierSeries([], tranchee, 1);
    expect(plan.map((s) => s.id)).toContain(serie.id);
  });

  it("ne retient rien sans valeur confirmée ni tension tranchée", () => {
    expect(planifierSeries([], [], 1)).toEqual([]);
  });
});

describe("calculerParcours", () => {
  it("commence par la phase des duels", () => {
    const parcours = calculerParcours({
      valeursConfirmees: toutesLesValeurs,
      reponses: [],
      graine: 4,
    });
    expect(parcours.phase).toBe("duels");
    expect(parcours.prochaine?.type).toBe("duel");
  });

  it("rend la même question tant que rien n'a été répondu", () => {
    const a = calculerParcours({
      valeursConfirmees: toutesLesValeurs,
      reponses: [],
      graine: 4,
    });
    const b = calculerParcours({
      valeursConfirmees: toutesLesValeurs,
      reponses: [],
      graine: 4,
    });
    expect(a.prochaine?.dilemmeId).toBe(b.prochaine?.dilemmeId);
  });

  it("ne repose jamais une situation déjà répondue", () => {
    const reponses: ReponseConnue[] = [];
    const vues = new Set<number>();
    for (let i = 0; i < 10; i++) {
      const { prochaine } = calculerParcours({
        valeursConfirmees: toutesLesValeurs,
        reponses,
        graine: 11,
      });
      if (!prochaine) break;
      expect(vues.has(prochaine.dilemmeId)).toBe(false);
      vues.add(prochaine.dilemmeId);
      reponses.push({
        dilemmeId: prochaine.dilemmeId,
        valeurA: prochaine.valeurA,
        valeurB: prochaine.valeurB,
        choix: "A",
        serieId: prochaine.serieId,
        palier: prochaine.palier,
      });
    }
  });

  // Le garde-fou principal : quoi que réponde la personne, la partie finit.
  const strategies: Record<string, (tour: number) => string> = {
    "toujours A": () => "A",
    "toujours B": () => "B",
    "alterne A et B": (tour) => (tour % 2 === 0 ? "A" : "B"),
    "toujours ça dépend": () => "ca_depend",
    "toujours je ne sais pas": () => "je_ne_sais_pas",
    "toujours passer": () => "passer",
  };

  for (const [nom, choisir] of Object.entries(strategies)) {
    it(`atteint « termine » quand la personne répond ${nom}`, () => {
      for (const graine of [0, 1, 42, 2024]) {
        const reponses: ReponseConnue[] = [];
        let parcours = calculerParcours({
          valeursConfirmees: toutesLesValeurs,
          reponses,
          graine,
        });
        let tours = 0;

        while (parcours.phase !== "termine") {
          expect(parcours.prochaine).not.toBeNull();
          const q = parcours.prochaine!;
          reponses.push({
            dilemmeId: q.dilemmeId,
            valeurA: q.valeurA,
            valeurB: q.valeurB,
            choix: choisir(tours),
            facteurDepend: q.dimension,
            serieId: q.serieId,
            palier: q.palier,
          });
          tours++;
          // Plafond large : 12 duels + 3 séries de 3 paliers = 21 questions.
          expect(tours).toBeLessThan(60);
          parcours = calculerParcours({
          valeursConfirmees: toutesLesValeurs,
          reponses,
          graine,
        });
        }

        expect(parcours.prochaine).toBeNull();
      }
    });
  }

  it("s'arrête sur une série dès que la réponse change", () => {
    // Le point de bascule est trouvé : monter le réglage plus haut
    // n'apprendrait plus rien. On joue la partie jusqu'au bout pour vérifier
    // que le troisième palier n'est jamais servi — et pas seulement qu'il
    // n'arrive pas tout de suite.
    const serie = series[0];
    const confirmees = [serie.valeurA, serie.valeurB];
    const graine = 1;

    // Les duels d'abord, tranchés franchement : c'est ce qui rend la série
    // éligible aux bascules.
    const reponses: ReponseConnue[] = planifierDuels(confirmees, graine).map(
      (d) => ({
        dilemmeId: d.id,
        valeurA: d.valeurA,
        valeurB: d.valeurB,
        choix: "A",
        serieId: null,
        palier: null,
      }),
    );

    expect(planifierSeries(confirmees, reponses, graine).map((s) => s.id)).toContain(
      serie.id,
    );

    // Palier 1 puis palier 2, avec un choix qui change : la bascule est trouvée.
    reponses.push(
      {
        dilemmeId: serie.paliers[0].id,
        valeurA: serie.valeurA,
        valeurB: serie.valeurB,
        choix: "A",
        serieId: serie.id,
        palier: 1,
      },
      {
        dilemmeId: serie.paliers[1].id,
        valeurA: serie.valeurA,
        valeurB: serie.valeurB,
        choix: "B",
        serieId: serie.id,
        palier: 2,
      },
    );

    const troisieme = serie.paliers[2].id;
    let parcours = calculerParcours({
      valeursConfirmees: confirmees,
      reponses,
      graine,
    });
    let tours = 0;

    while (parcours.phase !== "termine") {
      const q = parcours.prochaine!;
      expect(q.dilemmeId).not.toBe(troisieme);
      reponses.push({
        dilemmeId: q.dilemmeId,
        valeurA: q.valeurA,
        valeurB: q.valeurB,
        choix: "A",
        serieId: q.serieId,
        palier: q.palier,
      });
      expect(++tours).toBeLessThan(60);
      parcours = calculerParcours({
        valeursConfirmees: confirmees,
        reponses,
        graine,
      });
    }
  });
});

describe("phase d'arbitrage", () => {
  const cartes = Array.from({ length: 8 }, (_, i) => ({
    id: `c${i + 1}`,
    famille: "lignes_rouges" as const,
    label: `Carte ${i + 1}`,
  }));

  it("passe avant les duels", () => {
    // Classer ses cartes après douze situations, ce n'est plus les classer à
    // froid : c'est classer ce que les situations viennent de remuer.
    const parcours = calculerParcours({
      valeursConfirmees: toutesLesValeurs,
      reponses: [],
      cartes,
      graine: 4,
    });
    expect(parcours.phase).toBe("arbitrages");
    expect(parcours.prochainBloc).not.toBeNull();
    expect(parcours.prochaine).toBeNull();
  });

  it("ne se déclenche pas quand la partie n'a pas assez de cartes", () => {
    const parcours = calculerParcours({
      valeursConfirmees: toutesLesValeurs,
      reponses: [],
      cartes: cartes.slice(0, 2),
      graine: 4,
    });
    expect(parcours.phase).toBe("duels");
    expect(parcours.prochainBloc).toBeNull();
  });

  it("laisse repartir les duels une fois les blocs épuisés", () => {
    const arbitrages = [];
    let parcours = calculerParcours({
      valeursConfirmees: toutesLesValeurs,
      reponses: [],
      cartes,
      arbitrages,
      graine: 4,
    });

    let tours = 0;
    while (parcours.phase === "arbitrages") {
      const bloc = parcours.prochainBloc!;
      arbitrages.push({
        bloc: bloc.bloc,
        carteIds: bloc.cartes.map((c) => c.id),
        carteMeilleure: bloc.cartes[0].id,
        cartePire: bloc.cartes[1].id,
      });
      expect(++tours).toBeLessThanOrEqual(6);
      parcours = calculerParcours({
        valeursConfirmees: toutesLesValeurs,
        reponses: [],
        cartes,
        arbitrages,
        graine: 4,
      });
    }

    expect(parcours.phase).toBe("duels");
    expect(parcours.arbitragesRepondus).toBe(parcours.arbitragesPlanifies);
  });

  it("compte les blocs prévus et répondus", () => {
    const parcours = calculerParcours({
      valeursConfirmees: toutesLesValeurs,
      reponses: [],
      cartes,
      graine: 4,
    });
    expect(parcours.arbitragesPlanifies).toBeGreaterThan(0);
    expect(parcours.arbitragesRepondus).toBe(0);
  });
});
