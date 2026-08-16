/**
 * Les arbitrages comparent les cartes de la personne entre elles. Ce qui peut
 * casser sans bruit :
 *
 *   • reposer deux fois le même bloc — le jeu a l'air de tourner en rond ;
 *   • un bloc qui contient deux fois la même carte — la question devient absurde ;
 *   • une phase qui ne se termine pas parce qu'un bloc passé revient sans fin ;
 *   • le signe du score, qui inverserait le haut et le bas du classement.
 */

import { describe, expect, it } from "vitest";
import {
  MAX_BLOCS,
  MIN_CARTES,
  TAILLE_BLOC,
  calculerScoresCartes,
  planifierArbitrages,
  prochainArbitrage,
  type CarteArbitrable,
  type ReponseArbitrage,
} from "../src/arbitrages";

function cartes(combien: number): CarteArbitrable[] {
  return Array.from({ length: combien }, (_, i) => ({
    id: `c${i + 1}`,
    famille: "lignes_rouges" as const,
    label: `Carte ${i + 1}`,
  }));
}

describe("planifierArbitrages", () => {
  it("ne planifie rien en dessous du minimum de cartes", () => {
    for (let n = 0; n < MIN_CARTES; n++) {
      expect(planifierArbitrages(cartes(n), 1)).toEqual([]);
    }
  });

  it("planifie dès le minimum de cartes atteint", () => {
    expect(planifierArbitrages(cartes(MIN_CARTES), 1).length).toBeGreaterThan(
      0,
    );
  });

  it("ne dépasse jamais le plafond de blocs", () => {
    for (const n of [3, 5, 9, 20, 54]) {
      for (const graine of [0, 7, 2024]) {
        expect(
          planifierArbitrages(cartes(n), graine).length,
        ).toBeLessThanOrEqual(MAX_BLOCS);
      }
    }
  });

  it("ne met jamais deux fois la même carte dans un bloc", () => {
    for (const n of [3, 4, 6, 12, 30]) {
      for (const bloc of planifierArbitrages(cartes(n), 5)) {
        const ids = bloc.cartes.map((c) => c.id);
        expect(new Set(ids).size).toBe(ids.length);
      }
    }
  });

  it("remplit les blocs à la taille prévue, ou au nombre de cartes disponibles", () => {
    for (const n of [3, 4, 8, 20]) {
      const attendu = Math.min(TAILLE_BLOC, n);
      for (const bloc of planifierArbitrages(cartes(n), 3)) {
        expect(bloc.cartes).toHaveLength(attendu);
      }
    }
  });

  it("ne repose jamais le même bloc", () => {
    for (const n of [3, 4, 5, 7, 15]) {
      for (const graine of [0, 11, 999]) {
        const blocs = planifierArbitrages(cartes(n), graine);
        const cles = blocs.map((b) =>
          b.cartes
            .map((c) => c.id)
            .sort()
            .join("|"),
        );
        expect(new Set(cles).size).toBe(cles.length);
      }
    }
  });

  it("s'arrête tout seul quand il n'existe qu'un bloc possible", () => {
    // Quatre cartes, blocs de quatre : une seule combinaison existe.
    expect(planifierArbitrages(cartes(4), 1)).toHaveLength(1);
    // Trois cartes : le bloc se réduit à trois, et il n'y en a qu'un.
    expect(planifierArbitrages(cartes(3), 1)).toHaveLength(1);
  });

  it("numérote les blocs à partir de 1, sans trou", () => {
    const blocs = planifierArbitrages(cartes(12), 4);
    expect(blocs.map((b) => b.bloc)).toEqual(
      Array.from({ length: blocs.length }, (_, i) => i + 1),
    );
  });

  it("rend le même plan pour une même graine", () => {
    const cle = (b: { cartes: CarteArbitrable[] }) =>
      b.cartes.map((c) => c.id).join(",");
    expect(planifierArbitrages(cartes(10), 77).map(cle)).toEqual(
      planifierArbitrages(cartes(10), 77).map(cle),
    );
  });

  it("rend des plans différents selon la graine", () => {
    const plans = [1, 2, 3, 4, 5].map((g) =>
      planifierArbitrages(cartes(12), g)
        .map((b) => b.cartes.map((c) => c.id).join(","))
        .join(";"),
    );
    expect(new Set(plans).size).toBeGreaterThan(1);
  });

  it("fait passer les cartes à peu près autant de fois les unes que les autres", () => {
    // Sans ça, une carte jugée une seule fois pèserait autant qu'une carte
    // jugée quatre fois, et le classement dirait surtout qui a été tiré.
    const liste = cartes(9);
    const passages = new Map(liste.map((c) => [c.id, 0]));
    for (const bloc of planifierArbitrages(liste, 42)) {
      for (const carte of bloc.cartes) {
        passages.set(carte.id, passages.get(carte.id)! + 1);
      }
    }
    const compte = [...passages.values()];
    expect(Math.max(...compte) - Math.min(...compte)).toBeLessThanOrEqual(2);
  });
});

