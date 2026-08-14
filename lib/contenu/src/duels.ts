/**
 * Duels — les collisions concrètes du jeu.
 *
 * Un duel met exactement deux valeurs en tension dans une situation ordinaire.
 * Contrat d'écriture, appliqué à chaque entrée :
 *   • la situation tient en une ou deux phrases et se passe quelque part de précis ;
 *   • `optionA` protège `valeurA`, `optionB` protège `valeurB` — jamais les deux,
 *     jamais ni l'une ni l'autre ;
 *   • les deux options coûtent quelque chose : aucune n'est la « bonne réponse » ;
 *   • une seule chose change entre les deux options (pas de coût caché ajouté
 *     d'un seul côté) ;
 *   • rien de traumatisant, sexuel, violent ou criminellement grave quand une
 *     situation ordinaire teste la même tension.
 *
 * `contexte` sert au moteur : il permet d'observer *où* une valeur passe devant
 * une autre, plutôt que de prétendre à un classement unique et hors sol.
 *
 * Certaines paires ont deux duels (`variante: true` sur le second). Ils sont
 * posés loin l'un de l'autre dans la partie : un même conflit sous une autre
 * forme sert à voir si la réponse tient. Une différence n'est pas une faute —
 * c'est le contexte qui parle.
 */

import { V } from "./valeurs";

export const contextes = [
  "amis",
  "ecole",
  "maison",
  "en_ligne",
  "equipe",
  "public",
] as const;

export type Contexte = (typeof contextes)[number];

export const libellesContexte: Record<Contexte, string> = {
  amis: "Avec tes amis",
  ecole: "À l'école",
  maison: "À la maison",
  en_ligne: "En ligne",
  equipe: "Dans une équipe",
  public: "Devant du monde",
};

export interface DuelContenu {
  id: number;
  valeurA: string;
  valeurB: string;
  situation: string;
  /** Action qui protège valeurA. */
  optionA: string;
  /** Action qui protège valeurB. */
  optionB: string;
  contexte: Contexte;
  /** Second duel sur la même paire, posé plus tard dans la partie. */
  variante?: boolean;
}

