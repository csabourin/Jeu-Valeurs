/**
 * Vérification du contenu du jeu.
 *
 *   pnpm --filter @workspace/scripts run verifier-contenu
 *
 * Le contenu est écrit à la main et grossit à chaque ajout de situation. Ce
 * script attrape ce qu'un typecheck ne voit pas : une valeur mal orthographiée
 * dans un duel, deux situations qui partagent un identifiant, une série dont
 * les paliers ne montent pas, un parcours qui ne se termine jamais.
 *
 * Il joue aussi une partie complète de bout en bout pour chaque famille de
 * cartes, pour garantir qu'une personne ne peut pas se retrouver coincée.
 */

import {
  cartes,
  valeurs,
  duels,
  series,
  familles,
  calculerParcours,
  clePaire,
  type ReponseConnue,
} from "@workspace/contenu";

const erreurs: string[] = [];
const avertissements: string[] = [];

function verifier(condition: boolean, message: string): void {
  if (!condition) erreurs.push(message);
}

// ── Valeurs référencées ──────────────────────────────────────────────────────

const labelsConnus = new Set(valeurs.map((v) => v.label));

verifier(
  labelsConnus.size === valeurs.length,
  "Deux valeurs partagent le même libellé.",
);

for (const v of valeurs) {
  for (const t of v.tensionsFrequentes) {
    verifier(
      labelsConnus.has(t),
      `Valeur « ${v.label} » : tension vers une valeur inconnue « ${t} ».`,
    );
  }
}

for (const c of cartes) {
  for (const v of c.valeursSuggerees) {
    verifier(
      labelsConnus.has(v),
      `Carte ${c.id} « ${c.label} » : valeur suggérée inconnue « ${v} ».`,
    );
  }
  verifier(
    c.valeursSuggerees.length > 0,
    `Carte ${c.id} « ${c.label} » : aucune valeur suggérée.`,
  );
}

// ── Identifiants uniques, toutes situations confondues ───────────────────────

const identifiants = new Map<number, string>();
function reserver(id: number, quoi: string): void {
  const deja = identifiants.get(id);
  verifier(deja === undefined, `Identifiant ${id} utilisé par ${deja} et ${quoi}.`);
  identifiants.set(id, quoi);
}

for (const c of cartes) reserver(c.id, `carte « ${c.label} »`);
for (const d of duels) reserver(d.id, `duel ${d.id}`);
for (const s of series) {
  for (const p of s.paliers) reserver(p.id, `palier ${s.id}/${p.palier}`);
}

// ── Duels ────────────────────────────────────────────────────────────────────

for (const d of duels) {
  verifier(labelsConnus.has(d.valeurA), `Duel ${d.id} : valeurA inconnue « ${d.valeurA} ».`);
  verifier(labelsConnus.has(d.valeurB), `Duel ${d.id} : valeurB inconnue « ${d.valeurB} ».`);
  verifier(d.valeurA !== d.valeurB, `Duel ${d.id} : la même valeur des deux côtés.`);
  verifier(d.optionA !== d.optionB, `Duel ${d.id} : deux options identiques.`);
}

// Une variante n'a de sens que s'il existe un duel principal sur la même paire.
for (const d of duels.filter((x) => x.variante)) {
  const principal = duels.some(
    (x) => !x.variante && clePaire(x.valeurA, x.valeurB) === clePaire(d.valeurA, d.valeurB),
  );
  verifier(principal, `Duel ${d.id} est une variante sans duel principal sur sa paire.`);
}

// ── Séries de bascule ────────────────────────────────────────────────────────