describe("calculerScoresCartes", () => {
  const liste = cartes(4);
  const ids = liste.map((c) => c.id);

  function repondre(
    meilleure: string | null,
    pire: string | null,
    bloc = 1,
  ): ReponseArbitrage {
    return { bloc, carteIds: ids, carteMeilleure: meilleure, cartePire: pire };
  }

  it("met la carte choisie en haut et la carte écartée en bas", () => {
    const scores = calculerScoresCartes(liste, [repondre("c1", "c4")]);
    expect(scores[0].carteId).toBe("c1");
    expect(scores[0].score).toBe(1);
    expect(scores[scores.length - 1].carteId).toBe("c4");
    expect(scores[scores.length - 1].score).toBe(-1);
  });

  it("laisse à zéro les cartes vues mais jamais choisies", () => {
    const scores = calculerScoresCartes(liste, [repondre("c1", "c4")]);
    const milieu = scores.find((s) => s.carteId === "c2")!;
    expect(milieu.apparitions).toBe(1);
    expect(milieu.score).toBe(0);
  });

  it("compte les apparitions sur plusieurs blocs", () => {
    const scores = calculerScoresCartes(liste, [
      repondre("c1", "c4", 1),
      repondre("c1", "c3", 2),
    ]);
    const gagnante = scores.find((s) => s.carteId === "c1")!;
    expect(gagnante.apparitions).toBe(2);
    expect(gagnante.foisMeilleure).toBe(2);
    expect(gagnante.score).toBe(1);
  });

  it("ramène au milieu une carte tantôt choisie, tantôt écartée", () => {
    const scores = calculerScoresCartes(liste, [
      repondre("c1", "c4", 1),
      repondre("c4", "c1", 2),
    ]);
    expect(scores.find((s) => s.carteId === "c1")!.score).toBe(0);
    expect(scores.find((s) => s.carteId === "c4")!.score).toBe(0);
  });

  it("ignore complètement un bloc passé", () => {
    const scores = calculerScoresCartes(liste, [repondre(null, null)]);
    for (const s of scores) {
      expect(s.apparitions).toBe(0);
      expect(s.score).toBe(0);
    }
  });

  it("survit à une carte retirée de la partie après coup", () => {
    const scores = calculerScoresCartes(liste.slice(0, 3), [
      repondre("c1", "c4"),
    ]);
    expect(scores.find((s) => s.carteId === "c4")).toBeUndefined();
    expect(scores.find((s) => s.carteId === "c1")!.score).toBe(1);
  });

  it("garde le score dans [-1, 1]", () => {
    const scores = calculerScoresCartes(liste, [
      repondre("c1", "c4", 1),
      repondre("c1", "c4", 2),
      repondre("c2", "c3", 3),
    ]);
    for (const s of scores) {
      expect(s.score).toBeGreaterThanOrEqual(-1);
      expect(s.score).toBeLessThanOrEqual(1);
    }
  });
});

describe("prochainArbitrage", () => {
  const liste = cartes(8);

  it("sert le premier bloc quand rien n'a été répondu", () => {
    const { prochain, repondus } = prochainArbitrage(liste, [], 3);
    expect(prochain?.bloc).toBe(1);
    expect(repondus).toBe(0);
  });

  it("ne sert rien quand il n'y a pas assez de cartes", () => {
    expect(prochainArbitrage(cartes(2), [], 3).prochain).toBeNull();
  });

  it("avance bloc par bloc et finit par ne plus rien servir", () => {
    const reponses: ReponseArbitrage[] = [];
    const vus = new Set<number>();
    let etat = prochainArbitrage(liste, reponses, 3);
    let tours = 0;

    while (etat.prochain) {
      expect(vus.has(etat.prochain.bloc)).toBe(false);
      vus.add(etat.prochain.bloc);
      reponses.push({
        bloc: etat.prochain.bloc,
        carteIds: etat.prochain.cartes.map((c) => c.id),
        carteMeilleure: etat.prochain.cartes[0].id,
        cartePire: etat.prochain.cartes[1].id,
      });
      expect(++tours).toBeLessThanOrEqual(MAX_BLOCS);
      etat = prochainArbitrage(liste, reponses, 3);
    }

    expect(etat.repondus).toBe(etat.plan.length);
  });

  it("ne repropose pas un bloc que la personne a passé", () => {
    // Un bloc écarté est répondu : sans ça, il reviendrait sans fin.
    const premier = prochainArbitrage(liste, [], 3).prochain!;
    const apres = prochainArbitrage(
      liste,
      [
        {
          bloc: premier.bloc,
          carteIds: premier.cartes.map((c) => c.id),
          carteMeilleure: null,
          cartePire: null,
        },
      ],
      3,
    );
    expect(apres.prochain?.bloc).not.toBe(premier.bloc);
    expect(apres.repondus).toBe(1);
  });
});
