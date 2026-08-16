import { describe, expect, it } from "vitest";
import {
  collisionsPossibles,
  planifierCollisions,
  estCollision,
  PLAFOND_PREMIERE_VAGUE,
  type CarteJeu,
} from "../src/collisions";

const cartes: CarteJeu[] = [
  {
    id: "1",
    famille: "lignes_rouges",
    label: "Mentir à quelqu'un qui me fait confiance",
    valeurs: ["Dire la vérité"],
  },
  {
    id: "2",
    famille: "lignes_rouges",
    label: "Sacrifier tout mon temps libre",
    valeurs: ["Avoir du temps à moi"],
  },
  {
    id: "3",
    famille: "horizons",
    label: "Avoir une carrière qui me passionne",
    valeurs: ["Devenir bon dans mon domaine"],
  },
  {
    id: "4",
    famille: "tresors",
    label: "Ma relation avec mes enfants",
    valeurs: ["Être là pour mes enfants"],
  },
  {
    id: "5",
    famille: "tresors",
    label: "Ma sécurité financière",
    valeurs: ["Stabilité financière"],
  },
];

describe("la génération des collisions", () => {
  it("oppose une limite à un enjeu, jamais deux cartes de même rôle", () => {
    const possibles = collisionsPossibles(cartes);

    for (const c of possibles) {
      expect(["1", "2"]).toContain(c.limiteId);
      expect(["3", "4", "5"]).toContain(c.enjeuId);
    }
    // Deux limites entre elles, deux enjeux entre eux : jamais.
    expect(possibles.some((c) => c.limiteId === c.enjeuId)).toBe(false);
  });

  it("distingue obtenir une aspiration de garder un essentiel", () => {
    const possibles = collisionsPossibles(cartes);

    expect(possibles.map((c) => c.situation)).toContain(
      "Serais-tu prêt à mentir à quelqu'un qui me fait confiance pour avoir une carrière qui me passionne ?",
    );
    expect(possibles.map((c) => c.situation)).toContain(
      "Serais-tu prêt à mentir à quelqu'un qui me fait confiance pour garder ma relation avec mes enfants ?",
    );
  });

  it("fait de « oui » la victoire de l'enjeu et de « non » celle de la limite", () => {
    const c = collisionsPossibles(cartes).find(
      (x) => x.limiteId === "1" && x.enjeuId === "3",
    )!;

    expect(c.valeurA).toBe("Devenir bon dans mon domaine");
    expect(c.valeurB).toBe("Dire la vérité");
    expect(c.optionA).toContain("Oui");
    expect(c.optionB).toContain("Non");
  });

  it("écarte les collisions circulaires", () => {
    // La limite et l'essentiel protègent la même chose : « sacrifier ton temps
    // à toi pour garder du temps à toi ».
    const circulaires: CarteJeu[] = [
      {
        id: "1",
        famille: "lignes_rouges",
        label: "Sacrifier tout mon temps libre",
        valeurs: ["Avoir du temps à moi"],
      },
      {
        id: "2",
        famille: "tresors",
        label: "Mes soirées tranquilles",
        valeurs: ["Avoir du temps à moi"],
      },
    ];

    expect(collisionsPossibles(circulaires)).toHaveLength(0);
  });

  it("garde des identifiants stables et uniques", () => {
    const a = collisionsPossibles(cartes);
    const b = collisionsPossibles([...cartes].reverse());

    expect(a.map((c) => c.id)).toEqual(b.map((c) => c.id));
    expect(new Set(a.map((c) => c.id)).size).toBe(a.length);
    expect(a.every((c) => estCollision(c.id))).toBe(true);
  });

  it("n'impose aucun plafond : toutes les collisions admissibles sont jouables", () => {
    const plan = planifierCollisions(cartes, 7);
    const possibles = collisionsPossibles(cartes);

    expect(plan.total).toBe(possibles.length);
    expect(plan.premiereVague.length + plan.approfondissement.length).toBe(
      possibles.length,
    );
  });

  it("ne met qu'un exemplaire de chaque couple de valeurs dans la première vague", () => {
    // Deux essentiels portent la même valeur : le couple ne doit être vu
    // qu'une fois avant le portrait, la reprise appartient à la suite.
    const doublon: CarteJeu[] = [
      ...cartes,
      {
        id: "6",
        famille: "tresors",
        label: "Le fonds de retraite que j'ai bâti",
        valeurs: ["Stabilité financière"],
      },
    ];

    const plan = planifierCollisions(doublon, 3);
    const couples = plan.premiereVague.map((c) =>
      [c.valeurA, c.valeurB].sort().join("|"),
    );

    expect(new Set(couples).size).toBe(couples.length);
    expect(plan.approfondissement.length).toBeGreaterThan(0);
  });

  it("n'enchaîne pas deux collisions sur la même limite", () => {
    const plan = planifierCollisions(cartes, 11);

    for (let i = 1; i < plan.premiereVague.length; i++) {
      expect(plan.premiereVague[i].limiteId).not.toBe(
        plan.premiereVague[i - 1].limiteId,
      );
    }
  });

  it("rend le même plan pour une même graine, un autre pour une autre", () => {
    const a = planifierCollisions(cartes, 42).premiereVague.map((c) => c.id);
    const b = planifierCollisions(cartes, 42).premiereVague.map((c) => c.id);
    expect(a).toEqual(b);

    const c = planifierCollisions(cartes, 99).premiereVague.map((c) => c.id);
    expect(new Set([...a, ...c]).size).toBe(new Set(a).size);
  });
});

describe("le seuil de patience", () => {
  /** Beaucoup de limites et d'enjeux, tous porteurs de valeurs distinctes. */
  const grandeMain: CarteJeu[] = [
    ...[
      "Dire la vérité",
      "Avoir du temps à moi",
      "Ne rien devoir à personne",
      "Suivre les règles",
      "Mon confort",
      "La paix",
    ].map((valeur, i): CarteJeu => ({
      id: `L${i}`,
      famille: "lignes_rouges",
      label: `Limite ${i}`,
      valeurs: [valeur],
    })),
    ...[
      "Devenir bon dans mon domaine",
      "Découvrir des endroits",
      "Être là pour mes enfants",
      "Stabilité financière",
      "Ma santé",
      "Mes amitiés",
      "Créer quelque chose",
    ].map((valeur, i): CarteJeu => ({
      id: `E${i}`,
      famille: "horizons",
      label: `Enjeu ${i}`,
      valeurs: [valeur],
    })),
  ];

  it("montre le portrait sans faire jouer toute la matrice", () => {
    const plan = planifierCollisions(grandeMain, 5);

    expect(plan.total).toBeGreaterThan(PLAFOND_PREMIERE_VAGUE);
    expect(plan.premiereVague).toHaveLength(PLAFOND_PREMIERE_VAGUE);
    // Rien n'est perdu : le reste se joue à l'épreuve.
    expect(plan.premiereVague.length + plan.approfondissement.length).toBe(
      plan.total,
    );
  });

  it("fait entrer toutes les valeurs dans le premier portrait", () => {
    const plan = planifierCollisions(grandeMain, 5);
    const vues = new Set(
      plan.premiereVague.flatMap((c) => [c.valeurA, c.valeurB]),
    );
    const attendues = new Set(
      collisionsPossibles(grandeMain).flatMap((c) => [c.valeurA, c.valeurB]),
    );

    expect(vues.size).toBe(attendues.size);
  });
});
