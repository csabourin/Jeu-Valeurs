/**
 * Cartes de départ — le matériel concret du jeu.
 *
 * Trois familles :
 *   • lignes_rouges — « je ne pense pas être capable de faire ça »
 *   • horizons      — « je veux obtenir, réussir, devenir ou vivre ça »
 *   • tresors       — « j'ai ça et je ne veux pas le perdre »
 *
 * Règles d'écriture appliquées ici :
 *   • une carte décrit une action ou une chose précise, jamais une abstraction
 *     (« Répéter un secret » et non « L'importance de la confiance ») ;
 *   • pas de scénario traumatisant, sexuel, violent ou criminel grave quand une
 *     situation ordinaire teste exactement la même valeur ;
 *   • les valeurs suggérées sont des hypothèses à confirmer par la personne,
 *     jamais une lecture imposée.
 *
 * Les identifiants sont stables : ils sont conservés dans les cartes de session.
 * Ne jamais réutiliser un identifiant retiré.
 */

import { V } from "./valeurs";

export const familles = ["lignes_rouges", "horizons", "tresors"] as const;
export type Famille = (typeof familles)[number];

export interface CarteContenu {
  id: number;
  famille: Famille;
  label: string;
  description: string;
  /** Hypothèses de valeurs — la personne confirme, corrige ou remplace. */
  valeursSuggerees: string[];
}

/** 1000-1999 : lignes rouges. */
const lignesRouges: CarteContenu[] = [
  {
    id: 1001,
    famille: "lignes_rouges",
    label: "Répéter un secret qu'on m'a confié",
    description: "Quelqu'un t'a fait confiance et tu le racontes à d'autres.",
    valeursSuggerees: [V.loyaute, V.viePrivee],
  },
  {
    id: 1002,
    famille: "lignes_rouges",
    label: "Mentir à quelqu'un qui me fait confiance pour me sortir du trouble",
    description: "La vérité te coûterait cher, alors tu inventes autre chose.",
    valeursSuggerees: [V.honnetete],
  },
  {
    id: 1003,
    famille: "lignes_rouges",
    label: "Rire de quelqu'un avec le groupe pour ne pas être le prochain",
    description: "Tout le monde embarque et tu embarques aussi.",
    valeursSuggerees: [V.courage, V.entraide],
  },
  {
    id: 1004,
    famille: "lignes_rouges",
    label: "Faire semblant de ne rien voir quand quelqu'un se fait écœurer",
    description: "Tu regardes ailleurs et tu continues ta journée.",
    valeursSuggerees: [V.courage, V.justice],
  },
  {
    id: 1005,
    famille: "lignes_rouges",
    label: "Remettre le travail de quelqu'un d'autre comme si c'était le mien",
    description: "Tu copies, tu remets, tu prends la note.",
    valeursSuggerees: [V.honnetete, V.reussite],
  },
  {
    id: 1006,
    famille: "lignes_rouges",
    label: "Prendre le crédit pour l'idée de quelqu'un d'autre",
    description: "On te félicite et tu ne corriges pas.",
    valeursSuggerees: [V.honnetete, V.justice],
  },
  {
    id: 1007,
    famille: "lignes_rouges",
    label: "Laisser tomber quelqu'un à la dernière minute pour une meilleure offre",
    description: "C'était prévu depuis deux semaines, mais quelque chose de mieux arrive.",
    valeursSuggerees: [V.loyaute, V.honnetete],
  },
  {
    id: 1008,
    famille: "lignes_rouges",
    label: "Publier une photo de quelqu'un sans lui demander",
    description: "Elle est drôle, alors tu la mets en ligne.",
    valeursSuggerees: [V.viePrivee, V.entraide],
  },
  {
    id: 1009,
    famille: "lignes_rouges",
    label: "Fouiller dans le téléphone de quelqu'un",
    description: "Il est là, déverrouillé, et tu voudrais savoir.",
    valeursSuggerees: [V.viePrivee, V.honnetete],
  },
  {
    id: 1010,
    famille: "lignes_rouges",
    label: "Laisser quelqu'un se faire accuser à ma place",
    description: "Tu sais que ce n'est pas cette personne. Tu ne dis rien.",
    valeursSuggerees: [V.justice, V.courage],
  },
  {
    id: 1011,
    famille: "lignes_rouges",
    label: "Promettre quelque chose que je sais que je ne ferai pas",
    description: "Ça règle la conversation tout de suite, c'est tout ce qui compte sur le coup.",
    valeursSuggerees: [V.honnetete, V.loyaute],
  },
  {
    id: 1012,
    famille: "lignes_rouges",
    label: "Abandonner un projet quand d'autres comptent sur moi pour le finir",
    description: "Tu n'as plus le goût et tu lâches en plein milieu.",
    valeursSuggerees: [V.loyaute, V.reussite],
  },
  {
    id: 1013,
    famille: "lignes_rouges",
    label: "Cacher une erreur qui pourrait nuire à quelqu'un",
    description: "Personne ne l'a vue. Le dire te mettrait dans l'embarras.",
    valeursSuggerees: [V.honnetete, V.courage],
  },
  {
    id: 1014,
    famille: "lignes_rouges",
    label: "Faire semblant d'être quelqu'un d'autre pour être accepté",
    description: "Tu changes ce que tu aimes, ce que tu dis, ce que tu écoutes.",
    valeursSuggerees: [V.autonomie, V.honnetete],
  },
  {
    id: 1015,
    famille: "lignes_rouges",
    label: "Dire oui juste pour éviter la chicane",
    description: "Tu n'es pas d'accord, mais tu n'as pas envie d'en discuter.",
    valeursSuggerees: [V.courage, V.autonomie],
  },
  {
    id: 1016,
    famille: "lignes_rouges",
    label: "Prendre quelque chose qui ne m'appartient pas quand personne ne regarde",
    description: "Ça ne manquerait à personne et tu le sais.",
    valeursSuggerees: [V.honnetete, V.regles],
  },
  {
    id: 1017,
    famille: "lignes_rouges",
    label: "Exclure quelqu'un du groupe parce que les autres l'ont décidé",
    description: "Tu n'as rien contre cette personne, mais tu suis.",
    valeursSuggerees: [V.justice, V.courage],
  },
  {
    id: 1018,
    famille: "lignes_rouges",
    label: "Blesser quelqu'un exprès pour gagner",
    description: "Une phrase bien placée et la partie est à toi.",
    valeursSuggerees: [V.entraide, V.reussite],
  },
  {
    id: 1019,
    famille: "lignes_rouges",
    label: "Briser la confiance de ma famille pour impressionner du monde",
    description: "Tu racontes quelque chose qui devait rester à la maison.",
    valeursSuggerees: [V.famille, V.reconnaissance],
  },
  {
    id: 1020,
    famille: "lignes_rouges",
    label: "Renoncer à ce que je pense vraiment pour avoir la paix",
    description: "Tu gardes ton idée pour toi, indéfiniment.",
    valeursSuggerees: [V.autonomie, V.courage],
  },
];

