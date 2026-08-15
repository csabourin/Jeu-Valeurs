/**
 * @workspace/contenu — tout le matériel du jeu, versionné dans le code.
 *
 * Le contenu n'est pas en base de données : il est relu, corrigé et déployé
 * comme du code. La base ne garde que ce qui appartient à la personne (ses
 * cartes, ses réponses).
 *
 * Les modules, du plus statique au plus calculé :
 *
 *   taxonomie · valeurs · cartes · duels · bascules  — le matériel
 *   eligibilite · formulation                        — les règles d'écriture
 *   comparaisons · preferences                       — ce qu'on enregistre,
 *                                                      ce qu'on en déduit
 *   exploration · parcours                           — quelle question ensuite
 *   lexique · terminologie                           — les mots de l'interface
 */

export * from "./taxonomie";
export * from "./valeurs";
export * from "./cartes";
export * from "./categories";
export * from "./reecritures";
export * from "./catalogue";
export * from "./duels";
export * from "./bascules";
export * from "./eligibilite";
export * from "./formulation";
export * from "./comparaisons";
export * from "./preferences";
export * from "./duels-cartes";
export * from "./exploration";
export * from "./lexique";
export * from "./terminologie";
export * from "./hasard";
export * from "./parcours";