export const duels: DuelContenu[] = [
  // ── Honnêteté ─────────────────────────────────────────────────────────────
  {
    id: 101,
    valeurA: V.honnetete,
    valeurB: V.loyaute,
    situation:
      "Ton ami a brisé quelque chose chez quelqu'un. Le propriétaire te demande directement si tu sais qui c'est.",
    optionA: "Tu dis que c'est ton ami.",
    optionB: "Tu dis que tu ne le sais pas.",
    contexte: "amis",
  },
  {
    id: 102,
    valeurA: V.honnetete,
    valeurB: V.loyaute,
    situation:
      "Ton amie te dit qu'elle a copié pendant l'examen. Le prof demande au groupe si quelqu'un a vu quelque chose.",
    optionA: "Tu lèves la main.",
    optionB: "Tu restes silencieux.",
    contexte: "ecole",
    variante: true,
  },
  {
    id: 103,
    valeurA: V.honnetete,
    valeurB: V.entraide,
    situation:
      "Ton ami te montre son dessin, très fier. Tu le trouves franchement raté et il te demande ce que tu en penses.",
    optionA: "Tu lui dis ce que tu penses vraiment.",
    optionB: "Tu lui dis que c'est bon.",
    contexte: "amis",
  },
  {
    id: 104,
    valeurA: V.honnetete,
    valeurB: V.tranquillite,
    situation:
      "À souper, ta famille raconte une version des faits qui est fausse. Te corriger va relancer la chicane d'hier.",
    optionA: "Tu rétablis les faits.",
    optionB: "Tu laisses passer.",
    contexte: "maison",
  },
  {
    id: 105,
    valeurA: V.honnetete,
    valeurB: V.reussite,
    situation:
      "Ton équipe gagne le concours grâce à une idée que tu n'as pas eue. Le jury te félicite personnellement.",
    optionA: "Tu dis que l'idée venait de quelqu'un d'autre.",
    optionB: "Tu remercies et tu gardes le prix.",
    contexte: "public",
  },
  {
    id: 106,
    valeurA: V.honnetete,
    valeurB: V.viePrivee,
    situation:
      "On te demande pourquoi tu étais absent hier. La vraie raison, tu ne veux la raconter à personne.",
    optionA: "Tu dis la vraie raison.",
    optionB: "Tu réponds que ça ne les regarde pas.",
    contexte: "ecole",
  },

  // ── Loyauté ───────────────────────────────────────────────────────────────
  {
    id: 111,
    valeurA: V.loyaute,
    valeurB: V.justice,
    situation:
      "Ton ami a gagné la partie en trichant. Personne ne l'a vu sauf toi, et l'autre joueur repart perdant.",
    optionA: "Tu laisses la victoire à ton ami.",
    optionB: "Tu dis tout haut ce que tu as vu.",
    contexte: "amis",
  },
  {
    id: 112,
    valeurA: V.loyaute,
    valeurB: V.justice,
    situation:
      "Ton groupe a décidé d'exclure quelqu'un du prochain projet. Cette personne n'a rien fait de mal.",
    optionA: "Tu suis la décision du groupe.",
    optionB: "Tu t'y opposes devant tout le monde.",
    contexte: "equipe",
    variante: true,
  },
  {
    id: 113,
    valeurA: V.loyaute,
    valeurB: V.autonomie,
    situation:
      "Ta gang veut passer la fin de semaine ensemble. Toi, tu avais prévu une journée seul, et tu y tiens.",
    optionA: "Tu y vas avec eux.",
    optionB: "Tu gardes ta journée.",
    contexte: "amis",
  },
  {
    id: 114,
    valeurA: V.loyaute,
    valeurB: V.reussite,
    situation:
      "On t'offre une place dans la meilleure équipe. Ton coéquipier actuel compte sur toi pour la saison.",
    optionA: "Tu restes avec lui.",
    optionB: "Tu prends la place.",
    contexte: "equipe",
  },

  // ── Liberté ───────────────────────────────────────────────────────────────
  {
    id: 121,
    valeurA: V.liberte,
    valeurB: V.securite,
    situation:
      "Tu peux rentrer seul à pied le soir, ou attendre quarante minutes que quelqu'un vienne te chercher.",
    optionA: "Tu rentres à pied tout de suite.",
    optionB: "Tu attends qu'on vienne.",
    contexte: "maison",
  },
  {
    id: 122,
    valeurA: V.liberte,
    valeurB: V.securite,
    situation:
      "Un emploi te laisse choisir tes horaires mais peut se terminer en trois mois. L'autre est plate et garanti deux ans.",
    optionA: "Tu prends celui qui te laisse libre.",
    optionB: "Tu prends celui qui est garanti.",
    contexte: "public",
    variante: true,
  },
  {
    id: 123,
    valeurA: V.liberte,
    valeurB: V.regles,
    situation:
      "Le règlement interdit d'apporter ton matériel personnel. Le tien est meilleur et personne ne vérifie jamais.",
    optionA: "Tu apportes le tien.",
    optionB: "Tu utilises celui qui est fourni.",
    contexte: "ecole",
  },
  {
    id: 124,
    valeurA: V.liberte,
    valeurB: V.famille,
    situation:
      "Tu as la chance de partir six mois. Chez toi, on préférerait clairement que tu restes.",
    optionA: "Tu pars.",
    optionB: "Tu restes.",
    contexte: "maison",
  },

  // ── Sécurité ──────────────────────────────────────────────────────────────
  {
    id: 131,
    valeurA: V.securite,
    valeurB: V.curiosite,
    situation:
      "On te propose d'essayer une activité que tu n'as jamais faite. Tu risques d'être vraiment mauvais devant tout le monde.",
    optionA: "Tu regardes cette fois-ci.",
    optionB: "Tu embarques.",
    contexte: "amis",
  },
  {
    id: 132,
    valeurA: V.securite,
    valeurB: V.courage,
    situation:
      "Quelqu'un se fait ridiculiser dans le corridor. Intervenir va probablement te mettre sur la liste.",
    optionA: "Tu passes ton chemin.",
    optionB: "Tu t'interposes.",
    contexte: "ecole",
  },
  {
    id: 133,
    valeurA: V.securite,
    valeurB: V.plaisir,
    situation:
      "La sortie de fin de semaine s'annonce mémorable, mais tu as un examen important lundi matin.",
    optionA: "Tu restes pour étudier.",
    optionB: "Tu y vas.",
    contexte: "amis",
  },
  {
    id: 134,
    valeurA: V.securite,
    valeurB: V.viePrivee,
    situation:
      "Une application gratuite que tu veux vraiment demande l'accès à tes messages et à ta position.",
    optionA: "Tu refuses et tu ne l'installes pas.",
    optionB: "Tu acceptes pour l'avoir.",
    contexte: "en_ligne",
  },

  // ── Justice / entraide ────────────────────────────────────────────────────
  {
    id: 141,
    valeurA: V.justice,
    valeurB: V.entraide,
    situation:
      "Tu dois répartir le travail d'équipe. Un coéquipier traverse une mauvaise semaine et en a moins fait.",
    optionA: "Tu répartis les notes selon ce que chacun a fait.",
    optionB: "Tu donnes la même note à tout le monde.",
    contexte: "equipe",
  },
  {
    id: 142,
    valeurA: V.justice,
    valeurB: V.appartenance,
    situation:
      "Dans le groupe, quelqu'un raconte une joke sur un autre groupe. Tout le monde rit.",
    optionA: "Tu dis que tu ne trouves pas ça drôle.",
    optionB: "Tu laisses passer et tu ris avec eux.",
    contexte: "amis",
  },
  {
    id: 143,
    valeurA: V.entraide,
    valeurB: V.reussite,
    situation:
      "Il reste trente minutes avant la remise. Quelqu'un est bloqué et te demande de l'aide. Ton propre travail n'est pas fini.",
    optionA: "Tu l'aides.",
    optionB: "Tu finis le tien.",
    contexte: "ecole",
  },
  {
    id: 144,
    valeurA: V.entraide,
    valeurB: V.reussite,
    situation:
      "Tu as trouvé une méthode qui te donne une bonne longueur d'avance sur les autres candidats.",
    optionA: "Tu la partages avec eux.",
    optionB: "Tu la gardes pour toi.",
    contexte: "public",
    variante: true,
  },
  {
    id: 145,
    valeurA: V.entraide,
    valeurB: V.tranquillite,
    situation:
      "Il est 22 h, ta soirée est enfin calme. Quelqu'un t'écrit qu'il file mal et voudrait parler longtemps.",
    optionA: "Tu réponds et tu restes en ligne.",
    optionB: "Tu remets ça à demain.",
    contexte: "en_ligne",
  },
  {
    id: 146,
    valeurA: V.entraide,
    valeurB: V.regles,
    situation:
      "Un élève de ta classe te demande de le laisser copier tes réponses parce qu'il n'a pas pu étudier.",
    optionA: "Tu le laisses copier.",
    optionB: "Tu refuses.",
    contexte: "ecole",
  },

  // ── Réussite / plaisir / reconnaissance ───────────────────────────────────
  {
    id: 151,
    valeurA: V.reussite,
    valeurB: V.plaisir,
    situation:
      "Tu progresses vraiment vite depuis que tu t'entraînes tous les soirs, mais tu n'as plus de soirées.",
    optionA: "Tu continues le rythme.",
    optionB: "Tu reprends tes soirées.",
    contexte: "public",
  },
  {
    id: 152,
    valeurA: V.reussite,
    valeurB: V.reconnaissance,
    situation:
      "Tu peux prendre un rôle difficile où tu vas beaucoup apprendre, ou un rôle facile mais très visible.",
    optionA: "Tu prends le rôle difficile.",
    optionB: "Tu prends le rôle visible.",
    contexte: "equipe",
  },
  {
    id: 153,
    valeurA: V.reconnaissance,
    valeurB: V.tranquillite,
    situation:
      "On te propose de présenter le projet devant toute l'école. Ton nom serait sur l'affiche.",
    optionA: "Tu acceptes de présenter.",
    optionB: "Tu laisses quelqu'un d'autre le faire.",
    contexte: "public",
  },
  {
    id: 154,
    valeurA: V.creativite,
    valeurB: V.reussite,
    situation:
      "Ta version originale du projet risque une note moyenne. La version attendue par le prof est une note sûre.",
    optionA: "Tu remets ta version.",
    optionB: "Tu remets celle qui est attendue.",
    contexte: "ecole",
  },

  // ── Curiosité / règles / créativité ───────────────────────────────────────
  {
    id: 161,
    valeurA: V.curiosite,
    valeurB: V.tranquillite,
    situation:
      "Une activité que tu ne connais pas commence demain à 7 h. Tu dormirais deux heures de moins tous les matins.",
    optionA: "Tu t'inscris.",
    optionB: "Tu gardes tes matins.",
    contexte: "ecole",
  },
  {
    id: 162,
    valeurA: V.curiosite,
    valeurB: V.famille,
    situation:
      "Un voyage scolaire tombe exactement sur la fête que ta famille organise chaque année.",
    optionA: "Tu pars en voyage.",
    optionB: "Tu restes pour la fête.",
    contexte: "maison",
  },
  {
    id: 163,
    valeurA: V.regles,
    valeurB: V.plaisir,
    situation:
      "Le parc ferme à 22 h. Il est 22 h 15, la soirée est parfaite et il n'y a personne.",
    optionA: "Tu rentres.",
    optionB: "Tu restes.",
    contexte: "amis",
  },
  {
    id: 164,
    valeurA: V.regles,
    valeurB: V.creativite,
    situation:
      "Le concours impose un format précis. Ton idée ne rentre pas dedans, mais elle est meilleure.",
    optionA: "Tu respectes le format.",
    optionB: "Tu présentes ton idée hors format.",
    contexte: "public",
  },

  // ── Autonomie / appartenance / famille ────────────────────────────────────
  {
    id: 171,
    valeurA: V.autonomie,
    valeurB: V.appartenance,
    situation:
      "Le groupe a choisi une activité qui ne te tente pas du tout. Tout le monde y va.",
    optionA: "Tu fais autre chose de ton côté.",
    optionB: "Tu y vas avec eux.",
    contexte: "amis",
  },
  {
    id: 172,
    valeurA: V.autonomie,
    valeurB: V.appartenance,
    situation:
      "Tu es bloqué depuis deux jours sur quelque chose. Demander de l'aide règle ça en dix minutes.",
    optionA: "Tu continues seul.",
    optionB: "Tu demandes de l'aide.",
    contexte: "ecole",
    variante: true,
  },
  {
    id: 173,
    valeurA: V.autonomie,
    valeurB: V.famille,
    situation:
      "Tu veux prendre une décision importante seul. Chez toi, on veut être consulté avant.",
    optionA: "Tu décides et tu annonces après.",
    optionB: "Tu en discutes avant de décider.",
    contexte: "maison",
  },
  {
    id: 174,
    valeurA: V.appartenance,
    valeurB: V.courage,
    situation:
      "Tout le groupe est d'accord sur quelque chose. Toi, tu penses le contraire, et ils attendent ta réponse.",
    optionA: "Tu dis comme eux.",
    optionB: "Tu dis ce que tu penses.",
    contexte: "equipe",
  },
  {
    id: 175,
    valeurA: V.viePrivee,
    valeurB: V.appartenance,
    situation:
      "La gang partage tout dans un groupe de discussion. On te demande pourquoi tu ne racontes jamais rien.",
    optionA: "Tu continues de garder ça pour toi.",
    optionB: "Tu racontes comme les autres.",
    contexte: "en_ligne",
  },

  // ── Nature ────────────────────────────────────────────────────────────────
  {
    id: 181,
    valeurA: V.nature,
    valeurB: V.plaisir,
    situation:
      "L'activité que tout le monde veut faire abîme un peu l'endroit où vous êtes. Personne d'autre ne s'en occupe.",
    optionA: "Tu proposes de faire autre chose.",
    optionB: "Tu embarques comme les autres.",
    contexte: "amis",
  },
  {
    id: 182,
    valeurA: V.nature,
    valeurB: V.reussite,
    situation:
      "Le projet qui t'ouvrirait le plus de portes est aussi celui qui te met mal à l'aise pour ses effets sur l'environnement.",
    optionA: "Tu refuses le projet.",
    optionB: "Tu le prends.",
    contexte: "public",
  },

  // ── Courage / tranquillité ────────────────────────────────────────────────
  {
    id: 191,
    valeurA: V.courage,
    valeurB: V.tranquillite,
    situation:
      "Tu sais que la conversation que tu remets depuis trois semaines va bien se passer — mais elle va être inconfortable.",
    optionA: "Tu la fais aujourd'hui.",
    optionB: "Tu la remets encore.",
    contexte: "maison",
  },
  {
    id: 192,
    valeurA: V.honnetete,
    valeurB: V.appartenance,
    situation:
      "Le groupe est convaincu d'une chose que tu sais fausse. Les corriger va casser l'ambiance.",
    optionA: "Tu les corriges.",
    optionB: "Tu laisses passer.",
    contexte: "amis",
  },
];

const duelsParId = new Map(duels.map((d) => [d.id, d]));

export function trouverDuel(id: number): DuelContenu | undefined {
  return duelsParId.get(id);
}

/** Clé d'une paire de valeurs, indépendante de l'ordre. */
export function clePaire(a: string, b: string): string {
  return [a, b].sort().join(" | ");
}
