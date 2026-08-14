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
  cartesMaison,
  cartesImportees,
  distribuerCartes,
  valeursParCategorie,
  CARTES_PAR_FAMILLE,
  valeurs,
  duels,
  series,
  familles,
  calculerParcours,
  planifierDuels,
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

// Chaque catégorie importée doit avoir une correspondance : sans elle, les
// cartes de cette catégorie arrivent sans aucune hypothèse à confirmer.
for (const c of cartesImportees) {
  const table = valeursParCategorie[c.famille];
  verifier(
    c.categorie !== null && table[c.categorie] !== undefined,
    `Catégorie sans correspondance de valeurs : « ${c.categorie} » (${c.famille}).`,
  );
}

// Et l'inverse : une correspondance qui ne sert plus signale un renommage raté.
for (const famille of familles) {
  for (const categorie of Object.keys(valeursParCategorie[famille])) {
    const utilisee = cartesImportees.some(
      (c) => c.famille === famille && c.categorie === categorie,
    );
    if (!utilisee) {
      avertissements.push(
        `Correspondance inutilisée : « ${categorie} » (${famille}).`,
      );
    }
  }
}

// ── Identifiants uniques, toutes situations confondues ───────────────────────

const identifiants = new Map<number, string>();
function reserver(id: number, quoi: string): void {
  const deja = identifiants.get(id);
  verifier(deja === undefined, `Identifiant ${id} utilisé par ${deja} et ${quoi}.`);
  identifiants.set(id, quoi);
}

// Les cartes portent des identifiants textuels, les situations des numériques :
// les deux espaces sont séparés, mais chacun doit rester sans doublon.
const idsCartes = new Map<string, string>();
for (const c of cartes) {
  const deja = idsCartes.get(c.id);
  verifier(deja === undefined, `Identifiant de carte ${c.id} en double (${deja}).`);
  idsCartes.set(c.id, c.label);
}

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
function jouerJusquAuBout(
  valeursConfirmees: string[],
  choix: string,
  graine = 0,
): number {
  const reponses: ReponseConnue[] = [];
  for (let tour = 0; tour < 200; tour++) {
    const parcours = calculerParcours(valeursConfirmees, reponses, graine);
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

const scenarios: { nom: string; cartesChoisies: string[] }[] = [
  { nom: "une seule carte", cartesChoisies: ["JV1002"] },
  { nom: "trois lignes rouges", cartesChoisies: ["JV1002", "JV1004", "JV1010"] },
  {
    nom: "mélange des trois familles",
    cartesChoisies: ["JV1002", "JV1004", "JV2003", "JV2006", "JV3002", "JV3004"],
  },
  { nom: "toutes les cartes", cartesChoisies: cartes.map((c) => c.id) },
];

// Un identifiant qui ne correspond à rien ferait passer un scénario à vide,
// sans que rien ne le signale.
for (const scenario of scenarios) {
  for (const id of scenario.cartesChoisies) {
    verifier(
      cartes.some((c) => c.id === id),
      `Scénario « ${scenario.nom} » : carte introuvable « ${id} ».`,
    );
  }
}

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

// ── La main de cartes ───────────────────────────────────────────────────────

const main1 = distribuerCartes(4242).map((c) => c.id);
const main1bis = distribuerCartes(4242).map((c) => c.id);
verifier(
  main1.join(",") === main1bis.join(","),
  "Une même graine doit redonner exactement la même main de cartes.",
);

const mains = new Set<string>();
for (let graine = 1; graine <= 200; graine++) {
  const main = distribuerCartes(graine);
  mains.add(main.map((c) => c.id).join(","));

  for (const famille of familles) {
    const compte = main.filter((c) => c.famille === famille).length;
    if (compte !== CARTES_PAR_FAMILLE) {
      erreurs.push(
        `Graine ${graine} : ${compte} cartes en « ${famille} », attendu ${CARTES_PAR_FAMILLE}.`,
      );
      break;
    }
  }
  if (new Set(main.map((c) => c.id)).size !== main.length) {
    erreurs.push(`Graine ${graine} : une carte est distribuée deux fois.`);
    break;
  }
  // Sans part maison garantie, une main pourrait n'être faite que de
  // formulations non relues.
  if (!main.some((c) => c.origine === "maison")) {
    erreurs.push(`Graine ${graine} : aucune carte maison dans la main.`);
    break;
  }
}
verifier(
  mains.size > 190,
  `Les mains varient trop peu : ${mains.size} mains distinctes sur 200 parties.`,
);

// Combien de cartes différentes le jeu peut réellement proposer.
const cartesVues = new Set<string>();
for (let graine = 1; graine <= 2000; graine++) {
  for (const c of distribuerCartes(graine)) cartesVues.add(c.id);
}

// ── Le tirage des situations : varié d'une partie à l'autre ─────────────────

const toutesLesValeurs = valeurs.map((v) => v.label);

// Une graine donnée doit toujours produire exactement la même partie, sinon
// rafraîchir la page changerait les questions sous les pieds de la personne.
const planA = planifierDuels(toutesLesValeurs, 12345).map((d) => d.id);
const planA2 = planifierDuels(toutesLesValeurs, 12345).map((d) => d.id);
verifier(
  planA.join(",") === planA2.join(","),
  "Une même graine doit redonner exactement le même plan de duels.",
);

// Et deux parties différentes ne doivent pas jouer la même chose.
const plans = new Set<string>();
for (let graine = 1; graine <= 200; graine++) {
  plans.add(planifierDuels(toutesLesValeurs, graine).map((d) => d.id).join(","));
}
verifier(
  plans.size > 150,
  `Le tirage varie trop peu : ${plans.size} plans distincts sur 200 graines.`,
);

// Combien de situations différentes le jeu peut-il servir en tout.
const vues = new Set<number>();
for (let graine = 1; graine <= 500; graine++) {
  for (const d of planifierDuels(toutesLesValeurs, graine)) vues.add(d.id);
}

// Une variante ne doit jamais partir sans sa jumelle : l'écran annonce
// « déjà croisé, autrement », et la stabilité se calcule en comparant les deux.
for (let graine = 1; graine <= 200; graine++) {
  const plan = planifierDuels(toutesLesValeurs, graine);
  const paires = plan.map((d) => clePaire(d.valeurA, d.valeurB));
  for (const d of plan.filter((x) => x.variante)) {
    const cle = clePaire(d.valeurA, d.valeurB);
    if (paires.filter((p) => p === cle).length < 2) {
      erreurs.push(
        `Graine ${graine} : la variante ${d.id} est servie sans son duel principal.`,
      );
      break;
    }
  }
}

// Toute partie doit se terminer, quelle que soit la graine.
for (const graine of [0, 1, 7, 99, 123456]) {
  jouerJusquAuBout(toutesLesValeurs, "A", graine);
}

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
console.log(
  `Cartes : ${cartesMaison.length} maison + ${cartesImportees.length} importées · ` +
    `${mains.size} mains distinctes sur 200 parties · ${cartesVues.size}/${cartes.length} cartes atteignables`,
);
console.log(
  `Situations : ${plans.size} sélections distinctes sur 200 parties · ${vues.size}/${duels.length} duels atteignables`,
);

for (const a of avertissements) console.warn(`⚠ ${a}`);

if (erreurs.length > 0) {
  for (const e of erreurs) console.error(`✗ ${e}`);
  console.error(`\n${erreurs.length} problème(s) dans le contenu.`);
  process.exit(1);
}

console.log("✓ Contenu cohérent, et toute partie se termine.");
