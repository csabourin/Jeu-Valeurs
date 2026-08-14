import assert from "node:assert/strict";
import { test } from "node:test";

import {
  calculerConstellation,
  type ReponseSource,
} from "../artifacts/api-server/src/lib/constellation-engine.ts";

function response(
  overrides: Partial<ReponseSource> &
    Pick<ReponseSource, "id" | "valeurA" | "valeurB" | "choix">,
): ReponseSource {
  return {
    contexte: "Vie personnelle",
    pivotDimension: null,
    facteurDepend: null,
    facteurDependLibre: null,
    difficulte: 3,
    certitude: 3,
    version: 1,
    ...overrides,
  };
}

test("la certitude module la force de preuve", () => {
  const resultat = calculerConstellation(
    [
      response({
        id: 1,
        valeurA: "Liberté",
        valeurB: "Sécurité",
        choix: "A",
        certitude: 5,
      }),
      response({
        id: 2,
        valeurA: "Liberté",
        valeurB: "Sécurité",
        choix: "B",
        certitude: 1,
      }),
    ],
    ["Liberté", "Sécurité"],
  );

  assert.ok(resultat.tensions[0].probabiliteA > 0.5);
});

test("la difficulté décrit la tension sans devenir une preuve", () => {
  const facile = calculerConstellation(
    [
      response({
        id: 1,
        valeurA: "Liberté",
        valeurB: "Sécurité",
        choix: "A",
        certitude: 4,
        difficulte: 1,
      }),
    ],
    ["Liberté", "Sécurité"],
  );
  const difficile = calculerConstellation(
    [
      response({
        id: 1,
        valeurA: "Liberté",
        valeurB: "Sécurité",
        choix: "A",
        certitude: 4,
        difficulte: 5,
      }),
    ],
    ["Liberté", "Sécurité"],
  );

  assert.equal(
    facile.tensions[0].probabiliteA,
    difficile.tensions[0].probabiliteA,
  );
  assert.equal(facile.tensions[0].difficulteMoyenne, 1);
  assert.equal(difficile.tensions[0].difficulteMoyenne, 5);
});

test("Ça dépend augmente l'incertitude sans produire de gagnant", () => {
  const resultat = calculerConstellation(
    [
      response({
        id: 1,
        valeurA: "Liberté",
        valeurB: "Sécurité",
        choix: "ca_depend",
        facteurDepend: "reversibilite",
      }),
    ],
    ["Liberté", "Sécurité"],
  );

  const liberte = resultat.tendances.find(
    (tendance) => tendance.valeur === "Liberté",
  );
  assert.equal(liberte?.victoiresA, 0);
  assert.equal(liberte?.victoiresB, 0);
  assert.equal(liberte?.incertitudes, 1);
  assert.equal(resultat.tensions[0].probabiliteA, 0.5);
  assert.ok(
    resultat.observations.some(
      (observation) => observation.type === "point_bascule",
    ),
  );
});

test("la couverture compte les paires distinctes", () => {
  const resultat = calculerConstellation(
    [
      response({ id: 1, valeurA: "A", valeurB: "B", choix: "A" }),
      response({ id: 2, valeurA: "B", valeurB: "A", choix: "B" }),
      response({ id: 3, valeurA: "A", valeurB: "C", choix: "A" }),
    ],
    ["A", "B", "C"],
  );

  assert.equal(resultat.couverture, 2 / 3);
});

test("la stabilité compare les choix répétés sur une même paire", () => {
  const stable = calculerConstellation(
    [
      response({ id: 1, valeurA: "A", valeurB: "B", choix: "A" }),
      response({ id: 2, valeurA: "B", valeurB: "A", choix: "B" }),
    ],
    ["A", "B"],
  );
  const instable = calculerConstellation(
    [
      response({ id: 1, valeurA: "A", valeurB: "B", choix: "A" }),
      response({ id: 2, valeurA: "A", valeurB: "B", choix: "B" }),
    ],
    ["A", "B"],
  );

  assert.equal(stable.stabilite, 1);
  assert.equal(instable.stabilite, 0.5);
});
