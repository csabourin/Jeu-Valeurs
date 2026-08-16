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
  reecritures,
  CARTES_PAR_FAMILLE,
  valeurs,
  famillesValeurs,
  duels,
  series,
  familles,
  calculerParcours,
  planifierDuels,
  clePaire,
  paireAdmissible,
  pairesAdmissibles,
  analyserFormulation,
  personneCoherente,
  duelsCartesPossibles,
  ajusterModele,
  type CarteDuel,
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

// ── Registre des libellés ───────────────────────────────────────────────────

/**
 * Mots abstraits ou administratifs qui trahissent un libellé non relu.
 *
 * Le jeu s'adresse à des adultes, quel que soit leur niveau de scolarité :
 * ce filet cherche du **jargon**, pas des sujets d'adultes. « Mon travail »,
 * « mon conjoint », « mes économies » sont à leur place ; « instrumentaliser »
 * et « réciprocité » ne le sont pas — non parce qu'ils sont graves, mais parce
 * qu'ils forcent à décoder au lieu de réagir.
 *
 * Les mots retirés de cette liste l'ont été parce qu'ils décrivaient une vie
 * adulte ordinaire (`professionnel`, `partenaire`, `patrimoine`, `dignité`,
 * `légitime`, `vulnérabilité`, `descendants`) : les signaler poussait à
 * réécrire des cartes justes en cartes vagues.
 */
const motsJargon = [
  "délibérément",
  "systématiquement",
  "automatiquement",
  "déshumanis",
  "réciprocité",
  "instrumentalis",
  "institutionnel",
  "conventionnel",
  "conformiste",
  "transcendance",
  "environnement social",
  "structures sociales",
  "perspectives",
  "mesurable",
];

/** Un libellé qui ne se lit pas d'un coup d'œil rate sa cible. */
const LONGUEUR_MAX = 100;

for (const c of cartesImportees) {
  const minuscule = c.label.toLowerCase();
  for (const mot of motsJargon) {
    if (minuscule.includes(mot)) {
      avertissements.push(`${c.id} garde « ${mot} » : ${c.label}`);
      break;
    }
  }
  if (c.label.length > LONGUEUR_MAX) {
    avertissements.push(
      `${c.id} fait ${c.label.length} caractères : ${c.label}`,
    );
  }
  verifier(
    !c.label.includes("\u2019"),
    `${c.id} mélange les apostrophes typographiques et droites : ${c.label}`,
  );
}

// Une réécriture qui pointe un identifiant inexistant est du texte mort : elle
// ne s'affichera jamais et personne ne le remarquera.
const idsImportes = new Set(cartesImportees.map((c) => c.id));
for (const id of Object.keys(reecritures)) {
  verifier(
    idsImportes.has(id),
    `Réécriture orpheline : « ${id} » ne correspond à aucune carte.`,
  );
}

// ── Identifiants uniques, toutes situations confondues ───────────────────────

const identifiants = new Map<number, string>();
function reserver(id: number, quoi: string): void {
  const deja = identifiants.get(id);
  verifier(
    deja === undefined,
    `Identifiant ${id} utilisé par ${deja} et ${quoi}.`,
  );
  identifiants.set(id, quoi);
}

// Les cartes portent des identifiants textuels, les situations des numériques :
// les deux espaces sont séparés, mais chacun doit rester sans doublon.
const idsCartes = new Map<string, string>();
for (const c of cartes) {
  const deja = idsCartes.get(c.id);
  verifier(
    deja === undefined,
    `Identifiant de carte ${c.id} en double (${deja}).`,
  );
  idsCartes.set(c.id, c.label);
}

for (const d of duels) reserver(d.id, `duel ${d.id}`);
for (const s of series) {
  for (const p of s.paliers) reserver(p.id, `palier ${s.id}/${p.palier}`);
}

// ── Duels ────────────────────────────────────────────────────────────────────

for (const d of duels) {
  verifier(
    labelsConnus.has(d.valeurA),
    `Duel ${d.id} : valeurA inconnue « ${d.valeurA} ».`,
  );
  verifier(
    labelsConnus.has(d.valeurB),
    `Duel ${d.id} : valeurB inconnue « ${d.valeurB} ».`,
  );
  verifier(
    d.valeurA !== d.valeurB,
    `Duel ${d.id} : la même valeur des deux côtés.`,
  );
  verifier(d.optionA !== d.optionB, `Duel ${d.id} : deux options identiques.`);
}

