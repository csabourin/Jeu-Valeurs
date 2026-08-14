/**
 * Des catégories du jeu de cartes vers le vocabulaire de valeurs du jeu.
 *
 * Les 825 cartes importées portent une catégorie mais aucune valeur. Plutôt que
 * d'annoter 825 cartes une à une — impossible à relire, impossible à garder
 * cohérent — on annote les 70 catégories. Chaque carte hérite des valeurs de la
 * sienne.
 *
 * Ce que ça produit reste une **hypothèse**, jamais une lecture imposée : à
 * l'étape « Pourquoi cette carte ? », rien n'est coché d'avance et la personne
 * garde, retire ou réécrit. Une correspondance approximative coûte donc un
 * chip à décocher, pas une conclusion fausse.
 *
 * Certaines catégories n'ont pas d'équivalent exact dans les 19 valeurs (le
 * sacré, le pouvoir, la richesse). On donne alors les deux valeurs les plus
 * proches plutôt qu'une seule qui trancherait à la place de la personne.
 */

import { V } from "./valeurs";
import type { Famille } from "./cartes";

export const valeursParCategorie: Record<Famille, Record<string, string[]>> = {
  lignes_rouges: {
    "Dignité et respect de la personne": [V.entraide, V.justice],
    "Vérité, intégrité et confiance": [V.honnetete],
    "Loyauté, engagements et relations": [V.loyaute],
    "Famille, proches et responsabilités intergénérationnelles": [V.famille, V.loyaute],
    "Justice, équité et réciprocité": [V.justice],
    "Liberté, autonomie et consentement": [V.liberte, V.autonomie],
    "Autorité, ordre, devoir et responsabilité": [V.regles],
    "Harmonie sociale, conflit et appartenance": [V.appartenance, V.tranquillite],
    "Tradition, culture et transmission": [V.famille],
    "Sacré, convictions et sens": [V.autonomie, V.famille],
    "Communauté, entraide et réciprocité": [V.entraide, V.appartenance],
    "Nature, territoire et monde vivant": [V.nature],
    "Pouvoir, statut et leadership": [V.reconnaissance, V.justice],
    "Courage, prudence et protection": [V.courage, V.securite],
    "Travail, contribution et mérite": [V.reussite, V.justice],
    "Identité, authenticité et appartenance": [V.autonomie, V.appartenance],
    "Hospitalité, accueil et frontières du groupe": [V.entraide, V.appartenance],
    "Respect des ancêtres, héritage et changement": [V.famille, V.curiosite],
    "Savoir, apprentissage et expertise": [V.curiosite, V.honnetete],
    "Propriété, partage et biens communs": [V.justice, V.entraide],
    "Réputation, honneur et face": [V.reconnaissance, V.honnetete],
    "Pardon, réparation et conséquences": [V.justice, V.entraide],
    "Individu et collectivité": [V.autonomie, V.appartenance],
    "Temps, rythme et obligations": [V.tranquillite, V.loyaute],
    "Humains, autres êtres vivants et interdépendance": [V.nature, V.entraide],
  },

  horizons: {
    "Liberté, autonomie et indépendance": [V.liberte, V.autonomie],
    "Sécurité, stabilité et prévisibilité": [V.securite],
    "Appartenance, affection et proximité": [V.appartenance],
    "Reconnaissance, statut et admiration": [V.reconnaissance],
    "Pouvoir, influence et contrôle": [V.reconnaissance, V.autonomie],
    "Réussite, compétence et excellence": [V.reussite],
    "Richesse, confort et possessions": [V.securite, V.plaisir],
    "Plaisir, confort et gratification": [V.plaisir],
    "Paix, solitude et retrait": [V.tranquillite],
    "Famille, descendance et continuité": [V.famille],
    "Harmonie, conformité et acceptation sociale": [V.appartenance, V.regles],
    "Différence, originalité et transgression légère": [V.creativite, V.liberte],
    "Contribution, service et utilité": [V.entraide],
    "Justice, transformation et changement social": [V.justice, V.courage],
    "Nature, territoire et enracinement": [V.nature],
    "Savoir, compréhension et curiosité": [V.curiosite],
    "Sens, spiritualité et transcendance": [V.curiosite, V.tranquillite],
    "Compétition, comparaison et supériorité": [V.reussite, V.reconnaissance],
    "Évitement, facilité et moindre responsabilité": [V.tranquillite, V.plaisir],
    "Influence relationnelle et dépendance": [V.appartenance, V.reconnaissance],
    "Vie privée, secret et contrôle de son image": [V.viePrivee],
    "Héritage et immortalité symbolique": [V.famille, V.reconnaissance],
  },

  tresors: {
    "Relations proches et attachement": [V.appartenance, V.loyaute],
    "Famille, foyer et continuité": [V.famille],
    "Autonomie et liberté acquise": [V.autonomie, V.liberte],
    "Sécurité, stabilité et prévisibilité": [V.securite],
    "Confort, habitudes et qualité de vie": [V.plaisir, V.tranquillite],
    "Travail, compétence et accomplissements": [V.reussite],
    "Statut, prestige et reconnaissance": [V.reconnaissance],
    "Pouvoir, influence et contrôle acquis": [V.reconnaissance, V.autonomie],
    "Identité et sentiment de soi": [V.autonomie, V.courage],
    "Culture, langue et héritage collectif": [V.famille, V.appartenance],
    "Communauté et appartenance collective": [V.appartenance, V.entraide],
    "Nature, territoire et environnement": [V.nature],
    "Savoir, expertise et compréhension": [V.curiosite, V.reussite],
    "Valeurs, convictions et intégrité": [V.honnetete, V.courage],
    "Image, réputation et maîtrise de ce que les autres voient": [
      V.reconnaissance,
      V.viePrivee,
    ],
    "Possessions, patrimoine et ressources matérielles": [V.securite],
    "Position sociale et privilèges acquis": [V.reconnaissance, V.securite],
    "Temps, disponibilité et rythme de vie": [V.tranquillite, V.liberte],
    "Paix, harmonie et absence de conflit": [V.tranquillite],
    "Créativité, expression et projets personnels": [V.creativite],
    "Utilité, rôle et sentiment d’être nécessaire": [V.entraide, V.reconnaissance],
    "Choix, possibilités et avenir ouvert": [V.liberte, V.curiosite],
    "Ordre, règles et institutions": [V.regles, V.securite],
  },
};
