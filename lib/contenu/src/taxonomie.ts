/**
 * Taxonomie des valeurs — quatre étages, du plus théorique au plus concret.
 *
 *   grande famille  →  famille de valeurs  →  valeur fine  →  carte
 *   (cadre Schwartz)   (autonomie…)          (indépendance…)  (« Ne dépendre
 *                                                              de personne »)
 *
 * Exemple, lu de bas en haut :
 *
 *   « Ne dépendre de personne »   → Indépendance → autonomie → ouverture
 *   « Pouvoir décider de ma vie » → Liberté de choix → autonomie → ouverture
 *
 * Les deux cartes ci-dessus disent la même chose sous deux angles : les
 * confronter ne mesurerait rien. C'est le rôle de `eligibilite.ts`, qui lit
 * cette hiérarchie pour refuser les faux duels.
 *
 * ## Pourquoi deux étages au-dessus des valeurs fines
 *
 * Le modèle de Schwartz est un **cadre de haut niveau** : il sert à équilibrer
 * le contenu et à repérer les oppositions classiques. Il est trop large pour
 * l'affichage — personne ne dit « je tiens à l'ouverture au changement ». Les
 * valeurs fines sont ce que la personne voit et nomme ; les familles servent au
 * moteur.
 *
 * ## Tensions internes
 *
 * Deux valeurs d'une même famille ne s'opposent normalement pas. Quelques
 * paires font exception — elles tirent vraiment dans deux directions, et
 * `tensionsInternes` les autorise nommément. Tout le reste d'une même famille
 * est refusé par défaut : c'est le sens du garde-fou.
 */

export const grandesFamilles = [
  "ouverture", // essayer, décider par soi-même
  "attention_aux_autres", // prendre soin, être juste
  "continuite", // garder, protéger, se sentir en sûreté
  "affirmation", // réussir, être reconnu
] as const;

export type GrandeFamille = (typeof grandesFamilles)[number];

export const libellesGrandeFamille: Record<GrandeFamille, string> = {
  ouverture: "Ouverture",
  attention_aux_autres: "Attention aux autres",
  continuite: "Continuité",
  affirmation: "Affirmation",
};

/** Identifiants des familles de valeurs — l'étage intermédiaire. */
export const famillesValeursIds = [
  "autonomie",
  "creation",
  "exploration",
  "plaisir",
  "bienveillance",
  "justice",
  "integrite",
  "vivant",
  "securite",
  "regles",
  "appartenance",
  "tranquillite",
  "reussite",
  "reconnaissance",
  "courage",
] as const;

export type FamilleValeurId = (typeof famillesValeursIds)[number];

export interface FamilleValeur {
  id: FamilleValeurId;
  label: string;
  grandeFamille: GrandeFamille;
  /** Une phrase, concrète, pour l'écran « valeurs voisines ». */
  description: string;
  /**
   * Paires de valeurs fines de cette famille qui s'opposent réellement.
   * Elles seules échappent à l'interdit « même famille ⇒ pas de duel ».
   * Les libellés sont ceux de `valeurs.ts`.
   */
  tensionsInternes: [string, string][];
}

