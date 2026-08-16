/**
 * Séries de bascule — « à partir d'où est-ce que ça change ? »
 *
 * Une série reprend la même tension, les mêmes deux options, et fait bouger
 * **une seule** dimension d'un palier à l'autre. Si la réponse change entre le
 * palier 1 et le palier 3, on tient un point de bascule : ce n'est pas une
 * contradiction, c'est l'endroit précis où le réglage compte.
 *
 * Les options sont définies au niveau de la série, pas du palier : c'est ce qui
 * garantit qu'une seule chose a bougé. Seule `situation` change.
 *
 * Les dimensions réutilisent le vocabulaire des facteurs « ça dépend » des
 * duels. Quand quelqu'un répond « ça dépend du coût personnel », le jeu peut
 * lui servir la série où seul le coût personnel bouge.
 */

import { V } from "./valeurs";

export const dimensions = [
  "ampleur_impact",
  "proximite_sociale",
  "certitude",
  "cout_personnel",
  "urgence",
  "nombre_personnes",
  "reversibilite",
] as const;

export type Dimension = (typeof dimensions)[number];

/**
 * Libellés pensés pour tenir dans « on monte ___ » et « ___ décide ».
 * Éviter les tournures qui obligeraient à accorder un participe ou à contracter
 * un « de » : le même libellé sert dans plusieurs phrases générées.
 */
export const libellesDimension: Record<Dimension, string> = {
  ampleur_impact: "la gravité",
  proximite_sociale: "la proximité",
  certitude: "la certitude",
  cout_personnel: "le coût pour toi",
  urgence: "l'urgence",
  nombre_personnes: "le nombre de personnes touchées",
  reversibilite: "le caractère définitif",
};

export interface PalierBascule {
  id: number;
  /** 1, 2, 3 — le réglage monte d'un cran à chaque palier. */
  palier: number;
  situation: string;
  /** Le cran lui-même, affiché comme réglage (ex. « un devoir » → « un examen final »). */
  reglage: string;
}

export interface SerieBascule {
  id: string;
  valeurA: string;
  valeurB: string;
  dimension: Dimension;
  /** Une phrase qui plante le décor, identique pour toute la série. */
  amorce: string;
  /** Action qui protège valeurA — identique à tous les paliers. */
  optionA: string;
  /** Action qui protège valeurB — identique à tous les paliers. */
  optionB: string;
  paliers: PalierBascule[];
}

