/**
 * Catalogue de valeurs fines.
 *
 * Les libellés sont la clé canonique : ils voyagent tels quels dans la base de
 * données, l'API et l'affichage. Le dictionnaire `V` sert uniquement à éviter
 * les fautes de frappe quand on écrit du contenu (cartes, duels, bascules).
 *
 * ## Fin, pas large
 *
 * Le lexique visible n'est **pas** limité aux grandes catégories de Schwartz.
 * Celles-ci restent le cadre théorique de haut niveau (`taxonomie.ts`) ; ce
 * fichier descend jusqu'à ce qu'une personne dirait vraiment : « contrôle de
 * mon temps », « protection des proches », « parole tenue ». Deux valeurs
 * voisines restent deux valeurs : le moteur sait qu'elles sont proches
 * (`quasiSynonymes`) sans les confondre.
 *
 * Vocabulaire : mots de tous les jours, sans jargon. Chaque description dit ce
 * que la valeur fait *faire*, pas ce qu'elle « signifie ».
 *
 * `motsCles` sert au repérage d'une valeur à partir d'un texte écrit par la
 * personne. C'est une **proposition à confirmer**, jamais une lecture imposée :
 * voir `lexique.ts`.
 */

import {
  famillesValeurs,
  trouverFamilleValeur,
  type FamilleValeurId,
  type GrandeFamille,
} from "./taxonomie";

export interface ValeurCatalogue {
  /** Libellé canonique — utilisé comme identifiant partout. */
  label: string;
  /** Une phrase, à la deuxième personne, concrète. */
  description: string;
  /** Grande famille théorique. Sert à équilibrer le contenu, jamais à classer. */
  famille: GrandeFamille;
  /** Famille de valeurs — l'étage qui décide de l'admissibilité d'un duel. */
  familleValeur: FamilleValeurId;
  /**
   * Valeurs si proches qu'un duel entre elles ne mesurerait rien. La relation
   * est traitée comme symétrique, même déclarée d'un seul côté.
   */
  quasiSynonymes?: string[];
  /** Valeurs qui entrent souvent en tension avec celle-ci. Sert à équilibrer le contenu. */
  tensionsFrequentes: string[];
  /** Mots qui peuvent faire penser à cette valeur dans un texte libre. */
  motsCles: string[];
}

/** Raccourcis d'écriture pour le contenu. Ne jamais exposer les clés à l'écran. */
export const V = {
  // — Autonomie —
  autonomie: "Autonomie",
  liberte: "Liberté",
  independance: "Indépendance",
  liberteChoix: "Liberté de choix",
  liberteExpression: "Liberté d'expression",
  controleTemps: "Contrôle de mon temps",
  autonomieFinanciere: "Autonomie financière",
  viePrivee: "Vie privée",
  autodetermination: "Autodétermination",
  nonDependance: "Non-dépendance",
  capaciteAgir: "Capacité d'agir",
  // — Création —
  creativite: "Créativité",
  originalite: "Originalité",
  expressionDeSoi: "Expression de soi",
  // — Exploration —
  curiosite: "Curiosité",
  aventure: "Aventure",
  apprentissage: "Apprentissage",
  // — Plaisir —
  plaisir: "Plaisir",
  confort: "Confort",
  // — Bienveillance —
  entraide: "Entraide",
  loyaute: "Loyauté",
  soutien: "Soutien",
  disponibilite: "Disponibilité",
  protectionProches: "Protection des proches",
  compassion: "Compassion",
  reciprocite: "Réciprocité",
  responsabiliteProches: "Responsabilité envers les proches",
  // — Justice —
  justice: "Justice",
  egalite: "Égalité",
  // — Intégrité —
  honnetete: "Honnêteté",
  paroleTenue: "Parole tenue",
  coherence: "Cohérence",
  // — Vivant —
  nature: "Nature",
  respectVivant: "Respect du vivant",
  // — Sécurité —
  securite: "Sécurité",
  stabilite: "Stabilité",
  prevoyance: "Prévoyance",
  sante: "Santé",
  // — Règles —
  regles: "Respect des règles",
  ordre: "Ordre",
  devoir: "Devoir",
  // — Appartenance —
  appartenance: "Appartenance",
  famille: "Famille",
  traditions: "Traditions",
  // — Tranquillité —
  tranquillite: "Tranquillité",
  simplicite: "Simplicité",
  // — Réussite —
  reussite: "Réussite",
  competence: "Compétence",
  depassement: "Dépassement",
  // — Reconnaissance —
  reconnaissance: "Reconnaissance",
  influence: "Influence",
  reputation: "Réputation",
  // — Courage —
  courage: "Courage",
  tenacite: "Ténacité",
} as const;