// Une variante n'a de sens que s'il existe un duel principal sur la même paire.
for (const d of duels) {
  verifier(
    personneCoherente([d.situation, d.optionA, d.optionB]),
    `Duel ${d.id} mélange les personnes grammaticales : ${d.situation}`,
  );
}

for (const d of duels.filter((x) => x.variante)) {
  const principal = duels.some(
    (x) =>
      !x.variante &&
      clePaire(x.valeurA, x.valeurB) === clePaire(d.valeurA, d.valeurB),
  );
  verifier(
    principal,
    `Duel ${d.id} est une variante sans duel principal sur sa paire.`,
  );
}

// ── Séries de bascule ────────────────────────────────────────────────────────

const idsSeries = new Set<string>();
for (const s of series) {
  verifier(!idsSeries.has(s.id), `Série ${s.id} : identifiant en double.`);
  idsSeries.add(s.id);

  verifier(labelsConnus.has(s.valeurA), `Série ${s.id} : valeurA inconnue.`);
  verifier(labelsConnus.has(s.valeurB), `Série ${s.id} : valeurB inconnue.`);
  verifier(
    s.valeurA !== s.valeurB,
    `Série ${s.id} : la même valeur des deux côtés.`,
  );
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

// Une valeur qui n'apparaît dans aucune situation écrite reste jouable : les
// duels entre les cartes de la personne la porteront. C'est le prix d'un
// lexique fin — et c'est voulu.
const valeursSansSituation = valeurs.filter(
  (v) => !duels.some((d) => d.valeurA === v.label || d.valeurB === v.label),
);
if (valeursSansSituation.length > 0) {
  avertissements.push(
    `${valeursSansSituation.length} valeurs sans situation écrite (jouables seulement par les cartes) : ` +
      valeursSansSituation
        .slice(0, 8)
        .map((v) => v.label)
        .join(", ") +
      (valeursSansSituation.length > 8 ? "…" : ""),
  );
}

// Une valeur que rien ne propose reste choisissable à l'étape « Tes mots »,
// où le lexique complet est offert — mais elle ne sera jamais suggérée, donc
// presque jamais confirmée. On le signale sans bloquer.
const jamaisSuggerees = valeurs.filter(
  (v) =>
    !cartes.some((c) => c.valeursSuggerees.includes(v.label)) &&
    !duels.some((d) => d.valeurA === v.label || d.valeurB === v.label),
);
if (jamaisSuggerees.length > 0) {
  avertissements.push(
    `${jamaisSuggerees.length} valeurs ne sont proposées par aucune carte ` +
      `(choisissables seulement à la main) : ` +
      jamaisSuggerees.map((v) => v.label).join(", "),
  );
}

// ── Admissibilité des confrontations ────────────────────────────────────────

for (const d of duels) {
  const verdict = paireAdmissible(d.valeurA, d.valeurB);
  verifier(
    verdict.admissible,
    `Duel ${d.id} oppose deux valeurs inadmissibles : ${verdict.explication}`,
  );
}

for (const s of series) {
  const verdict = paireAdmissible(s.valeurA, s.valeurB);
  verifier(
    verdict.admissible,
    `Série ${s.id} oppose deux valeurs inadmissibles : ${verdict.explication}`,
  );
}

// ── Registre d'écriture ─────────────────────────────────────────────────────

for (const c of cartes) {
  for (const defaut of analyserFormulation(c.label)) {
    const message = `${c.id} · ${defaut.explication} : ${c.label}`;
    if (defaut.gravite === "erreur") erreurs.push(message);
    else avertissements.push(message);
  }
}

// Les duels générés à partir des cartes doivent rester cohérents : un énoncé au
// « tu » avec des options au « je » ne dit plus qui parle.
const mainTest: CarteDuel[] = [
  {
    id: "t1",
    famille: "lignes_rouges",
    label: cartes.find((c) => c.famille === "lignes_rouges")!.label,
    valeursConfirmees: ["Honnêteté"],
  },
  {
    id: "t2",
    famille: "horizons",
    label: cartes.find((c) => c.famille === "horizons")!.label,
    valeursConfirmees: ["Réussite"],
  },
  {
    id: "t3",
    famille: "tresors",
    label: cartes.find((c) => c.famille === "tresors")!.label,
    valeursConfirmees: ["Tranquillité"],
  },
  {
    id: "t4",
    famille: "lignes_rouges",
    label: cartes.filter((c) => c.famille === "lignes_rouges")[1]!.label,
    valeursConfirmees: ["Loyauté"],
  },
];
for (const duel of duelsCartesPossibles(mainTest)) {
  verifier(
    personneCoherente([duel.situation, duel.optionA, duel.optionB]),
    `Duel de cartes ${duel.id} mélange les personnes grammaticales : ${duel.situation}`,
  );
}

// ── Une partie doit toujours se terminer ─────────────────────────────────────

/**
 * Rejoue une partie complète en répondant toujours de la même façon —
 * première passe **et** mise à l'épreuve, puisque c'est là que le moteur
 * d'exploration décide seul de ce qu'il propose.
 */
function jouerJusquAuBout(
  valeursConfirmees: string[],
  cartesChoisies: CarteDuel[],
  choix: string,
  graine = 0,
  phaseDemandee: "ordination" | "epreuve" = "ordination",
): number {
  const reponses: ReponseConnue[] = [];
  for (let tour = 0; tour < 300; tour++) {
    const parcours = calculerParcours({
      valeursConfirmees,
      reponses,
      cartes: cartesChoisies,
      graine,
      phaseDemandee,
    });
    if (!parcours.prochaine) return tour;
    const q = parcours.prochaine;

    // La première passe ne doit jamais réclamer de question de relance.
    if (q.phase === "ordination" && q.approfondir) {
      erreurs.push(
        `La première passe demande un approfondissement (question ${q.dilemmeId}).`,
      );
    }
    // Et aucune question ne doit opposer deux valeurs inadmissibles.
    const verdict = paireAdmissible(q.valeurA, q.valeurB);
    if (!verdict.admissible) {
      erreurs.push(`Question ${q.dilemmeId} : ${verdict.explication}`);
    }

    reponses.push({
      dilemmeId: q.dilemmeId,
      valeurA: q.valeurA,
      valeurB: q.valeurB,
      carteA: q.carteA,
      carteB: q.carteB,
      choix,
      contexte: q.contexte,
      phase: q.phase,
      facteurDepend: null,
      serieId: q.serieId,
      palier: q.palier,
    });
  }
  erreurs.push(
    `Le parcours ne se termine pas pour [${valeursConfirmees.slice(0, 4).join(", ")}…] en répondant « ${choix} » (${phaseDemandee}).`,
  );
  return -1;
}

const scenarios: { nom: string; cartesChoisies: string[] }[] = [
  { nom: "une seule carte", cartesChoisies: ["JV1002"] },
  {
    nom: "trois lignes rouges",
    cartesChoisies: ["JV1002", "JV1004", "JV1010"],
  },
  {
    nom: "mélange des trois familles",
    cartesChoisies: [
      "JV1002",
      "JV1004",
      "JV2003",
      "JV2006",
      "JV3002",
      "JV3004",
    ],
  },
  // Une main réaliste, mais large : personne ne retient 900 cartes, et les
  // duels de cartes croissent en n². Vingt-quatre est déjà au-delà de ce qu'un
  // écran de sélection produit en pratique.
  {
    nom: "main large",
    cartesChoisies: [
      ...cartes.filter((c) => c.famille === "lignes_rouges").slice(0, 8),
      ...cartes.filter((c) => c.famille === "horizons").slice(0, 8),
      ...cartes.filter((c) => c.famille === "tresors").slice(0, 8),
    ].map((c) => c.id),
  },
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

/** La personne confirme les valeurs proposées : le cas le plus courant. */
function mainDe(ids: string[]): CarteDuel[] {
  return ids.flatMap((id, rang) => {
    const carte = cartes.find((c) => c.id === id);
    if (!carte) return [];
    return [
      {
        id: String(rang + 1),
        famille: carte.famille,
        label: carte.label,
        valeursConfirmees: carte.valeursSuggerees,
      },
    ];
  });
}

for (const scenario of scenarios) {
  const main = mainDe(scenario.cartesChoisies);
  const valeursConfirmees = Array.from(
    new Set(main.flatMap((c) => c.valeursConfirmees ?? [])),
  );
  // Une main jouable oppose au moins une limite à au moins un enjeu, et porte
  // au moins une paire de valeurs que les règles autorisent.
  const jouable =
    main.some((c) => c.famille === "lignes_rouges") &&
    main.some((c) => c.famille === "horizons" || c.famille === "tresors") &&
    pairesAdmissibles(valeursConfirmees).length > 0;

  for (const choix of ["A", "B", "ca_depend", "je_ne_sais_pas", "passer"]) {
    for (const phase of ["ordination", "epreuve"] as const) {
      const tours = jouerJusquAuBout(valeursConfirmees, main, choix, 1, phase);
      // Le mécanisme est asymétrique : il faut une limite **et** un enjeu pour
      // qu'une question existe. Une main d'un seul rôle n'a rien à poser, et
      // c'est correct — l'écran de sélection interdit d'ailleurs d'en sortir.
      // Ce qu'on vérifie ici, c'est qu'elle se termine proprement plutôt que
      // de boucler ; l'exigence de poser une question ne vaut que pour une
      // main réellement jouable.
      if (
        tours === 0 &&
        phase === "ordination" &&
        jouable &&
        main.length >= 2
      ) {
        erreurs.push(
          `Scénario « ${scenario.nom} » : aucune question posée alors qu'il reste des paires à couvrir.`,
        );
      }
    }
  }
}

// Le parcours doit tenir sans aucune valeur, sans planter.
const vide = calculerParcours({ valeursConfirmees: [], reponses: [] });
verifier(
  vide.prochaine === null,
  "Sans valeur confirmée, le jeu devrait n'avoir aucune question.",
);

// Et l'ordination doit tenir sur une partie vide.
const ordinationVide = ajusterModele([], []);
verifier(
  ordinationVide.forces.length === 0 && ordinationVide.cycles.length === 0,
  "L'ordination devrait être vide quand rien n'a été joué.",
);

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
  plans.add(
    planifierDuels(toutesLesValeurs, graine)
      .map((d) => d.id)
      .join(","),
  );
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
const mainComplete = mainDe(scenarios[scenarios.length - 1].cartesChoisies);
for (const graine of [0, 1, 7, 99, 123456]) {
  jouerJusquAuBout(toutesLesValeurs, mainComplete, "A", graine);
  jouerJusquAuBout(toutesLesValeurs, mainComplete, "A", graine, "epreuve");
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
  `Relecture : ${Object.keys(reecritures).length} cartes réécrites, ` +
    `${cartesImportees.length - Object.keys(reecritures).length} gardées telles quelles`,
);
console.log(
  `Cartes : ${cartesMaison.length} maison + ${cartesImportees.length} relues · ` +
    `${mains.size} mains distinctes sur 200 parties · ${cartesVues.size}/${cartes.length} cartes atteignables`,
);
console.log(
  `Situations : ${plans.size} sélections distinctes sur 200 parties · ${vues.size}/${duels.length} duels atteignables`,
);

// La taxonomie, et ce qu'elle écarte : c'est le chiffre à surveiller quand on
// ajoute des valeurs fines. Trop de paires refusées, et le jeu n'a plus rien à
// poser ; trop peu, et les faux duels reviennent.
const toutesPaires = (valeurs.length * (valeurs.length - 1)) / 2;
const admissibles = pairesAdmissibles(toutesLesValeurs).length;
console.log(
  `Taxonomie : ${famillesValeurs.length} familles de valeurs · ` +
    `${admissibles}/${toutesPaires} paires admissibles ` +
    `(${toutesPaires - admissibles} écartées comme faux duels)`,
);

for (const a of avertissements) console.warn(`⚠ ${a}`);

if (erreurs.length > 0) {
  for (const e of erreurs) console.error(`✗ ${e}`);
  console.error(`\n${erreurs.length} problème(s) dans le contenu.`);
  process.exit(1);
}

console.log("✓ Contenu cohérent, et toute partie se termine.");