/** 2000-2999 : horizons. */
const horizons: CarteContenu[] = [
  {
    id: 2001,
    famille: "horizons",
    label: "Devenir vraiment bon dans quelque chose que j'aime",
    description: "Assez bon pour que ça se remarque sans que tu aies à le dire.",
    valeursSuggerees: [V.reussite, V.plaisir],
  },
  {
    id: 2002,
    famille: "horizons",
    label: "Vivre ailleurs, dans une autre ville ou une autre langue",
    description: "Repartir d'une page blanche, loin de ce que tu connais.",
    valeursSuggerees: [V.curiosite, V.liberte],
  },
  {
    id: 2003,
    famille: "horizons",
    label: "Avoir une gang solide sur qui je peux compter",
    description: "Du monde qui répond quand tu écris à 23 h.",
    valeursSuggerees: [V.appartenance, V.loyaute],
  },
  {
    id: 2004,
    famille: "horizons",
    label: "Créer quelque chose que d'autres utilisent vraiment",
    description: "Un objet, un jeu, une chanson, un outil — quelque chose qui sort de toi.",
    valeursSuggerees: [V.creativite, V.reconnaissance],
  },
  {
    id: 2005,
    famille: "horizons",
    label: "Gagner assez d'argent pour arrêter de m'inquiéter",
    description: "Ne plus avoir à calculer avant chaque décision.",
    valeursSuggerees: [V.securite, V.autonomie],
  },
  {
    id: 2006,
    famille: "horizons",
    label: "Être capable de dire non sans me sentir mal après",
    description: "Refuser, et que ça reste correct.",
    valeursSuggerees: [V.autonomie, V.courage],
  },
  {
    id: 2007,
    famille: "horizons",
    label: "Faire un travail qui sert à quelque chose",
    description: "Pouvoir expliquer à quoi ta journée a servi.",
    valeursSuggerees: [V.entraide, V.reussite],
  },
  {
    id: 2008,
    famille: "horizons",
    label: "Avoir mon propre chez-moi, décidé par moi",
    description: "Tes règles, ton ménage, ta porte.",
    valeursSuggerees: [V.liberte, V.autonomie],
  },
  {
    id: 2009,
    famille: "horizons",
    label: "Être la personne vers qui les autres vont quand ça va mal",
    description: "Celle à qui on écrit en premier.",
    valeursSuggerees: [V.entraide, V.loyaute],
  },
  {
    id: 2010,
    famille: "horizons",
    label: "Voyager seul quelque part de loin",
    description: "Sans personne pour décider de l'horaire à ta place.",
    valeursSuggerees: [V.curiosite, V.courage],
  },
  {
    id: 2011,
    famille: "horizons",
    label: "Présenter devant du monde sans paniquer",
    description: "Monter, parler, redescendre, et que ça se soit bien passé.",
    valeursSuggerees: [V.courage, V.reconnaissance],
  },
  {
    id: 2012,
    famille: "horizons",
    label: "Réparer une amitié que j'ai perdue",
    description: "Reprendre contact et que ça reparte pour vrai.",
    valeursSuggerees: [V.loyaute, V.courage],
  },
  {
    id: 2013,
    famille: "horizons",
    label: "Comprendre pour vrai comment quelque chose fonctionne",
    description: "Assez pour l'expliquer à quelqu'un d'autre sans tricher.",
    valeursSuggerees: [V.curiosite, V.reussite],
  },
  {
    id: 2014,
    famille: "horizons",
    label: "Avoir du temps à moi, sans horaire",
    description: "Des journées où personne n'attend rien de toi.",
    valeursSuggerees: [V.tranquillite, V.liberte],
  },
  {
    id: 2015,
    famille: "horizons",
    label: "Être respecté pour ce que je fais",
    description: "Que ton nom soit associé à du travail solide.",
    valeursSuggerees: [V.reconnaissance, V.reussite],
  },
  {
    id: 2016,
    famille: "horizons",
    label: "Vivre proche de la nature",
    description: "De l'eau, des arbres, du silence, à quelques minutes.",
    valeursSuggerees: [V.nature, V.tranquillite],
  },
  {
    id: 2017,
    famille: "horizons",
    label: "Arrêter d'avoir peur de me tromper devant les autres",
    description: "Essayer même quand ça peut mal paraître.",
    valeursSuggerees: [V.courage, V.curiosite],
  },
  {
    id: 2018,
    famille: "horizons",
    label: "Transmettre quelque chose que ma famille m'a appris",
    description: "Une recette, une langue, un métier, une façon de faire.",
    valeursSuggerees: [V.famille, V.creativite],
  },
  {
    id: 2019,
    famille: "horizons",
    label: "Changer quelque chose qui est injuste autour de moi",
    description: "Pas le monde entier — une chose précise, dans ta vie à toi.",
    valeursSuggerees: [V.justice, V.courage],
  },
  {
    id: 2020,
    famille: "horizons",
    label: "Faire quelque chose qui n'a jamais été fait de cette façon",
    description: "Ta version, même si elle dérange.",
    valeursSuggerees: [V.creativite, V.liberte],
  },
];