export type CleValeur = keyof typeof V;

export const valeurs: ValeurCatalogue[] = [
  // ── Autonomie ──────────────────────────────────────────────────────────────
  {
    label: V.autonomie,
    description: "Te débrouiller par toi-même, sans dépendre de personne.",
    famille: "ouverture",
    familleValeur: "autonomie",
    quasiSynonymes: [V.independance, V.autodetermination, V.nonDependance],
    tensionsFrequentes: [V.appartenance, V.entraide, V.famille],
    motsCles: ["autonome", "par moi-même", "seul", "me débrouiller"],
  },
  {
    label: V.liberte,
    description: "Pouvoir choisir toi-même, sans avoir à demander la permission.",
    famille: "ouverture",
    familleValeur: "autonomie",
    quasiSynonymes: [V.liberteChoix],
    tensionsFrequentes: [V.securite, V.regles, V.famille],
    motsCles: ["libre", "liberté", "permission", "choisir"],
  },
  {
    label: V.independance,
    description: "Ne rien devoir à personne, et pouvoir partir si ça se gâte.",
    famille: "ouverture",
    familleValeur: "autonomie",
    quasiSynonymes: [V.autonomie, V.nonDependance],
    tensionsFrequentes: [V.entraide, V.appartenance, V.soutien],
    motsCles: ["indépendant", "ne rien devoir", "dépendre", "personne"],
  },
  {
    label: V.liberteChoix,
    description: "Décider de ta propre vie, même quand le choix déplaît.",
    famille: "ouverture",
    familleValeur: "autonomie",
    quasiSynonymes: [V.liberte, V.autodetermination],
    tensionsFrequentes: [V.famille, V.regles, V.securite],
    motsCles: ["décider", "mon choix", "ma vie", "choisir"],
  },
  {
    label: V.liberteExpression,
    description: "Dire ce que tu penses, même là où ça dérange.",
    famille: "ouverture",
    familleValeur: "autonomie",
    tensionsFrequentes: [V.tranquillite, V.appartenance, V.viePrivee],
    motsCles: ["dire", "parler", "m'exprimer", "me taire", "silence"],
  },
  {
    label: V.controleTemps,
    description: "Décider de tes journées : ton horaire t'appartient.",
    famille: "ouverture",
    familleValeur: "autonomie",
    tensionsFrequentes: [V.disponibilite, V.reussite, V.entraide],
    motsCles: ["temps", "horaire", "mes journées", "disponible", "occupé"],
  },
  {
    label: V.autonomieFinanciere,
    description: "Avoir ton propre argent, sans avoir à en demander.",
    famille: "ouverture",
    familleValeur: "autonomie",
    tensionsFrequentes: [V.controleTemps, V.entraide, V.tranquillite],
    motsCles: ["argent", "salaire", "payer", "revenu", "économies"],
  },
  {
    label: V.viePrivee,
    description: "Garder pour toi ce qui ne regarde personne d'autre.",
    famille: "ouverture",
    familleValeur: "autonomie",
    tensionsFrequentes: [V.honnetete, V.appartenance, V.liberteExpression],
    motsCles: ["privé", "secret", "intime", "personne à savoir"],
  },
  {
    label: V.autodetermination,
    description: "Mener ta vie selon tes propres raisons, pas celles des autres.",
    famille: "ouverture",
    familleValeur: "autonomie",
    quasiSynonymes: [V.autonomie, V.liberteChoix],
    tensionsFrequentes: [V.famille, V.appartenance, V.devoir],
    motsCles: ["mes raisons", "ma route", "mon chemin"],
  },
  {
    label: V.nonDependance,
    description: "Ne pas avoir besoin des autres pour tenir debout.",
    famille: "ouverture",
    familleValeur: "autonomie",
    quasiSynonymes: [V.independance, V.autonomie],
    tensionsFrequentes: [V.soutien, V.entraide, V.appartenance],
    motsCles: ["dépendance", "besoin des autres", "aide"],
  },
  {
    label: V.capaciteAgir,
    description: "Pouvoir changer quelque chose au lieu de subir.",
    famille: "ouverture",
    familleValeur: "autonomie",
    tensionsFrequentes: [V.tranquillite, V.regles, V.securite],
    motsCles: ["agir", "faire quelque chose", "subir", "impuissant"],
  },

  // ── Création ───────────────────────────────────────────────────────────────
  {
    label: V.creativite,
    description:
      "Faire les choses à ta manière, même si ce n'est pas la façon habituelle.",
    famille: "ouverture",
    familleValeur: "creation",
    quasiSynonymes: [V.originalite],
    tensionsFrequentes: [V.regles, V.reussite, V.appartenance],
    motsCles: ["créer", "inventer", "ma manière", "imaginer"],
  },
  {
    label: V.originalite,
    description: "Ne pas faire comme tout le monde, et l'assumer.",
    famille: "ouverture",
    familleValeur: "creation",
    quasiSynonymes: [V.creativite],
    tensionsFrequentes: [V.appartenance, V.regles, V.reputation],
    motsCles: ["différent", "original", "comme tout le monde"],
  },
  {
    label: V.expressionDeSoi,
    description: "Que ce que tu fais te ressemble vraiment.",
    famille: "ouverture",
    familleValeur: "creation",
    tensionsFrequentes: [V.appartenance, V.reussite, V.tranquillite],
    motsCles: ["me ressemble", "moi-même", "authentique", "vrai"],
  },

  // ── Exploration ────────────────────────────────────────────────────────────
  {
    label: V.curiosite,
    description: "Aller voir ailleurs, essayer ce que tu ne connais pas.",
    famille: "ouverture",
    familleValeur: "exploration",
    tensionsFrequentes: [V.securite, V.tranquillite, V.famille],
    motsCles: ["curieux", "découvrir", "essayer", "nouveau"],
  },
  {
    label: V.aventure,
    description: "Prendre la route sans savoir exactement ce qui t'attend.",
    famille: "ouverture",
    familleValeur: "exploration",
    tensionsFrequentes: [V.securite, V.stabilite, V.famille],
    motsCles: ["aventure", "voyage", "partir", "risque", "inconnu"],
  },
  {
    label: V.apprentissage,
    description: "Comprendre comment ça marche et devenir meilleur.",
    famille: "ouverture",
    familleValeur: "exploration",
    tensionsFrequentes: [V.confort, V.tranquillite, V.reussite],
    motsCles: ["apprendre", "comprendre", "étudier", "savoir"],
  },

  // ── Plaisir ────────────────────────────────────────────────────────────────
  {
    label: V.plaisir,
    description: "Profiter du moment, rire, faire ce qui te tente.",
    famille: "ouverture",
    familleValeur: "plaisir",
    tensionsFrequentes: [V.reussite, V.regles, V.securite],
    motsCles: ["plaisir", "profiter", "rire", "fun", "envie"],
  },
  {
    label: V.confort,
    description: "Être bien, sans te compliquer la vie.",
    famille: "ouverture",
    familleValeur: "plaisir",
    tensionsFrequentes: [V.depassement, V.courage, V.apprentissage],
    motsCles: ["confort", "confortable", "tranquille", "facile"],
  },

  // ── Bienveillance ──────────────────────────────────────────────────────────
  {
    label: V.entraide,
    description: "Donner un coup de main quand quelqu'un en a besoin.",
    famille: "attention_aux_autres",
    familleValeur: "bienveillance",
    quasiSynonymes: [V.soutien],
    tensionsFrequentes: [V.reussite, V.tranquillite, V.justice],
    motsCles: ["aider", "coup de main", "entraide", "rendre service"],
  },
  {
    label: V.loyaute,
    description: "Rester du côté de ton monde, même quand c'est mal vu.",
    famille: "attention_aux_autres",
    familleValeur: "bienveillance",
    tensionsFrequentes: [V.honnetete, V.justice, V.autonomie],
    motsCles: ["loyal", "fidèle", "trahir", "mon monde", "mes amis"],
  },
  {
    label: V.soutien,
    description: "Être là pour quelqu'un quand ça va mal, sans compter.",
    famille: "attention_aux_autres",
    familleValeur: "bienveillance",
    quasiSynonymes: [V.entraide],
    tensionsFrequentes: [V.controleTemps, V.independance, V.tranquillite],
    motsCles: ["soutenir", "épauler", "être là", "appuyer"],
  },
  {
    label: V.disponibilite,
    description: "Répondre présent quand on t'appelle, même au mauvais moment.",
    famille: "attention_aux_autres",
    familleValeur: "bienveillance",
    tensionsFrequentes: [V.controleTemps, V.tranquillite, V.reussite],
    motsCles: ["disponible", "présent", "répondre", "appeler"],
  },
  {
    label: V.protectionProches,
    description: "Mettre les tiens à l'abri avant tout le reste.",
    famille: "attention_aux_autres",
    familleValeur: "bienveillance",
    tensionsFrequentes: [V.honnetete, V.justice, V.regles],
    motsCles: ["protéger", "mes proches", "à l'abri", "les miens"],
  },
  {
    label: V.compassion,
    description: "Tenir compte de ce que l'autre est en train de vivre.",
    famille: "attention_aux_autres",
    familleValeur: "bienveillance",
    tensionsFrequentes: [V.justice, V.regles, V.honnetete],
    motsCles: ["compassion", "pitié", "comprendre", "souffrance"],
  },
  {
    label: V.reciprocite,
    description: "Rendre ce qu'on t'a donné, et attendre autant en retour.",
    famille: "attention_aux_autres",
    familleValeur: "bienveillance",
    tensionsFrequentes: [V.soutien, V.compassion, V.justice],
    motsCles: ["rendre", "en retour", "donnant-donnant", "je te dois"],
  },
  {
    label: V.responsabiliteProches,
    description: "Assumer ce que tes proches attendent de toi.",
    famille: "attention_aux_autres",
    familleValeur: "bienveillance",
    tensionsFrequentes: [V.controleTemps, V.liberteChoix, V.independance],
    motsCles: ["responsable", "compter sur moi", "charge", "mes parents"],
  },

  // ── Justice ────────────────────────────────────────────────────────────────
  {
    label: V.justice,
    description: "Que ce soit équitable, même pour ceux que tu n'aimes pas.",
    famille: "attention_aux_autres",
    familleValeur: "justice",
    tensionsFrequentes: [V.loyaute, V.entraide, V.reussite],
    motsCles: ["juste", "équitable", "injustice", "mérite"],
  },
  {
    label: V.egalite,
    description: "La même chose pour tout le monde, sans passe-droit.",
    famille: "attention_aux_autres",
    familleValeur: "justice",
    tensionsFrequentes: [V.justice, V.loyaute, V.reussite],
    motsCles: ["égal", "pareil pour tous", "passe-droit", "privilège"],
  },

  // ── Intégrité ──────────────────────────────────────────────────────────────
  {
    label: V.honnetete,
    description: "Dire ce qui est vrai, même quand ça te coûte quelque chose.",
    famille: "attention_aux_autres",
    familleValeur: "integrite",
    tensionsFrequentes: [V.loyaute, V.entraide, V.tranquillite],
    motsCles: ["honnête", "vérité", "mentir", "franc", "vrai"],
  },
  {
    label: V.paroleTenue,
    description: "Faire ce que tu as dit que tu ferais.",
    famille: "attention_aux_autres",
    familleValeur: "integrite",
    tensionsFrequentes: [V.honnetete, V.liberteChoix, V.controleTemps],
    motsCles: ["promesse", "parole", "engagement", "j'ai dit"],
  },
  {
    label: V.coherence,
    description: "Que ta vie ressemble à ce que tu dis croire.",
    famille: "attention_aux_autres",
    familleValeur: "integrite",
    tensionsFrequentes: [V.confort, V.reussite, V.appartenance],
    motsCles: ["cohérent", "au clair avec moi", "principes"],
  },

  // ── Vivant ─────────────────────────────────────────────────────────────────
  {
    label: V.nature,
    description: "Protéger le vivant et les endroits qui tiennent encore debout.",
    famille: "attention_aux_autres",
    familleValeur: "vivant",
    quasiSynonymes: [V.respectVivant],
    tensionsFrequentes: [V.plaisir, V.reussite, V.securite],
    motsCles: ["nature", "environnement", "planète", "dehors"],
  },
  {
    label: V.respectVivant,
    description: "Ne pas faire souffrir une bête pour ton confort.",
    famille: "attention_aux_autres",
    familleValeur: "vivant",
    quasiSynonymes: [V.nature],
    tensionsFrequentes: [V.plaisir, V.confort, V.reussite],
    motsCles: ["animaux", "bête", "souffrir", "vivant"],
  },

  // ── Sécurité ───────────────────────────────────────────────────────────────
  {
    label: V.securite,
    description: "Éviter les gros risques et savoir à quoi t'attendre.",
    famille: "continuite",
    familleValeur: "securite",
    quasiSynonymes: [V.stabilite],
    tensionsFrequentes: [V.liberte, V.curiosite, V.courage],
    motsCles: ["sécurité", "risque", "danger", "sûr", "à l'abri"],
  },
  {
    label: V.stabilite,
    description: "Que demain ressemble à aujourd'hui, sans mauvaise surprise.",
    famille: "continuite",
    familleValeur: "securite",
    quasiSynonymes: [V.securite],
    tensionsFrequentes: [V.aventure, V.curiosite, V.liberte],
    motsCles: ["stable", "routine", "changement", "surprise"],
  },
  {
    label: V.prevoyance,
    description: "Prévoir le coup dur avant qu'il arrive.",
    famille: "continuite",
    familleValeur: "securite",
    tensionsFrequentes: [V.plaisir, V.aventure, V.entraide],
    motsCles: ["prévoir", "économiser", "au cas où", "plus tard"],
  },
  {
    label: V.sante,
    description: "Tenir le coup physiquement, longtemps.",
    famille: "continuite",
    familleValeur: "securite",
    tensionsFrequentes: [V.reussite, V.plaisir, V.disponibilite],
    motsCles: ["santé", "corps", "dormir", "malade", "fatigue"],
  },

  // ── Règles ─────────────────────────────────────────────────────────────────
  {
    label: V.regles,
    description: "Suivre ce qui a été convenu, parce que c'est convenu.",
    famille: "continuite",
    familleValeur: "regles",
    quasiSynonymes: [V.ordre],
    tensionsFrequentes: [V.liberte, V.entraide, V.plaisir],
    motsCles: ["règles", "loi", "interdit", "permis"],
  },
  {
    label: V.ordre,
    description: "Que les choses soient à leur place et que ça roule.",
    famille: "continuite",
    familleValeur: "regles",
    quasiSynonymes: [V.regles],
    tensionsFrequentes: [V.creativite, V.liberte, V.plaisir],
    motsCles: ["ordre", "organisé", "propre", "en place"],
  },
  {
    label: V.devoir,
    description: "Faire ta part, même quand personne ne regarde.",
    famille: "continuite",
    familleValeur: "regles",
    tensionsFrequentes: [V.plaisir, V.liberteChoix, V.confort],
    motsCles: ["devoir", "ma part", "obligation", "il faut"],
  },

  // ── Appartenance ───────────────────────────────────────────────────────────
  {
    label: V.appartenance,
    description: "Faire partie d'un groupe où tu as ta place.",
    famille: "continuite",
    familleValeur: "appartenance",
    tensionsFrequentes: [V.autonomie, V.honnetete, V.justice],
    motsCles: ["groupe", "ma place", "appartenir", "les autres"],
  },
  {
    label: V.famille,
    description: "Garder le lien avec les tiens et ce qu'ils t'ont transmis.",
    famille: "continuite",
    familleValeur: "appartenance",
    tensionsFrequentes: [V.liberte, V.autonomie, V.curiosite],
    motsCles: ["famille", "parents", "enfants", "les miens"],
  },
  {
    label: V.traditions,
    description: "Continuer ce qui se fait depuis longtemps chez toi.",
    famille: "continuite",
    familleValeur: "appartenance",
    tensionsFrequentes: [V.curiosite, V.liberteChoix, V.originalite],
    motsCles: ["tradition", "coutume", "depuis toujours", "héritage"],
  },

  // ── Tranquillité ───────────────────────────────────────────────────────────
  {
    label: V.tranquillite,
    description: "Avoir la paix, du temps à toi, pas de chicane.",
    famille: "continuite",
    familleValeur: "tranquillite",
    tensionsFrequentes: [V.courage, V.justice, V.reconnaissance],
    motsCles: ["paix", "calme", "chicane", "tranquille", "silence"],
  },
  {
    label: V.simplicite,
    description: "Peu de choses, peu d'obligations, rien de compliqué.",
    famille: "continuite",
    familleValeur: "tranquillite",
    tensionsFrequentes: [V.reussite, V.reconnaissance, V.confort],
    motsCles: ["simple", "sobre", "moins", "compliqué"],
  },

  // ── Réussite ───────────────────────────────────────────────────────────────
  {
    label: V.reussite,
    description: "Devenir bon dans ce que tu fais et le prouver.",
    famille: "affirmation",
    familleValeur: "reussite",
    quasiSynonymes: [V.competence],
    tensionsFrequentes: [V.entraide, V.plaisir, V.honnetete],
    motsCles: ["réussir", "réussite", "gagner", "carrière"],
  },
  {
    label: V.competence,
    description: "Savoir vraiment faire ce que tu fais.",
    famille: "affirmation",
    familleValeur: "reussite",
    quasiSynonymes: [V.reussite],
    tensionsFrequentes: [V.plaisir, V.confort, V.entraide],
    motsCles: ["compétent", "bon", "métier", "savoir-faire"],
  },
  {
    label: V.depassement,
    description: "Aller plus loin que ce que tu croyais pouvoir faire.",
    famille: "affirmation",
    familleValeur: "reussite",
    tensionsFrequentes: [V.confort, V.sante, V.tranquillite],
    motsCles: ["dépasser", "plus loin", "défi", "limite"],
  },

  // ── Reconnaissance ─────────────────────────────────────────────────────────
  {
    label: V.reconnaissance,
    description: "Que ce que tu fais soit vu et compté.",
    famille: "affirmation",
    familleValeur: "reconnaissance",
    tensionsFrequentes: [V.tranquillite, V.entraide, V.honnetete],
    motsCles: ["reconnu", "merci", "bravo", "compté", "vu"],
  },
  {
    label: V.influence,
    description: "Peser sur ce qui se décide autour de toi.",
    famille: "affirmation",
    familleValeur: "reconnaissance",
    tensionsFrequentes: [V.tranquillite, V.egalite, V.honnetete],
    motsCles: ["influence", "peser", "poids", "avoir mon mot"],
  },
  {
    label: V.reputation,
    description: "Que les gens pensent du bien de toi, et que ça tienne.",
    famille: "affirmation",
    familleValeur: "reconnaissance",
    tensionsFrequentes: [V.honnetete, V.originalite, V.viePrivee],
    motsCles: ["réputation", "image", "ce qu'on dit", "honte"],
  },

  // ── Courage ────────────────────────────────────────────────────────────────
  {
    label: V.courage,
    description: "Faire la chose qui fait peur quand elle compte vraiment.",
    famille: "affirmation",
    familleValeur: "courage",
    tensionsFrequentes: [V.securite, V.tranquillite, V.appartenance],
    motsCles: ["courage", "peur", "oser", "affronter"],
  },
  {
    label: V.tenacite,
    description: "Continuer quand c'est long et que ça ne paraît pas.",
    famille: "affirmation",
    familleValeur: "courage",
    tensionsFrequentes: [V.confort, V.plaisir, V.sante],
    motsCles: ["tenir", "persévérer", "lâcher", "abandonner"],
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

/** Les valeurs d'une même famille — sert à proposer des valeurs voisines. */
export function valeursDeLaFamille(familleValeur: string): ValeurCatalogue[] {
  return valeurs.filter((v) => v.familleValeur === familleValeur);
}

/**
 * Les valeurs voisines d'une valeur : sa famille d'abord, puis ses
 * quasi-synonymes déclarés ailleurs. Sert à l'écran « je ne trouve pas ce qui
 * me correspond ».
 */
export function valeursVoisines(label: string): ValeurCatalogue[] {
  const valeur = parLabel.get(label);
  if (!valeur) return [];
  const voisines = new Map<string, ValeurCatalogue>();
  for (const v of valeursDeLaFamille(valeur.familleValeur)) {
    if (v.label !== label) voisines.set(v.label, v);
  }
  for (const synonyme of valeur.quasiSynonymes ?? []) {
    const v = parLabel.get(synonyme);
    if (v) voisines.set(v.label, v);
  }
  return Array.from(voisines.values());
}

/** Toutes les familles, avec leurs valeurs — pour la recherche par thème. */
export function lexiqueParFamille(): {
  famille: (typeof famillesValeurs)[number];
  valeurs: ValeurCatalogue[];
}[] {
  return famillesValeurs.map((famille) => ({
    famille,
    valeurs: valeursDeLaFamille(famille.id),
  }));
}

/** La famille d'une valeur, ou `undefined` si la personne a écrit la sienne. */
export function familleDeValeur(label: string) {
  const valeur = parLabel.get(label);
  return valeur ? trouverFamilleValeur(valeur.familleValeur) : undefined;
}
