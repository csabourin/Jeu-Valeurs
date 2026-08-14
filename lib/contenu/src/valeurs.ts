/**
 * Catalogue de valeurs.
 *
 * Les libellés sont la clé canonique : ils voyagent tels quels dans la base de
 * données, l'API et l'affichage. Le dictionnaire `V` sert uniquement à éviter
 * les fautes de frappe quand on écrit du contenu (cartes, duels, bascules).
 *
 * Vocabulaire : compréhensible vers 12-14 ans, sans être enfantin. Chaque
 * description dit ce que la valeur fait *faire*, pas ce qu'elle « signifie ».
 *
 * Référence : les familles s'inspirent librement du modèle de Schwartz
 * (ouverture au changement / dépassement de soi / continuité / affirmation de
 * soi). Elles servent à équilibrer le contenu et à repérer les oppositions
 * classiques — jamais à classer une personne.
 */

export const familleValeurs = [
  "ouverture", // essayer, décider par soi-même
  "attention_aux_autres", // prendre soin, être juste
  "continuite", // garder, protéger, se sentir en sûreté
  "affirmation", // réussir, être reconnu
] as const;

export type FamilleValeur = (typeof familleValeurs)[number];

export interface ValeurCatalogue {
  /** Libellé canonique — utilisé comme identifiant partout. */
  label: string;
  /** Une phrase, à la deuxième personne, concrète. */
  description: string;
  famille: FamilleValeur;
  /** Valeurs qui entrent souvent en tension avec celle-ci. Sert à équilibrer le contenu. */
  tensionsFrequentes: string[];
}

/** Raccourcis d'écriture pour le contenu. Ne jamais exposer les clés à l'écran. */
export const V = {
  honnetete: "Honnêteté",
  loyaute: "Loyauté",
  liberte: "Liberté",
  securite: "Sécurité",
  justice: "Justice",
  entraide: "Entraide",
  reussite: "Réussite",
  plaisir: "Plaisir",
  curiosite: "Curiosité",
  regles: "Respect des règles",
  autonomie: "Autonomie",
  appartenance: "Appartenance",
  creativite: "Créativité",
  nature: "Nature",
  famille: "Famille",
  reconnaissance: "Reconnaissance",
  tranquillite: "Tranquillité",
  courage: "Courage",
  viePrivee: "Vie privée",
} as const;

export type CleValeur = keyof typeof V;

export const valeurs: ValeurCatalogue[] = [
  {
    label: V.honnetete,
    description: "Dire ce qui est vrai, même quand ça te coûte quelque chose.",
    famille: "attention_aux_autres",
    tensionsFrequentes: [V.loyaute, V.entraide, V.tranquillite],
  },
  {
    label: V.loyaute,
    description: "Rester du côté de ton monde, même quand c'est mal vu.",
    famille: "continuite",
    tensionsFrequentes: [V.honnetete, V.justice, V.autonomie],
  },
  {
    label: V.liberte,
    description: "Pouvoir choisir toi-même, sans avoir à demander la permission.",
    famille: "ouverture",
    tensionsFrequentes: [V.securite, V.regles, V.famille],
  },
  {
    label: V.securite,
    description: "Éviter les gros risques et savoir à quoi t'attendre.",
    famille: "continuite",
    tensionsFrequentes: [V.liberte, V.curiosite, V.courage],
  },
  {
    label: V.justice,
    description: "Que ce soit équitable, même pour ceux que tu n'aimes pas.",
    famille: "attention_aux_autres",
    tensionsFrequentes: [V.loyaute, V.entraide, V.reussite],
  },
  {
    label: V.entraide,
    description: "Donner un coup de main quand quelqu'un en a besoin.",
    famille: "attention_aux_autres",
    tensionsFrequentes: [V.reussite, V.tranquillite, V.justice],
  },
  {
    label: V.reussite,
    description: "Devenir bon dans ce que tu fais et le prouver.",
    famille: "affirmation",
    tensionsFrequentes: [V.entraide, V.plaisir, V.honnetete],
  },
  {
    label: V.plaisir,
    description: "Profiter du moment, rire, faire ce qui te tente.",
    famille: "ouverture",
    tensionsFrequentes: [V.reussite, V.regles, V.securite],
  },
  {
    label: V.curiosite,
    description: "Aller voir ailleurs, essayer ce que tu ne connais pas.",
    famille: "ouverture",
    tensionsFrequentes: [V.securite, V.tranquillite, V.famille],
  },
  {
    label: V.regles,
    description: "Suivre ce qui a été convenu, parce que c'est convenu.",
    famille: "continuite",
    tensionsFrequentes: [V.liberte, V.entraide, V.plaisir],
  },
  {
    label: V.autonomie,
    description: "Te débrouiller par toi-même, sans dépendre de personne.",
    famille: "ouverture",
    tensionsFrequentes: [V.appartenance, V.entraide, V.famille],
  },
  {
    label: V.appartenance,
    description: "Faire partie d'un groupe où tu as ta place.",
    famille: "continuite",
    tensionsFrequentes: [V.autonomie, V.honnetete, V.justice],
  },
  {
    label: V.creativite,
    description: "Faire les choses à ta manière, même si ce n'est pas la façon habituelle.",
    famille: "ouverture",
    tensionsFrequentes: [V.regles, V.reussite, V.appartenance],
  },
  {
    label: V.nature,
    description: "Protéger le vivant et les endroits qui tiennent encore debout.",
    famille: "attention_aux_autres",
    tensionsFrequentes: [V.plaisir, V.reussite, V.securite],
  },
  {
    label: V.famille,
    description: "Garder le lien avec les tiens et ce qu'ils t'ont transmis.",
    famille: "continuite",
    tensionsFrequentes: [V.liberte, V.autonomie, V.curiosite],
  },
  {
    label: V.reconnaissance,
    description: "Que ce que tu fais soit vu et compté.",
    famille: "affirmation",
    tensionsFrequentes: [V.tranquillite, V.entraide, V.honnetete],
  },
  {
    label: V.tranquillite,
    description: "Avoir la paix, du temps à toi, pas de chicane.",
    famille: "continuite",
    tensionsFrequentes: [V.courage, V.justice, V.reconnaissance],
  },
  {
    label: V.courage,
    description: "Faire la chose qui fait peur quand elle compte vraiment.",
    famille: "affirmation",
    tensionsFrequentes: [V.securite, V.tranquillite, V.appartenance],
  },
  {
    label: V.viePrivee,
    description: "Garder pour toi ce qui ne regarde personne d'autre.",
    famille: "attention_aux_autres",
    tensionsFrequentes: [V.honnetete, V.appartenance, V.securite],
  },
];

const parLabel = new Map(valeurs.map((v) => [v.label, v]));

export function trouverValeur(label: string): ValeurCatalogue | undefined {
  return parLabel.get(label);
}

/** Description affichable pour une valeur, y compris une valeur écrite par la personne. */
export function decrireValeur(label: string): string | null {
  return parLabel.get(label)?.description ?? null;
}
