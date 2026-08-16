/**
 * Lexique des valeurs — trois couches.
 *
 *     valeur fine  →  famille  →  domaine
 *
 * Exemple :
 *
 *     « Ne dépendre de personne »   (carte)
 *       → indépendance personnelle  (valeur fine)
 *         → Autonomie               (famille)
 *           → ouverture             (domaine)
 *
 * Pourquoi trois couches et pas une. Une carte n'est pas une valeur : c'est un
 * geste, un projet ou un bien. Elle *porte* des valeurs, et le moteur a besoin
 * de savoir à quelle distance deux valeurs se trouvent l'une de l'autre — sinon
 * il fabrique des collisions circulaires du genre « sacrifier ton autonomie
 * pour préserver ton autonomie ». Deux cartes lexicalement très différentes
 * peuvent protéger exactement la même chose.
 *
 * La couche fine est aussi ce qui rend la carte finale intéressante. Sans elle
 * on ne peut dire que « Autonomie : 82 % ». Avec elle on peut dire « tu tiens
 * beaucoup à ne dépendre de personne, moins à contrôler ton temps ».
 *
 * Les 19 familles sont les valeurs qui existaient déjà : les 921 cartes du
 * catalogue les nomment dans `valeursSuggérées`, et ces libellés voyagent en
 * base. Elles restent la clé canonique — on ajoute une couche *en dessous*,
 * jamais on ne renomme au-dessus. Une carte qui ne nomme qu'une famille reste
 * parfaitement utilisable : le moteur travaille alors à la maille famille.
 *
 * Les domaines s'inspirent librement de Schwartz. Ils servent à mesurer une
 * distance et à équilibrer le contenu — jamais à classer une personne.
 */

import { valeurs, V, type FamilleValeur } from "./valeurs";

/** Le domaine est la grande famille théorique. Même liste que `familleValeurs`. */
export type Domaine = FamilleValeur;

export interface ValeurFine {
  /** Libellé canonique, visible à l'écran. */
  label: string;
  /** Une phrase, à la deuxième personne, qui dit ce que la valeur fait faire. */
  description: string;
  /** La famille dont elle relève — un des 19 libellés historiques. */
  famille: string;
  /**
   * Valeurs si proches qu'une collision entre les deux n'apprendrait rien.
   * « Perdre ma liberté de décision pour préserver mon indépendance » est
   * techniquement une opposition, introspectivement une boucle.
   */
  voisines: string[];
  /**
   * Valeurs de la *même famille* avec lesquelles la tension est réelle. Sans
   * cette déclaration, deux valeurs d'une même famille ne se rencontrent pas :
   * on suppose qu'elles vont dans le même sens.
   */
  tensions: string[];
}

interface Source {
  label: string;
  description: string;
  voisines?: string[];
  tensions?: string[];
}

/**
 * Le lexique, famille par famille.
 *
 * Registre : compréhensible vers 12-14 ans, sans être enfantin. Chaque
 * description dit ce que la valeur fait *faire*, pas ce qu'elle « signifie ».
 */
