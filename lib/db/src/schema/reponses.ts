import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const choixPossibles = [
  "A",
  "B",
  "ca_depend",
  "je_ne_sais_pas",
  "passer",
] as const;

export type ChoixCollision = (typeof choixPossibles)[number];

export const facteursPossibles = [
  "cout_personnel",
  "ampleur_impact",
  "proximite_sociale",
  "nombre_personnes",
  "certitude",
  "reversibilite",
  "urgence",
  "responsabilite",
  "autre",
] as const;

export type FacteurDepend = (typeof facteursPossibles)[number];

/**
 * Les deux moments du parcours. La phase est enregistrée avec la réponse : une
 * comparaison faite à froid pendant la première passe et une comparaison faite
 * pendant la mise à l'épreuve ne se lisent pas de la même façon.
 */
export const phasesPossibles = ["ordination", "epreuve"] as const;

export type PhaseExperience = (typeof phasesPossibles)[number];

/**
 * Une comparaison, telle qu'elle a été jouée.
 *
 * Elle porte **deux étages** : les valeurs comparées et les cartes qui les ont
 * manifestées. Sans les valeurs, on ne saurait dire que « la carte A a battu
 * la carte B » — ce qui n'apprend rien. Sans les cartes, on ne pourrait ni
 * remontrer la question posée, ni éviter de reposer exactement la même.
 */
export const reponsesCollisionTable = pgTable("reponses_collision", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  /** Identifiant du duel, du duel de cartes ou du palier de bascule. */
  dilemmeId: integer("dilemme_id"),
  valeurA: text("valeur_a").notNull(),
  valeurB: text("valeur_b").notNull(),
  /** Carte de session qui portait la valeur A, quand la question venait des cartes. */
  carteA: text("carte_a"),
  carteB: text("carte_b"),
  choix: text("choix").notNull().$type<ChoixCollision>(),
  /** Où ça se passait, quand la situation le précisait. */
  contexte: text("contexte"),
  phase: text("phase").notNull().default("ordination").$type<PhaseExperience>(),
  facteurDepend: text("facteur_depend").$type<FacteurDepend>(),
  facteurDependLibre: text("facteur_depend_libre"),
  /** Mise à l'épreuve seulement : jamais demandé pendant la première passe. */
  difficulte: integer("difficulte"),
  certitude: integer("certitude"),
  /** Série de bascule, si cette réponse en fait partie. */
  serieId: text("serie_id"),
  /** Rang du palier dans la série (1, 2, 3). */
  palier: integer("palier"),
  /** La seule dimension qui bouge dans la série. */
  dimension: text("dimension"),
  /** Valeur que la personne dit avoir voulu protéger, quand on le lui demande. */
  valeurProtegee: text("valeur_protegee"),
  /** Ce qui aurait pu faire changer sa réponse — dans ses mots, jamais déduit. */
  ceQuiChangerait: text("ce_qui_changerait"),
  version: integer("version").notNull().default(1),
  creeLe: timestamp("cree_le", { withTimezone: true }).notNull().defaultNow(),
  miseAJourLe: timestamp("mise_a_jour_le", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertReponseSchema = createInsertSchema(
  reponsesCollisionTable,
).omit({ id: true, creeLe: true, miseAJourLe: true });

export type InsertReponse = z.infer<typeof insertReponseSchema>;
export type ReponseCollision = typeof reponsesCollisionTable.$inferSelect;
