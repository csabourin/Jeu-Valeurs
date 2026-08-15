/**
 * Combats entre les cartes choisies par la personne.
 *
 * Une limite est le prix à payer. Une aspiration ou un essentiel est ce que la
 * personne pourrait obtenir ou garder. Reprendre la même limite avec un autre
 * enjeu crée la bascule : l'acte ne change pas, seule sa raison change.
 */

import type { Famille } from "./cartes";
import { generateurAleatoire, melanger } from "./hasard";

export const MAX_COMBATS_CARTES = 12;

export interface CarteCombat {
  id: string;
  famille: Famille;
  label: string;
  valeursConfirmees?: string[];
}

export interface CombatCarteContenu {
  id: number;
  valeurA: string;
  valeurB: string;
  situation: string;
  optionA: string;
  optionB: string;
  contexte: null;
  variante: boolean;
  limiteId: string;
  limiteLabel: string;
  enjeuId: string;
  enjeuLabel: string;
  enjeuFamille: "horizons" | "tresors";
}

function minusculeInitiale(texte: string): string {
  return texte.length > 0
    ? texte[0].toLocaleLowerCase("fr") + texte.slice(1)
    : texte;
}

function valeurPrincipale(carte: CarteCombat, repli: string): string {
  return carte.valeursConfirmees?.[0] ?? repli;
}

/** FNV-1a : identifiant numérique stable à partir des deux cartes de session. */
function empreinte(texte: string): number {
  let resultat = 0x811c9dc5;
  for (let i = 0; i < texte.length; i++) {
    resultat ^= texte.charCodeAt(i);
    resultat = Math.imul(resultat, 0x01000193);
  }
  return resultat >>> 0;
}

function situation(limite: CarteCombat, enjeu: CarteCombat): string {
  const acte = minusculeInitiale(limite.label);
  const but =
    enjeu.famille === "tresors"
      ? `garder ${minusculeInitiale(enjeu.label)}`
      : minusculeInitiale(enjeu.label);
  return `Serais-tu prêt à ${acte} pour ${but} ?`;
}

/**
 * Toutes les confrontations possibles. Sert aussi à la page de résultats pour
 * retrouver le texte d'une question à partir de son identifiant enregistré.
 */
export function combatsCartesPossibles(
  cartes: CarteCombat[],
): CombatCarteContenu[] {
  const limites = cartes
    .filter((carte) => carte.famille === "lignes_rouges")
    .sort((a, b) => a.id.localeCompare(b.id));
  const enjeux = cartes
    .filter(
      (carte): carte is CarteCombat & { famille: "horizons" | "tresors" } =>
        carte.famille === "horizons" || carte.famille === "tresors",
    )
    .sort((a, b) => a.id.localeCompare(b.id));

  const utilises = new Set<number>();
  const resultat: CombatCarteContenu[] = [];

  for (const limite of limites) {
    for (const enjeu of enjeux) {
      let id =
        1_000_000_000 + (empreinte(`${limite.id}|${enjeu.id}`) % 900_000_000);
      while (utilises.has(id)) id++;
      utilises.add(id);

      resultat.push({
        id,
        valeurA: valeurPrincipale(
          enjeu,
          enjeu.famille === "horizons" ? "Mes aspirations" : "Mes essentiels",
        ),
        valeurB: valeurPrincipale(limite, "Mes limites"),
        situation: situation(limite, enjeu),
        optionA: "Oui — je franchirais cette limite.",
        optionB: "Non — cette limite ne se négocie pas.",
        contexte: null,
        variante: false,
        limiteId: limite.id,
        limiteLabel: limite.label,
        enjeuId: enjeu.id,
        enjeuLabel: enjeu.label,
        enjeuFamille: enjeu.famille,
      });
    }
  }

  return resultat;
}

/**
 * Une première confrontation par limite, puis une reprise immédiate avec un
 * autre enjeu. Le changement éventuel de réponse est le point de bascule.
 */
export function planifierCombatsCartes(
  cartes: CarteCombat[],
  graine = 0,
): CombatCarteContenu[] {
  const possibles = combatsCartesPossibles(cartes);
  if (possibles.length === 0) return [];

  const suivant = generateurAleatoire(graine ^ 0xc0b47);
  const groupes = new Map<string, CombatCarteContenu[]>();

  for (const combat of possibles) {
    const groupe = groupes.get(combat.limiteId);
    if (groupe) groupe.push(combat);
    else groupes.set(combat.limiteId, [combat]);
  }

  const limites = melanger(Array.from(groupes.keys()).sort(), suivant);
  const parLimite = new Map(
    limites.map((id) => [id, melanger(groupes.get(id) ?? [], suivant)]),
  );

  const resultat: CombatCarteContenu[] = [];

  // Deux enjeux consécutifs par limite : la comparaison est encore fraîche
  // quand le deuxième arrive, donc le changement de réponse se voit vraiment.
  for (const limiteId of limites) {
    const groupe = parLimite.get(limiteId) ?? [];
    const nombre = Math.min(2, groupe.length);
    if (resultat.length + nombre > MAX_COMBATS_CARTES) break;
    for (let rang = 0; rang < nombre; rang++) {
      resultat.push({ ...groupe[rang], variante: rang > 0 });
    }
  }

  // S'il reste de la place, on explore d'autres enjeux sans séparer les deux
  // premières questions qui forment la bascule principale.
  for (let rang = 2; resultat.length < MAX_COMBATS_CARTES; rang++) {
    let ajoute = false;
    for (const limiteId of limites) {
      const combat = parLimite.get(limiteId)?.[rang];
      if (!combat) continue;
      resultat.push({ ...combat, variante: true });
      ajoute = true;
      if (resultat.length >= MAX_COMBATS_CARTES) break;
    }
    if (!ajoute) break;
  }

  return resultat;
}
