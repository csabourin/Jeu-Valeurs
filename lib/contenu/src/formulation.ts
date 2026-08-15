/**
 * Les règles d'écriture d'une carte, rendues vérifiables.
 *
 * Une carte se lit d'un coup d'œil, dit **une seule** chose et n'essaie pas de
 * se protéger. Les tournures prudentes (« je crois que je ne voudrais
 * jamais… ») ajoutent trois mots et retirent tout le tranchant : la personne
 * n'est pas en train de témoigner sous serment, elle prend une carte.
 *
 * Ce que ce module refuse :
 *
 *   • la prudence inutile — « je crois que », « il me semble que » ;
 *   • la double négation — on ne fait pas choisir entre deux « ne pas » ;
 *   • la personne mélangée — « Serais-**tu** prêt à mentir à quelqu'un qui
 *     **me** fait confiance » : on ne sait plus qui parle ;
 *   • la carte trop longue, ou qui empile deux idées ;
 *   • les conditions en cascade (« même si », « sauf si », « même lorsque »)
 *     qui font tenir deux valeurs dans une seule phrase.
 *
 * Une carte personnelle se dit au « je ». Un scénario peut s'adresser à la
 * personne au « tu ». Les deux ne se mélangent jamais **à l'intérieur d'un même
 * texte** — ni à l'intérieur d'un même duel : voir `personneCoherente`.
 *
 * Ces règles sont appliquées par `verifier-contenu`, pas au moment de
 * l'affichage : le contenu se corrige à la source.
 */

/** Au-delà, la carte ne se lit plus d'un coup d'œil. */
export const LONGUEUR_CARTE_MAX = 90;

export type CodeDefaut =
  | "prudence_inutile"
  | "double_negation"
  | "personne_melangee"
  | "trop_long"
  | "idees_multiples"
  | "conditions_multiples";

export interface DefautFormulation {
  code: CodeDefaut;
  /** `erreur` : la règle est ferme. `avertissement` : à relire, pas à bloquer. */
  gravite: "erreur" | "avertissement";
  explication: string;
}

// « mien » et « tien » sont volontairement absents : « je tiens à » et « tu
// tiens » les feraient apparaître partout, et le pronom possessif est rare.
const MOTS_PREMIERE = new Set(["je", "j", "me", "m", "moi", "mon", "ma", "mes"]);

const MOTS_DEUXIEME = new Set(["tu", "te", "t", "toi", "ton", "ta", "tes"]);

function mots(texte: string): string[] {
  return texte
    .toLocaleLowerCase("fr")
    .replace(/[’]/g, "'")
    .split(/[^\p{Letter}]+/u)
    .filter((mot) => mot.length > 0);
}

export type Personne = "je" | "tu" | "neutre" | "melangee";

/**
 * Qui parle dans ce texte.
 *
 * `melangee` est toujours un défaut : à l'intérieur d'une même phrase, « tu »
 * et « me » désignent deux personnes différentes et le lecteur doit deviner
 * laquelle est lui.
 */
export function personneDominante(texte: string): Personne {
  const liste = mots(texte);
  const premiere = liste.some((mot) => MOTS_PREMIERE.has(mot));
  const deuxieme = liste.some((mot) => MOTS_DEUXIEME.has(mot));
  if (premiere && deuxieme) return "melangee";
  if (premiere) return "je";
  if (deuxieme) return "tu";
  return "neutre";
}

/**
 * Les textes d'un même duel tiennent-ils ensemble ?
 *
 * Un duel peut être écrit au « je » (les cartes de la personne) ou au « tu »
 * (un scénario qui s'adresse à elle). Il ne peut pas être les deux : l'énoncé
 * dirait « toi » et les réponses « moi ».
 */
export function personneCoherente(textes: string[]): boolean {
  const personnes = textes.map(personneDominante);
  if (personnes.includes("melangee")) return false;
  const marquees = new Set(personnes.filter((p) => p !== "neutre"));
  return marquees.size <= 1;
}

const RENFORTS_NEGATION = ["jamais", "rien", "nul", "aucun", "aucune"];

