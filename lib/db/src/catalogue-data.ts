import redLines from "./data/red_lines.json" with { type: "json" };
import horizons from "./data/horizons.json" with { type: "json" };
import treasures from "./data/treasures.json" with { type: "json" };
import dilemmas from "./data/dilemmas.json" with { type: "json" };
import type { Famille } from "./schema/catalogue";

interface CatalogueSourceItem {
  id: string;
  category: string;
  label: string;
  status: string;
}

interface DilemmaSourceItem {
  id: string;
  context: string;
  value_a: string;
  value_b: string;
  dilemma: string;
  pivot_dimension_candidate: string;
}

export interface CatalogueSeedCard {
  sourceId: string;
  famille: Famille;
  categorie: string;
  label: string;
  description: string;
  valeursSuggerees: string[];
}

export interface CatalogueSeedDilemma {
  sourceId: string;
  valeurA: string;
  valeurB: string;
  texte: string;
  contexte: string;
  familles: string[];
  pivotDimensionCandidate: string;
}

function toSeedCards(
  items: CatalogueSourceItem[],
  famille: Famille,
): CatalogueSeedCard[] {
  return items.map((item) => ({
    sourceId: item.id,
    famille,
    categorie: item.category,
    label: item.label,
    description: `Catégorie de départ : ${item.category}. Cette interprétation doit être confirmée ou corrigée par la personne.`,
    valeursSuggerees: [item.category],
  }));
}

export const catalogueSeedCards: CatalogueSeedCard[] = [
  ...toSeedCards(redLines as CatalogueSourceItem[], "lignes_rouges"),
  ...toSeedCards(horizons as CatalogueSourceItem[], "horizons"),
  ...toSeedCards(treasures as CatalogueSourceItem[], "tresors"),
];

export const catalogueSeedDilemmas: CatalogueSeedDilemma[] = (
  dilemmas as DilemmaSourceItem[]
).map((item) => ({
  sourceId: item.id,
  valeurA: item.value_a,
  valeurB: item.value_b,
  texte: item.dilemma,
  contexte: item.context,
  familles: [],
  pivotDimensionCandidate: item.pivot_dimension_candidate,
}));

export const catalogueSeedCounts = {
  lignesRouges: redLines.length,
  horizons: horizons.length,
  tresors: treasures.length,
  dilemmes: dilemmas.length,
} as const;
