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
 * Certaines catégories n'ont pas d'équivalent exact (le sacré, le pouvoir). On
 * donne alors les deux valeurs les plus proches plutôt qu'une seule qui
 * trancherait à la place de la personne.
 *
 * Les correspondances visent la **valeur fine**, pas la grande famille :
 * « Temps, rythme et obligations » propose « contrôle de mon temps » et
 * « disponibilité », pas « tranquillité ». C'est ce qui permet au moteur de
 * distinguer deux valeurs voisines au lieu de tout ramener à quatre grandes
 * catégories. Le lexique complet reste accessible à l'étape « Tes mots » :
 * aucune valeur n'existe seulement dans le code.
 */

import { V } from "./valeurs";
import type { Famille } from "./cartes";

export const valeursParCategorie: Record<Famille, Record<string, string[]>> = {
  lignes_rouges: {
    "Dignité et respect de la personne": [V.compassion, V.justice],
    "Vérité, intégrité et confiance": [V.honnetete, V.coherence],
    "Loyauté, engagements et relations": [V.loyaute, V.paroleTenue],
    "Famille, proches et responsabilités intergénérationnelles": [
      V.famille,
      V.responsabiliteProches,
    ],
    "Justice, équité et réciprocité": [V.justice, V.reciprocite],
    "Liberté, autonomie et consentement": [V.liberteChoix, V.autonomie],
    "Autorité, ordre, devoir et responsabilité": [V.regles, V.devoir],
    "Harmonie sociale, conflit et appartenance": [V.appartenance, V.tranquillite],
    "Tradition, culture et transmission": [V.traditions, V.famille],
    "Sacré, convictions et sens": [V.coherence, V.traditions],
    "Communauté, entraide et réciprocité": [V.entraide, V.reciprocite],
    "Nature, territoire et monde vivant": [V.nature, V.respectVivant],
    "Pouvoir, statut et leadership": [V.influence, V.reconnaissance],
    "Courage, prudence et protection": [V.courage, V.protectionProches],
    "Travail, contribution et mérite": [V.reussite, V.tenacite],
    "Identité, authenticité et appartenance": [V.expressionDeSoi, V.appartenance],
    "Hospitalité, accueil et frontières du groupe": [V.soutien, V.appartenance],
    "Respect des ancêtres, héritage et changement": [V.traditions, V.curiosite],
    "Savoir, apprentissage et expertise": [V.apprentissage, V.competence],
    "Propriété, partage et biens communs": [V.egalite, V.entraide],
    "Réputation, honneur et face": [V.reputation, V.honnetete],
    "Pardon, réparation et conséquences": [V.compassion, V.justice],
    "Individu et collectivité": [V.autonomie, V.appartenance],
    "Temps, rythme et obligations": [V.controleTemps, V.disponibilite],
    "Humains, autres êtres vivants et interdépendance": [
      V.respectVivant,
      V.entraide,
    ],
  },

  horizons: {
    "Liberté, autonomie et indépendance": [V.liberte, V.independance],
    "Sécurité, stabilité et prévisibilité": [V.securite, V.stabilite],
    "Appartenance, affection et proximité": [V.appartenance, V.soutien],
    "Reconnaissance, statut et admiration": [V.reconnaissance, V.reputation],
    "Pouvoir, influence et contrôle": [V.influence, V.capaciteAgir],
    "Réussite, compétence et excellence": [V.reussite, V.competence],
    "Richesse, confort et possessions": [V.autonomieFinanciere, V.confort],
    "Plaisir, confort et gratification": [V.plaisir, V.confort],
    "Paix, solitude et retrait": [V.tranquillite, V.simplicite],
    "Famille, descendance et continuité": [V.famille, V.protectionProches],
    "Harmonie, conformité et acceptation sociale": [V.appartenance, V.regles],
    "Différence, originalité et transgression légère": [V.originalite, V.aventure],
    "Contribution, service et utilité": [V.entraide, V.soutien],
    "Justice, transformation et changement social": [V.justice, V.courage],
    "Nature, territoire et enracinement": [V.nature, V.respectVivant],
    "Savoir, compréhension et curiosité": [V.curiosite, V.apprentissage],
    "Sens, spiritualité et transcendance": [V.coherence, V.tranquillite],
    "Compétition, comparaison et supériorité": [V.depassement, V.reconnaissance],
    "Évitement, facilité et moindre responsabilité": [V.confort, V.tranquillite],
    "Influence relationnelle et dépendance": [V.influence, V.appartenance],
    "Vie privée, secret et contrôle de son image": [V.viePrivee, V.reputation],
    "Héritage et immortalité symbolique": [V.traditions, V.reconnaissance],
  },

  tresors: {
    "Relations proches et attachement": [V.loyaute, V.disponibilite],
    "Famille, foyer et continuité": [V.famille, V.protectionProches],
    "Autonomie et liberté acquise": [V.autonomie, V.autodetermination],
    "Sécurité, stabilité et prévisibilité": [V.securite, V.prevoyance],
    "Confort, habitudes et qualité de vie": [V.confort, V.sante],
    "Travail, compétence et accomplissements": [V.competence, V.reussite],
    "Statut, prestige et reconnaissance": [V.reconnaissance, V.reputation],
    "Pouvoir, influence et contrôle acquis": [V.influence, V.capaciteAgir],
    "Identité et sentiment de soi": [V.expressionDeSoi, V.coherence],
    "Culture, langue et héritage collectif": [V.traditions, V.appartenance],
    "Communauté et appartenance collective": [V.appartenance, V.entraide],
    "Nature, territoire et environnement": [V.nature],
    "Savoir, expertise et compréhension": [V.apprentissage, V.competence],
    "Valeurs, convictions et intégrité": [V.coherence, V.courage],
    "Image, réputation et maîtrise de ce que les autres voient": [
      V.reconnaissance,
      V.viePrivee,
    ],
    "Possessions, patrimoine et ressources matérielles": [
      V.securite,
      V.autonomieFinanciere,
    ],
    "Position sociale et privilèges acquis": [V.reconnaissance, V.securite],
    "Temps, disponibilité et rythme de vie": [V.controleTemps, V.tranquillite],
    "Paix, harmonie et absence de conflit": [V.tranquillite, V.simplicite],
    "Créativité, expression et projets personnels": [
      V.creativite,
      V.expressionDeSoi,
    ],
    "Utilité, rôle et sentiment d’être nécessaire": [V.entraide, V.reconnaissance],
    "Choix, possibilités et avenir ouvert": [V.liberteChoix, V.curiosite],
    "Ordre, règles et institutions": [V.ordre, V.regles],
  },
};