/** Découpe grossière en propositions : deux négations ne se stackent que dans la même. */
function propositions(texte: string): string[] {
  return texte
    .replace(/[’]/g, "'")
    .split(
      /[,;:.!?]|\b(?:quand|lorsqu[e']|parce qu[e']|puisqu[e']|si|mais|alors qu[e']|tandis qu[e'])/i,
    )
    .map((bout) => bout.trim())
    .filter((bout) => bout.length > 0);
}

function estInfinitif(mot: string): boolean {
  return /(?:er|ir|re|oir)$/.test(mot) && mot.length > 3;
}

const VERBES_PRIVATIFS = ["refuser", "refuse", "refusant", "eviter", "evite"];

/**
 * Combien de négations **distinctes** dans une même proposition.
 *
 * En français, « ne … pas », « ne … jamais » et « ne … rien » sont une seule
 * négation : « pas », « jamais » et « rien » ne font que renforcer le « ne ».
 * « Faire semblant de ne rien voir » est donc du français ordinaire, pas une
 * double négation.
 *
 * Ce qu'on refuse, c'est l'empilement qui oblige à résoudre deux négations
 * pour comprendre la carte : « ne pas refuser d'aider », « je ne crois pas que
 * je ne le ferais pas ». Les propositions sont comptées séparément — deux
 * négations dans deux bouts de phrase différents ne se gênent pas.
 */
export function compterNegations(texte: string): number {
  let maximum = 0;

  for (const proposition of propositions(texte)) {
    const liste = mots(proposition);

    // « n'importe quoi » n'a rien d'une négation.
    const ne = liste.filter(
      (mot, rang) =>
        (mot === "ne" || mot === "n") && liste[rang + 1] !== "importe",
    ).length;
    // « sans » ne nie que ce qui suit : « sans importance » n'est pas une
    // négation, « sans jamais donner » en est une.
    const sans = liste.filter(
      (mot, rang) =>
        mot === "sans" &&
        (RENFORTS_NEGATION.includes(liste[rang + 1] ?? "") ||
          estInfinitif(liste[rang + 1] ?? "")),
    ).length;
    const privatifs = liste.filter((mot) =>
      VERBES_PRIVATIFS.includes(mot),
    ).length;
    // « Jamais un merci » : un renfort seul porte la négation à lui tout seul.
    const renfortSeul =
      ne === 0 &&
      sans === 0 &&
      liste.some((mot) => RENFORTS_NEGATION.includes(mot))
        ? 1
        : 0;

    maximum = Math.max(maximum, ne + sans + privatifs + renfortSeul);
  }

  return maximum;
}

/**
 * La prudence, c'est la tournure qui met la carte à distance : « je crois
 * **que** je ne voudrais jamais… ». « Ce que je crois » n'en est pas une —
 * c'est le sujet de la carte. D'où le « que » exigé partout.
 */
const PRUDENCE =
  /\b(je (crois|pense|suppose|dirais|imagine)\s+(que|qu')|il me semble\s+(que|qu')|peut-[êe]tre que\b|j'aurais tendance|j'ai l'impression que|je ne pense pas [êe]tre capable|je ne serais probablement)/i;

const EMPILEMENT = /(,\s*et\b|\bainsi que\b|\btout en\b|\bet aussi\b|;)/i;

const CONDITIONS = /\b(m[êe]me si|sauf si|m[êe]me lorsque|m[êe]me quand|[àa] moins que|quitte [àa])\b/i;

const AUTRES_LIENS = /\b(et|ou|mais|parce que|alors que|tandis que)\b/i;

/**
 * Tout ce qui cloche dans un libellé. Liste vide ⇒ la carte passe.
 */
export function analyserFormulation(texte: string): DefautFormulation[] {
  const defauts: DefautFormulation[] = [];

  if (PRUDENCE.test(texte)) {
    defauts.push({
      code: "prudence_inutile",
      gravite: "erreur",
      explication:
        "Tournure prudente : la carte doit dire la chose, pas la mettre au conditionnel.",
    });
  }

  if (compterNegations(texte) >= 2) {
    defauts.push({
      code: "double_negation",
      gravite: "erreur",
      explication:
        "Double négation : il faut relire deux fois pour savoir ce qui est proposé.",
    });
  }

  if (personneDominante(texte) === "melangee") {
    defauts.push({
      code: "personne_melangee",
      gravite: "erreur",
      explication:
        "« je » et « tu » dans la même phrase : on ne sait plus de qui on parle.",
    });
  }

  if (texte.length > LONGUEUR_CARTE_MAX) {
    defauts.push({
      code: "trop_long",
      gravite: "avertissement",
      explication: `${texte.length} caractères : la carte ne se lit plus d'un coup d'œil.`,
    });
  }

  if (EMPILEMENT.test(texte)) {
    defauts.push({
      code: "idees_multiples",
      gravite: "avertissement",
      explication:
        "Deux idées empilées : couper en deux cartes, ou garder la principale.",
    });
  }

  if (CONDITIONS.test(texte) && AUTRES_LIENS.test(texte)) {
    defauts.push({
      code: "conditions_multiples",
      gravite: "avertissement",
      explication:
        "Une condition (« même si », « sauf si »…) empilée sur autre chose : la carte porte deux valeurs à la fois.",
    });
  }

  return defauts;
}

/** Raccourci : la carte passe-t-elle les règles fermes ? */
export function formulationAcceptable(texte: string): boolean {
  return !analyserFormulation(texte).some((d) => d.gravite === "erreur");
}
