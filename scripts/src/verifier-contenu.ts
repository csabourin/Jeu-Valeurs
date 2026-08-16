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
  familles,
  calculerParcours,
  planifierCollisions,
  collisionsPossibles,
  peutEntrerEnCollision,
  situerValeur,
  valeursFines,
  type CarteJeu,
  type CarteContenu,
  type CarteArbitrable,
  type ReponseArbitrage,
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

// ── Lexique des valeurs ──────────────────────────────────────────────────────

// Une valeur fine doit se rattacher à une famille qui existe, sinon le moteur
// ne peut plus mesurer la distance entre deux valeurs et se remet à fabriquer
// des collisions circulaires.
const labelsFins = new Set<string>();
for (const fine of valeursFines) {
  verifier(
    !labelsFins.has(fine.label),
    `Valeur fine « ${fine.label} » en double.`,
  );
  labelsFins.add(fine.label);

  verifier(
    labelsConnus.has(fine.famille),
    `Valeur fine « ${fine.label} » : famille inconnue « ${fine.famille} ».`,
  );
  verifier(
    !labelsConnus.has(fine.label),
    `Valeur fine « ${fine.label} » porte le nom d'une famille.`,
  );
}

for (const fine of valeursFines) {
  for (const voisine of fine.voisines) {
    verifier(
      labelsFins.has(voisine),
      `« ${fine.label} » déclare une voisine inconnue « ${voisine} ».`,
    );
  }
  for (const tension of fine.tensions) {
    verifier(
      situerValeur(tension).famille === fine.famille,
      `« ${fine.label} » déclare une tension hors de sa famille : « ${tension} ».`,
    );
  }
}

// Une famille sans valeur fine reste jouable — le moteur travaille alors à la
// maille famille —, mais c'est une occasion manquée de dire quelque chose de
// précis dans la carte finale.
for (const v of valeurs) {
  const fines = valeursFines.filter((f) => f.famille === v.label).length;
  if (fines === 0) {
    avertissements.push(`Valeur « ${v.label} » n'a aucune valeur fine.`);
  }
}

// ── Couverture ───────────────────────────────────────────────────────────────

for (const famille of familles) {
  const compte = cartes.filter((c) => c.famille === famille).length;
  if (compte < 10) {
    avertissements.push(`Famille « ${famille} » : seulement ${compte} cartes.`);
  }
}

// Une valeur qui ne peut entrer en collision avec aucune autre ne pourra jamais
// être mise à l'épreuve : elle serait dans le lexique sans jamais être jouée.
for (const v of valeurs) {
  const opposable = valeurs.some(
    (autre) =>
      autre.label !== v.label &&
      peutEntrerEnCollision([v.label], [autre.label]).admissible,
  );
  verifier(
    opposable,
    `Valeur « ${v.label} » ne peut être opposée à aucune autre valeur.`,
  );
}

/**
 * Une main jouable : des limites *et* des enjeux.
 *
 * `distribuerCartes` compose la main famille par famille, donc couper au rang N
 * ne rendrait que des lignes rouges — et une main sans enjeu ne produit aucune
 * collision. On prélève donc un nombre fixe dans chaque famille.
 */
function echantillonner(graine: number, parFamille: number): CarteContenu[] {
  const main = distribuerCartes(graine);
  return familles.flatMap((famille) =>
    main.filter((c) => c.famille === famille).slice(0, parFamille),
  );
}

// ── Une partie doit toujours se terminer ─────────────────────────────────────

/** Les cartes du catalogue, telles que le parcours les reçoit. */
function versCartes(ids: string[]): CarteArbitrable[] {
  return ids.flatMap((id) => {
    const carte = cartes.find((c) => c.id === id);
    if (!carte) return [];
    return [
      {
        id: carte.id,
        famille: carte.famille,
        label: carte.label,
        valeursConfirmees: carte.valeursSuggerees,
      },
    ];
  });
}

/**
 * Rejoue une partie complète en répondant toujours de la même façon, arbitrages
 * compris. Le but n'est pas de simuler une vraie personne : c'est de garantir
 * qu'aucune combinaison de réponses ne laisse quelqu'un coincé sur un écran.
 */