/** 3000-3999 : trésors. */
const tresors: CarteContenu[] = [
  {
    id: 3001,
    famille: "tresors",
    label: "Mon amitié la plus proche",
    description: "La personne à qui tu n'as pas besoin d'expliquer.",
    valeursSuggerees: [V.loyaute, V.appartenance],
  },
  {
    id: 3002,
    famille: "tresors",
    label: "La confiance de mes parents",
    description: "Le fait qu'on te croie sur parole.",
    valeursSuggerees: [V.famille, V.honnetete],
  },
  {
    id: 3003,
    famille: "tresors",
    label: "Ma réputation d'être quelqu'un de fiable",
    description: "Quand tu dis que tu vas être là, on arrête de vérifier.",
    valeursSuggerees: [V.honnetete, V.reconnaissance],
  },
  {
    id: 3004,
    famille: "tresors",
    label: "Mon temps libre",
    description: "Les heures que personne d'autre ne réclame.",
    valeursSuggerees: [V.tranquillite, V.liberte],
  },
  {
    id: 3005,
    famille: "tresors",
    label: "Mon coin à moi",
    description: "L'endroit où personne n'entre sans demander.",
    valeursSuggerees: [V.viePrivee, V.tranquillite],
  },
  {
    id: 3006,
    famille: "tresors",
    label: "Ce que je suis déjà capable de faire",
    description: "Ce que tu as appris et que personne ne peut t'enlever.",
    valeursSuggerees: [V.reussite, V.autonomie],
  },
  {
    id: 3007,
    famille: "tresors",
    label: "Ma santé",
    description: "Pouvoir courir, dormir, te lever sans y penser.",
    valeursSuggerees: [V.securite, V.liberte],
  },
  {
    id: 3008,
    famille: "tresors",
    label: "Ma liberté de dire ce que je pense",
    description: "Pouvoir être en désaccord tout haut.",
    valeursSuggerees: [V.liberte, V.courage],
  },
  {
    id: 3009,
    famille: "tresors",
    label: "Ma place dans mon groupe",
    description: "Le fait qu'on t'attende, qu'on te garde une chaise.",
    valeursSuggerees: [V.appartenance, V.reconnaissance],
  },
  {
    id: 3010,
    famille: "tresors",
    label: "Le calme quand je rentre chez moi",
    description: "Pas de cris, pas de tension dans le corridor.",
    valeursSuggerees: [V.tranquillite, V.securite],
  },
  {
    id: 3011,
    famille: "tresors",
    label: "Mes projets personnels",
    description: "Ce sur quoi tu travailles sans que ce soit demandé par personne.",
    valeursSuggerees: [V.creativite, V.autonomie],
  },
  {
    id: 3012,
    famille: "tresors",
    label: "Mon animal",
    description: "Celui qui est content quand tu ouvres la porte.",
    valeursSuggerees: [V.entraide, V.nature],
  },
  {
    id: 3013,
    famille: "tresors",
    label: "Ma famille proche",
    description: "Le monde qui était là avant que tu choisisses quoi que ce soit.",
    valeursSuggerees: [V.famille, V.loyaute],
  },
  {
    id: 3014,
    famille: "tresors",
    label: "Un endroit qui compte pour moi",
    description: "Un lac, une rue, un terrain, un chalet.",
    valeursSuggerees: [V.nature, V.famille],
  },
  {
    id: 3015,
    famille: "tresors",
    label: "Le droit de changer d'idée",
    description: "Pouvoir dire « finalement, non » sans avoir à te justifier.",
    valeursSuggerees: [V.liberte, V.autonomie],
  },
  {
    id: 3016,
    famille: "tresors",
    label: "L'argent que j'ai gagné moi-même",
    description: "Chaque dollar que tu as mis là.",
    valeursSuggerees: [V.autonomie, V.securite],
  },
  {
    id: 3017,
    famille: "tresors",
    label: "Le fait que personne ne lit mes messages",
    description: "Ce que tu écris reste entre toi et la personne à qui tu l'écris.",
    valeursSuggerees: [V.viePrivee, V.securite],
  },
  {
    id: 3018,
    famille: "tresors",
    label: "Quelqu'un qui me comprend sans que j'aie à expliquer",
    description: "Une personne, une seule, et c'est assez.",
    valeursSuggerees: [V.appartenance, V.loyaute],
  },
  {
    id: 3019,
    famille: "tresors",
    label: "Le fait de n'avoir jamais laissé tomber quelqu'un",
    description: "Ton dossier est propre et tu y tiens.",
    valeursSuggerees: [V.loyaute, V.honnetete],
  },
  {
    id: 3020,
    famille: "tresors",
    label: "Ma curiosité",
    description: "Le fait d'avoir encore le goût de savoir.",
    valeursSuggerees: [V.curiosite, V.plaisir],
  },
];

export const cartes: CarteContenu[] = [...lignesRouges, ...horizons, ...tresors];

export function cartesParFamille(famille: Famille): CarteContenu[] {
  return cartes.filter((c) => c.famille === famille);
}

export function trouverCarte(id: number): CarteContenu | undefined {
  return cartes.find((c) => c.id === id);
}
