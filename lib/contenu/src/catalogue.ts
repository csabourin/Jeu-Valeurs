/**
 * Le catalogue complet : le deck écrit à la main plus les 825 cartes importées.
 *
 * 825 cartes ne se parcourent pas à l'écran. Chaque partie reçoit donc une
 * **main** tirée avec sa graine : deux parties ne proposent pas les mêmes
 * cartes, et une même partie retrouve toujours la sienne. C'est aussi ce qui
 * rend l'écran de sélection jouable plutôt qu'interminable.
 *
 * Chaque main mélange deux provenances :
 *   • des cartes maison, relues, au vocabulaire calibré ;
 *   • des cartes importées, qui apportent le volume et des angles auxquels on
 *     n'aurait pas pensé.
 * La part maison est garantie — sans elle, une main pourrait n'être faite que
 * de formulations non relues.
 */

import {
  cartesMaison,
  familles,
  type CarteContenu,
  type Famille,
} from "./cartes";
import { valeursParCategorie } from "./categories";
import { reecritures } from "./reecritures";
import { limitesSimples } from "./limites-simples";
import { generateurAleatoire, melanger } from "./hasard";
import lignesRougesImportees from "./data/red_lines.json";
import horizonsImportes from "./data/horizons.json";
import tresorsImportes from "./data/treasures.json";

/**
 * Les données importées utilisent l'apostrophe typographique, le contenu écrit
 * ici l'apostrophe droite. Une même main affichait donc les deux. On uniformise
 * à l'affichage plutôt que de retoucher les fichiers d'origine.
 */
function normaliser(texte: string): string {
  return texte.replace(/\u2019/g, "'");
}

interface CarteImportee {
  id: string;
  category: string;
  label: string;
  status: string;
}

/** Combien de cartes une main propose, par famille. */
export const CARTES_PAR_FAMILLE = 18;
/**
 * Dont ce nombre venant du deck maison. Les cartes maison portent une
 * description et des valeurs choisies carte par carte, là où les relues tirent
 * les leurs de leur catégorie : en garantir une part garde chaque main ancrée.
 */
const PART_MAISON = 6;

function importer(brutes: CarteImportee[], famille: Famille): CarteContenu[] {
  const parCategorie = valeursParCategorie[famille];
  return brutes.map((c) => ({
    id: c.id,
    famille,
    // Le libellé d'origine ne sert que de repli : toutes les cartes ont été
    // relues, et celles qui ne sont pas dans `reecritures` sont celles qui
    // passaient déjà telles quelles.
    label: normaliser(
      famille === "lignes_rouges"
        ? (limitesSimples[c.id] ?? reecritures[c.id] ?? c.label)
        : (reecritures[c.id] ?? c.label),
    ),
    description: null,
    // Une catégorie inconnue ne fait pas disparaître la carte : elle arrive
    // sans hypothèse, et la personne nomme elle-même ce qu'elle y voit.
    valeursSuggerees: parCategorie[c.category] ?? [],
    origine: "relue" as const,
    categorie: c.category,
  }));
}

export const cartesImportees: CarteContenu[] = [
  ...importer(lignesRougesImportees as CarteImportee[], "lignes_rouges"),
  ...importer(horizonsImportes as CarteImportee[], "horizons"),
  ...importer(tresorsImportes as CarteImportee[], "tresors"),
];

/** Tout le catalogue. Sert aux recherches par identifiant, pas à l'affichage. */
export const cartes: CarteContenu[] = [...cartesMaison, ...cartesImportees];

const parId = new Map(cartes.map((c) => [c.id, c]));

export function trouverCarte(id: string): CarteContenu | undefined {
  return parId.get(id);
}

export function cartesParFamille(famille: Famille): CarteContenu[] {
  return cartes.filter((c) => c.famille === famille);
}

/**
 * La main d'une partie : ce que l'écran de sélection propose réellement.
 *
 * Déterministe pour une graine donnée — revenir sur l'écran ne rebat pas les
 * cartes sous les yeux de la personne, et une carte déjà prise reste visible.
 */
export function distribuerCartes(
  graine: number,
  parFamille = CARTES_PAR_FAMILLE,
): CarteContenu[] {
  const suivant = generateurAleatoire(graine ^ 0xca47e5);
  const main: CarteContenu[] = [];

  for (const famille of familles) {
    const maison = melanger(
      cartesMaison.filter((c) => c.famille === famille),
      suivant,
    ).slice(0, Math.min(PART_MAISON, parFamille));

    const prises = new Set(maison.map((c) => c.id));
    const importees = melanger(
      cartesImportees.filter((c) => c.famille === famille && !prises.has(c.id)),
      suivant,
    ).slice(0, Math.max(0, parFamille - maison.length));

    // Mélangées ensemble : rien à l'écran ne trie les cartes par provenance.
    main.push(...melanger([...maison, ...importees], suivant));
  }

  return main;
}