const parFamille: Record<string, Source[]> = {
  [V.honnetete]: [
    {
      label: "Dire la vérité",
      description:
        "Dire ce qui est, même quand le mensonge serait plus simple.",
      voisines: ["Ne pas faire semblant"],
    },
    {
      label: "Ne pas tricher",
      description: "Gagner pour vrai, ou pas du tout.",
      tensions: ["Tenir parole"],
    },
    {
      label: "Tenir parole",
      description: "Faire ce que tu as dit que tu ferais.",
      voisines: ["Respecter ma parole donnée"],
    },
    {
      label: "Ne pas faire semblant",
      description: "Te montrer tel que tu es, même si ça déplaît.",
      voisines: ["Dire la vérité"],
    },
    {
      label: "Admettre mes torts",
      description: "Dire que tu t'es trompé au lieu de te défendre.",
    },
  ],

  [V.loyaute]: [
    {
      label: "Ne pas trahir",
      description: "Rester du côté de ton monde quand ça devient difficile.",
    },
    {
      label: "Garder un secret",
      description: "Ce qu'on t'a confié reste chez toi.",
      voisines: ["Garder mes affaires pour moi"],
    },
    {
      label: "Défendre les miens",
      description: "Prendre leur défense même devant plus fort que toi.",
      tensions: ["Ne pas trahir"],
    },
    {
      label: "Être là dans l'épreuve",
      description: "Rester quand les autres partent.",
      voisines: ["Être présent pour les autres"],
    },
  ],

  [V.liberte]: [
    {
      label: "Liberté de choix",
      description: "Décider toi-même, sans avoir à demander la permission.",
      voisines: ["Indépendance personnelle", "Décider seul"],
    },
    {
      label: "Liberté de parole",
      description: "Dire ce que tu penses sans avoir à te taire.",
      tensions: ["Liberté de choix"],
    },
    {
      label: "Contrôle de mon temps",
      description: "Choisir à quoi passent tes journées.",
      voisines: ["Avoir du temps à moi"],
    },
    {
      label: "Ne pas être contrôlé",
      description: "Ne pas avoir quelqu'un au-dessus de ton épaule.",
      voisines: ["Ne rien devoir à personne", "Indépendance personnelle"],
    },
    {
      label: "Pouvoir partir",
      description: "Garder la porte ouverte, même si tu ne la prends pas.",
    },
  ],

  [V.securite]: [
    {
      label: "Stabilité financière",
      description: "Savoir que l'argent va rentrer le mois prochain.",
      tensions: ["Éviter le danger"],
    },
    {
      label: "Ma santé",
      description: "Garder ton corps en état de te porter longtemps.",
    },
    {
      label: "Savoir à quoi m'attendre",
      description: "Préférer ce qui est prévisible aux surprises.",
      voisines: ["Éviter le danger"],
    },
    {
      label: "Avoir un toit",
      description: "Un endroit à toi où rentrer le soir.",
    },
    {
      label: "Éviter le danger",
      description: "Ne pas jouer avec ce qui peut mal finir.",
      voisines: ["Savoir à quoi m'attendre"],
    },
  ],

  [V.justice]: [
    {
      label: "Que ce soit équitable",
      description: "Que chacun reçoive selon ce qui est juste.",
      voisines: ["Traiter tout le monde pareil"],
    },
    {
      label: "Traiter tout le monde pareil",
      description: "Pas de passe-droit, même pour ceux que tu aimes.",
      voisines: ["Que ce soit équitable"],
      tensions: ["Défendre les plus faibles"],
    },
    {
      label: "Défendre les plus faibles",
      description: "Te mettre du côté de celui qui n'a personne.",
      tensions: ["Traiter tout le monde pareil"],
    },
    {
      label: "Réparer un tort",
      description: "Faire en sorte que le mal causé soit corrigé.",
    },
  ],

  [V.entraide]: [
    {
      label: "Rendre service",
      description: "Donner un coup de main quand on te le demande.",
    },
    {
      label: "Être présent pour les autres",
      description: "Te rendre disponible même quand ça ne t'arrange pas.",
      voisines: ["Être là dans l'épreuve"],
    },
    {
      label: "Prendre soin",
      description: "T'occuper de quelqu'un qui ne peut pas s'occuper de lui.",
    },
    {
      label: "Partager ce que j'ai",
      description: "Donner une part de ce qui est à toi.",
      tensions: ["Rendre service"],
    },
  ],

  [V.reussite]: [
    {
      label: "Devenir bon dans mon domaine",
      description: "Maîtriser quelque chose pour vrai, pas à moitié.",
      voisines: ["Progresser"],
    },
    {
      label: "Progresser",
      description: "Être meilleur cette année que l'an dernier.",
      voisines: ["Devenir bon dans mon domaine"],
    },
    {
      label: "Du travail bien fait",
      description: "Ne pas rendre quelque chose dont tu aurais honte.",
    },
    {
      label: "Aller plus haut",
      description: "Viser la place au-dessus de celle que tu occupes.",
      tensions: ["Du travail bien fait"],
    },
  ],

  [V.plaisir]: [
    {
      label: "Profiter du moment",
      description: "Prendre ce qui passe pendant que ça passe.",
    },
    {
      label: "Rire",
      description: "Chercher ce qui est drôle, même quand c'est sérieux.",
    },
    {
      label: "Mon confort",
      description: "Ne pas te compliquer la vie sans raison.",
      tensions: ["Profiter du moment"],
    },
    {
      label: "Faire ce qui me tente",
      description: "Suivre l'envie du moment sans la justifier.",
      voisines: ["Liberté de choix"],
    },
  ],

  [V.curiosite]: [
    {
      label: "Apprendre",
      description: "Comprendre comment ça marche, pour le plaisir de savoir.",
    },
    {
      label: "Découvrir des endroits",
      description: "Voir ailleurs à quoi ressemble la vie.",
    },
    {
      label: "Essayer ce que je ne connais pas",
      description: "Te lancer sans savoir si ça va marcher.",
      tensions: ["Apprendre"],
    },
    {
      label: "Comprendre les gens",
      description: "Chercher ce qui se passe dans la tête des autres.",
    },
  ],

  [V.regles]: [
    {
      label: "Respecter ma parole donnée",
      description: "Un engagement pris est un engagement tenu.",
      voisines: ["Tenir parole"],
    },
    {
      label: "Suivre les règles",
      description: "Faire ce qui a été convenu, parce que c'est convenu.",
    },
    {
      label: "Être fiable",
      description: "Qu'on puisse compter sur toi sans avoir à vérifier.",
      tensions: ["Suivre les règles"],
    },
    {
      label: "Arriver à l'heure",
      description: "Ne pas faire attendre les autres.",
    },
  ],

  [V.autonomie]: [
    {
      label: "Indépendance personnelle",
      description: "Ne dépendre de personne pour vivre ta vie.",
      voisines: ["Liberté de choix", "Ne pas être contrôlé", "Décider seul"],
    },
    {
      label: "Autonomie financière",
      description: "Payer tes affaires avec ton propre argent.",
      tensions: ["Me débrouiller seul"],
    },
    {
      label: "Me débrouiller seul",
      description: "Régler tes problèmes sans avoir à demander.",
      voisines: ["Ne rien devoir à personne"],
    },
    {
      label: "Décider seul",
      description: "Trancher sans avoir à consulter qui que ce soit.",
      voisines: ["Indépendance personnelle", "Liberté de choix"],
    },
    {
      label: "Ne rien devoir à personne",
      description: "Ne pas être en dette, ni d'argent ni de service.",
      voisines: ["Me débrouiller seul", "Ne pas être contrôlé"],
    },
  ],

  [V.appartenance]: [
    {
      label: "Avoir ma place quelque part",
      description: "Un groupe où on remarque que tu n'es pas là.",
    },
    {
      label: "Mes amitiés",
      description: "Les gens que tu as choisis et qui t'ont choisi.",
    },
    {
      label: "Être accepté comme je suis",
      description: "Ne pas avoir à jouer un rôle pour rester dans le groupe.",
      voisines: ["Ne pas faire semblant"],
    },
    {
      label: "Faire partie d'une équipe",
      description: "Tirer dans le même sens que d'autres.",
      tensions: ["Mes amitiés"],
    },
  ],

  [V.creativite]: [
    {
      label: "Faire les choses à ma manière",
      description: "Ta façon, même si ce n'est pas la façon habituelle.",
      voisines: ["Décider seul"],
    },
    {
      label: "Créer quelque chose",
      description: "Laisser derrière toi ce qui n'existait pas avant.",
    },
    {
      label: "M'exprimer",
      description: "Mettre dehors ce que tu as en dedans.",
      voisines: ["Liberté de parole"],
      tensions: ["Créer quelque chose"],
    },
  ],

  [V.nature]: [
    {
      label: "Protéger le vivant",
      description: "Faire attention à ce qui pousse et à ce qui respire.",
    },
    {
      label: "Consommer moins",
      description: "Prendre moins que ce que tu pourrais prendre.",
      tensions: ["Être dehors"],
    },
    {
      label: "Être dehors",
      description: "Passer du temps là où il n'y a pas de murs.",
    },
    {
      label: "Penser à ceux qui viennent après",
      description: "Laisser la place en état pour les prochains.",
    },
  ],

  [V.famille]: [
    {
      label: "Le lien avec mes proches",
      description: "Rester attaché à ceux dont tu viens.",
    },
    {
      label: "Être là pour mes enfants",
      description: "Ne pas manquer ce qui compte dans leur vie.",
      voisines: ["Être présent pour les autres"],
    },
    {
      label: "Ma responsabilité envers les miens",
      description: "Assumer ce que ta place dans la famille demande.",
      tensions: ["Le lien avec mes proches"],
    },
    {
      label: "Ce qu'on m'a transmis",
      description: "Continuer ce qui t'a été passé avant toi.",
    },
  ],

  [V.reconnaissance]: [
    {
      label: "Que ce que je fais soit vu",
      description: "Ne pas travailler dans le vide.",
      voisines: ["Ma réputation"],
    },
    {
      label: "Le respect des autres",
      description: "Qu'on te prenne au sérieux quand tu parles.",
    },
    {
      label: "Ma réputation",
      description: "Ce qu'on dit de toi quand tu n'es pas là.",
      voisines: ["Que ce que je fais soit vu"],
      tensions: ["Le respect des autres"],
    },
  ],

  [V.tranquillite]: [
    {
      label: "La paix",
      description: "Pas de chicane, pas de tension dans l'air.",
      voisines: ["Éviter les conflits"],
    },
    {
      label: "Avoir du temps à moi",
      description: "Des heures où personne ne te demande rien.",
      voisines: ["Contrôle de mon temps"],
    },
    {
      label: "Éviter les conflits",
      description: "Ne pas entrer dans les affrontements que tu peux éviter.",
      voisines: ["La paix"],
      tensions: ["Avoir du temps à moi"],
    },
    {
      label: "Aller à mon rythme",
      description: "Ne pas te faire presser par les autres.",
    },
  ],

  [V.courage]: [
    {
      label: "Affronter ce qui me fait peur",
      description: "Y aller quand même, parce que ça compte.",
    },
    {
      label: "Dire ce qui dérange",
      description: "Parler quand tout le monde préfère se taire.",
      voisines: ["Liberté de parole"],
      tensions: ["Affronter ce qui me fait peur"],
    },
    {
      label: "Ne pas lâcher",
      description: "Continuer quand ce serait plus simple d'arrêter.",
    },
    {
      label: "Prendre des risques",
      description: "Accepter que ça puisse mal tourner.",
    },
  ],

  [V.viePrivee]: [
    {
      label: "Garder mes affaires pour moi",
      description: "Ce qui te regarde ne regarde personne d'autre.",
      voisines: ["Garder un secret"],
    },
    {
      label: "Mon intimité",
      description: "Une part de toi que personne ne visite.",
      voisines: ["Un espace à moi"],
    },
    {
      label: "Un espace à moi",
      description: "Un endroit où on n'entre pas sans frapper.",
      voisines: ["Mon intimité"],
    },
    {
      label: "Contrôler mon image",
      description: "Choisir ce que les autres voient de toi.",
      tensions: ["Mon intimité"],
    },
  ],
};