function jouerJusquAuBout(
  main: CarteArbitrable[],
  choix: string,
  graine = 0,
): number {
  const reponses: ReponseConnue[] = [];
  const arbitrages: ReponseArbitrage[] = [];

  for (let tour = 0; tour < 400; tour++) {
    const parcours = calculerParcours({
      reponses,
      cartes: main,
      arbitrages,
      graine,
      // On force l'approfondissement : c'est le chemin le plus long, donc
      // celui qui doit se terminer.
      approfondissementDemande: true,
    });

    if (parcours.prochainBloc) {
      arbitrages.push({
        bloc: parcours.prochainBloc.bloc,
        carteIds: parcours.prochainBloc.cartes.map((c) => c.id),
        carteMeilleure:
          choix === "passer" ? null : parcours.prochainBloc.cartes[0].id,
        cartePire:
          choix === "passer"
            ? null
            : parcours.prochainBloc.cartes[
                parcours.prochainBloc.cartes.length - 1
              ].id,
      });
      continue;
    }

    if (!parcours.prochaine) return tour;

    reponses.push({
      dilemmeId: parcours.prochaine.dilemmeId,
      valeurA: parcours.prochaine.valeurA,
      valeurB: parcours.prochaine.valeurB,
      choix,
      facteurDepend: null,
    });
  }

  erreurs.push(
    `Le parcours ne se termine pas pour ${main.length} cartes en répondant « ${choix} ».`,
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
  // Une main volumineuse mais atteignable. Le tirage propose 54 cartes et la
  // personne en retient une poignée ; prendre les 921 du catalogue ferait
  // 161 895 collisions, un état de partie qui n'existe pas.
  {
    nom: "une grosse main",
    cartesChoisies: echantillonner(4242, 13).map((c) => c.id),
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

for (const scenario of scenarios) {
  const main = versCartes(scenario.cartesChoisies);
  const admissibles = collisionsPossibles(
    main.map((c): CarteJeu => ({
      id: c.id,
      famille: c.famille,
      label: c.label,
      valeurs: c.valeursConfirmees ?? [],
    })),
  ).length;

  for (const choix of ["A", "B", "ca_depend", "passer"]) {
    const tours = jouerJusquAuBout(main, choix);
    if (tours === 0 && admissibles > 0) {
      erreurs.push(`Scénario « ${scenario.nom} » : aucune question posée.`);
    }
  }
}

// Le parcours doit tenir sans aucune carte, sans planter.
const vide = calculerParcours({ reponses: [] });
verifier(
  vide.prochaine === null && vide.prochainBloc === null,
  "Sans carte, le jeu ne devrait avoir aucune question.",
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

// ── Le tirage des collisions : varié d'une partie à l'autre ─────────────────

function mainType(graine: number): CarteJeu[] {
  return echantillonner(graine, 6).map((c) => ({
    id: c.id,
    famille: c.famille,
    label: c.label,
    valeurs: c.valeursSuggerees,
  }));
}

const mainReference = mainType(12345);

// Une graine donnée doit toujours produire exactement la même partie, sinon
// rafraîchir la page changerait les questions sous les pieds de la personne.
const planA = planifierCollisions(mainReference, 12345).premiereVague.map(
  (c) => c.id,
);
const planA2 = planifierCollisions(mainReference, 12345).premiereVague.map(
  (c) => c.id,
);
verifier(
  planA.join(",") === planA2.join(","),
  "Une même graine doit redonner exactement le même plan de collisions.",
);

// Et deux parties différentes ne doivent pas jouer la même chose.
const plans = new Set<string>();
for (let graine = 1; graine <= 200; graine++) {
  plans.add(
    planifierCollisions(mainReference, graine)
      .premiereVague.map((c) => c.id)
      .join(","),
  );
}
verifier(
  plans.size > 150,
  `Le tirage varie trop peu : ${plans.size} plans distincts sur 200 graines.`,
);

// Toutes les collisions admissibles doivent rester jouables : le jeu ne coupe
// pas la matrice à un nombre arbitraire, il la sert par vagues.
for (let graine = 1; graine <= 50; graine++) {
  const plan = planifierCollisions(mainReference, graine);
  const servies = plan.premiereVague.length + plan.approfondissement.length;
  if (servies !== plan.total) {
    erreurs.push(
      `Graine ${graine} : ${servies} collisions servies sur ${plan.total} admissibles.`,
    );
    break;
  }
}

// Aucune collision circulaire ne doit jamais sortir du planificateur.
let collisionsVerifiees = 0;
for (let graine = 1; graine <= 50; graine++) {
  const main = mainType(graine);
  for (const c of collisionsPossibles(main)) {
    collisionsVerifiees++;
    const verdict = peutEntrerEnCollision(c.valeursLimite, c.valeursEnjeu);
    if (!verdict.admissible) {
      erreurs.push(`Collision circulaire servie : « ${c.situation} ».`);
      break;
    }
  }
}

// La première vague ne doit jamais poser deux fois le même couple de valeurs :
// c'est ce qui garantit qu'un premier portrait couvre toute la constellation.
for (let graine = 1; graine <= 50; graine++) {
  const vague = planifierCollisions(mainType(graine), graine).premiereVague;
  const couples = vague.map((c) => [c.valeurA, c.valeurB].sort().join("|"));
  if (new Set(couples).size !== couples.length) {
    erreurs.push(
      `Graine ${graine} : un couple de valeurs revient dans la première vague.`,
    );
    break;
  }
}

// Toute partie doit se terminer, quelle que soit la graine.
for (const graine of [0, 1, 7, 99, 123456]) {
  jouerJusquAuBout(
    mainReference.map((c) => ({
      id: c.id,
      famille: c.famille,
      label: c.label,
      valeursConfirmees: c.valeurs,
    })),
    "A",
    graine,
  );
}

// ── Rapport ──────────────────────────────────────────────────────────────────

console.log(
  [
    `${valeurs.length} familles de valeurs`,
    `${valeursFines.length} valeurs fines`,
    `${cartes.length} cartes`,
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
  `Collisions : ${plans.size} sélections distinctes sur 200 parties · ` +
    `${collisionsVerifiees} collisions vérifiées, aucune circulaire`,
);

for (const a of avertissements) console.warn(`⚠ ${a}`);

if (erreurs.length > 0) {
  for (const e of erreurs) console.error(`✗ ${e}`);
  console.error(`\n${erreurs.length} problème(s) dans le contenu.`);
  process.exit(1);
}

console.log("✓ Contenu cohérent, et toute partie se termine.");