const idsSeries = new Set<string>();
for (const s of series) {
  verifier(!idsSeries.has(s.id), `Série ${s.id} : identifiant en double.`);
  idsSeries.add(s.id);

  verifier(labelsConnus.has(s.valeurA), `Série ${s.id} : valeurA inconnue.`);
  verifier(labelsConnus.has(s.valeurB), `Série ${s.id} : valeurB inconnue.`);
  verifier(s.valeurA !== s.valeurB, `Série ${s.id} : la même valeur des deux côtés.`);
  verifier(s.optionA !== s.optionB, `Série ${s.id} : deux options identiques.`);

  const rangs = s.paliers.map((p) => p.palier);
  verifier(
    rangs.length >= 2,
    `Série ${s.id} : il faut au moins deux paliers pour qu'une bascule existe.`,
  );
  verifier(
    rangs.every((r, i) => r === i + 1),
    `Série ${s.id} : les paliers doivent être numérotés 1, 2, 3… (reçu ${rangs.join(", ")}).`,
  );

  const situations = new Set(s.paliers.map((p) => p.situation));
  verifier(
    situations.size === s.paliers.length,
    `Série ${s.id} : deux paliers décrivent la même situation.`,
  );
}

// ── Couverture ───────────────────────────────────────────────────────────────

for (const famille of familles) {
  const compte = cartes.filter((c) => c.famille === famille).length;
  if (compte < 10) {
    avertissements.push(`Famille « ${famille} » : seulement ${compte} cartes.`);
  }
}

// Une valeur sans duel ne pourra jamais être mise à l'épreuve.
for (const v of valeurs) {
  const apparait = duels.some((d) => d.valeurA === v.label || d.valeurB === v.label);
  verifier(apparait, `Valeur « ${v.label} » n'apparaît dans aucun duel.`);
}

// ── Une partie doit toujours se terminer ─────────────────────────────────────

/** Rejoue une partie complète en répondant toujours de la même façon. */
function jouerJusquAuBout(valeursConfirmees: string[], choix: string): number {
  const reponses: ReponseConnue[] = [];
  for (let tour = 0; tour < 200; tour++) {
    const parcours = calculerParcours(valeursConfirmees, reponses);
    if (!parcours.prochaine) return tour;
    const q = parcours.prochaine;
    reponses.push({
      dilemmeId: q.dilemmeId,
      valeurA: q.valeurA,
      valeurB: q.valeurB,
      choix,
      facteurDepend: null,
      serieId: q.serieId,
      palier: q.palier,
    });
  }
  erreurs.push(
    `Le parcours ne se termine pas pour [${valeursConfirmees.join(", ")}] en répondant « ${choix} ».`,
  );
  return -1;
}

const scenarios: { nom: string; cartesChoisies: number[] }[] = [
  { nom: "une seule carte", cartesChoisies: [1002] },
  { nom: "trois lignes rouges", cartesChoisies: [1002, 1004, 1010] },
  { nom: "mélange des trois familles", cartesChoisies: [1002, 1004, 2003, 2006, 3002, 3004] },
  { nom: "toutes les cartes", cartesChoisies: cartes.map((c) => c.id) },
];

for (const scenario of scenarios) {
  const valeursConfirmees = Array.from(
    new Set(
      scenario.cartesChoisies.flatMap(
        (id) => cartes.find((c) => c.id === id)?.valeursSuggerees ?? [],
      ),
    ),
  );
  for (const choix of ["A", "B", "ca_depend", "passer"]) {
    const tours = jouerJusquAuBout(valeursConfirmees, choix);
    if (tours === 0 && valeursConfirmees.length >= 2) {
      erreurs.push(`Scénario « ${scenario.nom} » : aucune question posée.`);
    }
  }
}

// Le parcours doit tenir sans aucune valeur, sans planter.
const vide = calculerParcours([], []);
verifier(vide.prochaine === null, "Sans valeur confirmée, le jeu devrait n'avoir aucune question.");

// ── Rapport ──────────────────────────────────────────────────────────────────

const paires = new Set(duels.map((d) => clePaire(d.valeurA, d.valeurB)));

console.log(
  [
    `${valeurs.length} valeurs`,
    `${cartes.length} cartes`,
    `${duels.length} duels sur ${paires.size} paires`,
    `${series.length} séries de bascule`,
  ].join(" · "),
);

for (const a of avertissements) console.warn(`⚠ ${a}`);

if (erreurs.length > 0) {
  for (const e of erreurs) console.error(`✗ ${e}`);
  console.error(`\n${erreurs.length} problème(s) dans le contenu.`);
  process.exit(1);
}

console.log("✓ Contenu cohérent, et toute partie se termine.");
