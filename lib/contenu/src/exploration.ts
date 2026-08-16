/**
 * Exploration — où creuser une fois le premier portrait affiché.
 *
 * La première passe sert à obtenir une ordination lisible. La deuxième cherche
 * à comprendre **pourquoi** cette ordination bouge selon les circonstances.
 * Elle ne sert donc pas à couvrir mécaniquement ce qui reste : elle choisit les
 * collisions les plus informatives.
 *
 * Ce qui mérite qu'on y revienne :
 *
 *   — deux valeurs presque à égalité : l'ordre entre elles n'est pas établi ;
 *   — un couple qui a déjà répondu autrement selon les cartes : le contexte
 *     pèse manifestement, reste à voir dans quel sens ;
 *   — un couple sur lequel « ça dépend » revient : la personne dit elle-même
 *     que la question est mal posée telle quelle ;
 *   — une limite qui n'a encore jamais cédé : on ne sait pas si elle tient
 *     vraiment ou si elle n'a pas encore rencontré d'enjeu à sa mesure ;
 *   — une limite dont l'ordre est inversé : elle a cédé devant un enjeu plus
 *     léger que celui devant lequel elle a tenu.
 *
 * C'est aussi ce qui rend la deuxième passe psychologiquement différente : la
 * personne ne répond plus à une série de questions, elle met à l'épreuve une
 * constellation qui lui appartient déjà.
 */

import { cleValeurs, type Collision } from "./collisions";
import type { Bascule, RangValeur, Tension } from "./ordination";

/** En deçà de cet écart de force, deux valeurs sont considérées à égalité. */
const ECART_EGALITE = 0.25;

export interface MotifExploration {
  collision: Collision;
  /** Plus le score est haut, plus la collision est informative. */
  score: number;
  /** Pourquoi celle-ci — sert à l'affichage et aux tests. */
  motifs: string[];
}

export interface EtatExploration {
  classement: RangValeur[];
  tensions: Tension[];
  bascules: Bascule[];
}

/**
 * Classe les collisions restantes de la plus informative à la moins.
 *
 * Les motifs s'additionnent : une collision qui oppose deux valeurs à égalité
 * *et* dont la limite n'a jamais cédé passe devant une collision qui ne coche
 * qu'un seul critère.
 */
export function classerExploration(
  restantes: Collision[],
  etat: EtatExploration,
): MotifExploration[] {
  const forceParValeur = new Map(
    etat.classement.map((r) => [r.valeur, r.force]),
  );
  const tensionParCle = new Map(
    etat.tensions.map((t) => [cleValeurs(t.valeurA, t.valeurB), t]),
  );
  const basculeParLimite = new Map(etat.bascules.map((b) => [b.limiteId, b]));

  return restantes
    .map((collision) => {
      const motifs: string[] = [];
      let score = 0;

      const forceEnjeu = forceParValeur.get(collision.valeurA);
      const forceLimite = forceParValeur.get(collision.valeurB);

      if (forceEnjeu !== undefined && forceLimite !== undefined) {
        const ecart = Math.abs(forceEnjeu - forceLimite);
        if (ecart < ECART_EGALITE) {
          score += 3;
          motifs.push("deux valeurs presque à égalité");
        }
      } else {
        // Un couple jamais rencontré vaut la peine d'être vu au moins une fois.
        score += 2;
        motifs.push("couple encore jamais joué");
      }

      const tension = tensionParCle.get(
        cleValeurs(collision.valeurA, collision.valeurB),
      );
      if (tension) {
        if (tension.stable === false) {
          score += 4;
          motifs.push("la réponse a déjà changé selon les cartes");
        }
        if (tension.indecises > 0) {
          score += 2;
          motifs.push("« ça dépend » est déjà revenu sur ce couple");
        }
        if (tension.stable === null && tension.indecises === 0) {
          // Tranché une seule fois : le revoir sous une autre carte est la
          // seule façon de savoir si l'ordre tient ou si c'était la mise en
          // scène. C'est ainsi qu'on mesure la stabilité — jamais en demandant
          // à la personne si elle se trouve cohérente.
          score += 1;
          motifs.push("l'ordre n'a été observé qu'une fois");
        }
      }

      const bascule = basculeParLimite.get(collision.limiteId);
      if (bascule) {
        if (bascule.jamaisFranchie) {
          score += 2;
          motifs.push("cette limite n'a encore jamais cédé");
        }
        if (bascule.ordreInverse) {
          score += 3;
          motifs.push("cette limite a cédé devant un enjeu plus léger");
        }
      }

      return { collision, score, motifs };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.collision.situation.localeCompare(b.collision.situation),
    );
}