export const famillesValeurs: FamilleValeur[] = [
  {
    id: "autonomie",
    label: "Autonomie",
    grandeFamille: "ouverture",
    description: "Décider par soi-même et ne pas avoir à demander la permission.",
    tensionsInternes: [
      // Se garder pour soi ou pouvoir tout dire : les deux sont de l'autonomie,
      // et elles se contredisent dès qu'on parle en public.
      ["Vie privée", "Liberté d'expression"],
      // Se laisser suivre pour pouvoir sortir : donner de la vie privée pour
      // gagner de la liberté est un marché courant, et un vrai choix.
      ["Vie privée", "Liberté"],
      // Gagner assez pour être libre coûte souvent le temps qu'on voulait libre.
      ["Autonomie financière", "Contrôle de mon temps"],
    ],
  },
  {
    id: "creation",
    label: "Création",
    grandeFamille: "ouverture",
    description: "Faire les choses à sa manière et laisser quelque chose de soi.",
    tensionsInternes: [],
  },
  {
    id: "exploration",
    label: "Exploration",
    grandeFamille: "ouverture",
    description: "Aller voir ailleurs, apprendre, essayer ce qu'on ne connaît pas.",
    tensionsInternes: [],
  },
  {
    id: "plaisir",
    label: "Plaisir",
    grandeFamille: "ouverture",
    description: "Profiter de ce qui est bon maintenant.",
    tensionsInternes: [],
  },
  {
    id: "bienveillance",
    label: "Bienveillance",
    grandeFamille: "attention_aux_autres",
    description: "Prendre soin des gens de son monde et rester là pour eux.",
    tensionsInternes: [
      // Être disponible pour tout le monde, ou couvrir d'abord les siens.
      ["Disponibilité", "Protection des proches"],
      // Rester du côté des siens quand ce sont eux qui ont fait mal.
      ["Loyauté", "Compassion"],
      // Donner parce qu'on reçoit, ou donner sans compter.
      ["Réciprocité", "Soutien"],
    ],
  },
  {
    id: "justice",
    label: "Justice",
    grandeFamille: "attention_aux_autres",
    description: "Que ce soit équitable, y compris pour ceux qu'on n'aime pas.",
    tensionsInternes: [
      // Donner à chacun selon sa situation, ou exactement la même chose à tous.
      ["Justice", "Égalité"],
    ],
  },
  {
    id: "integrite",
    label: "Intégrité",
    grandeFamille: "attention_aux_autres",
    description: "Que ce qu'on dit et ce qu'on fait tiennent ensemble.",
    tensionsInternes: [
      // Dire la vérité maintenant, ou tenir la promesse de se taire.
      ["Honnêteté", "Parole tenue"],
    ],
  },
  {
    id: "vivant",
    label: "Vivant",
    grandeFamille: "attention_aux_autres",
    description: "Protéger la nature, les bêtes et les endroits qui tiennent encore.",
    tensionsInternes: [],
  },
  {
    id: "securite",
    label: "Sécurité",
    grandeFamille: "continuite",
    description: "Savoir à quoi s'attendre et éviter les gros risques.",
    tensionsInternes: [],
  },
  {
    id: "regles",
    label: "Règles",
    grandeFamille: "continuite",
    description: "Suivre ce qui a été convenu, parce que c'est convenu.",
    tensionsInternes: [],
  },
  {
    id: "appartenance",
    label: "Appartenance",
    grandeFamille: "continuite",
    description: "Faire partie d'un monde à soi et garder le lien.",
    tensionsInternes: [
      // Les siens ne veulent pas toujours la même chose que le groupe.
      ["Famille", "Appartenance"],
      // Ce qui se fait depuis toujours, ou ce que les tiens veulent maintenant.
      ["Traditions", "Famille"],
    ],
  },
  {
    id: "tranquillite",
    label: "Tranquillité",
    grandeFamille: "continuite",
    description: "Avoir la paix, du temps à soi, pas de chicane.",
    tensionsInternes: [],
  },
  {
    id: "reussite",
    label: "Réussite",
    grandeFamille: "affirmation",
    description: "Devenir bon dans ce qu'on fait et aller au bout.",
    tensionsInternes: [],
  },
  {
    id: "reconnaissance",
    label: "Reconnaissance",
    grandeFamille: "affirmation",
    description: "Que ce qu'on fait soit vu, compté, et pèse un peu.",
    tensionsInternes: [],
  },
  {
    id: "courage",
    label: "Courage",
    grandeFamille: "affirmation",
    description: "Faire la chose qui fait peur quand elle compte vraiment.",
    tensionsInternes: [],
  },
];

const familleParId = new Map(famillesValeurs.map((f) => [f.id, f]));

export function trouverFamilleValeur(
  id: string,
): FamilleValeur | undefined {
  return familleParId.get(id as FamilleValeurId);
}

export function famillesDeGrandeFamille(
  grande: GrandeFamille,
): FamilleValeur[] {
  return famillesValeurs.filter((f) => f.grandeFamille === grande);
}
