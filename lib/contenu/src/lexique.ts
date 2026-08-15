/**
 * « Je ne trouve pas ce qui me correspond. »
 *
 * Quand aucune carte proposée ne dit ce que la personne veut dire, elle écrit
 * ses mots. Le jeu peut alors **proposer** une ou plusieurs valeurs qui
 * pourraient être dessous — jamais les appliquer.
 *
 * Trois garde-fous, qui sont la raison d'être de ce module :
 *
 *   • aucune valeur n'est attachée sans que la personne l'ait confirmée ;
 *   • chaque proposition dit **pourquoi** elle apparaît (le mot qui l'a
 *     déclenchée), pour qu'elle puisse être rejetée en connaissance de cause ;
 *   • « aucune de ces valeurs » est une réponse complète : le texte reste tel
 *     quel et devient lui-même la valeur.
 *
 * Le repérage est un simple appariement de mots, déterministe et lisible.
 * Aucun modèle de langue nulle part : une suggestion doit pouvoir s'expliquer
 * en une ligne.
 */

import {
  valeurs,
  valeursVoisines,
  type ValeurCatalogue,
} from "./valeurs";
import { famillesValeurs, type FamilleValeur } from "./taxonomie";

export interface SuggestionValeur {
  valeur: string;
  description: string;
  /** Le mot du texte qui a fait remonter cette valeur. */
  motDeclencheur: string;
  /** Plus c'est haut, plus l'appariement est franc. Sert à ordonner, pas à décider. */
  poids: number;
}

function normaliser(texte: string): string {
  return texte
    .toLocaleLowerCase("fr")
    .replace(/[’]/g, "'")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function motsSignifiants(texte: string): string[] {
  const vides = new Set([
    "le", "la", "les", "un", "une", "des", "du", "de", "et", "ou", "que", "qui",
    "quoi", "dans", "pour", "par", "avec", "sans", "sur", "mon", "ma", "mes",
    "ton", "ta", "tes", "son", "sa", "ses", "je", "tu", "il", "elle", "on",
    "nous", "vous", "ils", "elles", "ne", "pas", "plus", "est", "suis", "etre",
    "avoir", "ai", "a", "au", "aux", "ce", "cette", "ces", "en", "y", "me",
    "te", "se", "moi", "toi", "lui", "leur", "quand", "comme", "tout", "tous",
  ]);
  return normaliser(texte)
    .split(/[^\p{Letter}']+/u)
    .map((mot) => mot.replace(/^'+|'+$/g, ""))
    .filter((mot) => mot.length > 2 && !vides.has(mot));
}

/**
 * Verbes et mots passe-partout : ils apparaissent dans la moitié des
 * descriptions et feraient remonter n'importe quelle valeur.
 */
const TROP_GENERIQUES = new Set([
  "garder", "faire", "avoir", "prendre", "mettre", "aller", "vouloir",
  "pouvoir", "devoir", "dire", "savoir", "etre", "soient", "sont", "chose",
  "choses", "gens", "monde", "vie", "quelque", "quelqu",
]);

/** Deux mots se ressemblent assez : même racine sur au moins cinq lettres. */
function seRessemblent(a: string, b: string): boolean {
  if (a === b) return true;
  const court = a.length <= b.length ? a : b;
  const long = a.length <= b.length ? b : a;
  if (court.length < 5) return false;
  return long.startsWith(court.slice(0, Math.max(5, court.length - 2)));
}

/**
 * Les valeurs qui pourraient être derrière un texte libre.
 *
 * Le résultat est une **hypothèse à confirmer**. L'appelant doit toujours
 * offrir de corriger, de reformuler, ou de n'en retenir aucune.
 */
export function suggererValeurs(texte: string, maximum = 5): SuggestionValeur[] {
  const motsTexte = motsSignifiants(texte);
  if (motsTexte.length === 0) return [];

  const trouvees = new Map<string, SuggestionValeur>();

  const retenir = (
    valeur: ValeurCatalogue,
    mot: string,
    poids: number,
  ): void => {
    const deja = trouvees.get(valeur.label);
    if (deja && deja.poids >= poids) return;
    trouvees.set(valeur.label, {
      valeur: valeur.label,
      description: valeur.description,
      motDeclencheur: mot,
      poids,
    });
  };

  for (const valeur of valeurs) {
    const motsLabel = motsSignifiants(valeur.label);
    const motsCles = valeur.motsCles.map(normaliser);
    const motsDescription = motsSignifiants(valeur.description);

    for (const mot of motsTexte) {
      // Le libellé lui-même : l'appariement le plus franc.
      if (motsLabel.some((m) => seRessemblent(m, mot))) {
        retenir(valeur, mot, 3);
        continue;
      }
      // Un mot-clé déclaré. Une expression de plusieurs mots doit se retrouver
      // telle quelle : la comparaison de racines ferait correspondre
      // « personne » à « personne à savoir », ce qui n'a rien à voir.
      const cle = motsCles.find((c) =>
        c.includes(" ")
          ? normaliser(texte).includes(c)
          : c === mot || seRessemblent(c, mot),
      );
      if (cle) {
        retenir(valeur, cle, 2);
        continue;
      }
      if (
        !TROP_GENERIQUES.has(mot) &&
        motsDescription.some(
          (m) => !TROP_GENERIQUES.has(m) && seRessemblent(m, mot),
        )
      ) {
        retenir(valeur, mot, 1);
      }
    }
  }

  return Array.from(trouvees.values())
    .sort(
      (a, b) => b.poids - a.poids || a.valeur.localeCompare(b.valeur, "fr"),
    )
    .slice(0, maximum);
}

/** Recherche par thème dans tout le lexique : libellé, description, mots-clés. */
export function rechercherValeurs(terme: string): ValeurCatalogue[] {
  const cible = normaliser(terme).trim();
  if (cible.length === 0) return [];
  return valeurs.filter((valeur) =>
    normaliser(
      [valeur.label, valeur.description, ...valeur.motsCles].join(" "),
    ).includes(cible),
  );
}

export interface ThemeValeurs {
  famille: FamilleValeur;
  valeurs: ValeurCatalogue[];
}

/** Le lexique rangé par famille — l'écran « explorer des valeurs voisines ». */
export function themesValeurs(): ThemeValeurs[] {
  return famillesValeurs.map((famille) => ({
    famille,
    valeurs: valeurs.filter((v) => v.familleValeur === famille.id),
  }));
}

/**
 * À partir de ce que la personne a déjà retenu, les valeurs voisines qu'elle
 * n'a pas encore regardées. Sert à élargir sans repartir de zéro.
 */
export function valeursAProposer(dejaRetenues: string[]): ValeurCatalogue[] {
  const prises = new Set(dejaRetenues);
  const proposees = new Map<string, ValeurCatalogue>();
  for (const label of dejaRetenues) {
    for (const voisine of valeursVoisines(label)) {
      if (!prises.has(voisine.label)) proposees.set(voisine.label, voisine);
    }
  }
  return Array.from(proposees.values()).sort((a, b) =>
    a.label.localeCompare(b.label, "fr"),
  );
}