/** Toutes les valeurs fines, à plat. */
export const valeursFines: ValeurFine[] = Object.entries(parFamille).flatMap(
  ([famille, sources]) =>
    sources.map((s) => ({
      label: s.label,
      description: s.description,
      famille,
      voisines: s.voisines ?? [],
      tensions: s.tensions ?? [],
    })),
);

const finesParLabel = new Map(valeursFines.map((v) => [v.label, v]));
const famillesParLabel = new Map(valeurs.map((v) => [v.label, v]));

/** Les valeurs fines d'une famille. Vide si la famille n'en a pas encore. */
export function finesDeLaFamille(famille: string): ValeurFine[] {
  return valeursFines.filter((v) => v.famille === famille);
}

/**
 * Une valeur située dans le lexique, quelle que soit la maille où elle est
 * nommée. Une carte peut ne nommer qu'une famille (« Autonomie »), une personne
 * peut avoir choisi une valeur fine (« Ne rien devoir à personne »), et une
 * valeur écrite à la main n'est ni l'une ni l'autre.
 */
export interface NoeudValeur {
  label: string;
  /** `libre` : écrite par la personne, absente du lexique. */
  niveau: "fine" | "famille" | "libre";
  /** Null pour une valeur libre. */
  famille: string | null;
  /** Null pour une valeur libre. */
  domaine: Domaine | null;
  voisines: string[];
  tensions: string[];
}

/**
 * Situe un libellé dans le lexique.
 *
 * Une valeur inconnue n'est pas une erreur : la personne peut écrire ses
 * propres mots, et le jeu ne devine pas ce qu'elle a voulu dire. Elle est
 * simplement `libre`, sans parenté avec quoi que ce soit — donc opposable à
 * tout, puisque rien ne permet d'affirmer le contraire.
 */
export function situerValeur(label: string): NoeudValeur {
  const fine = finesParLabel.get(label);
  if (fine) {
    return {
      label,
      niveau: "fine",
      famille: fine.famille,
      domaine: famillesParLabel.get(fine.famille)?.famille ?? null,
      voisines: fine.voisines,
      tensions: fine.tensions,
    };
  }

  const famille = famillesParLabel.get(label);
  if (famille) {
    return {
      label,
      niveau: "famille",
      famille: label,
      domaine: famille.famille,
      voisines: [],
      tensions: famille.tensionsFrequentes,
    };
  }

  return {
    label,
    niveau: "libre",
    famille: null,
    domaine: null,
    voisines: [],
    tensions: [],
  };
}