export const series: SerieBascule[] = [
  {
    id: "b_honnetete_loyaute_ampleur",
    valeurA: V.honnetete,
    valeurB: V.loyaute,
    dimension: "ampleur_impact",
    amorce:
      "Ton ami a triché. Tu es la seule personne au courant, et on te pose la question directement.",
    optionA: "Tu dis ce que tu sais.",
    optionB: "Tu ne dis rien.",
    paliers: [
      {
        id: 501,
        palier: 1,
        reglage: "un devoir sans importance",
        situation:
          "Il a copié les réponses d'un devoir qui ne compte pas dans la note.",
      },
      {
        id: 502,
        palier: 2,
        reglage: "l'examen final",
        situation:
          "Il a copié pendant l'examen final, celui qui décide de sa note de l'année.",
      },
      {
        id: 503,
        palier: 3,
        reglage: "quelqu'un d'autre est accusé",
        situation:
          "Il a copié pendant l'examen final, et c'est quelqu'un d'autre qui est en train de se faire accuser à sa place.",
      },
    ],
  },
  {
    id: "b_entraide_reussite_cout",
    valeurA: V.entraide,
    valeurB: V.reussite,
    dimension: "cout_personnel",
    amorce:
      "Quelqu'un est bloqué et te demande de l'aide, juste avant la remise.",
    optionA: "Tu l'aides.",
    optionB: "Tu continues ton travail.",
    paliers: [
      {
        id: 511,
        palier: 1,
        reglage: "dix minutes",
        situation:
          "L'aider te prendrait dix minutes. Ton travail est déjà prêt.",
      },
      {
        id: 512,
        palier: 2,
        reglage: "ta soirée",
        situation:
          "L'aider te prendrait ta soirée, et ton travail n'est pas fini.",
      },
      {
        id: 513,
        palier: 3,
        reglage: "ta propre note",
        situation:
          "L'aider te prendrait ta soirée, et tu remettrais le tien à moitié fait — avec la note qui vient avec.",
      },
    ],
  },
  {
    id: "b_liberte_securite_certitude",
    valeurA: V.liberte,
    valeurB: V.securite,
    dimension: "certitude",
    amorce:
      "Tu veux faire quelque chose seul, à ta façon. On te dit que ça pourrait mal tourner.",
    optionA: "Tu y vas.",
    optionB: "Tu laisses faire.",
    paliers: [
      {
        id: 521,
        palier: 1,
        reglage: "personne n'en sait rien",
        situation:
          "Personne ne sait vraiment si le risque est réel. C'est une impression, rien de plus.",
      },
      {
        id: 522,
        palier: 2,
        reglage: "c'est déjà arrivé",
        situation:
          "C'est déjà arrivé à quelqu'un l'an passé, dans les mêmes conditions que toi.",
      },
      {
        id: 523,
        palier: 3,
        reglage: "c'est arrivé aux trois derniers",
        situation:
          "Les trois dernières personnes qui l'ont fait dans ces conditions-là s'y sont blessées.",
      },
    ],
  },
  {
    id: "b_courage_tranquillite_proximite",
    valeurA: V.courage,
    valeurB: V.tranquillite,
    dimension: "proximite_sociale",
    amorce:
      "Quelqu'un se fait rabaisser devant toi. Intervenir va t'attirer du trouble.",
    optionA: "Tu interviens.",
    optionB: "Tu laisses passer.",
    paliers: [
      {
        id: 531,
        palier: 1,
        reglage: "un inconnu",
        situation: "Tu ne connais pas du tout la personne visée.",
      },
      {
        id: 532,
        palier: 2,
        reglage: "quelqu'un de ta classe",
        situation:
          "C'est quelqu'un de ta classe, à qui tu parles de temps en temps.",
      },
      {
        id: 533,
        palier: 3,
        reglage: "ton meilleur ami",
        situation: "C'est ton meilleur ami.",
      },
    ],
  },
  {
    id: "b_justice_loyaute_nombre",
    valeurA: V.justice,
    valeurB: V.loyaute,
    dimension: "nombre_personnes",
    amorce:
      "Ton groupe s'est arrangé pour obtenir un avantage auquel il n'avait pas droit. Tu peux le signaler.",
    optionA: "Tu le signales.",
    optionB: "Tu couvres ton groupe.",
    paliers: [
      {
        id: 541,
        palier: 1,
        reglage: "une personne lésée",
        situation: "Une seule personne perd quelque chose à cause de ça.",
      },
      {
        id: 542,
        palier: 2,
        reglage: "toute une équipe",
        situation: "Une équipe complète perd sa place à cause de ça.",
      },
      {
        id: 543,
        palier: 3,
        reglage: "tout le monde",
        situation: "Tous les autres participants sont pénalisés à cause de ça.",
      },
    ],
  },
  {
    id: "b_regles_entraide_ampleur",
    valeurA: V.regles,
    valeurB: V.entraide,
    dimension: "ampleur_impact",
    amorce:
      "Quelqu'un te demande de contourner une règle pour lui rendre service.",
    optionA: "Tu respectes la règle.",
    optionB: "Tu rends le service.",
    paliers: [
      {
        id: 551,
        palier: 1,
        reglage: "un service pratique",
        situation: "C'est pour lui éviter un détour de vingt minutes.",
      },
      {
        id: 552,
        palier: 2,
        reglage: "sa place dans l'équipe",
        situation: "C'est pour lui éviter de perdre sa place dans l'équipe.",
      },
      {
        id: 553,
        palier: 3,
        reglage: "sa sécurité",
        situation:
          "C'est pour lui éviter de rentrer seul de nuit sans moyen de transport.",
      },
    ],
  },
  {
    id: "b_viepivee_securite_reversibilite",
    valeurA: V.viePrivee,
    valeurB: V.securite,
    dimension: "reversibilite",
    amorce:
      "On te demande de partager en permanence ta position avec un service, en échange d'une protection.",
    optionA: "Tu refuses.",
    optionB: "Tu acceptes.",
    paliers: [
      {
        id: 561,
        palier: 1,
        reglage: "annulable en tout temps",
        situation:
          "Tu peux couper le partage quand tu veux, et les données sont effacées.",
      },
      {
        id: 562,
        palier: 2,
        reglage: "gardé un an",
        situation:
          "Tu peux couper le partage, mais l'historique est conservé un an.",
      },
      {
        id: 563,
        palier: 3,
        reglage: "impossible à effacer",
        situation:
          "Une fois partagé, l'historique reste là et rien ne peut l'effacer.",
      },
    ],
  },
  {
    id: "b_autonomie_appartenance_urgence",
    valeurA: V.autonomie,
    valeurB: V.appartenance,
    dimension: "urgence",
    amorce: "Le groupe a décidé quelque chose sans toi et attend ta réponse.",
    optionA: "Tu prends le temps de décider toi-même.",
    optionB: "Tu suis le groupe.",
    paliers: [
      {
        id: 571,
        palier: 1,
        reglage: "une semaine",
        situation: "Tu as une semaine pour répondre.",
      },
      {
        id: 572,
        palier: 2,
        reglage: "ce soir",
        situation: "Il faut que tu répondes ce soir.",
      },
      {
        id: 573,
        palier: 3,
        reglage: "tout de suite",
        situation: "Tout le monde te regarde et attend ta réponse maintenant.",
      },
    ],
  },
  {
    id: "b_nature_plaisir_nombre",
    valeurA: V.nature,
    valeurB: V.plaisir,
    dimension: "nombre_personnes",
    amorce: "L'activité que le groupe veut faire abîme l'endroit où vous êtes.",
    optionA: "Tu proposes autre chose.",
    optionB: "Tu embarques.",
    paliers: [
      {
        id: 581,
        palier: 1,
        reglage: "vous êtes trois",
        situation:
          "Vous êtes trois. Les traces disparaîtront d'ici quelques jours.",
      },
      {
        id: 582,
        palier: 2,
        reglage: "vous êtes trente",
        situation: "Vous êtes trente, et ça se verra tout l'été.",
      },
      {
        id: 583,
        palier: 3,
        reglage: "chaque fin de semaine",
        situation:
          "Vous êtes trente, et le même groupe revient chaque fin de semaine de la saison.",
      },
    ],
  },
  {
    id: "b_honnetete_entraide_ampleur",
    valeurA: V.honnetete,
    valeurB: V.entraide,
    dimension: "ampleur_impact",
    amorce:
      "Quelqu'un te demande ton avis sincère sur quelque chose qu'il a préparé.",
    optionA: "Tu dis ce que tu penses vraiment.",
    optionB: "Tu l'encourages sans dire le fond de ta pensée.",
    paliers: [
      {
        id: 591,
        palier: 1,
        reglage: "juste pour le plaisir",
        situation: "Il l'a fait pour le plaisir et il n'en fera rien d'autre.",
      },
      {
        id: 592,
        palier: 2,
        reglage: "il va le présenter",
        situation: "Il va le présenter devant la classe demain.",
      },
      {
        id: 593,
        palier: 3,
        reglage: "sa candidature en dépend",
        situation:
          "Il va l'envoyer pour une candidature qui compte beaucoup pour lui.",
      },
    ],
  },
];

const seriesParId = new Map(series.map((s) => [s.id, s]));

export function trouverSerie(id: string): SerieBascule | undefined {
  return seriesParId.get(id);
}

export function trouverPalier(
  serieId: string,
  palier: number,
): PalierBascule | undefined {
  return seriesParId.get(serieId)?.paliers.find((p) => p.palier === palier);
}
